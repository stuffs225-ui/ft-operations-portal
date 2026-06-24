// ── Sales Dashboard v2 — Read-Only Data Aggregation ───────────────────────────
// This helper aggregates projects, pipeline, invoicing milestones, and annual
// targets into the SalesDashboardV2Data contract. It is read-only: no inserts,
// updates, or deletes. All mutations remain in their original page/hook files.
//
// Role scoping:
//   isBroadView = true  → admin / operations_manager; sees all records
//   isBroadView = false → sales_user; RLS + explicit filter limits to own records
//
// Terminology (enforced — do not relabel in this file):
//   Pending Invoicing     = milestone amount scheduled but not yet invoiced
//                           (status IN 'planned','ready_to_invoice')
//   Outstanding Receivables = invoiced but not yet collected
//                           (status IN 'submitted','approved','overdue')
//   Collection to Date    = SUM(paid_amount) WHERE status='paid' AND paid_at in year
// ──────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SalesDashboardV2Data,
  SalesDashboardV2Summary,
  SalesDashboardV2Targets,
  SalesDashboardV2Warnings,
  SalesInvoicingPlanRow,
  SalesInvoicingPlanMonths,
} from '../types/salesDashboardV2';

// ── Internal types ────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
  total_sales_value: number;
  project_status: string;
  approved_at: string | null;
  sales_owner_id: string | null;
}

interface HotProjectRow {
  id: string;
  stage: string;
  estimated_value: number | null;
  sales_owner_id: string | null;
}

interface MilestoneRow {
  id: string;
  project_id: string;
  milestone_status: string;
  amount: number;
  due_date: string | null;
  paid_amount: number | null;
  paid_at: string | null;
}

