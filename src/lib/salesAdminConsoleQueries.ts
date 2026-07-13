// ── Sales Admin Console ────────────────────────────────────────────────────────
// Admin-only cross-salesman aggregation: for every sales_user, target attainment,
// open + SLA-overdue quotations, and open pipeline value — in a few grouped
// queries (not per-user round-trips). Read-only; rides existing admin RLS.

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError } from './deferredMigrationSafety';
import { getSalesUsers, getSalesTargetsAdminList } from './salesTargetsQueries';
import { isQuotationOverdue } from './quotationSla';
import type { QuotationRequest } from '../types';

const OPEN_HOT_STAGES = ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation'];
const CLOSED_QUOTATION = ['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'];
const SO_ACHIEVED_STATUSES = ['approved', 'active', 'completed'];

function inYear(iso: string | null | undefined, year: number): boolean {
  if (!iso) return false;
  return iso >= `${year}-01-01` && iso < `${year + 1}-01-01`;
}

function pct(num: number, den: number | null): number | null {
  if (den == null || den === 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

export interface SalesmanConsoleRow {
  userId: string;
  name: string;
  email: string;
  soTarget: number | null;
  soAchieved: number;
  soPercent: number | null;
  invoicingTarget: number | null;
  collectionTarget: number | null;
  openQuotations: number;
  overdueQuotations: number;
  pipelineValue: number;
  pipelineOpenCount: number;
  hasTarget: boolean;
}

export interface SalesConsoleResult {
  rows: SalesmanConsoleRow[];
  year: number;
  targetsUnavailable: boolean;
  error: string | null;
}

export async function getSalesAdminConsole(year: number): Promise<SalesConsoleResult> {
  const empty: SalesConsoleResult = { rows: [], year, targetsUnavailable: false, error: null };
  if (!isSupabaseConfigured || !supabase) return empty;
  const db = supabase;

  // 1. Salesmen (source of truth = user_roles)
  const usersRes = await getSalesUsers();
  if (usersRes.error) return { ...empty, error: usersRes.error };
  const users = usersRes.data;
  if (users.length === 0) return empty;

  // 2. Targets for the year (migration-safe)
  const targetsRes = await getSalesTargetsAdminList(year, users);
  const targetsUnavailable = !targetsRes.availability.available;
  const targetByUser = new Map(targetsRes.data.map((t) => [t.sales_user_id, t]));

  // 3–5. Projects (SO achieved), quotations (open/overdue), pipeline — grouped.
  const [projRes, quoteRes, hotRes] = await Promise.all([
    db.from('projects').select('sales_owner_id, total_sales_value, project_status, approved_at').in('project_status', SO_ACHIEVED_STATUSES),
    db.from('quotation_requests').select('requested_by, quotation_status, submitted_at, sent_to_estimation_at, updated_at'),
    db.from('hot_projects').select('created_by, stage, estimated_value'),
  ]);

  // Any of these being unavailable (missing table) degrades that metric to 0,
  // never an error — the console still renders the rest.
  const soByUser = new Map<string, number>();
  if (!projRes.error) {
    for (const p of (projRes.data ?? []) as { sales_owner_id: string | null; total_sales_value: number | null; approved_at: string | null }[]) {
      if (!p.sales_owner_id || !inYear(p.approved_at, year)) continue;
      soByUser.set(p.sales_owner_id, (soByUser.get(p.sales_owner_id) ?? 0) + (p.total_sales_value ?? 0));
    }
  } else if (!isMissingRelationError(projRes.error)) {
    return { ...empty, targetsUnavailable, error: projRes.error.message };
  }

  const openQByUser = new Map<string, number>();
  const overdueQByUser = new Map<string, number>();
  if (!quoteRes.error) {
    for (const q of (quoteRes.data ?? []) as Partial<QuotationRequest>[]) {
      const uid = q.requested_by;
      if (!uid || CLOSED_QUOTATION.includes(q.quotation_status as string)) continue;
      openQByUser.set(uid, (openQByUser.get(uid) ?? 0) + 1);
      if (isQuotationOverdue(q as QuotationRequest)) {
        overdueQByUser.set(uid, (overdueQByUser.get(uid) ?? 0) + 1);
      }
    }
  }

  const pipeValByUser = new Map<string, number>();
  const pipeCountByUser = new Map<string, number>();
  if (!hotRes.error) {
    for (const h of (hotRes.data ?? []) as { created_by: string | null; stage: string; estimated_value: number | null }[]) {
      if (!h.created_by || !OPEN_HOT_STAGES.includes(h.stage)) continue;
      pipeValByUser.set(h.created_by, (pipeValByUser.get(h.created_by) ?? 0) + (h.estimated_value ?? 0));
      pipeCountByUser.set(h.created_by, (pipeCountByUser.get(h.created_by) ?? 0) + 1);
    }
  }

  const rows: SalesmanConsoleRow[] = users.map((u) => {
    const t = targetByUser.get(u.id);
    const soAchieved = soByUser.get(u.id) ?? 0;
    const soTarget = t?.sales_order_target ?? null;
    return {
      userId: u.id,
      name: u.fullName ?? u.email,
      email: u.email,
      soTarget,
      soAchieved,
      soPercent: pct(soAchieved, soTarget),
      invoicingTarget: t?.invoicing_target ?? null,
      collectionTarget: t?.collection_target ?? null,
      openQuotations: openQByUser.get(u.id) ?? 0,
      overdueQuotations: overdueQByUser.get(u.id) ?? 0,
      pipelineValue: pipeValByUser.get(u.id) ?? 0,
      pipelineOpenCount: pipeCountByUser.get(u.id) ?? 0,
      hasTarget: t != null,
    };
  });

  return { rows, year, targetsUnavailable, error: null };
}
