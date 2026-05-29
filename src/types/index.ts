// ─── Roles ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'operations_manager'
  | 'sales_user'
  | 'sales_coordinator'
  | 'procurement_user'
  | 'factory_user'
  | 'store_user'
  | 'qc_user'
  | 'afs_user'
  | 'viewer';

export interface RoleConfig {
  key: UserRole;
  label: string;
  description: string;
  financialVisibility: 'full' | 'partial' | 'cost_only' | 'quotation_only' | 'none';
  color: string;
}

// ─── Project Lifecycle Status ─────────────────────────────────────────────────

export type ProjectStatus =
  | 'quotation_requested'
  | 'quotation_pending_estimation'
  | 'quotation_returned'
  | 'hot_project'
  | 'so_pending_approval'
  | 'so_approved'
  | 'wo_required'
  | 'pn_required'
  | 'wo_entered'
  | 'pn_entered'
  | 'in_procurement'
  | 'in_production'
  | 'in_qc'
  | 'release_note_issued'
  | 'delivered'
  | 'closed'
  | 'afs_maintenance';

export type ManufacturingRoute = 'saudi' | 'dubai';

// ─── Procurement ──────────────────────────────────────────────────────────────

export type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent_to_supplier'
  | 'eta_confirmed'
  | 'partially_received'
  | 'received'
  | 'rejected';

// ─── Material / Custody States ────────────────────────────────────────────────

export type MaterialStatus =
  | 'in_store'
  | 'reserved'
  | 'pending_approval'
  | 'issued'
  | 'pending_acceptance'
  | 'in_custody'
  | 'installed'
  | 'returned'
  | 'consumed'
  | 'lost_damaged';

// ─── Supplier ─────────────────────────────────────────────────────────────────

export type SupplierStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'approved_with_conditions'
  | 'suspended'
  | 'blacklisted';

// ─── QC ───────────────────────────────────────────────────────────────────────

export type QCResult = 'pending' | 'accepted' | 'rejected' | 'rework_required';

// ─── Document ─────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | 'uploaded'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'superseded'
  | 'expired';

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  roles?: UserRole[];
  badge?: number;
  children?: NavItem[];
}

// ─── Dashboard KPI Card ───────────────────────────────────────────────────────

export interface KpiCard {
  id: string;
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  severity: 'normal' | 'warning' | 'critical' | 'info';
  icon: string;
  path: string;
}

// ─── Action Inbox Task ────────────────────────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskCategory =
  | 'quotation'
  | 'approval'
  | 'procurement'
  | 'production'
  | 'store'
  | 'qc'
  | 'afs'
  | 'governance';

export interface InboxTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  project?: string;
  assignedRole: UserRole;
  dueDate?: string;
  overdueBy?: number;
  action: string;
  path: string;
}
