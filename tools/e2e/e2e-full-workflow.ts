/* ─────────────────────────────────────────────────────────────────────────────
 * E2E Full-Workflow Scenario Seeder — NAFFCO Operations Portal
 *
 * Seeds tagged, cleanly-removable scenario data across the real workflow chain:
 *   Quotation → SO/Project → Procurement PR/PO → Store Receiving → Factory →
 *   QC → AFS → Invoicing / Receivables
 *
 * SAFETY MODEL (all enforced in code, see assertWriteAllowed()):
 *   • Default mode is DRY-RUN — prints the plan, writes nothing.
 *   • Any write (seed / cleanup) requires  E2E_SEED_CONFIRM=true.
 *   • The target Supabase host is treated as PRODUCTION unless its hostname is
 *     listed in E2E_NON_PRODUCTION_HOSTS (comma-separated). Writing to a
 *     production host additionally requires  E2E_ALLOW_PRODUCTION=true.
 *   • Every record carries the tag  E2E_SCENARIO_SEED run_id=<id> scenario=<code>
 *     in a remarks/notes column where one exists, and an  E2E-<shortid>  prefix
 *     in every number/code column we control.
 *   • Cleanup requires --run-id and deletes ONLY records listed in that run's
 *     manifest (plus trigger-created invoicing-schedule rows belonging to that
 *     run's projects), child tables before parents. No truncation, ever.
 *
 * This is a backend test tool — it is never bundled into the frontend.
 * Run via:  npx tsx tools/e2e/e2e-full-workflow.ts --mode dry-run --scenario all
 * ──────────────────────────────────────────────────────────────────────────── */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import 'dotenv/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const TAG = 'E2E_SCENARIO_SEED';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'e2e-full-workflow');

const SCENARIOS = [
  'S01-clean-full-flow',
  'S02-partial-receiving',
  'S03-medical-pending',
  'S04-high-value-po-gate',
  'S05-vehicle-missing-photos',
  'S06-vehicle-complete-photos',
  'S07-serial-custody-gate',
  'S08-qc-fail-ncr',
  'S09-afs-delivery-pending',
  'S10-invoicing-receivables-risk',
] as const;
type ScenarioCode = (typeof SCENARIOS)[number];

