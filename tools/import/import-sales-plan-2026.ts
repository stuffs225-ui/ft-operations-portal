/* ─────────────────────────────────────────────────────────────────────────────
 * Sales Plan 2026 Import Tool — NAFFCO "Trucks and Vehicles 2026" plan.
 *
 * Imports REAL business data (not a test fixture) from the "Invoicing plan
 * 2026" sheet of the real sales plan workbook into projects /
 * project_vehicle_lines / project_invoicing_schedule, under the 10 real
 * sales user accounts provisioned by sales-users-bootstrap.ts.
 *
 * SAFETY MODEL:
 *   • Default mode is `parse` — reads the workbook only, opens NO database
 *     connection, writes NOTHING. Produces a JSON (local only) + Markdown
 *     (reviewable, meant to be committed) mapping report.
 *   • `import` requires IMPORT_CONFIRM=true AND the target Supabase host to
 *     be explicitly listed in SALES_IMPORT_ALLOWED_HOSTS (comma-separated).
 *     This is the same *shape* of guard as tools/e2e's
 *     E2E_NON_PRODUCTION_HOSTS allow-list, deliberately inverted: the E2E
 *     guard exists to keep test data OUT of production by default; this
 *     guard exists to keep a misconfigured env from writing real business
 *     data into the WRONG project by accident. Naming the real target host
 *     is a deliberate, explicit act either way.
 *   • This import is independent of the E2E seeder: it does not use the
 *     E2E_SCENARIO_SEED tag, is not touched by e2e:workflow:cleanup, and does
 *     not read/write any E2E artifact. Every row it creates is tagged
 *     `IMPORT_BATCH=<batch_id>` in its notes/remarks/description column so a
 *     batch can be reviewed or reversed by batch id alone (see `validate` /
 *     `revert`).
 *   • Never deletes or overwrites an existing row. A row whose so_number
 *     already exists is skipped and reported, never overwritten.
 *   • Never invents schema: every column written below is a real column in
 *     supabase/migrations (checked against src/types/database.ts). Fields
 *     the current schema has no column for (Sector, Customer PO#, Proj. No,
 *     Pending Value, expected delay/penalty, VAT, delivered counts, JED
 *     variants, free-text delivery) are recorded in a structured notes
 *     string and documented in docs/implementation/sales-plan-2026-import.md
 *     as future schema candidates — never silently dropped, never faked.
 *
 * Run via:
 *   npx tsx tools/import/import-sales-plan-2026.ts --mode parse --file <path.xlsx>
 * ──────────────────────────────────────────────────────────────────────────── */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import 'dotenv/config';
import { readXlsxWorkbook, type SheetGrid } from './lib/xlsx-reader';

// ── Constants ─────────────────────────────────────────────────────────────────

const TAG = 'IMPORT_BATCH';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'import-sales-plan');
const PARSE_REPORT_PATH = path.join(ARTIFACT_DIR, 'parse-report.md');
const PARSE_DATA_PATH = path.join(ARTIFACT_DIR, 'parse-data.json'); // local only — never committed

const PLAN_SHEET = 'Invoicing plan 2026';
const PRODUCTION_SHEET = 'Under production Orders';

// Plan-sheet column layout ("Invoicing plan 2026"), 1-indexed (A=1).
const PLAN_COL = {
  no: 1, doneBy: 2, cohort: 3, po: 4, projNo: 5, soNumber: 6, customer: 7,
  joh: 8, qty: 9, totalValue: 10, pendingValue: 11, location: 12,
  deliveryContract: 13, status: 14, remarks: 15,
  monthStart: 16, // P = January … AA = December (16..27)
  ttl2026: 28, year2027: 29,
} as const;

// Production-orders column layout ("Under production Orders"), 1-indexed.
const PROD_COL = {
  soNumber: 6, doneBy: 2, sector: 10, location: 12, delivered: 19,
  penaltyConditions: 35, penaltyStatus: 36, penaltyAmount: 37, totalWithVat: 38,
  dubaiRemarks: 16, jedRemarks: 17, purchaseRemarks: 18,
} as const;

// Approved 10 real sales users. Keys are normalized (trim + lowercase +
// collapsed whitespace) "Done by" names as they appear in the plan sheet.
const OWNER_MAP: Record<string, { email: string; fullName: string }> = {
  'nader': { email: 'nader@ft.com', fullName: 'Nader' },
  'mahmoud': { email: 'mahmoud@ft.com', fullName: 'Mahmoud' },
  'abdullah': { email: 'abdullah.s@ft.com', fullName: 'Abdullah' },
  'abdulhamid': { email: 'abdulhamid@ft.com', fullName: 'Abdulhamid' },
  'essam': { email: 'essam@ft.com', fullName: 'ESSAM' },
  'obada': { email: 'obada@ft.com', fullName: 'Obada' },
  'ahmed qadomi': { email: 'ahmed.qadomi@ft.com', fullName: 'Ahmed Qadomi' },
  'hatem': { email: 'hatem@ft.com', fullName: 'Hatem' },
  'suliman': { email: 'suliman@ft.com', fullName: 'Suliman' },
  'nadeem': { email: 'nadeem@ft.com', fullName: 'Nadeem' },
};

const STATUS_MAP: Record<string, { project_status: 'completed' | 'active'; note?: string }> = {
  'completed': { project_status: 'completed' },
  'in progress': { project_status: 'active' },
  'pending': { project_status: 'active', note: 'source status was "Pending"' },
  'delayed': { project_status: 'active', note: 'source status was "Delayed"' },
};

