// ── Sales Workspace v3 — pillar + execution-glance queries ────────────────────
// One query layer shared by BOTH the /sales pillar sections and the printable
// reports (salesReports.ts) so the numbers can never drift between screen and
// paper. Everything is read-only and rides the existing RLS:
//   • hot_projects / quotation_requests: sales_user sees own rows only;
//     admin/ops see all (broad view / any-salesman reports).
//   • Execution glance: every table queried already grants sales_user
//     own-project SELECT (025 factory, 029 store, 081 QC, 019 PRs, 060 PO safe
//     view). A blocked or missing source degrades to null — never an error.

import { supabase, isSupabaseConfigured } from './supabase';
import type { HotProject, QuotationRequest } from '../types';

// Default on-screen cap (one salesman's list). Report generation passes a much
// larger cap AND reads the `truncated` flag so a broad report can never drop
// financial rows without saying so. See getWorkspace* `opts.limit`.
const DEFAULT_WORKSPACE_LIMIT = 300;

export interface WorkspaceQueryResult<T> {
  data: T[];
  error: string | null;
  /** True when the row count hit the requested cap — the list may be incomplete. */
  truncated: boolean;
}

// ── Pillar 2: Hot Projects ────────────────────────────────────────────────────

export async function getWorkspaceHotProjects(
  salesUserId: string | null,
  opts?: { limit?: number },
): Promise<WorkspaceQueryResult<HotProject>> {
  const limit = opts?.limit ?? DEFAULT_WORKSPACE_LIMIT;
  if (!isSupabaseConfigured || !supabase) return { data: [], error: null, truncated: false };
  let q = supabase
    .from('hot_projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (salesUserId) q = q.eq('created_by', salesUserId);
  const { data, error } = await q;
  if (error) return { data: [], error: error.message, truncated: false };
  const rows = (data as unknown as HotProject[]) ?? [];
  return { data: rows, error: null, truncated: rows.length >= limit };
}

// ── Pillar 3: Quotations ──────────────────────────────────────────────────────

export async function getWorkspaceQuotations(
  salesUserId: string | null,
  opts?: { limit?: number },
): Promise<WorkspaceQueryResult<QuotationRequest>> {
  const limit = opts?.limit ?? DEFAULT_WORKSPACE_LIMIT;
  if (!isSupabaseConfigured || !supabase) return { data: [], error: null, truncated: false };
  let q = supabase
    .from('quotation_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (salesUserId) q = q.eq('requested_by', salesUserId);
  const { data, error } = await q;
  if (error) return { data: [], error: error.message, truncated: false };
  const rows = (data as unknown as QuotationRequest[]) ?? [];
  return { data: rows, error: null, truncated: rows.length >= limit };
}

// ── Salesman picker (admin reports) ───────────────────────────────────────────

export interface SalesmanOption {
  id: string;
  name: string;
}

/** Admin-only in practice: user_roles is readable by admin (003). */
export async function getSalesmanOptions(): Promise<SalesmanOption[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: roleRows, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'sales_user');
  if (error || !roleRows?.length) return [];
  const ids = roleRows.map((r) => r.user_id);
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids);
  return (profs ?? [])
    .map((p) => ({ id: p.id as string, name: (p.full_name as string) || (p.email as string) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Part C: Execution glance (read-only, counts/statuses — no amounts) ────────

export interface GlanceSection {
  /** null = the source is not readable for this role/project (shown as "—"). */
  count: number | null;
  latestStatus: string | null;
  latestDate: string | null;
  extra?: string | null;
}

export interface ExecutionGlanceData {
  procurement: GlanceSection;
  purchaseOrders: GlanceSection;
  factory: GlanceSection;
  store: GlanceSection;
  qc: GlanceSection;
}

const BLOCKED: GlanceSection = { count: null, latestStatus: null, latestDate: null };

export async function getExecutionGlance(projectId: string): Promise<ExecutionGlanceData> {
  if (!isSupabaseConfigured || !supabase) {
    return { procurement: BLOCKED, purchaseOrders: BLOCKED, factory: BLOCKED, store: BLOCKED, qc: BLOCKED };
  }
  const db = supabase;

  const [pr, po, factory, store, qc] = await Promise.all([
    db.from('procurement_requests')
      .select('status, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false }),
    db.from('purchase_orders_to_supplier_safe')
      .select('po_status, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false }),
    db.from('factory_records')
      .select('production_status, progress_percentage, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(1),
    db.from('store_receipts')
      .select('status, received_date')
      .eq('project_id', projectId)
      .order('received_date', { ascending: false }),
    db.from('material_qc_inspections')
      .select('inspection_result')
      .eq('project_id', projectId),
  ]);

  const section = (
    res: { data: unknown[] | null; error: { message: string } | null },
    statusKey: string,
    dateKey: string | null,
  ): GlanceSection => {
    if (res.error) return BLOCKED; // RLS-blocked or missing — degrade silently
    const rows = (res.data ?? []) as Record<string, unknown>[];
    const first = rows[0];
    return {
      count: rows.length,
      latestStatus: first ? String(first[statusKey] ?? '') || null : null,
      latestDate: first && dateKey ? (first[dateKey] as string | null) : null,
    };
  };

  const factorySection = section(factory, 'production_status', 'updated_at');
  if (factorySection.count !== null && factory.data?.length) {
    const f = factory.data[0] as Record<string, unknown>;
    factorySection.extra = f.progress_percentage != null ? `${f.progress_percentage}%` : null;
  }

  // QC: pass/pending summary instead of a latest status.
  let qcSection: GlanceSection = BLOCKED;
  if (!qc.error) {
    const rows = (qc.data ?? []) as { inspection_result: string }[];
    const accepted = rows.filter((r) => r.inspection_result === 'accepted' || r.inspection_result === 'accepted_with_comments').length;
    const rejected = rows.filter((r) => r.inspection_result === 'rejected').length;
    const pending = rows.length - accepted - rejected;
    qcSection = {
      count: rows.length,
      latestStatus: rows.length === 0 ? null : `${accepted} passed · ${pending} pending${rejected ? ` · ${rejected} rejected` : ''}`,
      latestDate: null,
    };
  }

  return {
    procurement: section(pr, 'status', 'updated_at'),
    purchaseOrders: section(po, 'po_status', 'updated_at'),
    factory: factorySection,
    store: section(store, 'status', 'received_date'),
    qc: qcSection,
  };
}