// Deletion order for cleanup: children first, parents last.
const CLEANUP_ORDER = [
  'material_ncrs',
  'material_qc_inspections',
  'material_custody_records',
  'medical_serial_numbers',
  'vehicle_receipt_photos',
  'vehicle_receipts',
  'store_receipt_items',
  'store_receipts',
  'purchase_orders_to_supplier',
  'procurement_request_items',
  'procurement_requests',
  'factory_records',
  'afs_arrival_reports',
  'dubai_project_followups',
  'project_invoice_milestones',
  'project_invoicing_plans',
  'project_invoicing_schedule_history',
  'project_invoicing_schedule',
  'projects',
  'quotation_requests',
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlannedInsert {
  table: string;
  scenario: ScenarioCode;
  /** Row payload. Values may reference earlier ids via $ref placeholders. */
  values: Record<string, unknown>;
  /** Key under which the created id is memoised for later $ref lookups. */
  as?: string;
}

interface ManifestRecord {
  table: string;
  id: string;
  scenario: string;
  label: string;
}

interface Manifest {
  run_id: string;
  tag: string;
  created_at: string;
  supabase_host: string;
  scenarios: string[];
  records: ManifestRecord[];
  step_errors: { table: string; scenario: string; error: string }[];
  cleanup?: { cleaned_at: string; deleted: Record<string, number>; errors: string[] };
}

// ── CLI / env parsing ─────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const MODE = (arg('mode') ?? 'dry-run') as 'dry-run' | 'seed' | 'validate' | 'cleanup' | 'report';
const SCENARIO_ARG = arg('scenario') ?? 'all';
const RUN_ID_ARG = arg('run-id');

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

function log(msg: string) { console.log(msg); }
function fail(msg: string): never { console.error(`\n✗ ${msg}\n`); process.exit(1); }

// ── Safety guards ─────────────────────────────────────────────────────────────

function supabaseHost(): string {
  try { return new URL(SUPABASE_URL).hostname; } catch { return '(invalid-url)'; }
}

function isProductionTarget(): boolean {
  const allow = (process.env.E2E_NON_PRODUCTION_HOSTS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
  // Default-deny: any host not explicitly allow-listed is treated as production.
  return !allow.includes(supabaseHost());
}

function assertWriteAllowed(action: 'seed' | 'cleanup') {
  if (process.env.E2E_SEED_CONFIRM !== 'true') {
    fail(
      `${action} writes to the database and is blocked.\n` +
      `  Set E2E_SEED_CONFIRM=true to confirm. Default mode is dry-run.`,
    );
  }
  if (isProductionTarget() && process.env.E2E_ALLOW_PRODUCTION !== 'true') {
    fail(
      `Target host "${supabaseHost()}" is not in E2E_NON_PRODUCTION_HOSTS and is treated as PRODUCTION.\n` +
      `  Writing to production is blocked. Either add the host to E2E_NON_PRODUCTION_HOSTS\n` +
      `  (if it is genuinely a staging/test database) or set E2E_ALLOW_PRODUCTION=true\n` +
      `  to explicitly accept writing E2E data to production.`,
    );
  }
}

// ── Client ────────────────────────────────────────────────────────────────────

async function makeClient(): Promise<SupabaseClient> {
  if (!SUPABASE_URL) fail('E2E_SUPABASE_URL / VITE_SUPABASE_URL is not set.');
  if (SERVICE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  }
  if (!ANON_KEY) fail('Set SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY (+ TEST_ADMIN_* login).');
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;
  if (!email || !password) {
    fail('No SUPABASE_SERVICE_ROLE_KEY — anon mode needs TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD to sign in.');
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) fail(`Admin sign-in failed: ${error.message}`);
  return client;
}

// ── Scenario plan builder ─────────────────────────────────────────────────────

const shortId = (runId: string) => runId.replace(/[^a-z0-9]/gi, '').slice(-6);
const tagFor = (runId: string, sc: ScenarioCode) => `${TAG} run_id=${runId} scenario=${sc}`;
const iso = (offsetDays: number) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/**
 * Builds the full insert plan for a run. `$profile` is replaced at execution
 * time with a real profile id (read-only lookup); `$ref:<key>` references the
 * id of a record created earlier in the same run.
 */
function buildPlan(runId: string, scenarios: ScenarioCode[]): PlannedInsert[] {
  const s = shortId(runId);
  const P: PlannedInsert[] = [];
  const has = (c: ScenarioCode) => scenarios.includes(c);

  // ── S01 — Clean full flow ──────────────────────────────────────────────────
  if (has('S01-clean-full-flow')) {
    const sc: ScenarioCode = 'S01-clean-full-flow'; const t = tagFor(runId, sc);
    P.push(
      { table: 'quotation_requests', scenario: sc, as: 'q1', values: { customer_name: `E2E-${s} Clean Flow Customer`, quotation_status: 'quotation_received', priority: 'normal', scope_summary: 'E2E clean full workflow', sales_remarks: t } },
      { table: 'projects', scenario: sc, as: 'p1', values: { so_number: `E2E-${s}-SO-01`, customer_name: `E2E-${s} Clean Flow Customer`, customer_delivery_date: iso(30), project_status: 'active', total_sales_value: 250000, notes: t } },
      { table: 'factory_records', scenario: sc, values: { project_id: '$ref:p1' } },
      { table: 'procurement_requests', scenario: sc, as: 'pr1', values: { project_id: '$ref:p1', pr_number: `E2E-${s}-PR-01`, received_date: iso(0), status: 'fully_ordered', source_department: 'factory', remarks: t } },
      { table: 'procurement_request_items', scenario: sc, as: 'pri1', values: { procurement_request_id: '$ref:pr1', project_id: '$ref:p1', item_name: `E2E-${s} Fire Pump 1500LPM`, quantity_required: 2, unit: 'pcs', remarks: t } },
      { table: 'purchase_orders_to_supplier', scenario: sc, as: 'po1', values: { project_id: '$ref:p1', procurement_request_id: '$ref:pr1', po_number: `E2E-${s}-PO-01`, supplier_name: `E2E-${s} Approved Supplier`, po_date: iso(-10), purchase_value: 8000, currency: 'SAR', po_status: 'fully_received', approval_required: false, eta_date: iso(-2), remarks: t } },
      { table: 'store_receipts', scenario: sc, as: 'grn1', values: { project_id: '$ref:p1', purchase_order_id: '$ref:po1', receipt_number: `E2E-${s}-GRN-01`, receipt_type: 'material', received_date: iso(-1), received_by: '$profile', supplier_name: `E2E-${s} Approved Supplier`, status: 'accepted', remarks: t } },
      { table: 'store_receipt_items', scenario: sc, as: 'item1', values: { store_receipt_id: '$ref:grn1', project_id: '$ref:p1', item_name: `E2E-${s} Fire Pump 1500LPM`, quantity_received: 2, unit: 'pcs', status: 'in_store', remarks: t } },
      { table: 'material_qc_inspections', scenario: sc, values: { store_receipt_item_id: '$ref:item1', store_receipt_id: '$ref:grn1', project_id: '$ref:p1', inspection_number: `E2E-${s}-QCI-01`, inspection_status: 'completed', inspection_result: 'accepted', remarks: t } },
      { table: 'project_invoicing_plans', scenario: sc, as: 'plan1', values: { project_id: '$ref:p1', total_contract_value: 250000, notes: t } },
      { table: 'project_invoice_milestones', scenario: sc, values: { plan_id: '$ref:plan1', project_id: '$ref:p1', milestone_name: `E2E-${s} Advance 50%`, milestone_status: 'paid', amount: 125000, paid_amount: 125000, paid_at: new Date().toISOString(), sort_order: 1, notes: t } },
      { table: 'project_invoice_milestones', scenario: sc, values: { plan_id: '$ref:plan1', project_id: '$ref:p1', milestone_name: `E2E-${s} Delivery 50%`, milestone_status: 'approved', amount: 125000, sort_order: 2, notes: t } },
    );
  }

  // ── S02 — Partial material receiving ───────────────────────────────────────
  if (has('S02-partial-receiving')) {
    const sc: ScenarioCode = 'S02-partial-receiving'; const t = tagFor(runId, sc);
    P.push(
      { table: 'projects', scenario: sc, as: 'p2', values: { so_number: `E2E-${s}-SO-02`, customer_name: `E2E-${s} Partial Receiving Customer`, customer_delivery_date: iso(45), project_status: 'active', total_sales_value: 120000, notes: t } },
      { table: 'procurement_requests', scenario: sc, as: 'pr2', values: { project_id: '$ref:p2', pr_number: `E2E-${s}-PR-02`, received_date: iso(-7), status: 'partially_ordered', remarks: t } },
      { table: 'procurement_request_items', scenario: sc, values: { procurement_request_id: '$ref:pr2', project_id: '$ref:p2', item_name: `E2E-${s} Hose Reel 30m`, quantity_required: 10, unit: 'pcs', remarks: t } },
      { table: 'purchase_orders_to_supplier', scenario: sc, as: 'po2', values: { project_id: '$ref:p2', procurement_request_id: '$ref:pr2', po_number: `E2E-${s}-PO-02`, supplier_name: `E2E-${s} Approved Supplier`, po_date: iso(-6), purchase_value: 6000, currency: 'SAR', po_status: 'partially_received', approval_required: false, eta_date: iso(3), remarks: t } },
      { table: 'store_receipts', scenario: sc, as: 'grn2', values: { project_id: '$ref:p2', purchase_order_id: '$ref:po2', receipt_number: `E2E-${s}-GRN-02`, receipt_type: 'material', received_date: iso(0), received_by: '$profile', supplier_name: `E2E-${s} Approved Supplier`, status: 'partially_received', remarks: t } },
      { table: 'store_receipt_items', scenario: sc, values: { store_receipt_id: '$ref:grn2', project_id: '$ref:p2', item_name: `E2E-${s} Hose Reel 30m`, quantity_received: 6, unit: 'pcs', status: 'received', remarks: `${t} — 6 of 10 received, remainder open` } },
    );
  }

  // ── S03 — Medical materials pending ────────────────────────────────────────
  if (has('S03-medical-pending')) {
    const sc: ScenarioCode = 'S03-medical-pending'; const t = tagFor(runId, sc);
    P.push(
      { table: 'projects', scenario: sc, as: 'p3', values: { so_number: `E2E-${s}-SO-03`, customer_name: `E2E-${s} Medical Customer`, customer_delivery_date: iso(60), project_status: 'active', medical_items: 'yes', total_sales_value: 300000, notes: t } },
      { table: 'store_receipts', scenario: sc, as: 'grn3', values: { project_id: '$ref:p3', receipt_number: `E2E-${s}-GRN-03`, receipt_type: 'material', received_date: iso(0), received_by: '$profile', supplier_name: `E2E-${s} Medical Supplier`, status: 'pending_material_qc', remarks: t } },
      { table: 'store_receipt_items', scenario: sc, as: 'item3', values: { store_receipt_id: '$ref:grn3', project_id: '$ref:p3', item_name: `E2E-${s} Defibrillator AED`, quantity_received: 1, unit: 'pcs', serial_required: true, status: 'pending_qc', remarks: t } },
      { table: 'medical_serial_numbers', scenario: sc, as: 'ser3', values: { store_receipt_item_id: '$ref:item3', project_id: '$ref:p3', serial_number: `E2E-${s}-SER-03`, qc_status: 'pending_qc', current_status: 'in_store', manufacturer: 'E2E MedCorp', remarks: t } },
      { table: 'material_qc_inspections', scenario: sc, values: { store_receipt_item_id: '$ref:item3', store_receipt_id: '$ref:grn3', project_id: '$ref:p3', medical_serial_number_id: '$ref:ser3', inspection_number: `E2E-${s}-QCI-03`, inspection_status: 'pending', inspection_result: 'pending', remarks: t } },
    );
  }

  // ── S04 — High-value PO approval gate (≥ SAR 10,000) ───────────────────────
  if (has('S04-high-value-po-gate')) {
    const sc: ScenarioCode = 'S04-high-value-po-gate'; const t = tagFor(runId, sc);
    P.push(
      { table: 'projects', scenario: sc, as: 'p4', values: { so_number: `E2E-${s}-SO-04`, customer_name: `E2E-${s} High Value Customer`, customer_delivery_date: iso(90), project_status: 'active', total_sales_value: 500000, notes: t } },
      { table: 'procurement_requests', scenario: sc, as: 'pr4', values: { project_id: '$ref:p4', pr_number: `E2E-${s}-PR-04`, received_date: iso(-3), status: 'in_progress', remarks: t } },
      { table: 'procurement_request_items', scenario: sc, values: { procurement_request_id: '$ref:pr4', project_id: '$ref:p4', item_name: `E2E-${s} Chassis Superstructure Kit`, quantity_required: 1, unit: 'set', remarks: t } },
      { table: 'purchase_orders_to_supplier', scenario: sc, values: { project_id: '$ref:p4', procurement_request_id: '$ref:pr4', po_number: `E2E-${s}-PO-04`, supplier_name: `E2E-${s} Approved Supplier`, po_date: iso(0), purchase_value: 25000, currency: 'SAR', po_status: 'pending_approval', approval_required: true, approval_status: 'pending', remarks: `${t} — must NOT be sendable before Admin/Ops approval` } },
    );
  }

  // ── S05 — Vehicle receiving, missing required photos (3 of 5) ──────────────
  if (has('S05-vehicle-missing-photos')) {
    const sc: ScenarioCode = 'S05-vehicle-missing-photos'; const t = tagFor(runId, sc);
    P.push(
      { table: 'vehicle_receipts', scenario: sc, as: 'veh5', values: { chassis_number: `E2E${s}CHS05`, received_date: iso(0), received_by: '$profile', vehicle_type: `E2E-${s} Ambulance Type II`, status: 'received', remarks: `${t} — acceptance must stay blocked (3/5 photos)` } },
      ...(['front', 'rear', 'left_side'] as const).map((pt): PlannedInsert => (
        { table: 'vehicle_receipt_photos', scenario: sc, values: { vehicle_receipt_id: '$ref:veh5', photo_type: pt, file_name: `e2e-${s}-${pt}.jpg`, storage_path: `e2e/${runId}/veh5-${pt}.jpg`, uploaded_by: '$profile', remarks: t } }
      )),
    );
  }

  // ── S06 — Vehicle receiving, complete required photos (5 of 5) ─────────────
  if (has('S06-vehicle-complete-photos')) {
    const sc: ScenarioCode = 'S06-vehicle-complete-photos'; const t = tagFor(runId, sc);
    P.push(
      { table: 'vehicle_receipts', scenario: sc, as: 'veh6', values: { chassis_number: `E2E${s}CHS06`, received_date: iso(-1), received_by: '$profile', vehicle_type: `E2E-${s} Fire Truck 4x4`, status: 'accepted', remarks: `${t} — all 5 photos present, acceptance valid` } },
      ...(['front', 'rear', 'left_side', 'right_side', 'chassis_plate'] as const).map((pt): PlannedInsert => (
        { table: 'vehicle_receipt_photos', scenario: sc, values: { vehicle_receipt_id: '$ref:veh6', photo_type: pt, file_name: `e2e-${s}-${pt}.jpg`, storage_path: `e2e/${runId}/veh6-${pt}.jpg`, uploaded_by: '$profile', remarks: t } }
      )),
    );
  }

  // ── S07 — Serial / custody gate ────────────────────────────────────────────
  if (has('S07-serial-custody-gate')) {
    const sc: ScenarioCode = 'S07-serial-custody-gate'; const t = tagFor(runId, sc);
    P.push(
      { table: 'projects', scenario: sc, as: 'p7', values: { so_number: `E2E-${s}-SO-07`, customer_name: `E2E-${s} Custody Customer`, customer_delivery_date: iso(40), project_status: 'active', total_sales_value: 90000, notes: t } },
      { table: 'store_receipts', scenario: sc, as: 'grn7', values: { project_id: '$ref:p7', receipt_number: `E2E-${s}-GRN-07`, receipt_type: 'material', received_date: iso(-2), received_by: '$profile', status: 'accepted', remarks: t } },
      { table: 'store_receipt_items', scenario: sc, as: 'item7', values: { store_receipt_id: '$ref:grn7', project_id: '$ref:p7', item_name: `E2E-${s} Patient Monitor`, quantity_received: 1, unit: 'pcs', serial_required: true, status: 'accepted_by_qc', remarks: t } },
      { table: 'medical_serial_numbers', scenario: sc, as: 'ser7', values: { store_receipt_item_id: '$ref:item7', project_id: '$ref:p7', serial_number: `E2E-${s}-SER-07`, qc_status: 'passed', current_status: 'in_store', remarks: t } },
      // Custody A — awaiting Admin/Ops approval (approval gate visible)
      { table: 'material_custody_records', scenario: sc, values: { project_id: '$ref:p7', store_receipt_item_id: '$ref:item7', medical_serial_number_id: '$ref:ser7', issue_type: 'temporary_custody', approval_required: true, approval_status: 'pending_approval', status: 'pending_approval', issued_by: '$profile', issued_to_role: 'factory_user', remarks: `${t} — custody approval gate` } },
      // Custody B — approved + issued, awaiting receiver acceptance
      { table: 'material_custody_records', scenario: sc, values: { project_id: '$ref:p7', store_receipt_item_id: '$ref:item7', issue_type: 'temporary_custody', approval_required: true, approval_status: 'approved', status: 'issued', receiver_decision: 'pending', issued_by: '$profile', issued_to_role: 'factory_user', remarks: `${t} — receiver acceptance gate` } },
    );
  }

  // ── S08 — QC failure / NCR / rework ────────────────────────────────────────
  if (has('S08-qc-fail-ncr')) {
    const sc: ScenarioCode = 'S08-qc-fail-ncr'; const t = tagFor(runId, sc);
    P.push(
      { table: 'projects', scenario: sc, as: 'p8', values: { so_number: `E2E-${s}-SO-08`, customer_name: `E2E-${s} NCR Customer`, customer_delivery_date: iso(50), project_status: 'active', total_sales_value: 150000, notes: t } },
      { table: 'store_receipts', scenario: sc, as: 'grn8', values: { project_id: '$ref:p8', receipt_number: `E2E-${s}-GRN-08`, receipt_type: 'material', received_date: iso(-4), received_by: '$profile', status: 'pending_material_qc', remarks: t } },
      { table: 'store_receipt_items', scenario: sc, as: 'item8', values: { store_receipt_id: '$ref:grn8', project_id: '$ref:p8', item_name: `E2E-${s} Centrifugal Pump`, quantity_received: 1, unit: 'pcs', status: 'rejected_by_qc', remarks: t } },
      { table: 'material_qc_inspections', scenario: sc, as: 'qci8', values: { store_receipt_item_id: '$ref:item8', store_receipt_id: '$ref:grn8', project_id: '$ref:p8', inspection_number: `E2E-${s}-QCI-08`, inspection_status: 'completed', inspection_result: 'rejected', rejection_reason: 'E2E: casing crack found on inspection', remarks: t } },
      { table: 'material_ncrs', scenario: sc, values: { material_qc_inspection_id: '$ref:qci8', store_receipt_item_id: '$ref:item8', project_id: '$ref:p8', ncr_number: `E2E-${s}-NCR-08`, ncr_status: 'open', severity: 'high', description: `E2E seeded NCR — casing crack; issuance must stay blocked until closure. ${t}`, remarks: t } },
    );
  }

  // ── S09 — AFS / delivery pending ───────────────────────────────────────────
  if (has('S09-afs-delivery-pending')) {
    const sc: ScenarioCode = 'S09-afs-delivery-pending'; const t = tagFor(runId, sc);
    P.push(
      { table: 'projects', scenario: sc, as: 'p9', values: { so_number: `E2E-${s}-SO-09`, customer_name: `E2E-${s} AFS Delivery Customer`, customer_delivery_date: iso(20), project_status: 'active', total_sales_value: 200000, notes: t } },
      // Followup only — arrival/predelivery reports are documented as not safely
      // seedable yet (loosely-typed hand-maintained schema section).
      { table: 'dubai_project_followups', scenario: sc, values: { project_id: '$ref:p9' } },
    );
  }

  // ── S10 — Invoicing / receivables risk ─────────────────────────────────────
  if (has('S10-invoicing-receivables-risk')) {
    const sc: ScenarioCode = 'S10-invoicing-receivables-risk'; const t = tagFor(runId, sc);
    P.push(
      { table: 'projects', scenario: sc, as: 'p10', values: { so_number: `E2E-${s}-SO-10`, customer_name: `E2E-${s} Receivables Risk Customer`, customer_delivery_date: iso(-45), project_status: 'active', total_sales_value: 180000, notes: t } },
      { table: 'project_invoicing_schedule', scenario: sc, values: { project_id: '$ref:p10', sequence_no: 2, schedule_label: `E2E-${s} Overdue Line`, schedule_description: t, invoice_amount: 90000, current_invoice_date: iso(-30), status: 'scheduled', source: 'admin_manual' } },
      { table: 'project_invoicing_plans', scenario: sc, as: 'plan10', values: { project_id: '$ref:p10', total_contract_value: 180000, notes: t } },
      { table: 'project_invoice_milestones', scenario: sc, values: { plan_id: '$ref:plan10', project_id: '$ref:p10', milestone_name: `E2E-${s} Overdue Milestone`, milestone_status: 'overdue', amount: 90000, due_date: iso(-20), sort_order: 1, notes: t } },
    );
  }

  return P;
}

// ── Manifest helpers ──────────────────────────────────────────────────────────

const manifestPath = (runId: string) => path.join(ARTIFACT_DIR, `${runId}.json`);
const reportPath = (runId: string) => path.join(ARTIFACT_DIR, `${runId}.md`);

function loadManifest(runId: string): Manifest {
  const p = manifestPath(runId);
  if (!existsSync(p)) fail(`No manifest found for run "${runId}" at ${p}`);
  return JSON.parse(readFileSync(p, 'utf8')) as Manifest;
}

function saveManifest(m: Manifest) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(manifestPath(m.run_id), JSON.stringify(m, null, 2));
}

function writeReport(m: Manifest, extra: string[] = []) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const byTable: Record<string, number> = {};
  const byScenario: Record<string, number> = {};
  for (const r of m.records) {
    byTable[r.table] = (byTable[r.table] ?? 0) + 1;
    byScenario[r.scenario] = (byScenario[r.scenario] ?? 0) + 1;
  }
  const lines = [
    `# E2E Full-Workflow Run Report — \`${m.run_id}\``,
    '',
    `- **Tag:** \`${m.tag} run_id=${m.run_id}\``,
    `- **Created:** ${m.created_at}`,
    `- **Supabase host:** \`${m.supabase_host}\``,
    `- **Scenarios:** ${m.scenarios.join(', ')}`,
    `- **Records created:** ${m.records.length}`,
    `- **Step errors:** ${m.step_errors.length}`,
    '',
    '## Records by scenario',
    ...Object.entries(byScenario).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Records by table',
    ...Object.entries(byTable).map(([k, v]) => `- ${k}: ${v}`),
    '',
    ...(m.step_errors.length
      ? ['## Step errors', ...m.step_errors.map(e => `- [${e.scenario}] ${e.table}: ${e.error}`), '']
      : []),
    ...(m.cleanup
      ? [
          '## Cleanup',
          `- Cleaned at: ${m.cleanup.cleaned_at}`,
          ...Object.entries(m.cleanup.deleted).map(([k, v]) => `- ${k}: ${v} deleted`),
          ...(m.cleanup.errors.length ? ['- Errors:', ...m.cleanup.errors.map(e => `  - ${e}`)] : []),
          '',
        ]
      : []),
    ...extra,
  ];
  writeFileSync(reportPath(m.run_id), lines.join('\n'));
  log(`Report written: ${reportPath(m.run_id)}`);
}

