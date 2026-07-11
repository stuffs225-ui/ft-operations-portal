// ── Financial Truth — query helpers (migration 103) ───────────────────────────
// Read helpers for the project_financials / project_schedule_reconciliation
// views and the per-project schedule lines. Same migration-deferred safety
// model as projectInvoicingScheduleQueries.ts: missing relations (103 or 100
// not yet applied) surface as an availability descriptor, never a crash.
//
// Convention (docs/implementation/financial-truth.md): schedule amounts are
// NET; VAT is derived from vat_applicable lines; both views are
// revenue-restricted in-DB to admin / operations_manager / owning sales_user —
// other roles simply receive zero rows.

import { supabase } from './supabase';
import { classifyAvailability, type DeferredAvailability } from './deferredMigrationSafety';

const MIGRATION_NUMBER = 103;

const NOT_CONFIGURED: DeferredAvailability = {
  available: false,
  migrationNumber: MIGRATION_NUMBER,
  unavailableReason: 'Supabase is not configured in this environment.',
};

export interface ProjectFinancialsRow {
  projectId: string;
  projectCode: string;
  soNumber: string;
  customerName: string;
  projectStatus: string;
  totalSalesValue: number;
  lineCount: number;
  linesNet: number;
  linesVat: number;
  linesGross: number;
  vatLineCount: number;
}

export interface ProjectFinancialsResult {
  /** null when the row is invisible to this role (revenue restriction) or 103 pending. */
  data: ProjectFinancialsRow | null;
  availability: DeferredAvailability;
  error: string | null;
}

export async function getProjectFinancials(projectId: string): Promise<ProjectFinancialsResult> {
  if (!supabase) return { data: null, availability: NOT_CONFIGURED, error: null };

  const { data, error } = await supabase
    .from('project_financials')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  const { availability, realError } = classifyAvailability(error, 'project_financials', MIGRATION_NUMBER);
  if (!availability.available || realError || !data) {
    return { data: null, availability, error: realError };
  }
  return {
    availability,
    error: null,
    data: {
      projectId: data.project_id,
      projectCode: data.project_code,
      soNumber: data.so_number,
      customerName: data.customer_name,
      projectStatus: data.project_status,
      totalSalesValue: Number(data.total_sales_value),
      lineCount: data.line_count,
      linesNet: Number(data.lines_net),
      linesVat: Number(data.lines_vat),
      linesGross: Number(data.lines_gross),
      vatLineCount: data.vat_line_count,
    },
  };
}

export type ReconciliationClass = 'matches_net' | 'matches_gross' | 'mismatch' | 'no_schedule';

export interface ScheduleReconciliationRow {
  projectId: string;
  projectCode: string;
  soNumber: string;
  customerName: string;
  projectStatus: string;
  totalSalesValue: number;
  linesNet: number;
  linesVat: number;
  linesGross: number;
  scheduleTotal: number;
  scheduleLines: number;
  reconciliation: ReconciliationClass;
}

export interface ScheduleReconciliationResult {
  data: ScheduleReconciliationRow[];
  availability: DeferredAvailability;
  error: string | null;
}

export async function getScheduleReconciliation(): Promise<ScheduleReconciliationResult> {
  if (!supabase) return { data: [], availability: NOT_CONFIGURED, error: null };

  const { data, error } = await supabase
    .from('project_schedule_reconciliation')
    .select('*')
    .order('project_code', { ascending: true });

  const { availability, realError } = classifyAvailability(error, 'project_schedule_reconciliation', MIGRATION_NUMBER);
  if (!availability.available || realError) {
    return { data: [], availability, error: realError };
  }
  return {
    availability,
    error: null,
    data: (data ?? []).map((r) => ({
      projectId: r.project_id,
      projectCode: r.project_code,
      soNumber: r.so_number,
      customerName: r.customer_name,
      projectStatus: r.project_status,
      totalSalesValue: Number(r.total_sales_value),
      linesNet: Number(r.lines_net),
      linesVat: Number(r.lines_vat),
      linesGross: Number(r.lines_gross),
      scheduleTotal: Number(r.schedule_total),
      scheduleLines: r.schedule_lines,
      reconciliation: r.reconciliation,
    })),
  };
}

// ── Per-project schedule lines (base table — migration 100) ──────────────────

export interface ProjectScheduleLine {
  id: string;
  sequenceNo: number;
  scheduleLabel: string | null;
  invoiceAmount: number;
  currentInvoiceDate: string;
  status: 'scheduled' | 'overdue' | 'rescheduled' | 'invoiced' | 'cancelled';
  source: string;
  delayCount: number;
  invoiceReference: string | null;
}

export interface ProjectScheduleLinesResult {
  data: ProjectScheduleLine[];
  availability: DeferredAvailability;
  error: string | null;
}

export async function getProjectScheduleLines(projectId: string): Promise<ProjectScheduleLinesResult> {
  if (!supabase) {
    return { data: [], availability: { ...NOT_CONFIGURED, migrationNumber: 100 }, error: null };
  }

  const { data, error } = await supabase
    .from('project_invoicing_schedule')
    .select('id, sequence_no, schedule_label, invoice_amount, current_invoice_date, status, source, delay_count, invoice_reference')
    .eq('project_id', projectId)
    .order('sequence_no', { ascending: true });

  const { availability, realError } = classifyAvailability(error, 'project_invoicing_schedule', 100);
  if (!availability.available || realError) {
    return { data: [], availability, error: realError };
  }
  return {
    availability,
    error: null,
    data: (data ?? []).map((r) => ({
      id: r.id,
      sequenceNo: r.sequence_no,
      scheduleLabel: r.schedule_label,
      invoiceAmount: Number(r.invoice_amount),
      currentInvoiceDate: r.current_invoice_date,
      status: r.status,
      source: r.source,
      delayCount: r.delay_count,
      invoiceReference: r.invoice_reference,
    })),
  };
}