// Deletion order for revert: children before parents.
const REVERT_ORDER = ['project_invoicing_schedule', 'project_vehicle_lines', 'projects'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawPlanRow {
  row: number;
  doneBy: string | null;
  po: string | null;
  projNo: string | null;
  soNumberRaw: string | null;
  customer: string | null;
  joh: string | null;
  qty: number | null;
  totalValue: number | null;
  pendingValue: number | null;
  location: string | null;
  deliveryContract: string | null;
  status: string | null;
  remarks: string | null;
  monthly: (number | null)[]; // length 12, Jan..Dec 2026
  year2027: number | null;
}

interface ScheduleLine {
  year: number;
  month: number; // 1-12
  amount: number;
  estimatedMonth?: boolean; // true for the 2027 lump column (month defaulted to Jan)
}

interface VehicleLineDraft {
  lineNumber: number;
  vehicleType: string;
  quantity: number;
  quantityWasZeroInSource: boolean;
  unitSalesValue: number;
  sourceRow: number;
  projNo: string | null;
  po: string | null;
}

interface ProjectGroup {
  soNumber: string;
  rows: RawPlanRow[];
  customerName: string;
  customerNameMismatch: boolean;
  doneByRaw: string;
  owner: { email: string; fullName: string } | null;
  manufacturingLocation: 'saudi' | 'dubai' | 'not_set';
  locationMismatch: boolean;
  projectStatus: 'completed' | 'active';
  statusNote: string | null;
  statusMismatch: boolean;
  totalSalesValue: number;
  lines: VehicleLineDraft[];
  schedule: ScheduleLine[];
  estimatedDeliveryDate: string; // YYYY-MM-DD
  deliveryDateIsEstimated: boolean;
  enrichment: ProductionEnrichment | null;
  notes: string;
  flags: string[];
}

interface ProductionEnrichment {
  sourceRow: number;
  sector: string | null;
  delivered: string | null;
  penaltyConditions: string | null;
  penaltyStatus: string | null;
  penaltyAmount: string | null;
  totalWithVat: string | null;
  locationDetail: string | null;
  remarks: string | null;
}

interface ParseResult {
  generatedAt: string;
  sourceFile: string;
  totalRowsRead: number;
  totalRowAt: number | null;
  projects: ProjectGroup[];
  blankSoRows: RawPlanRow[];
  ambiguousSoGroups: { soNumberRaw: string; rows: RawPlanRow[] }[];
  productionOrdersExcluded: { doneBy: string; soNumber: string; row: number }[];
  productionOrdersMatched: number;
}

interface ManifestRecord { table: string; id: string; so_number: string; label: string }
interface Manifest {
  batch_id: string;
  tag: string;
  created_at: string;
  supabase_host: string;
  source_file: string;
  records: ManifestRecord[];
  skipped: { so_number: string; reason: string }[];
  step_errors: { table: string; so_number: string; error: string }[];
  revert?: { reverted_at: string; deleted: Record<string, number>; errors: string[] };
}

// ── CLI / env ─────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const MODE = (arg('mode') ?? 'parse') as 'parse' | 'import' | 'validate' | 'revert';
const FILE_ARG = arg('file');
const BATCH_ID_ARG = arg('batch-id');

const SUPABASE_URL = process.env.SALES_IMPORT_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function log(msg: string) { console.log(msg); }
function fail(msg: string): never { console.error(`\n✗ ${msg}\n`); process.exit(1); }

function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}
/** Collapses embedded newlines/whitespace — for fields that must render as a single Markdown table cell. */
function collapseWS(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}
function normalizeStatus(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ── Safety guards (import mode) ───────────────────────────────────────────────

function host(): string {
  try { return new URL(SUPABASE_URL).hostname; } catch { return '(invalid-url)'; }
}

function assertImportAllowed() {
  if (process.env.IMPORT_CONFIRM !== 'true') {
    fail('import writes real business data and is blocked. Set IMPORT_CONFIRM=true to confirm.');
  }
  const allow = (process.env.SALES_IMPORT_ALLOWED_HOSTS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allow.includes(host())) {
    fail(
      `Target host "${host()}" is not in SALES_IMPORT_ALLOWED_HOSTS.\n` +
      `  Add it explicitly to confirm you intend to import real business data into\n` +
      `  this Supabase project: SALES_IMPORT_ALLOWED_HOSTS=${host()}`,
    );
  }
}

async function makeClient(): Promise<SupabaseClient> {
  if (!SUPABASE_URL) fail('SALES_IMPORT_SUPABASE_URL / VITE_SUPABASE_URL is not set.');
  if (!SERVICE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY is required (backend tool only).');
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

// ── Workbook reading ──────────────────────────────────────────────────────────

function loadWorkbook(filePath: string): Map<string, SheetGrid> {
  if (!existsSync(filePath)) fail(`File not found: ${filePath}`);
  const buf = readFileSync(filePath);
  return readXlsxWorkbook(buf);
}

function readNumber(v: string | number | null): number | null {
  if (v === null) return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) && String(v).trim() !== '' ? n : null;
}
function readText(v: string | number | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function readPlanRows(sheet: SheetGrid): { rows: RawPlanRow[]; totalRowAt: number | null } {
  const rows: RawPlanRow[] = [];
  let totalRowAt: number | null = null;
  for (let r = 2; r <= sheet.maxRow; r++) {
    const aCell = sheet.get(r, PLAN_COL.no);
    if (aCell === null) continue;
    if (String(aCell).trim().toUpperCase() === 'TOTAL') { totalRowAt = r; break; }
    const monthly: (number | null)[] = [];
    for (let m = 0; m < 12; m++) monthly.push(readNumber(sheet.get(r, PLAN_COL.monthStart + m)));
    rows.push({
      row: r,
      doneBy: readText(sheet.get(r, PLAN_COL.doneBy)) ? collapseWS(readText(sheet.get(r, PLAN_COL.doneBy))!) : null,
      po: readText(sheet.get(r, PLAN_COL.po)),
      projNo: readText(sheet.get(r, PLAN_COL.projNo)),
      soNumberRaw: readText(sheet.get(r, PLAN_COL.soNumber)),
      customer: readText(sheet.get(r, PLAN_COL.customer)),
      joh: readText(sheet.get(r, PLAN_COL.joh)),
      qty: readNumber(sheet.get(r, PLAN_COL.qty)),
      totalValue: readNumber(sheet.get(r, PLAN_COL.totalValue)),
      pendingValue: readNumber(sheet.get(r, PLAN_COL.pendingValue)),
      location: readText(sheet.get(r, PLAN_COL.location)),
      deliveryContract: readText(sheet.get(r, PLAN_COL.deliveryContract)),
      status: readText(sheet.get(r, PLAN_COL.status)),
      remarks: readText(sheet.get(r, PLAN_COL.remarks)),
      monthly,
      year2027: readNumber(sheet.get(r, PLAN_COL.year2027)),
    });
  }
  return { rows, totalRowAt };
}

interface ProdRow {
  row: number;
  doneBy: string | null;
  soNumber: string | null;
  enrichment: ProductionEnrichment;
}

function readProductionRows(sheet: SheetGrid): ProdRow[] {
  const rows: ProdRow[] = [];
  for (let r = 2; r <= sheet.maxRow; r++) {
    const aCell = sheet.get(r, 1);
    if (aCell === null) continue;
    if (String(aCell).trim().toUpperCase() === 'TOTAL') break;
    const soNumber = readText(sheet.get(r, PROD_COL.soNumber));
    const prodDoneBy = readText(sheet.get(r, PROD_COL.doneBy));
    rows.push({
      row: r,
      doneBy: prodDoneBy ? collapseWS(prodDoneBy) : null,
      soNumber,
      enrichment: {
        sourceRow: r,
        sector: readText(sheet.get(r, PROD_COL.sector)),
        delivered: readText(sheet.get(r, PROD_COL.delivered)),
        penaltyConditions: readText(sheet.get(r, PROD_COL.penaltyConditions)),
        penaltyStatus: readText(sheet.get(r, PROD_COL.penaltyStatus)),
        penaltyAmount: readText(sheet.get(r, PROD_COL.penaltyAmount)),
        totalWithVat: readText(sheet.get(r, PROD_COL.totalWithVat)),
        locationDetail: readText(sheet.get(r, PROD_COL.location)),
        remarks: [
          readText(sheet.get(r, PROD_COL.dubaiRemarks)),
          readText(sheet.get(r, PROD_COL.jedRemarks)),
          readText(sheet.get(r, PROD_COL.purchaseRemarks)),
        ].filter(Boolean).join(' / ') || null,
      },
    });
  }
  return rows;
}

// ── Grouping / normalization ──────────────────────────────────────────────────

function round2(n: number): number { return Math.round(n * 100) / 100; }

function buildParseResult(sourceFile: string, sheets: Map<string, SheetGrid>): ParseResult {
  const planSheet = sheets.get(PLAN_SHEET);
  if (!planSheet) fail(`Sheet "${PLAN_SHEET}" not found in workbook. Sheets present: ${[...sheets.keys()].join(', ')}`);
  const prodSheet = sheets.get(PRODUCTION_SHEET);

  const { rows, totalRowAt } = readPlanRows(planSheet);

  const blankSoRows: RawPlanRow[] = [];
  const ambiguousMap = new Map<string, RawPlanRow[]>();
  const groupMap = new Map<string, RawPlanRow[]>();

  for (const row of rows) {
    const so = row.soNumberRaw;
    if (!so) { blankSoRows.push(row); continue; }
    if (so.includes('|')) {
      ambiguousMap.set(so, [...(ambiguousMap.get(so) ?? []), row]);
      continue;
    }
    groupMap.set(so, [...(groupMap.get(so) ?? []), row]);
  }

  // Production-orders enrichment map: so_number → enrichment, ONLY for rows
  // whose Done-by is one of the 10 approved owners. Everything else is
  // reported as "needs assignment decision", never silently merged.
  const productionOrdersExcluded: { doneBy: string; soNumber: string; row: number }[] = [];
  const enrichmentBySo = new Map<string, ProductionEnrichment>();
  let productionOrdersMatched = 0;
  if (prodSheet) {
    for (const prow of readProductionRows(prodSheet)) {
      if (!prow.soNumber) continue;
      const ownerKey = prow.doneBy ? normalizeName(prow.doneBy) : '';
      if (ownerKey && OWNER_MAP[ownerKey]) {
        enrichmentBySo.set(prow.soNumber, prow.enrichment);
        productionOrdersMatched++;
      } else {
        productionOrdersExcluded.push({ doneBy: prow.doneBy ?? '(blank)', soNumber: prow.soNumber, row: prow.row });
      }
    }
  }

  const projects: ProjectGroup[] = [];
  for (const [soNumber, groupRows] of groupMap) {
    const flags: string[] = [];

    const customers = [...new Set(groupRows.map(r => r.customer).filter(Boolean) as string[])];
    const customerName = customers[0] ?? '(unknown customer)';
    const customerNameMismatch = customers.length > 1;
    if (customerNameMismatch) flags.push(`customer name differs across lines: ${customers.join(' | ')}`);

    const doneByValues = [...new Set(groupRows.map(r => r.doneBy).filter(Boolean) as string[])];
    const doneByRaw = doneByValues[0] ?? '(blank)';
    if (doneByValues.length > 1) flags.push(`Done by differs across lines: ${doneByValues.join(' | ')}`);
    const owner = OWNER_MAP[normalizeName(doneByRaw)] ?? null;
    if (!owner) flags.push(`Done by "${doneByRaw}" does not match any of the 10 approved sales users — needs assignment decision`);

    const locations = [...new Set(groupRows.map(r => r.location).filter(Boolean) as string[])];
    const locationMismatch = locations.length > 1;
    if (locationMismatch) flags.push(`location differs across lines: ${locations.join(' | ')}`);
    const locRaw = (locations[0] ?? '').toLowerCase();
    const manufacturingLocation: ProjectGroup['manufacturingLocation'] =
      locRaw === 'dubai' ? 'dubai' : locRaw === 'ksa' ? 'saudi' : 'not_set';
    if (manufacturingLocation === 'not_set') flags.push(`location "${locations[0] ?? '(blank)'}" not recognized (expected Dubai/KSA) — defaulted to not_set`);

    const statuses = [...new Set(groupRows.map(r => r.status).filter(Boolean) as string[])];
    const statusMismatch = statuses.length > 1;
    if (statusMismatch) flags.push(`status differs across lines: ${statuses.join(' | ')}`);
    const statusKey = statuses[0] ? normalizeStatus(statuses[0]) : '';
    const statusEntry = STATUS_MAP[statusKey];
    const projectStatus = statusEntry?.project_status ?? 'active';
    const statusNote = statusEntry?.note ?? (statusEntry ? null : `source status "${statuses[0] ?? '(blank)'}" not in mapping table — defaulted to active, verify`);
    if (!statusEntry) flags.push(`status "${statuses[0] ?? '(blank)'}" not recognized — defaulted to project_status=active`);

    const lines: VehicleLineDraft[] = groupRows.map((r, i) => {
      const rawQty = r.qty ?? 0;
      const quantityWasZeroInSource = rawQty <= 0;
      const quantity = quantityWasZeroInSource ? 1 : Math.round(rawQty);
      const totalValue = r.totalValue ?? 0;
      const unitSalesValue = round2(totalValue / quantity);
      if (quantityWasZeroInSource) flags.push(`row ${r.row} (${r.joh ?? 'JOH'}): quantity was 0/blank in source — defaulted to 1 to satisfy quantity>0, verify`);
      if (r.totalValue === null) flags.push(`row ${r.row} (${r.joh ?? 'JOH'}): total value missing in source — defaulted to 0, verify`);
      return {
        lineNumber: i + 1,
        vehicleType: r.joh ?? `Line ${i + 1}`,
        quantity,
        quantityWasZeroInSource,
        unitSalesValue,
        sourceRow: r.row,
        projNo: r.projNo,
        po: r.po,
      };
    });

    const totalSalesValue = round2(groupRows.reduce((sum, r) => sum + (r.totalValue ?? 0), 0));

    const schedule: ScheduleLine[] = [];
    for (const r of groupRows) {
      for (let m = 0; m < 12; m++) {
        const amt = r.monthly[m];
        if (amt !== null && amt !== 0) schedule.push({ year: 2026, month: m + 1, amount: round2(amt) });
      }
      if (r.year2027 !== null && r.year2027 !== 0) {
        schedule.push({ year: 2027, month: 1, amount: round2(r.year2027), estimatedMonth: true });
        flags.push(`row ${r.row}: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify`);
      }
    }

    const deliveryDateIsEstimated = true; // customer_delivery_date always has no direct source column
    let estimatedDeliveryDate = '2026-12-31';
    if (schedule.length > 0) {
      const latest = schedule.reduce((a, b) => (a.year * 12 + a.month >= b.year * 12 + b.month ? a : b));
      estimatedDeliveryDate = `${latest.year}-${String(latest.month).padStart(2, '0')}-01`;
    } else {
      flags.push('no monthly invoicing amount found in source — delivery date estimate falls back to the default 2026-12-31, verify');
    }

    const enrichment = enrichmentBySo.get(soNumber) ?? null;

    const poHints = [...new Set(groupRows.map(r => r.po).filter(Boolean) as string[])];
    const projNos = [...new Set(groupRows.map(r => r.projNo).filter(Boolean) as string[])];
    const pendingValueSum = round2(groupRows.reduce((s, r) => s + (r.pendingValue ?? 0), 0));
    const deliveryTexts = [...new Set(groupRows.map(r => r.deliveryContract).filter(Boolean) as string[])];
    const remarksTexts = [...new Set(groupRows.map(r => r.remarks).filter(Boolean) as string[])];

    const noteParts = [
      `Source: Invoicing plan 2026 row(s) ${groupRows.map(r => r.row).join(',')}`,
      poHints.length ? `PO#: ${poHints.join(' / ')}` : null,
      projNos.length ? `Proj No: ${projNos.join(' / ')}` : null,
      `Pending Value: ${pendingValueSum}`,
      deliveryTexts.length ? `Delivery (contract): ${deliveryTexts.join(' | ').slice(0, 300)}` : null,
      remarksTexts.length ? `Remarks: ${remarksTexts.join(' | ').slice(0, 300)}` : null,
      statusNote,
      enrichment?.sector ? `Sector: ${enrichment.sector}` : null,
      enrichment?.delivered ? `Delivered: ${enrichment.delivered}` : null,
      enrichment?.penaltyConditions || enrichment?.penaltyStatus || enrichment?.penaltyAmount
        ? `Penalty: ${[enrichment.penaltyStatus, enrichment.penaltyAmount, enrichment.penaltyConditions].filter(Boolean).join(' / ')}`
        : null,
      enrichment?.totalWithVat ? `Total incl. VAT (source): ${enrichment.totalWithVat}` : null,
      enrichment?.locationDetail ? `Location detail: ${enrichment.locationDetail}` : null,
      enrichment?.remarks ? `Production remarks: ${enrichment.remarks}` : null,
    ].filter(Boolean);

    projects.push({
      soNumber, rows: groupRows, customerName, customerNameMismatch, doneByRaw, owner,
      manufacturingLocation, locationMismatch, projectStatus, statusNote, statusMismatch,
      totalSalesValue, lines, schedule, estimatedDeliveryDate, deliveryDateIsEstimated,
      enrichment, notes: noteParts.join(' | '), flags,
    });
  }

  const ambiguousSoGroups = [...ambiguousMap.entries()].map(([soNumberRaw, rowsForGroup]) => ({ soNumberRaw, rows: rowsForGroup }));

  return {
    generatedAt: new Date().toISOString(),
    sourceFile,
    totalRowsRead: rows.length,
    totalRowAt,
    projects: [...projects].sort((a, b) => a.soNumber.localeCompare(b.soNumber)),
    blankSoRows,
    ambiguousSoGroups,
    productionOrdersExcluded,
    productionOrdersMatched,
  };
}

// ── Report writing ────────────────────────────────────────────────────────────

function writeParseReport(result: ParseResult) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(PARSE_DATA_PATH, JSON.stringify(result, null, 2));

  const lines: string[] = [];
  lines.push('# Sales Plan 2026 — Parse Report', '');
  lines.push(`- **Source file:** \`${result.sourceFile}\``);
  lines.push(`- **Sheet:** \`${PLAN_SHEET}\` (cross-referenced with \`${PRODUCTION_SHEET}\`)`);
  lines.push(`- **Generated:** ${result.generatedAt}`);
  lines.push(`- **Data rows read:** ${result.totalRowsRead}${result.totalRowAt ? ` (TOTAL row detected at sheet row ${result.totalRowAt}, excluded)` : ' (no TOTAL row found — verify nothing was truncated)'}`);
  lines.push(`- **Distinct SO-number groups (→ one \`projects\` row each):** ${result.projects.length}`);
  lines.push(`- **Rows with no SO number (excluded, need a decision):** ${result.blankSoRows.length}`);
  lines.push(`- **SO-number cells containing multiple values (excluded, need a decision):** ${result.ambiguousSoGroups.length}`);
  lines.push(`- **"${PRODUCTION_SHEET}" rows matched to an approved owner (used for enrichment):** ${result.productionOrdersMatched}`);
  lines.push(`- **"${PRODUCTION_SHEET}" rows excluded (owner not one of the 10 approved users):** ${result.productionOrdersExcluded.length}`);
  lines.push('');

  lines.push('## Grouping logic (read this first)', '');
  lines.push('`SO number` (column F) is the true one-project key — `projects.so_number` is unique in the schema.');
  lines.push('`Proj. No` (column E) is a **per-line** internal reference (several distinct Proj. No values often');
  lines.push('share one SO number, e.g. one Sales Order with 5 vehicle types) — it is NOT used as `project_code`.');
  lines.push('`project_code` is set to the SO number itself (already unique, human-recognizable). Flag if you');
  lines.push('would prefer a different source.', '');
  lines.push('`customer_delivery_date` (required, not-null in the schema) has no direct source column in either');
  lines.push('sheet. Every project below estimates it as the **last month with a scheduled invoicing amount**');
  lines.push('(or 2026-12-31 if none) — shown per project as "(estimated)". Treat every delivery date as');
  lines.push('provisional; a per-project flag only appears below when a project has NO monthly amount at all.', '');

  lines.push('## Owner match summary', '');
  lines.push('| Approved user | Found in plan sheet | SO groups | Total value |');
  lines.push('|---|---|---|---|');
  for (const [key, u] of Object.entries(OWNER_MAP)) {
    const projectsForOwner = result.projects.filter(p => p.owner?.email === u.email);
    const found = result.projects.some(p => normalizeName(p.doneByRaw) === key) || projectsForOwner.length > 0;
    const total = projectsForOwner.reduce((s, p) => s + p.totalSalesValue, 0);
    lines.push(`| ${u.fullName} (${u.email}) | ${found ? 'yes' : 'NOT FOUND'} | ${projectsForOwner.length} | ${total.toLocaleString()} |`);
  }
  lines.push('');

  const decisions: string[] = [];
  if (result.blankSoRows.length) {
    decisions.push('### Rows with no SO number', '');
    decisions.push('| Row | Done by | Customer | JOH | Total Value |', '|---|---|---|---|---|');
    for (const r of result.blankSoRows) decisions.push(`| ${r.row} | ${r.doneBy ?? ''} | ${r.customer ?? ''} | ${r.joh ?? ''} | ${r.totalValue ?? ''} |`);
    decisions.push('');
  }
  if (result.ambiguousSoGroups.length) {
    decisions.push('### SO-number cells containing multiple values', '');
    for (const g of result.ambiguousSoGroups) {
      decisions.push(`- \`"${g.soNumberRaw}"\` — rows ${g.rows.map(r => r.row).join(', ')} (${g.rows.map(r => r.joh ?? '').join(' / ')})`);
    }
    decisions.push('');
  }
  const unmapped = result.projects.filter(p => !p.owner);
  if (unmapped.length) {
    decisions.push('### SO groups whose "Done by" does not match one of the 10 approved users', '');
    for (const p of unmapped) decisions.push(`- SO \`${p.soNumber}\` — Done by "${p.doneByRaw}" — ${p.customerName} — ${p.lines.length} line(s)`);
    decisions.push('');
  }
  const flagged = result.projects.filter(p => p.flags.length > 0);
  if (flagged.length) {
    decisions.push('### Per-project flags requiring review', '');
    for (const p of flagged) {
      decisions.push(`- **SO ${p.soNumber}** (${p.customerName}):`);
      for (const f of p.flags) decisions.push(`  - ${f}`);
    }
    decisions.push('');
  }
  if (result.productionOrdersExcluded.length) {
    const byOwner = new Map<string, { so: string; row: number }[]>();
    for (const e of result.productionOrdersExcluded) byOwner.set(e.doneBy, [...(byOwner.get(e.doneBy) ?? []), { so: e.soNumber, row: e.row }]);
    decisions.push(`### "${PRODUCTION_SHEET}" rows excluded — owner not one of the 10 approved users`, '');
    decisions.push('| Owner (not approved) | Count | SO numbers |', '|---|---|---|');
    for (const [owner, entries] of byOwner) decisions.push(`| ${owner} | ${entries.length} | ${entries.map(e => e.so).join(', ')} |`);
    decisions.push('');
  }

  lines.push('## Decisions needed before import', '');
  lines.push(decisions.length ? decisions.join('\n') : '_None — every row mapped cleanly._', '');

  lines.push('## Per-owner breakdown', '');
  for (const u of Object.values(OWNER_MAP)) {
    const ownerProjects = result.projects.filter(p => p.owner?.email === u.email);
    if (ownerProjects.length === 0) continue;
    lines.push(`### ${u.fullName} (\`${u.email}\`)`, '');
    for (const p of ownerProjects) {
      lines.push(`#### SO ${p.soNumber} — ${p.customerName}`, '');
      lines.push(`- Location: \`${p.manufacturingLocation}\` · Status: \`${p.projectStatus}\` · Total value: ${p.totalSalesValue.toLocaleString()} · Delivery date estimate: ${p.estimatedDeliveryDate}${p.deliveryDateIsEstimated ? ' (estimated)' : ''}`);
      lines.push('', '| Line | Vehicle type (JOH) | Qty | Unit value | Line total |', '|---|---|---|---|---|');
      for (const l of p.lines) lines.push(`| ${l.lineNumber} | ${l.vehicleType} | ${l.quantity}${l.quantityWasZeroInSource ? ' (was 0)' : ''} | ${l.unitSalesValue.toLocaleString()} | ${(l.quantity * l.unitSalesValue).toLocaleString()} |`);
      if (p.schedule.length) {
        lines.push('', '| Invoicing month | Amount |', '|---|---|');
        for (const s of p.schedule) lines.push(`| ${s.year}-${String(s.month).padStart(2, '0')}${s.estimatedMonth ? ' (month estimated)' : ''} | ${s.amount.toLocaleString()} |`);
      }
      lines.push('', `- Unmapped fields → notes: ${p.notes}`, '');
    }
  }

  lines.push('## Not imported (informational only)', '');
  lines.push('- Rows with no SO number (see Decisions needed above) — cannot create a `projects` row without one.');
  lines.push('- SO-number cells containing multiple values — needs a human decision on which SO (or whether to split).');
  lines.push(`- "${PRODUCTION_SHEET}" rows owned by someone outside the 10 approved users — not enriched, not imported.`);
  lines.push('- Sector, Customer PO#, Proj. No, Pending Value, delay/penalty %, VAT, delivered counts, JED remarks,');
  lines.push('  free-text delivery — no column exists for these on `projects`/`project_vehicle_lines` today. They are');
  lines.push('  preserved verbatim in the `notes` field above and documented as future schema candidates in');
  lines.push('  `docs/implementation/sales-plan-2026-import.md`.', '');

  writeFileSync(PARSE_REPORT_PATH, lines.join('\n'));
  log(`Report written: ${PARSE_REPORT_PATH}`);
  log(`Data (local only, not committed): ${PARSE_DATA_PATH}`);
}

// ── Manifest helpers (import / validate / revert) ─────────────────────────────

const manifestPath = (batchId: string) => path.join(ARTIFACT_DIR, `${batchId}.json`);
const batchReportPath = (batchId: string) => path.join(ARTIFACT_DIR, `${batchId}.md`);

function loadManifest(batchId: string): Manifest {
  const p = manifestPath(batchId);
  if (!existsSync(p)) fail(`No manifest found for batch "${batchId}" at ${p}`);
  return JSON.parse(readFileSync(p, 'utf8')) as Manifest;
}
function saveManifest(m: Manifest) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(manifestPath(m.batch_id), JSON.stringify(m, null, 2));
}
function writeBatchReport(m: Manifest, extra: string[] = []) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const byTable: Record<string, number> = {};
  for (const r of m.records) byTable[r.table] = (byTable[r.table] ?? 0) + 1;
  const lines = [
    `# Sales Plan 2026 Import — Batch \`${m.batch_id}\``, '',
    `- **Tag:** \`${m.tag}=${m.batch_id}\``,
    `- **Created:** ${m.created_at}`,
    `- **Supabase host:** \`${m.supabase_host}\``,
    `- **Source file:** \`${m.source_file}\``,
    `- **Records created:** ${m.records.length}`,
    `- **Skipped:** ${m.skipped.length}`,
    `- **Step errors:** ${m.step_errors.length}`,
    '',
    '## Records by table', ...Object.entries(byTable).map(([k, v]) => `- ${k}: ${v}`), '',
    '## Created records', ...m.records.map(r => `- ${r.table} — ${r.so_number} — ${r.label} — \`${r.id}\``), '',
    ...(m.skipped.length ? ['## Skipped (already existed, or conflict)', ...m.skipped.map(s => `- SO ${s.so_number}: ${s.reason}`), ''] : []),
    ...(m.step_errors.length ? ['## Step errors', ...m.step_errors.map(e => `- [${e.so_number}] ${e.table}: ${e.error}`), ''] : []),
    ...(m.revert ? ['## Revert', `- Reverted at: ${m.revert.reverted_at}`, ...Object.entries(m.revert.deleted).map(([k, v]) => `- ${k}: ${v} deleted`), ...(m.revert.errors.length ? ['- Errors:', ...m.revert.errors.map(e => `  - ${e}`)] : []), ''] : []),
    ...extra,
  ];
  writeFileSync(batchReportPath(m.batch_id), lines.join('\n'));
  log(`Batch report written: ${batchReportPath(m.batch_id)}`);
}