// ── Modes ─────────────────────────────────────────────────────────────────────

function resolveScenarios(): ScenarioCode[] {
  if (SCENARIO_ARG === 'all') return [...SCENARIOS];
  const matched = SCENARIOS.filter(
    sc => sc === SCENARIO_ARG || sc.startsWith(`${SCENARIO_ARG}-`) || sc.startsWith(SCENARIO_ARG),
  );
  if (matched.length === 0) fail(`Unknown scenario "${SCENARIO_ARG}". Valid: all, ${SCENARIOS.join(', ')}`);
  return matched;
}

function modeDryRun() {
  const runId = `e2e-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${randomBytes(2).toString('hex')}`;
  const scenarios = resolveScenarios();
  const plan = buildPlan(runId, scenarios);
  log(`\n─── DRY-RUN (no writes) ──────────────────────────────────────────`);
  log(`Run id (would be): ${runId}`);
  log(`Target host:       ${supabaseHost()} ${isProductionTarget() ? '(treated as PRODUCTION — writes would need E2E_ALLOW_PRODUCTION=true)' : '(allow-listed non-production)'}`);
  log(`Scenarios:         ${scenarios.length} — ${scenarios.join(', ')}`);
  log(`Planned inserts:   ${plan.length} rows\n`);
  const byTable: Record<string, number> = {};
  for (const p of plan) byTable[p.table] = (byTable[p.table] ?? 0) + 1;
  for (const [t, n] of Object.entries(byTable)) log(`  ${t.padEnd(34)} ${n}`);
  log('');
  for (const p of plan) {
    const keys = Object.keys(p.values).join(', ');
    log(`  [${p.scenario}] INSERT ${p.table} (${keys})`);
  }
  log(`\nEvery row is tagged "${TAG} run_id=<run_id> scenario=<code>" and prefixed E2E-${shortId(runId)}.`);
  log(`Not safely seedable yet (documented): AFS arrival/predelivery reports, project-level QC rework chain.`);
  log(`To seed for real:  E2E_SEED_CONFIRM=true npm run e2e:workflow:seed -- --scenario all\n`);
}

