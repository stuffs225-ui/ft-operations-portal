// ── Automatic factory production status ───────────────────────────────────────
// production_status is DERIVED from real facts (requirements checklist + process-step
// progress + QC hand-off), never typed by hand. This is the single source of truth
// for the derivation so the workspace and any future trigger agree.

import type { FactoryItemRequirement, FactoryProductionStatus, FactoryReqStatus } from '../types';

const DONE_REQ: FactoryReqStatus[] = ['approved', 'not_applicable'];

/**
 * Derive the production status from observable facts:
 *   • current === 'sent_to_qc' → stays 'sent_to_qc' (set by the QC hand-off, terminal here)
 *   • step progress 100% → 'production_completed'
 *   • step progress > 0 → 'in_production'
 *   • no requirements yet → 'not_started'
 *   • requirements not all approved → 'boq_pending' (requirements phase)
 *   • requirements approved, production not started → 'pending_raw_materials'
 */
export function deriveProductionStatus(
  progressPct: number,
  requirements: FactoryItemRequirement[],
  current: FactoryProductionStatus | null | undefined,
): FactoryProductionStatus {
  if (current === 'sent_to_qc') return 'sent_to_qc';
  if (progressPct >= 100) return 'production_completed';
  if (progressPct > 0) return 'in_production';
  if (requirements.length === 0) return 'not_started';
  const allApproved = requirements.every((r) => DONE_REQ.includes(r.status));
  if (!allApproved) return 'boq_pending';
  return 'pending_raw_materials';
}

/** Plain-language reason the record is at its derived status. */
export function statusReason(status: FactoryProductionStatus): string {
  switch (status) {
    case 'sent_to_qc': return 'Handed off to Quality Control.';
    case 'production_completed': return 'All process steps are complete.';
    case 'in_production': return 'Production in progress — driven by the process steps.';
    case 'pending_raw_materials': return 'Requirements approved — awaiting raw materials / production start.';
    case 'boq_pending': return 'Requirements checklist is not fully approved yet.';
    case 'not_started': return 'No requirements or process steps recorded yet.';
    default: return 'Derived automatically from requirements and process steps.';
  }
}
