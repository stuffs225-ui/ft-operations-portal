// ── AFS Delivery-Readiness Board ──────────────────────────────────────────────
// One cross-project view of every Dubai follow-up and where it sits on the road
// to delivery: PN → Dubai production → in transit → arrived → pre-delivery →
// delivered, with the live blockers (no PN, ETA overdue, open missing items,
// pre-delivery not ready, follow-up overdue) surfaced per project. Replaces the
// six-page hop AFS users make today. Read-only, deferred-migration safe.

import { supabase, isSupabaseConfigured } from './supabase';
import type { DubaiStatus, EtaStatus } from '../types';

export type AfsStageKey = 'pn' | 'production' | 'transit' | 'arrived' | 'predelivery' | 'delivered';

export const AFS_STAGES: { key: AfsStageKey; label: string }[] = [
  { key: 'pn', label: 'PN' },
  { key: 'production', label: 'Dubai Production' },
  { key: 'transit', label: 'In Transit' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'predelivery', label: 'Pre-delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export type AfsVerdict = 'delivered' | 'ready' | 'blocked' | 'in_progress' | 'on_hold';

export interface AfsBoardRow {
  followupId: string;
  projectId: string;
  projectCode: string;
  customer: string;
  vehicleType: string | null;
  hasPn: boolean;
  dubaiStatus: DubaiStatus;
  stage: AfsStageKey;
  stageIndex: number;
  etaStatus: EtaStatus;
  etaDate: string | null;
  etaDays: number | null;
  openMissingItems: number;
  criticalMissing: number;
  predeliveryReady: boolean | null; // null = no pre-delivery report yet
  checklistPassed: number;
  checklistTotal: number;
  nextFollowupDate: string | null;
  followupOverdue: boolean;
  verdict: AfsVerdict;
  blockers: string[];
}

export interface AfsBoard {
  rows: AfsBoardRow[];
  counts: { total: number; blocked: number; ready: number; delivered: number; followupOverdue: number };
}

const EMPTY: AfsBoard = { rows: [], counts: { total: 0, blocked: 0, ready: 0, delivered: 0, followupOverdue: 0 } };

const OPEN_MISSING = ['open', 'requested'];

function stageOf(status: DubaiStatus): { key: AfsStageKey; index: number } {
  switch (status) {
    case 'not_started':
    case 'pending_dubai_po':
    case 'dubai_po_sent':
    case 'under_dubai_production':
      return { key: 'production', index: 1 };
    case 'eta_confirmed':
    case 'in_transit':
      return { key: 'transit', index: 2 };
    case 'arrived_ksa':
    case 'handed_to_afs':
      return { key: 'arrived', index: 3 };
    case 'ready_for_pre_delivery':
      return { key: 'predelivery', index: 4 };
    case 'completed':
      return { key: 'delivered', index: 5 };
    default:
      return { key: 'production', index: 1 };
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

interface FollowupLite {
  id: string; project_id: string; pn_reference_id: string | null; dubai_status: DubaiStatus;
  eta_status: EtaStatus; eta_date: string | null; next_followup_date: string | null;
  projectCode: string; customer: string; vehicleType: string | null;
}
interface PredeliveryLite { project_id: string; ready_for_delivery: boolean; checklist_items_total: number; checklist_items_passed: number; report_date: string | null }

function assemble(
  followups: FollowupLite[],
  missingByProject: Map<string, { open: number; critical: number }>,
  predeliveryByProject: Map<string, PredeliveryLite>,
): AfsBoard {
  const rows: AfsBoardRow[] = followups
    .filter((f) => f.dubai_status !== 'cancelled')
    .map((f) => {
      const stage = stageOf(f.dubai_status);
      const hasPn = !!f.pn_reference_id;
      const missing = missingByProject.get(f.project_id) ?? { open: 0, critical: 0 };
      const pd = predeliveryByProject.get(f.project_id);
      const predeliveryReady = pd ? pd.ready_for_delivery : null;
      const etaDays = daysUntil(f.eta_date);
      const etaOverdue = f.eta_status !== 'arrived' && f.dubai_status !== 'completed' && etaDays !== null && etaDays < 0;
      const nextDays = daysUntil(f.next_followup_date);
      const isTerminal = f.dubai_status === 'completed' || f.dubai_status === 'on_hold';
      const followupOverdue = !isTerminal && nextDays !== null && nextDays < 0;

      const blockers: string[] = [];
      if (!hasPn) blockers.push('No PN — Dubai progress blocked');
      if (f.dubai_status === 'on_hold') blockers.push('On hold');
      if (etaOverdue) blockers.push(`ETA overdue ${Math.abs(etaDays as number)}d`);
      else if (f.eta_status === 'delayed') blockers.push('ETA delayed');
      if (missing.open > 0) blockers.push(`${missing.open} missing item${missing.open !== 1 ? 's' : ''} open`);
      if (stage.index >= 3 && predeliveryReady === false) blockers.push('Pre-delivery not ready');
      if (followupOverdue) blockers.push('Follow-up overdue');

      let verdict: AfsVerdict;
      if (f.dubai_status === 'completed') verdict = 'delivered';
      else if (f.dubai_status === 'on_hold') verdict = 'on_hold';
      else if (predeliveryReady === true && missing.open === 0 && hasPn) verdict = 'ready';
      else if (!hasPn || missing.open > 0 || predeliveryReady === false || etaOverdue) verdict = 'blocked';
      else verdict = 'in_progress';

      return {
        followupId: f.id, projectId: f.project_id, projectCode: f.projectCode,
        customer: f.customer, vehicleType: f.vehicleType, hasPn, dubaiStatus: f.dubai_status,
        stage: stage.key, stageIndex: stage.index, etaStatus: f.eta_status, etaDate: f.eta_date, etaDays,
        openMissingItems: missing.open, criticalMissing: missing.critical, predeliveryReady,
        checklistPassed: pd?.checklist_items_passed ?? 0, checklistTotal: pd?.checklist_items_total ?? 0,
        nextFollowupDate: f.next_followup_date, followupOverdue, verdict, blockers,
      };
    });

  // Sort: blocked first, then in-progress, ready, delivered; within each, overdue follow-ups float up.
  const order: Record<AfsVerdict, number> = { blocked: 0, on_hold: 1, in_progress: 2, ready: 3, delivered: 4 };
  rows.sort((a, b) => (order[a.verdict] - order[b.verdict]) || (Number(b.followupOverdue) - Number(a.followupOverdue)) || (b.openMissingItems - a.openMissingItems));

  return {
    rows,
    counts: {
      total: rows.length,
      blocked: rows.filter((r) => r.verdict === 'blocked' || r.verdict === 'on_hold').length,
      ready: rows.filter((r) => r.verdict === 'ready').length,
      delivered: rows.filter((r) => r.verdict === 'delivered').length,
      followupOverdue: rows.filter((r) => r.followupOverdue).length,
    },
  };
}

function latestByProject(rows: PredeliveryLite[]): Map<string, PredeliveryLite> {
  const map = new Map<string, PredeliveryLite>();
  for (const r of rows) {
    const prev = map.get(r.project_id);
    if (!prev || (r.report_date ?? '') > (prev.report_date ?? '')) map.set(r.project_id, r);
  }
  return map;
}

export async function fetchAfsDeliveryBoard(): Promise<AfsBoard> {
  if (!isSupabaseConfigured || !supabase) {
    const [{ MOCK_DUBAI_FOLLOWUPS, MOCK_AFS_MISSING_ITEMS, MOCK_AFS_PREDELIVERY_REPORTS }, { mockOrEmpty }] =
      await Promise.all([import('../data/mockAfs'), import('./dataMode')]);
    const followups: FollowupLite[] = mockOrEmpty(MOCK_DUBAI_FOLLOWUPS).map((f) => ({
      id: f.id, project_id: f.project_id, pn_reference_id: f.pn_reference_id, dubai_status: f.dubai_status,
      eta_status: f.eta_status, eta_date: f.eta_date, next_followup_date: f.next_followup_date,
      projectCode: f.project?.project_code ?? '—', customer: f.project?.customer_name ?? '—',
      vehicleType: f.vehicle_line?.vehicle_type ?? null,
    }));
    const missingByProject = new Map<string, { open: number; critical: number }>();
    for (const m of mockOrEmpty(MOCK_AFS_MISSING_ITEMS)) {
      if (!OPEN_MISSING.includes(m.missing_item_status)) continue;
      const cur = missingByProject.get(m.project_id) ?? { open: 0, critical: 0 };
      cur.open += 1;
      if (m.severity === 'critical' || m.severity === 'high') cur.critical += 1;
      missingByProject.set(m.project_id, cur);
    }
    const predeliveryByProject = latestByProject(mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS).map((p) => ({
      project_id: p.project_id, ready_for_delivery: p.ready_for_delivery,
      checklist_items_total: p.checklist_items_total, checklist_items_passed: p.checklist_items_passed,
      report_date: p.report_date,
    })));
    return assemble(followups, missingByProject, predeliveryByProject);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [fuRes, missRes, pdRes] = await Promise.all([
    sb.from('dubai_project_followups')
      .select('id, project_id, pn_reference_id, dubai_status, eta_status, eta_date, next_followup_date, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
      .order('updated_at', { ascending: false }),
    sb.from('afs_missing_items').select('project_id, missing_item_status, severity').in('missing_item_status', OPEN_MISSING),
    sb.from('afs_predelivery_reports').select('project_id, ready_for_delivery, checklist_items_total, checklist_items_passed, report_date'),
  ]);
  if (fuRes.error) return EMPTY;

  const followups: FollowupLite[] = ((fuRes.data ?? []) as Record<string, unknown>[]).map((f) => ({
    id: f.id as string, project_id: f.project_id as string,
    pn_reference_id: (f.pn_reference_id as string) ?? null, dubai_status: f.dubai_status as DubaiStatus,
    eta_status: (f.eta_status as EtaStatus) ?? 'not_set', eta_date: (f.eta_date as string) ?? null,
    next_followup_date: (f.next_followup_date as string) ?? null,
    projectCode: (f.project as { project_code?: string } | null)?.project_code ?? '—',
    customer: (f.project as { customer_name?: string } | null)?.customer_name ?? '—',
    vehicleType: (f.vehicle_line as { vehicle_type?: string } | null)?.vehicle_type ?? null,
  }));

  const missingByProject = new Map<string, { open: number; critical: number }>();
  if (!missRes.error) {
    for (const m of (missRes.data ?? []) as { project_id: string; severity: string }[]) {
      const cur = missingByProject.get(m.project_id) ?? { open: 0, critical: 0 };
      cur.open += 1;
      if (m.severity === 'critical' || m.severity === 'high') cur.critical += 1;
      missingByProject.set(m.project_id, cur);
    }
  }
  const predeliveryByProject = pdRes.error ? new Map<string, PredeliveryLite>() : latestByProject(
    ((pdRes.data ?? []) as Record<string, unknown>[]).map((p) => ({
      project_id: p.project_id as string, ready_for_delivery: !!p.ready_for_delivery,
      checklist_items_total: Number(p.checklist_items_total ?? 0), checklist_items_passed: Number(p.checklist_items_passed ?? 0),
      report_date: (p.report_date as string) ?? null,
    })),
  );

  return assemble(followups, missingByProject, predeliveryByProject);
}