async function modeSeed() {
  assertWriteAllowed('seed');
  const runId = `e2e-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${randomBytes(2).toString('hex')}`;
  const scenarios = resolveScenarios();
  const plan = buildPlan(runId, scenarios);
  const client = await makeClient();

  // Read-only lookup: any active profile id for received_by/issued_by/uploaded_by.
  const { data: prof, error: profErr } = await client
    .from('profiles').select('id').limit(1).maybeSingle();
  if (profErr || !prof) fail(`Could not resolve a profile id (needed for received_by/issued_by): ${profErr?.message ?? 'no profiles'}`);
  const profileId = (prof as { id: string }).id;

  const manifest: Manifest = {
    run_id: runId, tag: TAG, created_at: new Date().toISOString(),
    supabase_host: supabaseHost(), scenarios, records: [], step_errors: [],
  };
  const refs: Record<string, string> = {};

  log(`\nSeeding run ${runId} (${plan.length} planned rows)…`);
  for (const step of plan) {
    const values: Record<string, unknown> = {};
    let refMissing = false;
    for (const [k, v] of Object.entries(step.values)) {
      if (v === '$profile') values[k] = profileId;
      else if (typeof v === 'string' && v.startsWith('$ref:')) {
        const key = v.slice(5);
        if (!refs[key]) { refMissing = true; break; }
        values[k] = refs[key];
      } else values[k] = v;
    }
    if (refMissing) {
      manifest.step_errors.push({ table: step.table, scenario: step.scenario, error: 'skipped — parent record failed earlier' });
      continue;
    }
    const { data, error } = await client.from(step.table).insert(values).select('id').single();
    if (error || !data) {
      manifest.step_errors.push({ table: step.table, scenario: step.scenario, error: error?.message ?? 'no id returned' });
      log(`  ✗ [${step.scenario}] ${step.table}: ${error?.message}`);
      continue;
    }
    const id = (data as { id: string }).id;
    if (step.as) refs[step.as] = id;
    manifest.records.push({ table: step.table, id, scenario: step.scenario, label: String(values.remarks ?? values.notes ?? values.so_number ?? '') });
    log(`  ✓ [${step.scenario}] ${step.table} → ${id}`);
  }

  saveManifest(manifest);
  writeReport(manifest);
  log(`\nDone. Created ${manifest.records.length} rows, ${manifest.step_errors.length} step errors.`);
  log(`Manifest: ${manifestPath(runId)}`);
  log(`Cleanup:  E2E_SEED_CONFIRM=true npm run e2e:workflow:cleanup -- --run-id ${runId}\n`);
}

