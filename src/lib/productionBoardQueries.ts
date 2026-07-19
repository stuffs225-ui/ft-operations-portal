// ── Unified production board (the Master List, inside the system) ─────────────
// One row per factory project, aggregating the data that today lives in separate
// pages/tables: WO, client, vehicle, chassis, %, manhours, delivery, engineering
// (requirements), and derived production status. Read-oriented; drill into the
// workspace / plan to edit. Deferred-migration safe.

import { supabase, isSupabaseConfigured } from './supabase';
import type { FactoryProductionStatus } from '../types';

export interface ProductionBoardRow {
  projectId: string;
  projectCode: string;
  client: string;
  soNumber: string;
  woNumber: string | null;
  description: string;
  qty: number;
  dep: 'AMB' | 'FT' | '—';
  chassisReceived: number;
  chassisTotal: number;
  chassisStatus: string | null;
  progressPct: number;
  unitsDone: number;
  unitsTotal: number;
  manhoursNeeded: number;
  deliverySchedule: string | null;
  engineeringApproved: number;
  engineeringTotal: number;
  productionStatus: FactoryProductionStatus;
  offlineNotes: string | null;
  onlineNotes: string | null;
}

// Least-advanced status wins (a project isn't further along than its slowest line).
const STATUS_ORDER: FactoryProductionStatus[] = [
  'not_started', 'details_requested', 'boq_pending', 'boq_uploaded',
  'ga_drawing_pending', 'ga_drawing_uploaded', 'detail_drawings_pending',
  'detail_drawings_uploaded', 'manhours_pending', 'manhours_added',
  'pending_raw_materials', 'in_production', 'monthly_update_required',
  'production_completed', 'sent_to_qc',
];
function leastAdvanced(a: FactoryProductionStatus, b: FactoryProductionStatus): FactoryProductionStatus {
  return STATUS_ORDER.indexOf(a) <= STATUS_ORDER.indexOf(b) ? a : b;
}

function depOf(vehicleType: string | null | undefined): 'AMB' | 'FT' | '—' {
  const t = (vehicleType ?? '').toLowerCase();
  if (t.includes('ambulance') || t.includes('amb')) return 'AMB';
  if (t.includes('fire') || t.includes('truck') || t.includes('rescue')) return 'FT';
  return '—';
}

export async function fetchProductionBoard(): Promise<ProductionBoardRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: recs } = await sb.from('factory_records')
    .select('project_id, production_status, progress_percentage');
  const records = (recs ?? []) as { project_id: string; production_status: FactoryProductionStatus; progress_percentage: number }[];
  if (records.length === 0) return [];

  const projectIds = Array.from(new Set(records.map((r) => r.project_id)));

  const [projRes, detRes, refRes, reqRes, lineRes] = await Promise.all([
    sb.from('projects').select('id, project_code, so_number, customer_name').in('id', projectIds),
    sb.from('project_production_details').select('*').in('project_id', projectIds),
    sb.from('project_execution_references').select('project_id, reference_number, reference_type, status').in('project_id', projectIds).eq('reference_type', 'wo'),
    sb.from('factory_item_requirements').select('project_id, status').in('project_id', projectIds),
    sb.from('project_vehicle_lines').select('project_id, vehicle_type, quantity').in('project_id', projectIds),
  ]);

  const projById = new Map<string, { project_code: string; so_number: string; customer_name: string }>();
  for (const p of (projRes.data ?? [])) projById.set(p.id, p);
  const detByProj = new Map<string, Record<string, unknown>>();
  for (const d of (detRes.data ?? [])) detByProj.set(d.project_id, d);
  const woByProj = new Map<string, string>();
  for (const r of (refRes.data ?? [])) {
    if (r.status !== 'cancelled' && r.status !== 'superseded' && !woByProj.has(r.project_id)) {
      woByProj.set(r.project_id, r.reference_number);
    }
  }
  const reqByProj = new Map<string, { approved: number; total: number }>();
  for (const r of (reqRes.data ?? [])) {
    const e = reqByProj.get(r.project_id) ?? { approved: 0, total: 0 };
    e.total += 1;
    if (r.status === 'approved' || r.status === 'not_applicable') e.approved += 1;
    reqByProj.set(r.project_id, e);
  }
  const lineByProj = new Map<string, { type: string | null; qty: number }>();
  for (const l of (lineRes.data ?? [])) {
    const e = lineByProj.get(l.project_id) ?? { type: null, qty: 0 };
    if (!e.type) e.type = l.vehicle_type;
    e.qty += l.quantity ?? 0;
    lineByProj.set(l.project_id, e);
  }

  const rows: ProductionBoardRow[] = projectIds.map((pid) => {
    const projRecs = records.filter((r) => r.project_id === pid);
    const progressPct = Math.round(projRecs.reduce((s, r) => s + (r.progress_percentage || 0), 0) / projRecs.length);
    const status = projRecs.reduce<FactoryProductionStatus>((acc, r) => leastAdvanced(acc, r.production_status), 'sent_to_qc');
    const proj = projById.get(pid);
    const det = (detByProj.get(pid) ?? {}) as Record<string, unknown>;
    const req = reqByProj.get(pid) ?? { approved: 0, total: 0 };
    const line = lineByProj.get(pid) ?? { type: null, qty: 0 };
    return {
      projectId: pid,
      projectCode: proj?.project_code ?? '—',
      client: proj?.customer_name ?? '—',
      soNumber: proj?.so_number ?? '—',
      woNumber: woByProj.get(pid) ?? null,
      description: line.type ?? '—',
      qty: line.qty,
      dep: depOf(line.type),
      chassisReceived: Number(det.chassis_received ?? 0),
      chassisTotal: Number(det.chassis_total ?? 0),
      chassisStatus: (det.chassis_status as string) ?? null,
      progressPct,
      unitsDone: projRecs.filter((r) => (r.progress_percentage || 0) >= 100).length,
      unitsTotal: projRecs.length,
      manhoursNeeded: Number(det.manhours_needed ?? 0),
      deliverySchedule: (det.delivery_schedule as string) ?? null,
      engineeringApproved: req.approved,
      engineeringTotal: req.total,
      productionStatus: status,
      offlineNotes: (det.offline_notes as string) ?? null,
      onlineNotes: (det.online_notes as string) ?? null,
    };
  });

  return rows.sort((a, b) => a.progressPct - b.progressPct);
}