// ── Modes ─────────────────────────────────────────────────────────────────────

function modeParse() {
  if (!FILE_ARG) fail('parse requires --file <path-to-xlsx>');
  const sheets = loadWorkbook(FILE_ARG);
  const result = buildParseResult(FILE_ARG, sheets);
  log(`\nParsed ${result.totalRowsRead} plan rows → ${result.projects.length} SO groups (projects).`);
  log(`Blank-SO rows: ${result.blankSoRows.length} · Ambiguous-SO groups: ${result.ambiguousSoGroups.length} · Unmapped owners: ${result.projects.filter(p => !p.owner).length}`);
  writeParseReport(result);
  log(`\nNo database connection was opened. Review the report, then run --mode import once approved.\n`);
}

async function modeImport() {
  if (!FILE_ARG) fail('import requires --file <path-to-xlsx>');
  assertImportAllowed();
  const sheets = loadWorkbook(FILE_ARG);
  const result = buildParseResult(FILE_ARG, sheets);
  const client = await makeClient();

  const batchId = `sales-plan-2026-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${randomBytes(2).toString('hex')}`;
  const manifest: Manifest = {
    batch_id: batchId, tag: TAG, created_at: new Date().toISOString(),
    supabase_host: host(), source_file: FILE_ARG, records: [], skipped: [], step_errors: [],
  };

  const importable = result.projects.filter(p => p.owner && p.flags.every(f => !f.includes('needs assignment decision')));
  const skippedForDecision = result.projects.filter(p => !importable.includes(p));
  for (const p of skippedForDecision) manifest.skipped.push({ so_number: p.soNumber, reason: 'flagged in parse report — needs a decision before import (see Decisions needed)' });

  log(`\nImporting batch ${batchId} — ${importable.length} of ${result.projects.length} SO groups are import-ready…`);

  for (const p of importable) {
    const tag = `${TAG}=${batchId}`;
    const notesWithTag = `${p.notes} | ${tag}`;

    // Never overwrite: skip if this so_number already exists.
    const { data: existing, error: existErr } = await client.from('projects').select('id').eq('so_number', p.soNumber).maybeSingle();
    if (existErr) { manifest.step_errors.push({ table: 'projects', so_number: p.soNumber, error: existErr.message }); continue; }
    if (existing) { manifest.skipped.push({ so_number: p.soNumber, reason: `projects.so_number already exists (id=${(existing as { id: string }).id})` }); continue; }

    // Resolve the owner's profile id — the real account must already exist
    // (run sales-users-bootstrap.ts --mode apply first).
    const { data: ownerProfile, error: ownerErr } = await client.from('profiles').select('id').eq('email', p.owner!.email).maybeSingle();
    if (ownerErr || !ownerProfile) {
      manifest.skipped.push({ so_number: p.soNumber, reason: `sales owner ${p.owner!.email} not provisioned yet — run sales-users-bootstrap.ts first` });
      continue;
    }
    const ownerId = (ownerProfile as { id: string }).id;

    const { data: projectData, error: projectErr } = await client.from('projects').insert({
      project_code: p.soNumber,
      so_number: p.soNumber,
      customer_name: p.customerName,
      sales_owner_id: ownerId,
      customer_delivery_date: p.estimatedDeliveryDate,
      project_status: p.projectStatus,
      manufacturing_location: p.manufacturingLocation,
      total_sales_value: p.totalSalesValue,
      notes: notesWithTag,
      created_by: ownerId,
    }).select('id').single();
    if (projectErr || !projectData) { manifest.step_errors.push({ table: 'projects', so_number: p.soNumber, error: projectErr?.message ?? 'no id returned' }); continue; }
    const projectId = (projectData as { id: string }).id;
    manifest.records.push({ table: 'projects', id: projectId, so_number: p.soNumber, label: p.customerName });

    for (const l of p.lines) {
      const { data: lineData, error: lineErr } = await client.from('project_vehicle_lines').insert({
        project_id: projectId,
        line_number: l.lineNumber,
        vehicle_type: l.vehicleType,
        description: l.vehicleType,
        quantity: l.quantity,
        unit_sales_value: l.unitSalesValue,
        notes: `Source row ${l.sourceRow}${l.projNo ? ` — Proj No ${l.projNo}` : ''}${l.po ? ` — PO# ${l.po}` : ''} | ${tag}`,
      }).select('id').single();
      if (lineErr || !lineData) { manifest.step_errors.push({ table: 'project_vehicle_lines', so_number: p.soNumber, error: lineErr?.message ?? 'no id returned' }); continue; }
      manifest.records.push({ table: 'project_vehicle_lines', id: (lineData as { id: string }).id, so_number: p.soNumber, label: l.vehicleType });
    }

    // Sequence 1 is taken by the DB trigger's auto-created default schedule
    // line (migration 100) — explicit monthly lines start at 2.
    let seq = 2;
    const today = new Date();
    const currentYearMonth = today.getFullYear() * 12 + (today.getMonth() + 1);
    for (const s of p.schedule) {
      const isPast = s.year * 12 + s.month <= currentYearMonth;
      const status = p.projectStatus === 'completed' && isPast ? 'invoiced' : 'scheduled';
      const { data: schedData, error: schedErr } = await client.from('project_invoicing_schedule').insert({
        project_id: projectId,
        sales_user_id: ownerId,
        sequence_no: seq++,
        schedule_label: `Imported ${s.year}-${String(s.month).padStart(2, '0')}${s.estimatedMonth ? ' (month estimated)' : ''}`,
        schedule_description: `Sales Plan 2026 import | ${tag}`,
        invoice_amount: s.amount,
        current_invoice_date: `${s.year}-${String(s.month).padStart(2, '0')}-01`,
        status,
        source: 'migration_backfill',
      }).select('id').single();
      if (schedErr || !schedData) { manifest.step_errors.push({ table: 'project_invoicing_schedule', so_number: p.soNumber, error: schedErr?.message ?? 'no id returned' }); continue; }
      manifest.records.push({ table: 'project_invoicing_schedule', id: (schedData as { id: string }).id, so_number: p.soNumber, label: `${s.year}-${String(s.month).padStart(2, '0')}` });
    }

    log(`  ✓ SO ${p.soNumber} (${p.customerName}) → project ${projectId}, ${p.lines.length} line(s), ${p.schedule.length} schedule row(s)`);
  }

  saveManifest(manifest);
  writeBatchReport(manifest);
  log(`\nDone. Created ${manifest.records.length} rows, skipped ${manifest.skipped.length}, ${manifest.step_errors.length} step errors.`);
  log(`Manifest: ${manifestPath(batchId)}`);
  log(`Validate: IMPORT_CONFIRM=true npx tsx tools/import/import-sales-plan-2026.ts --mode validate --batch-id ${batchId}`);
  log(`Revert:   IMPORT_CONFIRM=true npx tsx tools/import/import-sales-plan-2026.ts --mode revert --batch-id ${batchId}\n`);
}

