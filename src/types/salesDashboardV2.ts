// ── Sales Dashboard v2 — Type Contracts ───────────────────────────────────────
// Read-only data shapes for the Sales Dashboard v2 data aggregation layer.
// No UI is defined here. These types serve getSalesDashboardV2Data() and
// useSalesDashboardV2Data() only.

// ── Summary KPIs ──────────────────────────────────────────────────────────────

export interface SalesDashboardV2Summary {
  /** COUNT of non-draft, non-rejected, non-cancelled projects visible to the user */
  projectsCount: number;
  /** SUM(projects.total_sales_value) for active/approved/completed projects */
  totalProjectValue: number;
  /** COUNT of open hot_projects (stage NOT IN won/lost/cancelled) */
  pipelineProjectsCount: number;
  /** SUM(hot_projects.estimated_value) for open pipeline — unweighted */
  totalPipelineValue: number;
  /** SUM(estimated_value × probability) for open pipeline — weighted (matches the Pipeline Projects page) */
  totalPipelineValueWeighted: number;
  /**
   * COUNT of projects matching the "at risk" definition.
   * Current definition (interim): project_status = 'sent_back_for_revision'.
   * WARNING: this definition means "admin sent SO back for revision", not a
   * commercial delivery risk. A product decision is required to redefine this
   * as overdue-delivery or overdue-milestone risk. See warnings array.
   */
  projectsAtRiskCount: number;
  /**
   * SUM(invoice_amount) for project_invoicing_schedule WHERE status IN
   * ('scheduled','overdue','rescheduled'). These are planned but not yet invoiced.
   * Label as "Pending Invoicing" — NOT "Total Outstanding" which implies billed-but-unpaid.
   * Source: project_invoicing_schedule (migration 100).
   */
  pendingInvoicingValue: number;
  /**
   * SUM(amount - paid_amount) for milestones WHERE milestone_status IN
   * ('submitted','approved','overdue'). These are invoiced but not yet collected.
   * Separate from pendingInvoicingValue. Label as "Outstanding Receivables".
   */
  outstandingReceivablesValue: number;
  /**
   * SUM(paid_amount) for milestones WHERE milestone_status = 'paid'
   * AND EXTRACT(year FROM paid_at) = selectedYear.
   */
  collectionToDateValue: number;
}

// ── Monthly Invoicing Plan Row ────────────────────────────────────────────────

export interface SalesInvoicingPlanMonths {
  jan: number | null;
  feb: number | null;
  mar: number | null;
  apr: number | null;
  may: number | null;
  jun: number | null;
  jul: number | null;
  aug: number | null;
  sep: number | null;
  oct: number | null;
  nov: number | null;
  dec: number | null;
}

export interface SalesInvoicingPlanRow {
  projectId: string;
  projectCode: string;
  customerName: string;
  /** SO number — maps to projects.so_number */
  orderOrPo: string;
  /** Work Order (WO) reference numbers from project_execution_references (Saudi). */
  woNumbers: string[];
  /** Part Number (PN) reference numbers from project_execution_references (Dubai). */
  pnNumbers: string[];
  /**
   * "Job On Hand" — the vehicle type(s) on this project's vehicle lines
   * (e.g. "Ambulance"). Joined distinct from project_vehicle_lines.vehicle_type.
   */
  vehicleType: string;
  /**
   * Total vehicle-line quantity for this project (units).
   * Null only when the project has no vehicle lines or lines are not readable.
   */
  quantity: number | null;
  /** projects.total_sales_value */
  totalValue: number;
  /**
   * SUM(invoice_amount) for schedule lines WHERE status IN ('scheduled','overdue','rescheduled')
   * for this project. Source: project_invoicing_schedule.
   */
  pendingInvoicing: number;
  /**
   * Per-month SUM(invoice_amount) for schedule lines in selectedYear, keyed by month name.
   * Multiple lines in the same project+month are summed.
   * Source: project_invoicing_schedule.current_invoice_date → invoice_month.
   */
  months: SalesInvoicingPlanMonths;
  /** SUM of all month cells (schedule lines in selectedYear) */
  ttl: number;
  /** Same as ttl — included for UI flexibility. "Up to the end of {year}". */
  selectedYearValue: number;
  /**
   * "Carry over" — SUM(invoice_amount) for schedule lines dated AFTER the selected
   * year (invoice_year > selectedYear): anything that will not invoice during the
   * selected year. Source: project_invoicing_schedule.
   */
  carryOver: number;
}

