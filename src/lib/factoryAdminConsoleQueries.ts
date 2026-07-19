// ── Factory Admin Console ──────────────────────────────────────────────────────
// Admin oversight of four factory / production risk signals:
//   1. Projects missing a Work Order — Saudi approved projects with no confirmed
//      WO (factory execution is blocked until a WO is entered).
//   2. Stalled production — factory_records on hold, or overdue for their monthly
//      progress update (>30 days since last update while an update is required).
//   3. Open raw-material requests — production_raw_material_requests not yet
//      fulfilled/rejected/cancelled, aged by request date.
//   4. Completed awaiting QC — production finished (production_completed) but not
//      yet handed off to QC.
// Read-only; rides admin RLS. Each signal degrades independently (missing table
// or blocked read → that section is empty, never a hard error).

import { supabase, isSupabaseConfigured } from './supabase';
import { fetchProjectIdsWithActiveReference } from './executionGate';

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export interface MissingWoRow {
  id: string; projectCode: string; customerName: string; daysWaiting: number;
}
export interface StalledProductionRow {
  id: string; projectCode: string; customerName: string;
  status: string; reason: string; daysSinceUpdate: number;
}
export interface OpenRmrRow {
  id: string; requestNumber: string; projectCode: string | null;
  requestType: string; status: string; daysWaiting: number;
}
export interface ReadyForQcRow {
  id: string; projectCode: string; customerName: string; daysWaiting: number;
}

export interface FactoryConsoleResult {
  missingWo: MissingWoRow[];
  stalled: StalledProductionRow[];
  openRmrs: OpenRmrRow[];
  readyForQc: ReadyForQcRow[];
  inProductionCount: number;
  error: string | null;
}

const RMR_OPEN_EXCLUDE = '("fulfilled","rejected","cancelled")';
const UPDATE_OVERDUE_DAYS = 30;

interface ProjRef { project_code: string; customer_name: string }

export async function getFactoryAdminConsole(): Promise<FactoryConsoleResult> {
  const empty: FactoryConsoleResult = {
    missingWo: [], stalled: [], openRmrs: [], readyForQc: [], inProductionCount: 0, error: null,
  };
  if (!isSupabaseConfigured || !supabase) return empty;
  const db = supabase;

  const [saudiProjRes, recordsRes, rmrRes, inProdRes, woProjectIds] = await Promise.all([
    db.from('projects')
      .select('id, project_code, customer_name, created_at')
      .eq('manufacturing_location', 'saudi')
      .eq('project_status', 'approved'),
    db.from('factory_records')
      .select('id, project_id, wo_reference_id, production_status, monthly_update_required, last_updated_at, project:projects(project_code, customer_name)')
      .limit(1000),
    db.from('production_raw_material_requests')
      .select('id, request_number, request_type, status, requested_at, project:projects(project_code)')
      .not('status', 'in', RMR_OPEN_EXCLUDE)
      .order('requested_at', { ascending: true })
      .limit(100),
    db.from('factory_records').select('id', { count: 'exact', head: true }).eq('production_status', 'in_production'),
    // Authoritative WO presence: the execution-reference register (same source as
    // the WO/PN gate), NOT factory_records.wo_reference_id — a project with a
    // confirmed WO but no production record yet must not read as "missing WO".
    fetchProjectIdsWithActiveReference('wo'),
  ]);

  type RecRow = {
    id: string; project_id: string; wo_reference_id: string | null; production_status: string;
    monthly_update_required: boolean; last_updated_at: string; project: ProjRef | null;
  };
  const records: RecRow[] = recordsRes.error ? [] : ((recordsRes.data ?? []) as unknown as RecRow[]);

  // 1. Projects missing a Work Order — Saudi approved projects with no active WO
  //    in the execution-reference register (matches the WO/PN gate). Derived from
  //    the register, not factory_records, so a project with a confirmed WO but no
  //    production record yet is correctly treated as having its WO.
  const missingWo: MissingWoRow[] = saudiProjRes.error ? [] : (saudiProjRes.data ?? [])
    .map((p) => {
      const row = p as unknown as { id: string; project_code: string; customer_name: string; created_at: string };
      return { id: row.id, projectCode: row.project_code, customerName: row.customer_name, daysWaiting: daysSince(row.created_at) };
    })
    .filter((p) => !woProjectIds.has(p.id))
    .sort((a, b) => b.daysWaiting - a.daysWaiting);

  // 2. Stalled production — on hold, or overdue for a required monthly update.
  const stalled: StalledProductionRow[] = records
    .map((r) => {
      const days = daysSince(r.last_updated_at);
      const onHold = r.production_status === 'on_hold';
      const overdue = r.monthly_update_required && days > UPDATE_OVERDUE_DAYS;
      if (!onHold && !overdue) return null;
      return {
        id: r.id,
        projectCode: r.project?.project_code ?? '—',
        customerName: r.project?.customer_name ?? '—',
        status: r.production_status,
        reason: onHold ? 'On hold' : `Update overdue (${days}d)`,
        daysSinceUpdate: days,
      };
    })
    .filter((r): r is StalledProductionRow => r !== null)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

  // 3. Open raw-material requests, aged.
  const openRmrs: OpenRmrRow[] = rmrRes.error ? [] : (rmrRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; request_number: string; request_type: string; status: string; requested_at: string; project: { project_code: string } | null };
    return {
      id: row.id, requestNumber: row.request_number,
      projectCode: row.project?.project_code ?? null,
      requestType: (row.request_type ?? '').replace(/_/g, ' '),
      status: (row.status ?? '').replace(/_/g, ' '),
      daysWaiting: daysSince(row.requested_at),
    };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  // 4. Completed, awaiting QC hand-off.
  const readyForQc: ReadyForQcRow[] = records
    .filter(r => r.production_status === 'production_completed')
    .map(r => ({
      id: r.id,
      projectCode: r.project?.project_code ?? '—',
      customerName: r.project?.customer_name ?? '—',
      daysWaiting: daysSince(r.last_updated_at),
    }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting);

  const inProductionCount = inProdRes.error ? 0 : (inProdRes.count ?? 0);

  return { missingWo, stalled, openRmrs, readyForQc, inProductionCount, error: null };
}
