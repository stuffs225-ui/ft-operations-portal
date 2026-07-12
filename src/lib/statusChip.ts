// ── Status → chip variant map (Visual Identity D2) ───────────────────────────
// Single source of truth for status semantics. Maps every real status across
// the app to a Badge variant so chips read at a glance without rainbow noise.
//
// Grammar: neutral = inert/closed · info(navy) = in motion/healthy ·
// warning = needs attention · critical(tint) = negative outcome ·
// dangerSolid = ACT NOW (money/penalty at risk — only `overdue` & `CRITICAL`) ·
// success = positive terminal · outline = non-semantic (sectors).

type BadgeVariant =
  | 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral'
  | 'dangerSolid' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // core project lifecycle
  draft: 'neutral',
  submitted_for_approval: 'info',
  sent_back_for_revision: 'warning',
  approved: 'success',
  rejected: 'critical',
  active: 'info',
  in_execution: 'info',
  completed: 'success',
  cancelled: 'neutral',

  // quotation
  submitted_by_sales: 'info',
  received_by_coordinator: 'info',
  sent_to_estimation: 'info',
  waiting_for_estimation: 'info',
  need_clarification: 'warning',
  quotation_received: 'info',
  returned_to_sales: 'warning',
  converted_to_hot_project: 'success',
  converted_to_so: 'success',
  closed_lost: 'neutral',
  lost: 'neutral',

  // hot project stages
  lead: 'neutral',
  qualified: 'info',
  proposal_required: 'warning',
  quotation_requested: 'info',
  negotiation: 'warning',
  won: 'success',

  // invoicing schedule — overdue is the only SOLID danger here
  scheduled: 'neutral',
  overdue: 'dangerSolid',
  rescheduled: 'warning',
  invoiced: 'success',

  // procurement
  pr_received: 'info',
  in_progress: 'info',
  pending_approval: 'info',
  partially_ordered: 'warning',
  fully_ordered: 'success',
  partially_received: 'warning',
  fully_received: 'success',
  delayed: 'critical',
  closed: 'neutral',

  // QC / material inspection
  pending: 'neutral',
  accepted: 'success',
  accepted_with_comments: 'success',
  rework: 'warning',
  pending_rework: 'warning',

  // penalty risk (SAFE / APPLIED / CRITICAL)
  safe: 'success',
  applied: 'critical',
  critical_risk: 'dangerSolid',

  // sectors — non-semantic
  private: 'outline',
  gov: 'outline',
  semi_gov: 'outline',
};

/**
 * Map a raw status string to a Badge variant. Unknown values fall back to
 * neutral so a new status never renders as an accidental accent color.
 * `rejected` differs by table (QC rejected is a tint danger = 'critical'),
 * which the default mapping already covers.
 */
export function statusVariant(status: string | null | undefined): BadgeVariant {
  if (!status) return 'neutral';
  const key = status.toLowerCase().trim();
  // 'CRITICAL' penalty risk is solid; the word alone maps to the risk meaning.
  if (key === 'critical') return 'dangerSolid';
  return STATUS_VARIANT[key] ?? 'neutral';
}

/** Human label for a raw status (snake/kebab → Title Case). */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return status.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
