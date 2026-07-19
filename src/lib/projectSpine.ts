// ── Project production spine ──────────────────────────────────────────────────
// One unified view of a project's factory journey as sequential stages with gates:
//   WO → Chassis → Engineering → Materials → Production → QC
// Computed from the existing data (execution references, production details,
// requirements, raw-material requests, factory records) — it PRESENTS the separate
// pieces as one journey rather than duplicating them.

import type { FactoryReqStatus, RawMaterialRequestStatus } from '../types';

export type StageTone = 'ok' | 'partial' | 'blocked' | 'idle';

export interface ProjectStage {
  key: string;
  label: string;
  done: boolean;
  tone: StageTone;
  detail: string;
  /** Where to go to act on this stage (absolute route). */
  href?: string;
}

export interface SpineInput {
  projectId: string;
  hasActiveWO: boolean;
  chassisReceived: number;
  chassisTotal: number;
  requirements: { status: FactoryReqStatus }[];
  rmrs: { status: RawMaterialRequestStatus }[];
  progressPct: number;
  anyRecord: boolean;
  sentToQc: boolean;
}

const DONE_REQ: FactoryReqStatus[] = ['approved', 'not_applicable'];

export function deriveProjectStages(i: SpineInput): ProjectStage[] {
  // 1. Work Order
  const wo: ProjectStage = i.hasActiveWO
    ? { key: 'wo', label: 'Work Order', done: true, tone: 'ok', detail: 'Active WO', href: '/wo-pn-gate' }
    : { key: 'wo', label: 'Work Order', done: false, tone: 'blocked', detail: 'No active WO — create one at the WO Gate', href: '/wo-pn-gate' };

  // 2. Chassis
  let chassis: ProjectStage;
  if (i.chassisTotal > 0 && i.chassisReceived >= i.chassisTotal) {
    chassis = { key: 'chassis', label: 'Chassis', done: true, tone: 'ok', detail: `${i.chassisReceived}/${i.chassisTotal} received`, href: `/factory/projects/${i.projectId}/plan` };
  } else if (i.chassisReceived > 0) {
    chassis = { key: 'chassis', label: 'Chassis', done: false, tone: 'partial', detail: `${i.chassisReceived}/${i.chassisTotal || '?'} received`, href: `/factory/projects/${i.projectId}/plan` };
  } else {
    chassis = { key: 'chassis', label: 'Chassis', done: false, tone: i.chassisTotal > 0 ? 'blocked' : 'idle', detail: i.chassisTotal > 0 ? 'Awaiting chassis' : 'Not recorded', href: `/factory/projects/${i.projectId}/plan` };
  }

  // 3. Engineering (requirements)
  let eng: ProjectStage;
  if (i.requirements.length === 0) {
    eng = { key: 'engineering', label: 'Engineering', done: false, tone: 'idle', detail: 'No requirements checklist yet' };
  } else {
    const approved = i.requirements.filter((r) => DONE_REQ.includes(r.status)).length;
    const allDone = approved === i.requirements.length;
    eng = { key: 'engineering', label: 'Engineering', done: allDone, tone: allDone ? 'ok' : 'partial', detail: `${approved}/${i.requirements.length} approved` };
  }

  // 4. Materials (raw-material requests)
  let mat: ProjectStage;
  const hasFulfilled = i.rmrs.some((r) => r.status === 'fulfilled');
  const hasPartial = i.rmrs.some((r) => r.status === 'partially_fulfilled');
  const hasOpen = i.rmrs.some((r) => ['submitted', 'under_review', 'sent_to_procurement'].includes(r.status));
  if (hasFulfilled) mat = { key: 'materials', label: 'Materials', done: true, tone: 'ok', detail: 'Fulfilled', href: '/factory/raw-material-requests' };
  else if (hasPartial) mat = { key: 'materials', label: 'Materials', done: false, tone: 'partial', detail: 'Partially fulfilled', href: '/factory/raw-material-requests' };
  else if (hasOpen) mat = { key: 'materials', label: 'Materials', done: false, tone: 'partial', detail: 'Requested', href: '/factory/raw-material-requests' };
  else mat = { key: 'materials', label: 'Materials', done: false, tone: 'idle', detail: 'No material request', href: '/factory/raw-material-requests' };

  // 5. Production
  let prod: ProjectStage;
  if (i.progressPct >= 100) prod = { key: 'production', label: 'Production', done: true, tone: 'ok', detail: '100%', href: `/factory/projects/${i.projectId}/plan` };
  else if (i.progressPct > 0) prod = { key: 'production', label: 'Production', done: false, tone: 'partial', detail: `${i.progressPct}%`, href: `/factory/projects/${i.projectId}/plan` };
  else prod = { key: 'production', label: 'Production', done: false, tone: 'idle', detail: i.anyRecord ? 'Not started' : 'No production record', href: `/factory/projects/${i.projectId}/plan` };

  // 6. QC
  const qc: ProjectStage = i.sentToQc
    ? { key: 'qc', label: 'QC', done: true, tone: 'ok', detail: 'Sent to QC' }
    : { key: 'qc', label: 'QC', done: false, tone: i.progressPct >= 100 ? 'partial' : 'idle', detail: i.progressPct >= 100 ? 'Ready — send to QC' : 'Pending production', href: '/factory/send-to-qc' };

  return [wo, chassis, eng, mat, prod, qc];
}

/** Index of the current (first not-done) stage, or stages.length if all done. */
export function currentStageIndex(stages: ProjectStage[]): number {
  const i = stages.findIndex((s) => !s.done);
  return i === -1 ? stages.length : i;
}
