// ── Project Invoicing Schedule — Admin Query Helpers ──────────────────────────
// Read + reschedule/amount-adjust helpers for the Admin Invoicing Schedule page.
//
// MIGRATION-DEFERRED SAFETY:
//   project_invoicing_schedule, project_invoicing_schedule_history, the alerts
//   view, and the reschedule/amount RPCs are defined in migration 100 — which
//   may NOT be applied to the live Supabase database yet. Every function here
//   returns an availability descriptor and never throws on a missing relation or
//   missing function. Genuine, unrelated errors are still surfaced via `error`.
//
// All reads are scoped by RLS automatically (admin sees all; the page is
// admin-only). All writes go through SECURITY DEFINER RPCs — no direct table
// mutation, no fabricated history.
// ──────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import {
  classifyAvailability,
  isMissingFunctionError,
  isMissingRelationError,
  formatDeferredMigrationMessage,
  type DeferredAvailability,
} from './deferredMigrationSafety';

const MIGRATION_NUMBER = 100;
const FEATURE_NAME = 'project_invoicing_schedule';

export type PisStatus = 'scheduled' | 'overdue' | 'rescheduled' | 'invoiced' | 'cancelled';

// ── Row shapes ────────────────────────────────────────────────────────────────

export interface InvoicingScheduleAdminRow {
  id: string;
  projectId: string;
  projectCode: string;
  customerName: string;
  salesUserId: string | null;
  salesUserName: string | null;
  sequenceNo: number;
  scheduleLabel: string | null;
  scheduleDescription: string | null;
  invoiceAmount: number;
  invoicePercentage: number | null;
  originalDeliveryDate: string | null;
  originalInvoiceDate: string | null;
  currentInvoiceDate: string;
  invoiceYear: number;
  invoiceMonth: number;
  status: PisStatus;
  source: string;
  delayCount: number;
  lastChangeReason: string | null;
  lastChangeDetails: string | null;
  lastRescheduledAt: string | null;
  invoicedAt: string | null;
  invoiceReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicingScheduleHistoryRow {
  id: string;
  scheduleId: string;
  projectId: string;
  oldInvoiceDate: string | null;
  newInvoiceDate: string | null;
  oldInvoiceAmount: number | null;
  newInvoiceAmount: number | null;
  oldStatus: string | null;
  newStatus: string | null;
  changeReason: string;
  changeDetails: string | null;
  changedBy: string | null;
  changedAt: string;
}

export interface InvoicingScheduleAlertRow {
  scheduleId: string;
  projectId: string;
  projectCode: string;
  customerName: string;
  sequenceNo: number;
  scheduleLabel: string | null;
  currentInvoiceDate: string;
  invoiceAmount: number;
  daysOverdue: number;
  salesUserId: string | null;
  status: PisStatus;
  delayCount: number;
  lastChangeReason: string | null;
  lastChangeDetails: string | null;
}

// ── List params + result ──────────────────────────────────────────────────────

export interface GetInvoicingScheduleListParams {
  selectedYear?: number;
  selectedMonth?: number;
  status?: PisStatus | 'all';
  overdueOnly?: boolean;
  salesUserId?: string;
  search?: string;
}

export interface InvoicingScheduleListResult {
  data: InvoicingScheduleAdminRow[];
  availability: DeferredAvailability;
  warnings: string[];
  error: string | null;
}

const NOT_CONFIGURED_AVAILABILITY: DeferredAvailability = {
  available: false,
  migrationNumber: MIGRATION_NUMBER,
  unavailableReason: 'Supabase is not configured in this environment.',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// ── 1. Admin list ─────────────────────────────────────────────────────────────

export async function getProjectInvoicingScheduleAdminList(
  params: GetInvoicingScheduleListParams = {}
): Promise<InvoicingScheduleListResult> {
  if (!supabase) {
    return { data: [], availability: NOT_CONFIGURED_AVAILABILITY, warnings: [], error: null };
  }

  const { selectedYear, selectedMonth, status, overdueOnly, salesUserId, search } = params;

  // Join projects for code/customer; join sales-owner profile for a display name.
  let query = supabase
    .from('project_invoicing_schedule')
    .select(
      `id, project_id, sales_user_id, sequence_no, schedule_label, schedule_description,
       invoice_amount, invoice_percentage, original_delivery_date, original_invoice_date,
       current_invoice_date, invoice_year, invoice_month, status, source, delay_count,
       last_change_reason, last_change_details, last_rescheduled_at, invoiced_at,
       invoice_reference, created_at, updated_at,
       projects!inner ( project_code, customer_name ),
       profiles:sales_user_id ( full_name )`
    );

  if (selectedYear != null) query = query.eq('invoice_year', selectedYear);
  if (selectedMonth != null) query = query.eq('invoice_month', selectedMonth);
  if (status && status !== 'all') query = query.eq('status', status);
  if (salesUserId) query = query.eq('sales_user_id', salesUserId);
  if (overdueOnly) {
    query = query
      .lt('current_invoice_date', todayISO())
      .not('status', 'in', '(invoiced,cancelled)');
  }

  query = query.order('current_invoice_date', { ascending: true });

  const { data, error } = await query;

  const { availability, realError } = classifyAvailability(error, FEATURE_NAME, MIGRATION_NUMBER);
  if (!availability.available || realError) {
    return { data: [], availability, warnings: [], error: realError };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = mapAdminRows((data ?? []) as any[]);

  // Client-side search across project code and customer name.
  const warnings: string[] = [];
  if (search && search.trim()) {
    const needle = search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.projectCode.toLowerCase().includes(needle) ||
        r.customerName.toLowerCase().includes(needle)
    );
  }

  if (rows.length === 0) {
    warnings.push('No invoicing schedule lines match the current filters.');
  }

  return { data: rows, availability, warnings, error: null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAdminRows(raw: any[]): InvoicingScheduleAdminRow[] {
  return raw.map((r) => {
    const project = Array.isArray(r.projects) ? r.projects[0] : r.projects;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      projectId: r.project_id,
      projectCode: project?.project_code ?? '—',
      customerName: project?.customer_name ?? '—',
      salesUserId: r.sales_user_id ?? null,
      salesUserName: profile?.full_name ?? null,
      sequenceNo: r.sequence_no,
      scheduleLabel: r.schedule_label ?? null,
      scheduleDescription: r.schedule_description ?? null,
      invoiceAmount: Number(r.invoice_amount ?? 0),
      invoicePercentage: r.invoice_percentage != null ? Number(r.invoice_percentage) : null,
      originalDeliveryDate: r.original_delivery_date ?? null,
      originalInvoiceDate: r.original_invoice_date ?? null,
      currentInvoiceDate: r.current_invoice_date,
      invoiceYear: r.invoice_year,
      invoiceMonth: r.invoice_month,
      status: r.status,
      source: r.source,
      delayCount: r.delay_count ?? 0,
      lastChangeReason: r.last_change_reason ?? null,
      lastChangeDetails: r.last_change_details ?? null,
      lastRescheduledAt: r.last_rescheduled_at ?? null,
      invoicedAt: r.invoiced_at ?? null,
      invoiceReference: r.invoice_reference ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

// ── 2. History for one schedule line ──────────────────────────────────────────

export interface InvoicingScheduleHistoryResult {
  data: InvoicingScheduleHistoryRow[];
  availability: DeferredAvailability;
  error: string | null;
}

export async function getProjectInvoicingScheduleHistory(
  scheduleId: string
): Promise<InvoicingScheduleHistoryResult> {
  if (!supabase) {
    return { data: [], availability: NOT_CONFIGURED_AVAILABILITY, error: null };
  }
  if (!scheduleId) {
    return { data: [], availability: { available: true, migrationNumber: MIGRATION_NUMBER }, error: 'scheduleId is required' };
  }

  const { data, error } = await supabase
    .from('project_invoicing_schedule_history')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('changed_at', { ascending: false });

  const { availability, realError } = classifyAvailability(error, 'project_invoicing_schedule_history', MIGRATION_NUMBER);
  if (!availability.available || realError) {
    return { data: [], availability, error: realError };
  }

  const rows: InvoicingScheduleHistoryRow[] = (data ?? []).map((r) => ({
    id: r.id,
    scheduleId: r.schedule_id,
    projectId: r.project_id,
    oldInvoiceDate: r.old_invoice_date,
    newInvoiceDate: r.new_invoice_date,
    oldInvoiceAmount: r.old_invoice_amount != null ? Number(r.old_invoice_amount) : null,
    newInvoiceAmount: r.new_invoice_amount != null ? Number(r.new_invoice_amount) : null,
    oldStatus: r.old_status,
    newStatus: r.new_status,
    changeReason: r.change_reason,
    changeDetails: r.change_details,
    changedBy: r.changed_by,
    changedAt: r.changed_at,
  }));

  return { data: rows, availability, error: null };
}

// ── 3. Overdue alerts (alerts view) ───────────────────────────────────────────

export interface InvoicingScheduleAlertsResult {
  data: InvoicingScheduleAlertRow[];
  availability: DeferredAvailability;
  error: string | null;
}

export async function getProjectInvoicingScheduleAlerts(
  params: { salesUserId?: string } = {}
): Promise<InvoicingScheduleAlertsResult> {
  if (!supabase) {
    return { data: [], availability: NOT_CONFIGURED_AVAILABILITY, error: null };
  }

  let query = supabase
    .from('project_invoicing_schedule_alerts_view')
    .select('*')
    .order('current_invoice_date', { ascending: true });

  if (params.salesUserId) query = query.eq('sales_user_id', params.salesUserId);

  const { data, error } = await query;

  const { availability, realError } = classifyAvailability(error, 'project_invoicing_schedule_alerts_view', MIGRATION_NUMBER);
  if (!availability.available || realError) {
    return { data: [], availability, error: realError };
  }

  const rows: InvoicingScheduleAlertRow[] = (data ?? []).map((r) => ({
    scheduleId: r.schedule_id,
    projectId: r.project_id,
    projectCode: r.project_code,
    customerName: r.customer_name,
    sequenceNo: r.sequence_no,
    scheduleLabel: r.schedule_label,
    currentInvoiceDate: r.current_invoice_date,
    invoiceAmount: Number(r.invoice_amount ?? 0),
    daysOverdue: r.days_overdue,
    salesUserId: r.sales_user_id,
    status: r.status,
    delayCount: r.delay_count ?? 0,
    lastChangeReason: r.last_change_reason,
    lastChangeDetails: r.last_change_details,
  }));

  return { data: rows, availability, error: null };
}

// ── Mutation result shape ─────────────────────────────────────────────────────

export interface ScheduleMutationResult {
  success: boolean;
  /** True when the RPC itself is unavailable (migration pending). */
  unavailable: boolean;
  unavailableReason?: string;
  error: string | null;
}

// ── 4. Reschedule (RPC) ───────────────────────────────────────────────────────

export interface RescheduleParams {
  scheduleId: string;
  newInvoiceDate: string;
  changeReason: string;
  changeDetails?: string | null;
}

export async function rescheduleProjectInvoicingSchedule(
  params: RescheduleParams
): Promise<ScheduleMutationResult> {
  const { scheduleId, newInvoiceDate, changeReason, changeDetails } = params;

  // ── Client-side validation (mirrors the RPC's own checks) ──
  if (!scheduleId) return { success: false, unavailable: false, error: 'Schedule line is required.' };
  if (!newInvoiceDate) return { success: false, unavailable: false, error: 'A new invoice date is required.' };
  if (!changeReason || !changeReason.trim()) {
    return { success: false, unavailable: false, error: 'A change reason is required.' };
  }

  if (!supabase) {
    return {
      success: false,
      unavailable: true,
      unavailableReason: 'Supabase is not configured in this environment.',
      error: null,
    };
  }

  const { error } = await supabase.rpc('reschedule_project_invoicing_schedule', {
    p_schedule_id: scheduleId,
    p_new_invoice_date: newInvoiceDate,
    p_change_reason: changeReason.trim(),
    p_change_details: changeDetails?.trim() || null,
  });

  if (error) {
    if (isMissingFunctionError(error) || isMissingRelationError(error)) {
      return {
        success: false,
        unavailable: true,
        unavailableReason: formatDeferredMigrationMessage('reschedule_project_invoicing_schedule', MIGRATION_NUMBER),
        error: null,
      };
    }
    return { success: false, unavailable: false, error: error.message };
  }

  return { success: true, unavailable: false, error: null };
}

// ── 5. Update amount (RPC) ────────────────────────────────────────────────────

export interface UpdateAmountParams {
  scheduleId: string;
  newInvoiceAmount: number;
  changeReason: string;
  changeDetails?: string | null;
}

export async function updateProjectInvoicingScheduleAmount(
  params: UpdateAmountParams
): Promise<ScheduleMutationResult> {
  const { scheduleId, newInvoiceAmount, changeReason, changeDetails } = params;

  if (!scheduleId) return { success: false, unavailable: false, error: 'Schedule line is required.' };
  if (typeof newInvoiceAmount !== 'number' || Number.isNaN(newInvoiceAmount) || newInvoiceAmount < 0) {
    return { success: false, unavailable: false, error: 'Amount must be a number greater than or equal to 0.' };
  }
  if (!changeReason || !changeReason.trim()) {
    return { success: false, unavailable: false, error: 'A change reason is required.' };
  }

  if (!supabase) {
    return {
      success: false,
      unavailable: true,
      unavailableReason: 'Supabase is not configured in this environment.',
      error: null,
    };
  }

  const { error } = await supabase.rpc('update_project_invoicing_schedule_amount', {
    p_schedule_id: scheduleId,
    p_new_invoice_amount: newInvoiceAmount,
    p_change_reason: changeReason.trim(),
    p_change_details: changeDetails?.trim() || null,
  });

  if (error) {
    if (isMissingFunctionError(error) || isMissingRelationError(error)) {
      return {
        success: false,
        unavailable: true,
        unavailableReason: formatDeferredMigrationMessage('update_project_invoicing_schedule_amount', MIGRATION_NUMBER),
        error: null,
      };
    }
    return { success: false, unavailable: false, error: error.message };
  }

  return { success: true, unavailable: false, error: null };
}

// ── 6. Split into installments (RPC) ──────────────────────────────────────────

export interface SplitInstallmentInput {
  invoiceDate: string;
  amount: number;
  label?: string | null;
}

export interface SplitParams {
  scheduleId: string;
  /** The line's current amount — installments must sum to this. */
  originalAmount: number;
  installments: SplitInstallmentInput[];
}

export async function splitProjectInvoicingSchedule(
  params: SplitParams,
): Promise<ScheduleMutationResult> {
  const { scheduleId, originalAmount, installments } = params;

  // ── Client-side validation (mirrors the RPC's own checks) ──
  if (!scheduleId) return { success: false, unavailable: false, error: 'Schedule line is required.' };
  if (!Array.isArray(installments) || installments.length < 2) {
    return { success: false, unavailable: false, error: 'A split needs at least 2 installments.' };
  }
  for (const it of installments) {
    if (!it.invoiceDate) return { success: false, unavailable: false, error: 'Every installment needs a date.' };
    if (typeof it.amount !== 'number' || Number.isNaN(it.amount) || it.amount < 0) {
      return { success: false, unavailable: false, error: 'Every installment needs a valid amount.' };
    }
  }
  const sum = installments.reduce((s, it) => s + it.amount, 0);
  if (Math.round(sum * 100) !== Math.round(originalAmount * 100)) {
    return {
      success: false,
      unavailable: false,
      error: `Installments must sum to the original amount (${originalAmount.toLocaleString()}). Current total: ${sum.toLocaleString()}.`,
    };
  }

  if (!supabase) {
    return {
      success: false,
      unavailable: true,
      unavailableReason: 'Supabase is not configured in this environment.',
      error: null,
    };
  }

  const { error } = await supabase.rpc('split_project_invoicing_schedule', {
    p_schedule_id: scheduleId,
    p_installments: installments.map((it) => ({
      invoice_date: it.invoiceDate,
      amount: it.amount,
      label: it.label?.trim() || null,
    })),
  });

  if (error) {
    if (isMissingFunctionError(error) || isMissingRelationError(error)) {
      return {
        success: false,
        unavailable: true,
        unavailableReason: formatDeferredMigrationMessage('split_project_invoicing_schedule', 111),
        error: null,
      };
    }
    return { success: false, unavailable: false, error: error.message };
  }

  return { success: true, unavailable: false, error: null };
}

// ── KPI summary (pure, from already-fetched rows) ─────────────────────────────

export interface InvoicingScheduleKpis {
  totalScheduledAmount: number;
  pendingInvoicingAmount: number;
  overdueAmount: number;
  overdueLinesCount: number;
  invoicedAmount: number;
  rescheduledLinesCount: number;
}

const PENDING_STATUSES: PisStatus[] = ['scheduled', 'overdue', 'rescheduled'];

export function computeInvoicingScheduleKpis(rows: InvoicingScheduleAdminRow[]): InvoicingScheduleKpis {
  const today = todayISO();
  let totalScheduledAmount = 0;
  let pendingInvoicingAmount = 0;
  let overdueAmount = 0;
  let overdueLinesCount = 0;
  let invoicedAmount = 0;
  let rescheduledLinesCount = 0;

  for (const r of rows) {
    if (r.status === 'cancelled') continue;
    totalScheduledAmount += r.invoiceAmount;
    if (PENDING_STATUSES.includes(r.status)) pendingInvoicingAmount += r.invoiceAmount;
    if (r.status === 'invoiced') invoicedAmount += r.invoiceAmount;
    if (r.status === 'rescheduled') rescheduledLinesCount += 1;
    const isOverdue = r.currentInvoiceDate < today && r.status !== 'invoiced';
    if (isOverdue) {
      overdueAmount += r.invoiceAmount;
      overdueLinesCount += 1;
    }
  }

  return {
    totalScheduledAmount,
    pendingInvoicingAmount,
    overdueAmount,
    overdueLinesCount,
    invoicedAmount,
    rescheduledLinesCount,
  };
}
