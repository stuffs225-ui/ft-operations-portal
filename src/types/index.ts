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
  | 'draft'
  | 'submitted_for_approval'
  | 'sent_back_for_revision'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'cancelled';

export type ManufacturingLocation = 'saudi' | 'dubai' | 'not_set';
export type MedicalItems = 'yes' | 'no' | 'not_set';

export interface Project {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
  sales_owner_id: string | null;
  customer_delivery_date: string;
  project_status: ProjectStatus;
  manufacturing_location: ManufacturingLocation;
  medical_items: MedicalItems;
  total_sales_value: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  revision_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  sales_owner?: { full_name: string | null; email: string } | null;
  approved_by_profile?: { full_name: string | null } | null;
}

export interface ProjectVehicleLine {
  id: string;
  project_id: string;
  line_number: number;
  vehicle_type: string;
  description: string;
  quantity: number;
  unit_sales_value: number;
  line_total_value: number;
  line_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: string;
  file_name: string;
  storage_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: string;
  version: string;
  remarks: string | null;
}

export interface ProjectTimelineEvent {
  id: string;
  project_id: string;
  event_type: string;
  title: string;
  body: string | null;
  actor_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  is_system: boolean;
  created_at: string;
}

// ─── Execution Reference (WO / PN Gate) ──────────────────────────────────────

export type ExecutionReferenceType = 'wo' | 'pn';

export type ExecutionReferenceStatus =
  | 'created'
  | 'confirmed'
  | 'superseded'
  | 'cancelled';

export interface ExecutionReference {
  id: string;
  project_id: string;
  reference_type: ExecutionReferenceType;
  reference_number: string;
  manufacturing_location: 'saudi' | 'dubai';
  status: ExecutionReferenceStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  remarks: string | null;
  // Joined fields (optional)
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name' | 'project_status'> | null;
  created_by_profile?: { full_name: string | null; email: string } | null;
  confirmed_by_profile?: { full_name: string | null } | null;
}

export interface ExecutionGateStatus {
  isApproved: boolean;
  isSaudi: boolean;
  isDubai: boolean;
  requiresWO: boolean;
  requiresPN: boolean;
  hasActiveWO: boolean;
  hasActivePN: boolean;
  woReference: ExecutionReference | null;
  pnReference: ExecutionReference | null;
  canStartSaudiFactory: boolean;
  canStartDubaiFollowUp: boolean;
}

// Keep legacy alias for any remaining references
export type ManufacturingRoute = 'saudi' | 'dubai';

// ─── Quotation Management ─────────────────────────────────────────────────────

export type QuotationStatus =
  | 'draft'
  | 'submitted_by_sales'
  | 'received_by_coordinator'
  | 'sent_to_estimation'
  | 'waiting_for_estimation'
  | 'need_clarification'
  | 'quotation_received'
  | 'returned_to_sales'
  | 'converted_to_hot_project'
  | 'converted_to_so'
  | 'cancelled'
  | 'closed_lost';

export type QuotationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface QuotationRequest {
  id: string;
  quotation_code: string;
  customer_name: string;
  customer_contact_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  opportunity_source: string | null;
  linked_hot_project_id: string | null;
  requested_by: string | null;
  assigned_coordinator_id: string | null;
  quotation_status: QuotationStatus;
  priority: QuotationPriority;
  required_delivery_expectation: string | null;
  scope_summary: string | null;
  sales_remarks: string | null;
  coordinator_remarks: string | null;
  quotation_number: string | null;
  quotation_total_value: number | null;
  submitted_at: string | null;
  sent_to_estimation_at: string | null;
  estimation_contact: string | null;
  quotation_received_at: string | null;
  returned_to_sales_at: string | null;
  converted_to_project_id: string | null;
  converted_to_hot_project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  requested_by_profile?: { full_name: string | null; email: string } | null;
  assigned_coordinator?: { full_name: string | null; email: string } | null;
}

export interface QuotationRequestLine {
  id: string;
  quotation_request_id: string;
  line_number: number;
  vehicle_type: string;
  description: string;
  quantity: number;
  estimated_unit_value: number | null;
  final_quotation_unit_value: number | null;
  final_quotation_line_value: number | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationDocument {
  id: string;
  quotation_request_id: string;
  document_type: string;
  file_name: string;
  storage_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: string;
  version: string;
  remarks: string | null;
}

export interface QuotationTimelineEvent {
  id: string;
  quotation_request_id: string;
  event_type: string;
  title: string;
  body: string | null;
  actor_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  is_system: boolean;
  created_at: string;
}

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
