/* ─────────────────────────────────────────────────────────────────────────────
 * Shared pieces for the 2026 Sales Plan import tools.
 *
 * Safety model mirrors tools/e2e/e2e-full-workflow.ts:
 *   • Default mode is DRY-RUN — prints the plan, writes nothing.
 *   • Any write requires IMPORT_CONFIRM=true.
 *   • The target Supabase host is treated as PRODUCTION unless listed in
 *     E2E_NON_PRODUCTION_HOSTS; writing to production additionally requires
 *     IMPORT_ALLOW_PRODUCTION=true (explicit, since this import is real
 *     business data that IS ultimately destined for production).
 *   • Secrets come from env only and are never printed.
 * ──────────────────────────────────────────────────────────────────────────── */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

export const IMPORT_TAG = 'PLAN2026_IMPORT';

/** Fixed workbook "Done by" → account mapping (the 10 real salesmen). */
export const SALESMEN: { name: string; email: string; fullName: string }[] = [
  { name: 'Nader',        email: 'nader@ft.com',        fullName: 'Nader' },
  { name: 'Mahmoud',      email: 'mahmoud@ft.com',      fullName: 'Mahmoud' },
  { name: 'Abdullah',     email: 'abdullah.s@ft.com',   fullName: 'Abdullah' },
  { name: 'Abdulhamid',   email: 'abdulhamid@ft.com',   fullName: 'Abdulhamid' },
  { name: 'ESSAM',        email: 'essam@ft.com',        fullName: 'Essam' },
  { name: 'Obada',        email: 'obada@ft.com',        fullName: 'Obada' },
  { name: 'Ahmed Qadomi', email: 'ahmed.qadomi@ft.com', fullName: 'Ahmed Qadomi' },
  { name: 'Hatem',        email: 'hatem@ft.com',        fullName: 'Hatem' },
  { name: 'Suliman',      email: 'suliman@ft.com',      fullName: 'Suliman' },
  { name: 'Nadeem',       email: 'nadeem@ft.com',       fullName: 'Nadeem' },
];

/** Trim/case-insensitive salesman lookup ("ESSAM " → essam@ft.com). */
export function salesmanByName(raw: string | null | undefined) {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key) return undefined;
  return SALESMEN.find((s) => s.name.toLowerCase() === key);
}

export const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function log(msg: string) { console.log(msg); }
export function fail(msg: string): never { console.error(`\n✗ ${msg}\n`); process.exit(1); }

export function supabaseHost(): string {
  try { return new URL(SUPABASE_URL).hostname; } catch { return '(invalid-url)'; }
}

export function isProductionTarget(): boolean {
  const allow = (process.env.E2E_NON_PRODUCTION_HOSTS ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  // Default-deny: any host not explicitly allow-listed is treated as production.
  return !allow.includes(supabaseHost());
}

export function assertWriteAllowed(action: string) {
  if (process.env.IMPORT_CONFIRM !== 'true') {
    fail(
      `${action} writes to the database and is blocked.\n` +
      `  Set IMPORT_CONFIRM=true to confirm. Default mode is dry-run.`,
    );
  }
  if (isProductionTarget() && process.env.IMPORT_ALLOW_PRODUCTION !== 'true') {
    fail(
      `Target host "${supabaseHost()}" is not in E2E_NON_PRODUCTION_HOSTS and is treated as PRODUCTION.\n` +
      `  Either add the host to E2E_NON_PRODUCTION_HOSTS (staging/test database), or set\n` +
      `  IMPORT_ALLOW_PRODUCTION=true to explicitly accept importing the 2026 plan into production.`,
    );
  }
}

export function makeServiceClient(): SupabaseClient {
  if (!SUPABASE_URL) fail('E2E_SUPABASE_URL / VITE_SUPABASE_URL is not set.');
  if (!SERVICE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY is required (backend tool only — never ship this key).');
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

export function cliArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ── Dataset shape (tools/import/data/sales-plan-2026.json) ────────────────────

export interface DatasetLine {
  sheetRow: number;
  vehicleType: string;
  /** Quantity as imported (always ≥ 1 — DB CHECK). */
  quantity: number;
  /** Quantity as written in the sheet (may be 0; reconciliation uses this). */
  sheetQuantity: number;
  /** NET line value exactly as in the sheet. */
  netValue: number;
  /** round(netValue / quantity, 2) — what the DB stores; line_total is derived. */
  unitValue: number;
  /** qty × unitValue − netValue (rounding drift, reported). */
  roundingDrift: number;
  vatApplicable: boolean;
  vatSource: 'proj_no_match' | 'so_group_match' | 'unmatched_default_false';
  pendingValue: number | null;
}

export interface DatasetSchedule {
  month: number;            // 1–12 (2026)
  monthName: string;
  amount: number;
  invoiceDate: string;      // yyyy-mm-dd (last day of month, 2026)
}

export interface DatasetProject {
  /** so_number written to the DB. Synthetic ones are flagged. */
  soNumber: string;
  soIsSynthetic: boolean;
  salesmanName: string;
  salesmanEmail: string;
  customerName: string;
  projectStatus: 'draft' | 'submitted_for_approval' | 'approved' | 'active' | 'completed';
  sheetStatus: string;
  manufacturingLocation: 'saudi' | 'dubai' | 'not_set';
  medicalItems: 'yes' | 'no';
  sector: 'private' | 'gov' | 'semi_gov' | null;
  delayPenaltyPercent: number | null;
  delayPenaltyText: string | null;
  customerDeliveryDate: string;             // yyyy-mm-dd
  deliveryDateSource: 'contract_text' | 'last_plan_month' | 'default_2026_12_31';
  /** NET Σ of line netValue (reconciliation) */
  totalNet: number;
  /** VAT-inclusive value written to projects.total_sales_value */
  totalSalesValue: number;
  notes: string;
  lines: DatasetLine[];
  schedules: DatasetSchedule[];
  sheetRows: number[];
}

export interface Dataset {
  meta: {
    generatedFrom: string;
    xlsxSha256: string;
    generatedAt: string;
    sheetTotals: { qty: number; totalNet: number; pending: number };
    perSalesmanNet: Record<string, number>;
  };
  projects: DatasetProject[];
  needsReview: string[];
  skippedUnderProductionOnly: {
    salesman: string; soNumber: string; customer: string; item: string; totalWithVat: number | null;
  }[];
}
