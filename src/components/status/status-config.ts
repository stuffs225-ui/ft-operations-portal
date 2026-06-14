export type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface StatusConfig {
  variant: StatusVariant
  label: string
  className?: string
}

// Centralized status → badge config for all FT Operations Portal modules.
// Add new statuses here; do NOT scatter per-page status color logic.
export const STATUS_CONFIG: Record<string, StatusConfig> = {
  // ── Projects / Sales Orders ────────────────────────────────────────────
  draft: {
    variant: 'secondary',
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  submitted_for_approval: {
    variant: 'outline',
    label: 'Pending Approval',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  approved: {
    variant: 'default',
    label: 'Approved',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  rejected: {
    variant: 'destructive',
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  active: {
    variant: 'default',
    label: 'Active',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  in_progress: {
    variant: 'default',
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  completed: {
    variant: 'secondary',
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    variant: 'secondary',
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
  sent_back_for_revision: {
    variant: 'outline',
    label: 'Sent Back',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  // ── Release Notes ──────────────────────────────────────────────────────
  ready_to_issue: {
    variant: 'default',
    label: 'Ready to Issue',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  issued: {
    variant: 'default',
    label: 'Issued',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  blocked: {
    variant: 'destructive',
    label: 'Blocked',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  // ── Purchase Orders ────────────────────────────────────────────────────
  pending: {
    variant: 'outline',
    label: 'Pending',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  pending_approval: {
    variant: 'outline',
    label: 'Pending Approval',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  // ── Store / Inventory ──────────────────────────────────────────────────
  accepted_by_qc: {
    variant: 'default',
    label: 'Accepted by QC',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  rejected_by_qc: {
    variant: 'destructive',
    label: 'Rejected by QC',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  installed: {
    variant: 'default',
    label: 'Installed',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  in_custody: {
    variant: 'default',
    label: 'In Custody',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  returned: {
    variant: 'secondary',
    label: 'Returned',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  consumed: {
    variant: 'secondary',
    label: 'Consumed',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  lost_damaged: {
    variant: 'destructive',
    label: 'Lost / Damaged',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  // ── Suppliers ──────────────────────────────────────────────────────────
  active_approved: {
    variant: 'default',
    label: 'Active / Approved',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  blacklisted: {
    variant: 'destructive',
    label: 'Blacklisted',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  suspended: {
    variant: 'outline',
    label: 'Suspended',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  approved_with_conditions: {
    variant: 'outline',
    label: 'Approved w/ Conditions',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  pending_review: {
    variant: 'outline',
    label: 'Pending Review',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  inactive: {
    variant: 'secondary',
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
  assessed: {
    variant: 'default',
    label: 'Assessed',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  not_assessed: {
    variant: 'secondary',
    label: 'Not Assessed',
    className: 'bg-gray-100 text-gray-400 border-gray-200',
  },
  // ── QC / NCR ──────────────────────────────────────────────────────────
  open: {
    variant: 'destructive',
    label: 'Open',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  assigned: {
    variant: 'outline',
    label: 'Assigned',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  rework_required: {
    variant: 'outline',
    label: 'Rework Required',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  closed: {
    variant: 'secondary',
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  released: {
    variant: 'default',
    label: 'Released',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  corrective_action_in_progress: {
    variant: 'outline',
    label: 'In Progress',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  pending_evidence: {
    variant: 'outline',
    label: 'Pending Evidence',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  // ── Quotations ─────────────────────────────────────────────────────────
  submitted: {
    variant: 'outline',
    label: 'Submitted',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  under_review: {
    variant: 'outline',
    label: 'Under Review',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  returned_to_sales: {
    variant: 'outline',
    label: 'Returned to Sales',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  expired: {
    variant: 'secondary',
    label: 'Expired',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  // ── General ────────────────────────────────────────────────────────────
  generated: {
    variant: 'default',
    label: 'Generated',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  exported: {
    variant: 'outline',
    label: 'Exported',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  archived: {
    variant: 'secondary',
    label: 'Archived',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  delivered: {
    variant: 'default',
    label: 'Delivered',
    className: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  waiting: {
    variant: 'outline',
    label: 'Waiting',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
}

export function getStatusConfig(status: string): StatusConfig {
  return (
    STATUS_CONFIG[status] ?? {
      variant: 'outline' as StatusVariant,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }
  )
}

// Priority levels — used by NCR, CAPA, findings
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface PriorityConfig {
  variant: StatusVariant
  label: string
  className: string
}

export const PRIORITY_CONFIG: Record<PriorityLevel, PriorityConfig> = {
  critical: {
    variant: 'destructive',
    label: 'Critical',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
  high: {
    variant: 'destructive',
    label: 'High',
    className: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  medium: {
    variant: 'outline',
    label: 'Medium',
    className: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  },
  low: {
    variant: 'secondary',
    label: 'Low',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
}