interface TargetRow {
  sales_order_target: number | null;
  invoicing_target: number | null;
  collection_target: number | null;
  target_year: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OPEN_HOT_STAGES = ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation'] as const;
const ACTIVE_PROJECT_STATUSES = ['approved', 'active', 'completed', 'submitted_for_approval', 'sent_back_for_revision'];
const PENDING_INVOICE_STATUSES = ['planned', 'ready_to_invoice'];
const BILLED_UNPAID_STATUSES = ['submitted', 'approved', 'overdue'];
const MONTH_NAMES: (keyof SalesInvoicingPlanMonths)[] = [
  'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
];

// ── Year-range helpers ────────────────────────────────────────────────────────

function yearStart(year: number): string { return `${year}-01-01`; }
function yearEnd(year: number): string   { return `${year + 1}-01-01`; }

function inYear(isoDate: string | null | undefined, year: number): boolean {
  if (!isoDate) return false;
  return isoDate >= yearStart(year) && isoDate < yearEnd(year);
}

// ── Pure calculation helpers (testable) ──────────────────────────────────────

export function calcPendingInvoicing(milestones: MilestoneRow[]): number {
  return milestones
    .filter(m => PENDING_INVOICE_STATUSES.includes(m.milestone_status))
    .reduce((sum, m) => sum + (m.amount ?? 0), 0);
}

export function calcOutstandingReceivables(milestones: MilestoneRow[]): number {
  return milestones
    .filter(m => BILLED_UNPAID_STATUSES.includes(m.milestone_status))
    .reduce((sum, m) => sum + Math.max(0, (m.amount ?? 0) - (m.paid_amount ?? 0)), 0);
}

export function calcCollectionToDate(milestones: MilestoneRow[], year: number): number {
  return milestones
    .filter(m => m.milestone_status === 'paid' && inYear(m.paid_at, year))
    .reduce((sum, m) => sum + (m.paid_amount ?? 0), 0);
}

export function calcInvoicingUpToDate(milestones: MilestoneRow[], year: number): number {
  // "Invoiced and paid" this year — represented by paid milestones in the year.
  return calcCollectionToDate(milestones, year);
}

export function calcInvoicingYearPlan(milestones: MilestoneRow[], year: number): number {
  // Milestones due in the selected year that are not yet paid or cancelled.
  return milestones
    .filter(m =>
      inYear(m.due_date, year) &&
      m.milestone_status !== 'cancelled' &&
      m.milestone_status !== 'paid'
    )
    .reduce((sum, m) => sum + (m.amount ?? 0), 0);
}

export function calcSoAchievedInYear(projects: ProjectRow[], year: number): number {
  return projects
    .filter(p =>
      ['approved', 'active', 'completed'].includes(p.project_status) &&
      inYear(p.approved_at, year)
    )
    .reduce((sum, p) => sum + (p.total_sales_value ?? 0), 0);
}

function pct(numerator: number, denominator: number | null): number | null {
  if (denominator == null || denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100; // 2 decimal places
}

// ── Monthly invoicing plan builder ───────────────────────────────────────────

function buildInvoicingPlanRows(
  projects: ProjectRow[],
  milestones: MilestoneRow[],
  selectedYear: number
): SalesInvoicingPlanRow[] {
  // Group milestones by project_id
  const byProject = new Map<string, MilestoneRow[]>();
  for (const m of milestones) {
    const bucket = byProject.get(m.project_id) ?? [];
    bucket.push(m);
    byProject.set(m.project_id, bucket);
  }

  const rows: SalesInvoicingPlanRow[] = [];

  for (const project of projects) {
    const projectMilestones = byProject.get(project.id) ?? [];
    if (projectMilestones.length === 0) continue; // skip projects with no plan

    // Per-month amounts for selected year (non-cancelled)
    const months: SalesInvoicingPlanMonths = {
      jan: null, feb: null, mar: null, apr: null,
      may: null, jun: null, jul: null, aug: null,
      sep: null, oct: null, nov: null, dec: null,
    };

    for (const m of projectMilestones) {
      if (m.milestone_status === 'cancelled') continue;
      if (!m.due_date) continue;
      if (!inYear(m.due_date, selectedYear)) continue;

      const monthIndex = new Date(m.due_date + 'T00:00:00').getMonth(); // 0-based
      const key = MONTH_NAMES[monthIndex];
      months[key] = (months[key] ?? 0) + (m.amount ?? 0);
    }

    const ttl = MONTH_NAMES.reduce((sum, k) => sum + (months[k] ?? 0), 0);

    rows.push({
      projectId:        project.id,
      projectCode:      project.project_code,
      customerName:     project.customer_name,
      orderOrPo:        project.so_number,
      quantity:         null, // requires join to project_vehicle_lines — deferred
      totalValue:       project.total_sales_value,
      pendingInvoicing: calcPendingInvoicing(projectMilestones),
      months,
      ttl,
      selectedYearValue: ttl,
    });
  }

  // Sort by project_code for stable order
  rows.sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  return rows;
}

// ── Main aggregation function ─────────────────────────────────────────────────

export interface GetSalesDashboardV2DataParams {
  supabase: SupabaseClient;
  salesUserId: string;
  selectedYear: number;
  /** true for admin / operations_manager — sees all records; false for sales_user */
  isBroadView: boolean;
}

export async function getSalesDashboardV2Data(
  params: GetSalesDashboardV2DataParams
): Promise<{ data: SalesDashboardV2Data | null; error: string | null }> {
  const { supabase, salesUserId, selectedYear, isBroadView } = params;

  // ── Parallel data fetch ─────────────────────────────────────────────────────

  const projectsQuery = (() => {
    const base = supabase
      .from('projects')
      .select('id, project_code, so_number, customer_name, total_sales_value, project_status, approved_at, sales_owner_id')
      .in('project_status', ACTIVE_PROJECT_STATUSES);
    return isBroadView ? base : base.eq('sales_owner_id', salesUserId);
  })();

  const hotProjectsQuery = (() => {
    const base = supabase
      .from('hot_projects')
      .select('id, stage, estimated_value, sales_owner_id')
      .in('stage', [...OPEN_HOT_STAGES]);
    return isBroadView ? base : base.eq('sales_owner_id', salesUserId);
  })();

  // Milestones: RLS scopes sales_user to own projects automatically.
  // Broad view: RLS allows all. No extra filter needed beyond cancelled exclusion.
  const milestonesQuery = supabase
    .from('project_invoice_milestones')
    .select('id, project_id, milestone_status, amount, due_date, paid_amount, paid_at')
    .neq('milestone_status', 'cancelled');

  // Targets: only meaningful for sales_user; admin/ops will get null result via RLS
  const targetsQuery = supabase
    .from('sales_user_targets')
    .select('sales_order_target, invoicing_target, collection_target, target_year')
    .eq('sales_user_id', salesUserId)
    .eq('target_year', selectedYear)
    .maybeSingle();

  const [projectsRes, hotProjectsRes, milestonesRes, targetsRes] = await Promise.all([
    projectsQuery,
    hotProjectsQuery,
    milestonesQuery,
    targetsQuery,
  ]);

  // Collect first fatal error (non-blocking errors produce warnings instead)
  const fatalError = projectsRes.error?.message ?? milestonesRes.error?.message ?? null;
  if (fatalError) return { data: null, error: fatalError };

  const projects   = (projectsRes.data   ?? []) as ProjectRow[];
  const hotProjects = (hotProjectsRes.data ?? []) as HotProjectRow[];
  const milestones  = (milestonesRes.data  ?? []) as MilestoneRow[];
  const target      = (targetsRes.data     ?? null) as TargetRow | null;

  // ── Summary KPIs ────────────────────────────────────────────────────────────

  const activeProjects = projects.filter(p =>
    ['approved', 'active', 'completed'].includes(p.project_status)
  );

  const summary: SalesDashboardV2Summary = {
    projectsCount:          activeProjects.length,
    totalProjectValue:      activeProjects.reduce((s, p) => s + (p.total_sales_value ?? 0), 0),
    pipelineProjectsCount:  hotProjects.length,
    totalPipelineValue:     hotProjects.reduce((s, h) => s + (h.estimated_value ?? 0), 0),
    projectsAtRiskCount:    projects.filter(p => p.project_status === 'sent_back_for_revision').length,
    pendingInvoicingValue:  calcPendingInvoicing(milestones),
    outstandingReceivablesValue: calcOutstandingReceivables(milestones),
    collectionToDateValue:  calcCollectionToDate(milestones, selectedYear),
  };

  // ── Monthly invoicing plan ───────────────────────────────────────────────────

  const invoicingPlanRows = buildInvoicingPlanRows(projects, milestones, selectedYear);

  // ── Annual targets ───────────────────────────────────────────────────────────

  const soAchieved        = calcSoAchievedInYear(projects, selectedYear);
  const invUpToDate       = calcInvoicingUpToDate(milestones, selectedYear);
  const invYearPlan       = calcInvoicingYearPlan(milestones, selectedYear);
  const invExpectedTotal  = invUpToDate + invYearPlan;
  const soExpectedTotal   = soAchieved + hotProjects.reduce((s, h) => s + (h.estimated_value ?? 0), 0);
  const collectedToDate   = calcCollectionToDate(milestones, selectedYear);

  const soTarget     = target?.sales_order_target ?? null;
  const invTarget    = target?.invoicing_target   ?? null;
  const colTarget    = target?.collection_target  ?? null;

  const targets: SalesDashboardV2Targets = {
    targetYear:                selectedYear,
    salesOrderTarget:          soTarget,
    salesOrderAchieved:        soAchieved,
    salesOrderYearPlan:        activeProjects.reduce((s, p) => s + (p.total_sales_value ?? 0), 0),
    salesOrderExpectedTotal:   soExpectedTotal,
    salesOrderPercent:         pct(soAchieved, soTarget),
    invoicingTarget:           invTarget,
    invoicingUpToDate:         invUpToDate,
    invoicingYearPlan:         invYearPlan,
    invoicingExpectedTotal:    invExpectedTotal,
    invoicingPercent:          pct(invExpectedTotal, invTarget),
    invoicingActualPercentUpToNow: pct(invUpToDate, invTarget),
    collectionTarget:          colTarget,
    collectedToDate,
    collectionPercent:         pct(collectedToDate, colTarget),
  };

  // ── Warnings ─────────────────────────────────────────────────────────────────

  const warnings: SalesDashboardV2Warnings = {
    projectsAtRiskDefinitionPending: true, // pending product approval — current = sent_back_for_revision
    collectionTargetNotSet:  colTarget == null,
    invoicingTargetNotSet:   invTarget == null,
    salesOrderTargetNotSet:  soTarget  == null,
    noTargetsRecord:         target == null,
    receivablesViewMixedScope: true, // receivables_aging_view mixes unbilled + billed-unpaid; we query milestones directly
  };

  // ── Metadata ─────────────────────────────────────────────────────────────────

  const metadata = {
    selectedYear,
    salesUserId,
    generatedAt: new Date().toISOString(),
    hasTargets: target != null,
    collectionTargetSet: colTarget != null,
  };

  return {
    data: { summary, invoicingPlanRows, targets, warnings, metadata },
    error: null,
  };
}