async function modeValidate() {
  if (!BATCH_ID_ARG) fail('validate requires --batch-id <id>');
  const manifest = loadManifest(BATCH_ID_ARG);
  const client = await makeClient();
  log(`\nValidating batch ${manifest.batch_id} (${manifest.records.length} manifest records)…\n`);
  const byTable = new Map<string, string[]>();
  for (const r of manifest.records) byTable.set(r.table, [...(byTable.get(r.table) ?? []), r.id]);
  let missing = 0;
  const extra: string[] = ['## Validation (SELECT-only)', ''];
  for (const [table, ids] of byTable) {
    const { count, error } = await client.from(table).select('id', { count: 'exact', head: true }).in('id', ids);
    const found = count ?? 0;
    const ok = !error && found === ids.length;
    if (!ok) missing += ids.length - found;
    const line = `${ok ? '✓' : '✗'} ${table}: ${found}/${ids.length} present${error ? ` (${error.message})` : ''}`;
    log(`  ${line}`); extra.push(`- ${line}`);
  }
  extra.push('', `Result: ${missing === 0 ? 'ALL PRESENT' : `${missing} MISSING`}`);
  writeBatchReport(manifest, extra);
  log(`\n${missing === 0 ? '✓ All manifest records present.' : `✗ ${missing} records missing.`}\n`);
  if (missing > 0) process.exit(1);
}

