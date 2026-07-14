// ── Dubai / AFS Admin Console ──────────────────────────────────────────────────
// Admin oversight of four Dubai-followup / after-sales risk signals:
//   1. Open maintenance requests — afs_maintenance_requests not completed/closed/
//      cancelled, aged by reported date (with priority).
//   2. Unresolved missing items — afs_missing_items still open/requested.
//   3. Delayed ETAs — dubai_project_followups with eta_status delayed/changed.
//   4. Pre-delivery not ready — afs_predelivery_reports readiness_status 'not_ready'.
// Read-only; rides admin RLS. Each signal degrades independently (missing table
// or blocked read → that section is empty, never a hard error).

import { supabase, isSupabaseConfigured } from './supabase';

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export interface OpenMaintenanceRow {
  id: string; requestNumber: string; customerName: string;
  priority: string; status: string; daysOpen: number;
}
export interface MissingItemRow {
  id: string; itemName: string; projectCode: string | null; status: string; daysOpen: number;
}
export interface EtaDelayRow {
  id: string; projectCode: string | null; poNumber: string | null;
  etaDate: string | null; etaStatus: string;
}
export interface PredeliveryRow {
  id: string; reportNumber: string; projectCode: string | null; daysWaiting: number;
}

export interface AfsConsoleResult {
  openMaintenance: OpenMaintenanceRow[];
  missingItems: MissingItemRow[];
  etaDelays: EtaDelayRow[];
  predeliveryNotReady: PredeliveryRow[];
  arrivedCount: number;
  error: string | null;
}

const MAINT_CLOSED = '(completed,closed,cancelled)';
const MISSING_OPEN = ['open', 'requested'];
const ETA_DELAYED = ['delayed', 'changed'];

export async function getAfsAdminConsole(): Promise<AfsConsoleResult> {
  const empty: AfsConsoleResult = {
    openMaintenance: [], missingItems: [], etaDelays: [], predeliveryNotReady: [], arrivedCount: 0, error: null,
  };
  if (!isSupabaseConfigured || !supabase) return empty;
  const db = supabase;

  const [maintRes, missingRes, etaRes, predelRes, arrivedRes] = await Promise.all([
    db.from('afs_maintenance_requests')
      .select('id, maintenance_request_number, customer_name, priority, maintenance_status, reported_date')
      .not('maintenance_status', 'in', MAINT_CLOSED)
      .order('reported_date', { ascending: true })
      .limit(100),
    db.from('afs_missing_items')
      .select('id, item_name, missing_item_status, created_at, project:projects(project_code)')
      .in('missing_item_status', MISSING_OPEN)
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('dubai_project_followups')
      .select('id, dubai_po_number, eta_date, eta_status, project:projects(project_code)')
      .in('eta_status', ETA_DELAYED)
      .order('eta_date', { ascending: true })
      .limit(100),
    db.from('afs_predelivery_reports')
      .select('id, predelivery_report_number, readiness_status, created_at, project:projects(project_code)')
      .eq('readiness_status', 'not_ready')
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('afs_arrival_reports').select('id', { count: 'exact', head: true }).eq('arrival_status', 'arrived'),
  ]);

  // 1. Open maintenance requests
  const openMaintenance: OpenMaintenanceRow[] = maintRes.error ? [] : (maintRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; maintenance_request_number: string; customer_name: string; priority: string; maintenance_status: string; reported_date: string };
    return {
      id: row.id, requestNumber: row.maintenance_request_number, customerName: row.customer_name,
      priority: row.priority, status: (row.maintenance_status ?? '').replace(/_/g, ' '), daysOpen: daysSince(row.reported_date),
    };
  }).sort((a, b) => b.daysOpen - a.daysOpen);

  // 2. Unresolved missing items
  const missingItems: MissingItemRow[] = missingRes.error ? [] : (missingRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; item_name: string | null; missing_item_status: string; created_at: string; project: { project_code: string } | null };
    return {
      id: row.id, itemName: row.item_name ?? '—', projectCode: row.project?.project_code ?? null,
      status: (row.missing_item_status ?? '').replace(/_/g, ' '), daysOpen: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysOpen - a.daysOpen);

  // 3. Delayed ETAs
  const etaDelays: EtaDelayRow[] = etaRes.error ? [] : (etaRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; dubai_po_number: string | null; eta_date: string | null; eta_status: string; project: { project_code: string } | null };
    return {
      id: row.id, projectCode: row.project?.project_code ?? null, poNumber: row.dubai_po_number,
      etaDate: row.eta_date, etaStatus: (row.eta_status ?? '').replace(/_/g, ' '),
    };
  });

  // 4. Pre-delivery not ready
  const predeliveryNotReady: PredeliveryRow[] = predelRes.error ? [] : (predelRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; predelivery_report_number: string; created_at: string; project: { project_code: string } | null };
    return { id: row.id, reportNumber: row.predelivery_report_number, projectCode: row.project?.project_code ?? null, daysWaiting: daysSince(row.created_at) };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  const arrivedCount = arrivedRes.error ? 0 : (arrivedRes.count ?? 0);

  return { openMaintenance, missingItems, etaDelays, predeliveryNotReady, arrivedCount, error: null };
}