// ── Annual Targets ────────────────────────────────────────────────────────────

export interface SalesDashboardV2Targets {
  targetYear: number;

  // ─ Sales Order targets ─
  /** From sales_user_targets.sales_order_target — null if not yet set */
  salesOrderTarget: number | null;
  /**
   * SUM(projects.total_sales_value) WHERE project_status IN ('approved','active','completed')
   * AND approved_at IN targetYear. Formula assumption: SO is "achieved" when approved.
   */
  salesOrderAchieved: number;
  /**
   * SUM(projects.total_sales_value) for approved/active/completed projects regardless
   * of year — represents the full portfolio plan for context.
   */
  salesOrderYearPlan: number;
  /**
   * salesOrderAchieved + SUM(hot_projects.estimated_value) for open pipeline.
   * Represents a reasonable expected total if pipeline converts.
   */
  salesOrderExpectedTotal: number;
  /** salesOrderAchieved / salesOrderTarget * 100 — null if target not set */
  salesOrderPercent: number | null;

  // ─ Invoicing targets ─
  /** From sales_user_targets.invoicing_target — null if not yet set */
  invoicingTarget: number | null;
  /**
   * SUM(invoice_amount) for schedule lines WHERE status='invoiced' AND invoice_year=targetYear.
   * Represents value formally invoiced this year.
   * Source: project_invoicing_schedule.
   */
  invoicingUpToDate: number;
  /**
   * SUM(invoice_amount) for schedule lines WHERE invoice_year=targetYear AND status != 'invoiced'.
   * Still-planned invoicing for this year.
   * Source: project_invoicing_schedule.
   */
  invoicingYearPlan: number;
  /** invoicingUpToDate + invoicingYearPlan */
  invoicingExpectedTotal: number;
  /** invoicingExpectedTotal / invoicingTarget * 100 — null if target not set */
  invoicingPercent: number | null;
  /** invoicingUpToDate / invoicingTarget * 100 — null if target not set */
  invoicingActualPercentUpToNow: number | null;

  // ─ Collection targets ─
  /**
   * From sales_user_targets.collection_target.
   * null if not yet set — do not substitute invoicingTarget.
   */
  collectionTarget: number | null;
  /**
   * SUM(paid_amount) for milestones WHERE status='paid' AND paid_at IN targetYear.
   * Same source as invoicingUpToDate — collected = paid milestones for the year.
   */
  collectedToDate: number;
  /** collectedToDate / collectionTarget * 100 — null if target not set */
  collectionPercent: number | null;
}

// ── Top-level data container ──────────────────────────────────────────────────

export interface SalesDashboardV2Warnings {
  projectsAtRiskDefinitionPending: boolean;
  collectionTargetNotSet: boolean;
  invoicingTargetNotSet: boolean;
  salesOrderTargetNotSet: boolean;
  noTargetsRecord: boolean;
  /** No longer applicable — invoicing plan reads project_invoicing_schedule directly. Always false. */
  receivablesViewMixedScope: boolean;
  /** True when any non-cancelled schedule line has current_invoice_date in the past. */
  overdueInvoicingScheduleExists: boolean;
  /**
   * True when project_invoicing_schedule (migration 100) is not available in the database.
   * The dashboard still renders projects/pipeline/targets; invoicing-schedule-derived values
   * are shown as unavailable (NOT silently zero).
   */
  invoicingScheduleUnavailable: boolean;
  /** True when sales_user_targets (migration 099) is not available in the database. */
  salesTargetsUnavailable: boolean;
}

export interface SalesDashboardV2Metadata {
  selectedYear: number;
  salesUserId: string;
  generatedAt: string;
  hasTargets: boolean;
  collectionTargetSet: boolean;
}

export interface SalesDashboardV2Data {
  summary: SalesDashboardV2Summary;
  invoicingPlanRows: SalesInvoicingPlanRow[];
  targets: SalesDashboardV2Targets;
  warnings: SalesDashboardV2Warnings;
  metadata: SalesDashboardV2Metadata;
}