async function modeRevert() {
  if (!BATCH_ID_ARG) fail('revert requires --batch-id <id> (tagged-batch deletion only — no blanket deletes)');
  assertImportAllowed();
  const manifest = loadManifest(BATCH_ID_ARG);
  const client = await makeClient();
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  log(`\nReverting batch ${manifest.batch_id} — deleting ONLY the ${manifest.records.length} manifest records…`);

  const byTable = new Map<string, string[]>();
  for (const r of manifest.records) byTable.set(r.table, [...(byTable.get(r.table) ?? []), r.id]);
  const projectIds = manifest.records.filter(r => r.table === 'projects').map(r => r.id);

  for (const table of REVERT_ORDER) {
    // The DB trigger (migration 100) auto-creates one default schedule row per
    // project on insert — it belongs to this batch's projects but is not in
    // manifest.records. Remove it (and its history) by project_id, still
    // scoped strictly to this batch's own project ids.
    if (table === 'project_invoicing_schedule' && projectIds.length) {
      const { error: histErr } = await client.from('project_invoicing_schedule_history').delete().in('project_id', projectIds);
      if (histErr) errors.push(`project_invoicing_schedule_history: ${histErr.message}`);
      const { count, error } = await client.from(table).delete({ count: 'exact' }).in('project_id', projectIds);
      if (error) { errors.push(`${table}: ${error.message}`); log(`  ✗ ${table}: ${error.message}`); }
      else { deleted[table] = (deleted[table] ?? 0) + (count ?? 0); log(`  ✓ ${table}: ${count ?? 0} deleted (incl. trigger-created default line)`); }
      continue;
    }
    const ids = byTable.get(table);
    if (!ids?.length) continue;
    const { count, error } = await client.from(table).delete({ count: 'exact' }).in('id', ids);
    if (error) { errors.push(`${table}: ${error.message}`); log(`  ✗ ${table}: ${error.message}`); }
    else { deleted[table] = (deleted[table] ?? 0) + (count ?? 0); log(`  ✓ ${table}: ${count ?? 0} deleted`); }
  }

  manifest.revert = { reverted_at: new Date().toISOString(), deleted, errors };
  saveManifest(manifest);
  writeBatchReport(manifest);
  const total = Object.values(deleted).reduce((a, b) => a + b, 0);
  log(`\nRevert complete: ${total} rows deleted, ${errors.length} errors.\n`);
  if (errors.length) process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  switch (MODE) {
    case 'parse': modeParse(); break;
    case 'import': await modeImport(); break;
    case 'validate': await modeValidate(); break;
    case 'revert': await modeRevert(); break;
    default: fail(`Unknown --mode "${MODE}". Valid: parse | import | validate | revert`);
  }
})();
