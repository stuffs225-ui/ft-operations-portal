// ── QC Admin Console ───────────────────────────────────────────────────────────
// Admin oversight of four quality risk signals:
//   1. Materials awaiting QC — material_qc_inspections still 'pending'.
//   2. Open NCRs — material_ncrs not yet closed/cancelled (with severity).
//   3. Open project-QC findings — project_qc_findings not closed/cancelled
//      (rework-required flagged separately).
//   4. Blocked releases — release_notes in 'blocked' status.
// Read-only; rides admin RLS. Each signal degrades independently (missing table
// or blocked read → that section is empty, never a hard error).

import { supabase, isSupabaseConfigured } from './supabase';

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export interface WaitingQcRow {
  id: string; inspectionNumber: string; projectCode: string | null; daysWaiting: number;
}
export interface OpenNcrRow {
  id: string; ncrNumber: string; projectCode: string | null;
  severity: string; status: string; daysOpen: number;
}
export interface OpenFindingRow {
  id: string; findingNumber: string; projectCode: string | null;
  severity: string; status: string; reworkRequired: boolean; daysOpen: number;
}
export interface BlockedReleaseRow {
  id: string; projectCode: string | null; daysBlocked: number;
}

export interface QcConsoleResult {
  waitingQc: WaitingQcRow[];
  openNcrs: OpenNcrRow[];
  openFindings: OpenFindingRow[];
  blockedReleases: BlockedReleaseRow[];
  inProgressCount: number;
  error: string | null;
}

const CLOSED_EXCLUDE = '(closed,cancelled)';

export async function getQcAdminConsole(): Promise<QcConsoleResult> {
  const empty: QcConsoleResult = {
    waitingQc: [], openNcrs: [], openFindings: [], blockedReleases: [], inProgressCount: 0, error: null,
  };
  if (!isSupabaseConfigured || !supabase) return empty;
  const db = supabase;

  const [waitingRes, ncrRes, findingRes, releaseRes, inProgRes] = await Promise.all([
    db.from('material_qc_inspections')
      .select('id, inspection_number, created_at, project:projects(project_code)')
      .eq('inspection_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('material_ncrs')
      .select('id, ncr_number, ncr_status, severity, created_at, project:projects(project_code)')
      .not('ncr_status', 'in', CLOSED_EXCLUDE)
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('project_qc_findings')
      .select('id, finding_number, finding_status, severity, rework_required, rework_completed_at, created_at, project:projects(project_code)')
      .not('finding_status', 'in', CLOSED_EXCLUDE)
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('release_notes')
      .select('id, created_at, project:projects(project_code)')
      .eq('release_status', 'blocked')
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('material_qc_inspections').select('id', { count: 'exact', head: true }).eq('inspection_status', 'in_progress'),
  ]);

  // 1. Materials awaiting QC
  const waitingQc: WaitingQcRow[] = waitingRes.error ? [] : (waitingRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; inspection_number: string; created_at: string; project: { project_code: string } | null };
    return { id: row.id, inspectionNumber: row.inspection_number, projectCode: row.project?.project_code ?? null, daysWaiting: daysSince(row.created_at) };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  // 2. Open NCRs
  const openNcrs: OpenNcrRow[] = ncrRes.error ? [] : (ncrRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; ncr_number: string; ncr_status: string; severity: string; created_at: string; project: { project_code: string } | null };
    return {
      id: row.id, ncrNumber: row.ncr_number, projectCode: row.project?.project_code ?? null,
      severity: row.severity, status: (row.ncr_status ?? '').replace(/_/g, ' '), daysOpen: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysOpen - a.daysOpen);

  // 3. Open project-QC findings
  const openFindings: OpenFindingRow[] = findingRes.error ? [] : (findingRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; finding_number: string; finding_status: string; severity: string; rework_required: boolean; rework_completed_at: string | null; created_at: string; project: { project_code: string } | null };
    return {
      id: row.id, findingNumber: row.finding_number, projectCode: row.project?.project_code ?? null,
      severity: row.severity, status: (row.finding_status ?? '').replace(/_/g, ' '),
      reworkRequired: row.rework_required && !row.rework_completed_at, daysOpen: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysOpen - a.daysOpen);

  // 4. Blocked releases
  const blockedReleases: BlockedReleaseRow[] = releaseRes.error ? [] : (releaseRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; created_at: string; project: { project_code: string } | null };
    return { id: row.id, projectCode: row.project?.project_code ?? null, daysBlocked: daysSince(row.created_at) };
  }).sort((a, b) => b.daysBlocked - a.daysBlocked);

  const inProgressCount = inProgRes.error ? 0 : (inProgRes.count ?? 0);

  return { waitingQc, openNcrs, openFindings, blockedReleases, inProgressCount, error: null };
}
