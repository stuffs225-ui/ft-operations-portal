// ── QC Quality Intelligence ───────────────────────────────────────────────────
// Turns the raw QC record tables (material inspections, NCRs, project inspections)
// into the signals a QC lead actually acts on: pass rate, which suppliers fail
// most, what root causes dominate, and the trend over time. Read-only and
// deferred-migration safe — a missing table degrades that section to empty.

import { supabase, isSupabaseConfigured } from './supabase';

// Material inspection result vocabulary (live enum + any legacy/mock synonyms).
const MAT_ACCEPTED = ['accepted', 'accepted_with_comments', 'pass', 'passed', 'pass_with_observations', 'conditional_pass'];
const MAT_REJECTED = ['rejected', 'fail', 'failed'];
// Project inspection result vocabulary.
const PROJ_PASSED = ['passed', 'passed_with_comments', 'accepted'];
const PROJ_FAILED = ['failed', 'rework_required', 'rejected'];

const NCR_OPEN_EXCLUDE = ['closed', 'cancelled'];

export interface PassRate {
  total: number;      // all inspections
  decided: number;    // accepted + rejected (pending excluded)
  accepted: number;
  rejected: number;
  passRate: number | null; // accepted / decided, null when nothing decided
}

export interface SupplierQuality {
  supplier: string;
  inspected: number;  // decided inspections attributed to this supplier
  rejected: number;
  ncrs: number;
  rejectRate: number; // rejected / inspected
}

export interface RootCause {
  category: string;
  count: number;
}

export interface MonthlyQuality {
  month: string;      // 'YYYY-MM'
  label: string;      // 'Feb 26'
  accepted: number;
  rejected: number;
  passRate: number | null;
}

export interface QcQuality {
  material: PassRate;
  project: PassRate;
  suppliers: SupplierQuality[];
  rootCauses: RootCause[];
  monthly: MonthlyQuality[];
  openNcrs: number;
  criticalOpenNcrs: number;
}

interface InspRow { inspection_result: string; when: string | null; supplier: string | null; id: string }
interface NcrRow { root_cause_category: string | null; severity: string; ncr_status: string; inspectionId: string | null }

function passRate(rows: { result: string }[], accepted: string[], rejected: string[]): PassRate {
  let acc = 0, rej = 0;
  for (const r of rows) {
    if (accepted.includes(r.result)) acc += 1;
    else if (rejected.includes(r.result)) rej += 1;
  }
  const decided = acc + rej;
  return { total: rows.length, decided, accepted: acc, rejected: rej, passRate: decided > 0 ? acc / decided : null };
}

function monthKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Build the trailing-6-month trend from material inspections.
function buildMonthly(insp: InspRow[]): MonthlyQuality[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    });
  }
  const byMonth = new Map<string, { acc: number; rej: number }>();
  for (const r of insp) {
    const k = monthKey(r.when);
    if (!k) continue;
    const bucket = byMonth.get(k) ?? { acc: 0, rej: 0 };
    if (MAT_ACCEPTED.includes(r.inspection_result)) bucket.acc += 1;
    else if (MAT_REJECTED.includes(r.inspection_result)) bucket.rej += 1;
    byMonth.set(k, bucket);
  }
  return months.map((m) => {
    const b = byMonth.get(m.key) ?? { acc: 0, rej: 0 };
    const decided = b.acc + b.rej;
    return { month: m.key, label: m.label, accepted: b.acc, rejected: b.rej, passRate: decided > 0 ? b.acc / decided : null };
  });
}

