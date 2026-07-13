// ── Aging report import (C3 admin ingestion) ──────────────────────────────────
// Parses the monthly Finance collection/aging workbook (the "Normal Customers"
// and "Government Customers" sheets), keeps only rows belonging to OUR sales
// staff (matched by name), diffs against last month (new vs recurring), and
// commits a snapshot to aging_snapshots / aging_items.
//
// Column layout (both sheets, header on row 1; salesman column is C in both even
// though its header text differs — "Sales Person" vs "ORG_Sales_Man"):
//   A Company · B Customer · C Salesman · H Total · I..O aging buckets
//   (Current / <30 / 60 / 90 / 180 / 365 / 365+)

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError } from './deferredMigrationSafety';
import type { SalesmanOption } from './salesWorkspaceQueries';

// ── Name matching ─────────────────────────────────────────────────────────────

// Spelling variants seen in the Finance file → our canonical token.
const TOKEN_ALIAS: Record<string, string> = {
  ABDALLAH: 'ABDULLAH', ABDALLA: 'ABDULLAH',
  MAHMOOD: 'MAHMOUD', MAHMUD: 'MAHMOUD',
  SOLIMAN: 'SULIMAN', SULAIMAN: 'SULIMAN', SULEIMAN: 'SULIMAN', SOLAIMAN: 'SULIMAN',
  HATIM: 'HATEM', HAATEM: 'HATEM',
  ESAM: 'ESSAM', ISSAM: 'ESSAM',
  OBADAH: 'OBADA', UBADA: 'OBADA',
  NADIM: 'NADEEM',
};

export function nameTokens(raw: string): string[] {
  const ascii = (raw ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
  return ascii
    .split(/[^A-Z]+/)
    .filter(Boolean)
    .map((t) => TOKEN_ALIAS[t] ?? t);
}

/** A salesman matches a Finance name when ALL of the salesman's name tokens
 *  appear in the Finance name — so "Ahmed Qadomi" needs both AHMED and QADOMI
 *  and will NOT match "Ahmed Burhan". Returns the matched ids (0, 1, or many). */
export function matchSalesmen(orgName: string, salesmen: SalesmanOption[]): string[] {
  const target = new Set(nameTokens(orgName));
  const hits: string[] = [];
  for (const s of salesmen) {
    const toks = nameTokens(s.name);
    if (toks.length > 0 && toks.every((t) => target.has(t))) hits.push(s.id);
  }
  return hits;
}

// ── Workbook parsing ──────────────────────────────────────────────────────────

export interface RawAgingRow {
  sheet: string;
  company: string;
  customerName: string;
  salesPersonRaw: string;
  total: number;
  worstDays: number;
}

const BUCKET_DAYS = [
  { col: 9, days: 0 },    // I Current
  { col: 10, days: 20 },  // J < 30
  { col: 11, days: 45 },  // K 60
  { col: 12, days: 75 },  // L 90
  { col: 13, days: 135 }, // M 180
  { col: 14, days: 270 }, // N 365
  { col: 15, days: 400 }, // O 365+
];

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[, ]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function text(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object' && 'text' in (v as Record<string, unknown>)) {
    return String((v as { text: unknown }).text ?? '').trim();
  }
  return String(v).trim();
}

/** Parse the two relevant sheets from an .xlsx ArrayBuffer. ExcelJS is imported
 *  dynamically so it stays out of the main bundle. */
export async function parseAgingWorkbook(buffer: ArrayBuffer): Promise<{ rows: RawAgingRow[]; sheetsRead: string[] }> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const rows: RawAgingRow[] = [];
  const sheetsRead: string[] = [];

  wb.eachSheet((ws) => {
    const nameLc = ws.name.toLowerCase();
    if (!nameLc.includes('normal') && !nameLc.includes('government')) return;
    sheetsRead.push(ws.name);

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const salesPersonRaw = text(row.getCell(3).value);
      const customerName = text(row.getCell(2).value);
      if (!salesPersonRaw || !customerName) return;

      let total = num(row.getCell(8).value); // H Total
      let worstDays = 0;
      let bucketSum = 0;
      for (const b of BUCKET_DAYS) {
        const v = num(row.getCell(b.col).value);
        if (v > 0) { bucketSum += v; if (b.days > worstDays) worstDays = b.days; }
      }
      if (total <= 0) total = bucketSum; // fall back to bucket sum when H is blank/"-"
      if (total <= 0) return; // nothing outstanding → skip

      rows.push({
        sheet: ws.name,
        company: text(row.getCell(1).value),
        customerName,
        salesPersonRaw,
        total,
        worstDays,
      });
    });
  });

  return { rows, sheetsRead };
}

// ── Preview (match + new/recurring diff) ──────────────────────────────────────

export function agingKey(customerName: string, salesmanId: string): string {
  return `${nameTokens(customerName).join(' ')}::${salesmanId}`;
}

export interface PreviewItem {
  key: string;
  customerName: string;
  company: string;
  amount: number;
  worstDays: number;
  isRecurring: boolean;
}
export interface PreviewSalesman {
  salesmanId: string;
  salesmanName: string;
  items: PreviewItem[];
  total: number;
}
export interface AgingPreview {
  perSalesman: PreviewSalesman[];
  /** Finance names that matched no salesman (skipped) — count per raw name. */
  unmatched: { name: string; count: number; amount: number }[];
  /** Names that matched more than one salesman (need a manual choice). */
  ambiguous: { name: string; count: number }[];
  matchedRows: number;
  totalRows: number;
}

/**
 * Build the reviewable preview. `manualMap` lets the admin assign an unmatched/
 * ambiguous Finance name (normalized) to a specific salesman id. `prevKeys` are
 * the aging keys from the previous snapshot (recurring detection).
 */