async function modeValidate() {
  if (!RUN_ID_ARG) fail('validate requires --run-id <run_id>');
  const manifest = loadManifest(RUN_ID_ARG);
  const client = await makeClient();
  log(`\nValidating run ${manifest.run_id} (${manifest.records.length} manifest records)…\n`);
  const byTable = new Map<string, string[]>();
  for (const r of manifest.records) {
    byTable.set(r.table, [...(byTable.get(r.table) ?? []), r.id]);
  }
  let missing = 0;
  const extra: string[] = ['## Validation (SELECT-only)', ''];
  for (const [table, ids] of byTable) {
    const { count, error } = await client
      .from(table).select('id', { count: 'exact', head: true }).in('id', ids);
    const found = count ?? 0;
    const ok = !error && found === ids.length;
    if (!ok) missing += ids.length - found;
    const line = `${ok ? '✓' : '✗'} ${table}: ${found}/${ids.length} present${error ? ` (${error.message})` : ''}`;
    log(`  ${line}`);
    extra.push(`- ${line}`);
  }
  // Trigger-created invoicing schedule rows for this run's projects (read-only check)
  const projectIds = manifest.records.filter(r => r.table === 'projects').map(r => r.id);
  if (projectIds.length) {
    const { count } = await client
      .from('project_invoicing_schedule')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds);
    const line = `ℹ project_invoicing_schedule rows linked to run projects (incl. trigger-created): ${count ?? 0}`;
    log(`  ${line}`); extra.push(`- ${line}`);
  }
  extra.push('', `Result: ${missing === 0 ? 'ALL PRESENT' : `${missing} MISSING`}`);
  writeReport(manifest, extra);
  log(`\n${missing === 0 ? '✓ All manifest records present.' : `✗ ${missing} records missing.`}\n`);
  if (missing > 0) process.exit(1);
}