function assemble(matInsp: InspRow[], projInsp: InspRow[], ncrs: NcrRow[]): QcQuality {
  const material = passRate(matInsp.map((r) => ({ result: r.inspection_result })), MAT_ACCEPTED, MAT_REJECTED);
  const project = passRate(projInsp.map((r) => ({ result: r.inspection_result })), PROJ_PASSED, PROJ_FAILED);

  // Supplier quality: attribute each decided material inspection (and each NCR,
  // via its parent inspection) to the receipt's supplier.
  const inspSupplier = new Map<string, string | null>();
  const bySupplier = new Map<string, { inspected: number; rejected: number; ncrs: number }>();
  for (const r of matInsp) {
    inspSupplier.set(r.id, r.supplier);
    if (!r.supplier) continue;
    const decided = MAT_ACCEPTED.includes(r.inspection_result) || MAT_REJECTED.includes(r.inspection_result);
    if (!decided) continue;
    const s = bySupplier.get(r.supplier) ?? { inspected: 0, rejected: 0, ncrs: 0 };
    s.inspected += 1;
    if (MAT_REJECTED.includes(r.inspection_result)) s.rejected += 1;
    bySupplier.set(r.supplier, s);
  }
  for (const n of ncrs) {
    const supplier = n.inspectionId ? inspSupplier.get(n.inspectionId) ?? null : null;
    if (!supplier) continue;
    const s = bySupplier.get(supplier) ?? { inspected: 0, rejected: 0, ncrs: 0 };
    s.ncrs += 1;
    bySupplier.set(supplier, s);
  }
  const suppliers: SupplierQuality[] = [...bySupplier.entries()]
    .map(([supplier, v]) => ({ supplier, ...v, rejectRate: v.inspected > 0 ? v.rejected / v.inspected : 0 }))
    .sort((a, b) => (b.rejected + b.ncrs) - (a.rejected + a.ncrs) || b.rejectRate - a.rejectRate);

  // Root-cause Pareto over all NCRs that carry a category.
  const byCause = new Map<string, number>();
  for (const n of ncrs) {
    const c = (n.root_cause_category ?? '').trim();
    if (!c) continue;
    byCause.set(c, (byCause.get(c) ?? 0) + 1);
  }
  const rootCauses: RootCause[] = [...byCause.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const openNcrs = ncrs.filter((n) => !NCR_OPEN_EXCLUDE.includes(n.ncr_status)).length;
  const criticalOpenNcrs = ncrs.filter((n) => !NCR_OPEN_EXCLUDE.includes(n.ncr_status) && (n.severity === 'critical' || n.severity === 'high')).length;

  return { material, project, suppliers, rootCauses, monthly: buildMonthly(matInsp), openNcrs, criticalOpenNcrs };
}

export async function fetchQcQuality(): Promise<QcQuality> {
  if (!isSupabaseConfigured || !supabase) {
    const [{ MOCK_MATERIAL_QC_INSPECTIONS, MOCK_MATERIAL_NCRS, MOCK_PROJECT_QC_INSPECTIONS }, { MOCK_STORE_RECEIPTS }] =
      await Promise.all([import('../data/mockQc'), import('../data/mockStore')]);
    const { mockOrEmpty } = await import('./dataMode');
    const receiptSupplier = new Map<string, string | null>(
      mockOrEmpty(MOCK_STORE_RECEIPTS).map((r) => [r.id, r.supplier_name]),
    );
    const matInsp: InspRow[] = mockOrEmpty(MOCK_MATERIAL_QC_INSPECTIONS).map((r) => ({
      id: r.id, inspection_result: r.inspection_result,
      when: r.inspected_at ?? r.created_at,
      supplier: r.store_receipt_id ? receiptSupplier.get(r.store_receipt_id) ?? null : null,
    }));
    const projInsp: InspRow[] = mockOrEmpty(MOCK_PROJECT_QC_INSPECTIONS).map((r) => ({
      id: r.id, inspection_result: r.inspection_result, when: r.inspected_at ?? r.created_at, supplier: null,
    }));
    const ncrs: NcrRow[] = mockOrEmpty(MOCK_MATERIAL_NCRS).map((n) => ({
      root_cause_category: n.root_cause_category, severity: n.severity, ncr_status: n.ncr_status,
      inspectionId: n.material_qc_inspection_id ?? null,
    }));
    return assemble(matInsp, projInsp, ncrs);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [matRes, projRes, ncrRes] = await Promise.all([
    sb.from('material_qc_inspections')
      .select('id, inspection_result, inspected_at, created_at, store_receipt:store_receipts(supplier_name)')
      .limit(5000),
    sb.from('project_qc_inspections')
      .select('id, inspection_result, inspected_at, created_at')
      .limit(5000),
    sb.from('material_ncrs')
      .select('material_qc_inspection_id, root_cause_category, severity, ncr_status')
      .limit(5000),
  ]);

  const matInsp: InspRow[] = matRes.error ? [] : ((matRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    inspection_result: (r.inspection_result as string) ?? 'pending',
    when: (r.inspected_at as string) ?? (r.created_at as string) ?? null,
    supplier: (r.store_receipt as { supplier_name?: string | null } | null)?.supplier_name ?? null,
  }));
  const projInsp: InspRow[] = projRes.error ? [] : ((projRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    inspection_result: (r.inspection_result as string) ?? 'pending',
    when: (r.inspected_at as string) ?? (r.created_at as string) ?? null,
    supplier: null,
  }));
  const ncrs: NcrRow[] = ncrRes.error ? [] : ((ncrRes.data ?? []) as Record<string, unknown>[]).map((n) => ({
    root_cause_category: (n.root_cause_category as string) ?? null,
    severity: (n.severity as string) ?? 'low',
    ncr_status: (n.ncr_status as string) ?? 'open',
    inspectionId: (n.material_qc_inspection_id as string) ?? null,
  }));

  return assemble(matInsp, projInsp, ncrs);
}