export function buildAgingPreview(
  rows: RawAgingRow[],
  salesmen: SalesmanOption[],
  prevKeys: Set<string>,
  manualMap: Record<string, string> = {},
): AgingPreview {
  const byId = new Map<string, PreviewSalesman>();
  const nameById = new Map(salesmen.map((s) => [s.id, s.name]));
  const unmatched = new Map<string, { count: number; amount: number }>();
  const ambiguous = new Map<string, number>();
  let matchedRows = 0;

  const normKey = (n: string) => nameTokens(n).join(' ');

  for (const r of rows) {
    const manual = manualMap[normKey(r.salesPersonRaw)];
    let salesmanId: string | null = null;
    if (manual) {
      salesmanId = manual;
    } else {
      const hits = matchSalesmen(r.salesPersonRaw, salesmen);
      if (hits.length === 1) salesmanId = hits[0];
      else if (hits.length > 1) {
        ambiguous.set(r.salesPersonRaw, (ambiguous.get(r.salesPersonRaw) ?? 0) + 1);
        continue;
      }
    }
    if (!salesmanId) {
      const cur = unmatched.get(r.salesPersonRaw) ?? { count: 0, amount: 0 };
      unmatched.set(r.salesPersonRaw, { count: cur.count + 1, amount: cur.amount + r.total });
      continue;
    }

    matchedRows += 1;
    const key = agingKey(r.customerName, salesmanId);
    let bucket = byId.get(salesmanId);
    if (!bucket) {
      bucket = { salesmanId, salesmanName: nameById.get(salesmanId) ?? 'Salesman', items: [], total: 0 };
      byId.set(salesmanId, bucket);
    }
    bucket.items.push({
      key,
      customerName: r.customerName,
      company: r.company,
      amount: r.total,
      worstDays: r.worstDays,
      isRecurring: prevKeys.has(key),
    });
    bucket.total += r.total;
  }

  const perSalesman = [...byId.values()].sort((a, b) => b.total - a.total);
  for (const b of perSalesman) b.items.sort((a, c) => c.amount - a.amount);

  return {
    perSalesman,
    unmatched: [...unmatched.entries()]
      .map(([name, v]) => ({ name, count: v.count, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount),
    ambiguous: [...ambiguous.entries()].map(([name, count]) => ({ name, count })),
    matchedRows,
    totalRows: rows.length,
  };
}

// ── Supabase: previous keys + commit ──────────────────────────────────────────

/** Aging keys of the most recent snapshot BEFORE `beforeMonth` (YYYY-MM-01). */
export async function getPreviousAgingKeys(
  beforeMonth: string,
): Promise<{ keys: Set<string>; unavailable: boolean }> {
  if (!isSupabaseConfigured || !supabase) return { keys: new Set(), unavailable: false };
  const snapRes = await supabase
    .from('aging_snapshots')
    .select('id, snapshot_month')
    .lt('snapshot_month', beforeMonth)
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapRes.error) {
    if (isMissingRelationError(snapRes.error)) return { keys: new Set(), unavailable: true };
    return { keys: new Set(), unavailable: false };
  }
  const snap = snapRes.data as { id: string } | null;
  if (!snap) return { keys: new Set(), unavailable: false };
  const items = await supabase.from('aging_items').select('invoice_ref').eq('snapshot_id', snap.id);
  const keys = new Set<string>();
  for (const it of (items.data ?? []) as { invoice_ref: string }[]) keys.add(it.invoice_ref);
  return { keys, unavailable: false };
}

export interface CommitResult { ok: boolean; unavailable: boolean; error: string | null; inserted: number }

/** Replace (or create) the snapshot for `month` and insert the matched items. */
export async function commitAgingSnapshot(
  month: string,             // YYYY-MM-01
  preview: AgingPreview,
  uploadedBy: string | null,
): Promise<CommitResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, unavailable: false, error: 'Supabase not configured.', inserted: 0 };
  const db = supabase;

  // Re-upload of the same month replaces it (unique(snapshot_month)).
  const existing = await db.from('aging_snapshots').select('id').eq('snapshot_month', month).maybeSingle();
  if (existing.error && isMissingRelationError(existing.error)) {
    return { ok: false, unavailable: true, error: null, inserted: 0 };
  }
  if (existing.data?.id) {
    await db.from('aging_snapshots').delete().eq('id', existing.data.id); // items cascade
  }

  const snapIns = await db
    .from('aging_snapshots')
    .insert({ snapshot_month: month, uploaded_by: uploadedBy })
    .select('id')
    .single();
  if (snapIns.error) {
    if (isMissingRelationError(snapIns.error)) return { ok: false, unavailable: true, error: null, inserted: 0 };
    return { ok: false, unavailable: false, error: snapIns.error.message, inserted: 0 };
  }
  const snapshotId = (snapIns.data as { id: string }).id;

  const rows = preview.perSalesman.flatMap((s) =>
    s.items.map((it) => ({
      snapshot_id: snapshotId,
      invoice_ref: it.key,
      customer_name: it.customerName,
      project_code: it.company || null,
      amount: it.amount,
      days_overdue: it.worstDays,
      sales_owner_id: s.salesmanId,
      is_recurring: it.isRecurring,
      first_seen_month: it.isRecurring ? null : month,
    })),
  );

  // Insert in chunks to stay within payload limits.
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const ins = await db.from('aging_items').insert(chunk);
    if (ins.error) return { ok: false, unavailable: false, error: ins.error.message, inserted };
    inserted += chunk.length;
  }
  return { ok: true, unavailable: false, error: null, inserted };
}