async function modeCleanup() {
  if (!RUN_ID_ARG) fail('cleanup requires --run-id <run_id> (tagged-run deletion only — no blanket deletes)');
  assertWriteAllowed('cleanup');
  const manifest = loadManifest(RUN_ID_ARG);
  const client = await makeClient();
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  log(`\nCleaning up run ${manifest.run_id} — deleting ONLY the ${manifest.records.length} manifest records…`);

  const byTable = new Map<string, string[]>();
  for (const r of manifest.records) byTable.set(r.table, [...(byTable.get(r.table) ?? []), r.id]);
  const projectIds = manifest.records.filter(r => r.table === 'projects').map(r => r.id);

  for (const table of CLEANUP_ORDER) {
    // Trigger-created rows (and their history) belong exclusively to this run's
    // tagged projects — remove them by project_id, still scoped to the run.
    if ((table === 'project_invoicing_schedule' || table === 'project_invoicing_schedule_history') && projectIds.length) {
      const { count, error } = await client.from(table)
        .delete({ count: 'exact' }).in('project_id', projectIds);
      if (error) errors.push(`${table}: ${error.message}`);
      else if (count) deleted[table] = (deleted[table] ?? 0) + count;
    }
    const ids = byTable.get(table);
    if (!ids?.length) continue;
    const { count, error } = await client.from(table)
      .delete({ count: 'exact' }).in('id', ids);
    if (error) { errors.push(`${table}: ${error.message}`); log(`  ✗ ${table}: ${error.message}`); }
    else { deleted[table] = (deleted[table] ?? 0) + (count ?? 0); log(`  ✓ ${table}: ${count ?? 0} deleted`); }
  }

  manifest.cleanup = { cleaned_at: new Date().toISOString(), deleted, errors };
  saveManifest(manifest);
  writeReport(manifest);
  const total = Object.values(deleted).reduce((a, b) => a + b, 0);
  log(`\nCleanup complete: ${total} rows deleted, ${errors.length} errors.\n`);
  if (errors.length) process.exit(1);
}

function modeReport() {
  if (!RUN_ID_ARG) fail('report requires --run-id <run_id>');
  const manifest = loadManifest(RUN_ID_ARG);
  writeReport(manifest);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  switch (MODE) {
    case 'dry-run': modeDryRun(); break;
    case 'seed': await modeSeed(); break;
    case 'validate': await modeValidate(); break;
    case 'cleanup': await modeCleanup(); break;
    case 'report': modeReport(); break;
    default: fail(`Unknown --mode "${MODE}". Valid: dry-run | seed | validate | cleanup | report`);
  }
})();
