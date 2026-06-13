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

export type PRStatus =
  | 'draft' | 'pr_received' | 'in_progress'
  | 'partially_ordered' | 'fully_ordered' | 'cancelled' | 'closed';

export type PRItemStatus =
  | 'pending' | 'waiting_for_po_to_supplier' | 'po_to_supplier_created'
  | 'eta_confirmed' | 'in_transit' | 'partially_received' | 'fully_received'
  | 'delayed' | 'cancelled';

export type POStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'rejected'
  | 'sent_to_supplier' | 'eta_confirmed' | 'in_transit'
  | 'partially_received' | 'fully_received' | 'delayed' | 'cancelled' | 'closed';

export type POApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export type SupplierProcurementStatus =
  | 'draft' | 'pending_review' | 'approved' | 'approved_with_conditions'
  | 'suspended' | 'blacklisted' | 'inactive';

export type SupplierQCStatus =
  | 'not_assessed' | 'assessed' | 'approved' | 'approved_with_conditions' | 'rejected';

export interface ProcurementRequest {
  id: string;
  project_id: string;
  pr_number: string;
  received_date: string | null;
  requested_by: string | null;
  source_department: string | null;
  status: PRStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name'> | null;
  requested_by_profile?: { full_name: string | null } | null;
}

export interface ProcurementRequestItem {
  id: string;
  procurement_request_id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  item_code: string | null;
  item_name: string;
  description: string | null;
  material_category: string | null;
  quantity_required: number;
  unit: string;
  quantity_ordered: number;
  quantity_received: number;
  status: PRItemStatus;
  expected_arrival_date: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  project_id: string;
  procurement_request_id: string | null;
  po_number: string;
  supplier_id: string | null;
  supplier_name: string;
  po_date: string;
  purchase_value: number;
  currency: string;
  eta_date: string | null;
  po_status: POStatus;
  approval_required: boolean;
  approval_status: POApprovalStatus;
  submitted_for_approval_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name'> | null;
  approved_by_profile?: { full_name: string | null } | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  procurement_request_item_id: string | null;
  item_code: string | null;
  item_name: string;
  description: string | null;
  quantity_ordered: number;
  unit: string;
  unit_price: number;
  line_total: number;
  expected_arrival_date: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface EtaChangeHistory {
  id: string;
  entity_type: string;
  entity_id: string;
  project_id: string | null;
  old_eta: string | null;
  new_eta: string | null;
  changed_by: string | null;
  changed_at: string;
  reason: string;
  remarks: string | null;
  changed_by_profile?: { full_name: string | null } | null;
}

export interface ApprovedSupplier {
  id: string;
  supplier_name: string;
  supplier_category: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  materials_supplied: string | null;
  payment_terms: string | null;
  procurement_status: SupplierProcurementStatus;
  qc_status: SupplierQCStatus;
  quality_rating: number | null;
  approved_for_medical_items: boolean;
  approved_for_critical_items: boolean;
  remarks: string | null;
  procurement_remarks: string | null;
  qc_remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Factory / Production ─────────────────────────────────────────────────────

export type FactoryProductionStatus =
  | 'not_started' | 'details_requested' | 'boq_pending' | 'boq_uploaded'
  | 'ga_drawing_pending' | 'ga_drawing_uploaded' | 'detail_drawings_pending'
  | 'detail_drawings_uploaded' | 'manhours_pending' | 'manhours_added'
  | 'pending_raw_materials' | 'in_production' | 'monthly_update_required'
  | 'production_completed' | 'sent_to_qc' | 'on_hold';

export type FactoryReqStatus =
  | 'pending' | 'in_progress' | 'uploaded' | 'approved' | 'rejected' | 'not_applicable';

export type RawMaterialRequestStatus =
  | 'draft' | 'submitted' | 'under_review' | 'sent_to_procurement'
  | 'partially_fulfilled' | 'fulfilled' | 'rejected' | 'cancelled';

export type RawMaterialRequestType = 'project_related' | 'stock';

export type RawMaterialParsingStatus = 'not_parsed' | 'pending_future_parser' | 'parsed' | 'failed';

export interface FactoryRecord {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  wo_reference_id: string | null;
  production_status: FactoryProductionStatus;
  progress_percentage: number;
  expected_completion_date: string | null;
  actual_completion_date: string | null;
  monthly_update_required: boolean;
  last_updated_by: string | null;
  last_updated_at: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description' | 'quantity'> | null;
}

export interface FactoryRequirementType {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface FactoryItemRequirement {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  requirement_type_id: string;
  status: FactoryReqStatus;
  document_id: string | null;
  value_text: string | null;
  value_number: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  requirement_type?: FactoryRequirementType | null;
}

export interface RawMaterialRequest {
  id: string;
  project_id: string | null;
  project_vehicle_line_id: string | null;
  wo_reference_id: string | null;
  request_type: RawMaterialRequestType;
  request_number: string;
  status: RawMaterialRequestStatus;
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  sent_to_procurement_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name'> | null;
  requested_by_profile?: { full_name: string | null } | null;
}

export interface RawMaterialRequestFile {
  id: string;
  raw_material_request_id: string;
  file_name: string;
  storage_path: string | null;
  file_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
  parsing_status: RawMaterialParsingStatus;
  remarks: string | null;
}

export interface RawMaterialRequestItem {
  id: string;
  raw_material_request_id: string;
  item_code: string | null;
  item_name: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  material_category: string | null;
  required_for: string | null;
  vehicle_line_id: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

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

// Row shape returned by action_inbox_view
export interface ActionInboxItem {
  id: string;
  title: string;
  description: string;
  action_type: string;
  related_entity_type: string;
  related_entity_id: string;
  assigned_to_user_id: string | null;
  assigned_to_role: string;
  department: string;
  priority: TaskPriority;
  due_at: string | null;
  status: 'open' | 'overdue';
  path: string;
  created_at: string;
  updated_at: string;
}

// ─── Store / Warehouse ────────────────────────────────────────────────────────

export type ReceiptStatus = 'draft' | 'received' | 'partially_received' | 'pending_material_qc' | 'accepted' | 'rejected' | 'closed';
export type ReceiptType = 'material' | 'vehicle' | 'mixed';
export type ItemStatus = 'received' | 'pending_qc' | 'accepted_by_qc' | 'rejected_by_qc' | 'in_store' | 'issued' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';

export interface StoreReceipt {
  id: string;
  project_id: string | null;
  purchase_order_id: string | null;
  procurement_request_id: string | null;
  receipt_number: string;
  receipt_type: ReceiptType;
  received_date: string;
  received_by: string | null;
  supplier_name: string | null;
  delivery_note_number: string | null;
  status: ReceiptStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name'> | null;
  received_by_profile?: { full_name: string | null; email: string } | null;
  items?: StoreReceiptItem[];
}

export interface StoreReceiptItem {
  id: string;
  store_receipt_id: string;
  project_id: string | null;
  project_vehicle_line_id: string | null;
  purchase_order_item_id: string | null;
  item_code: string | null;
  item_name: string;
  description: string | null;
  material_category: string;
  quantity_received: number;
  unit: string;
  serial_required: boolean;
  status: ItemStatus;
  storage_location: string | null;
  condition: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  serial_numbers?: MedicalSerialNumber[];
}

export type SerialQcStatus = 'not_checked' | 'pending_qc' | 'passed' | 'failed';
export type SerialCurrentStatus = 'in_store' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';

export interface MedicalSerialNumber {
  id: string;
  store_receipt_item_id: string;
  project_id: string | null;
  serial_number: string;
  batch_number: string | null;
  expiry_date: string | null;
  manufacturer: string | null;
  supplier_name: string | null;
  qc_status: SerialQcStatus;
  current_status: SerialCurrentStatus;
  current_holder_type: string | null;
  current_holder_id: string | null;
  installed_on_project_vehicle_line_id: string | null;
  installed_at: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type VehicleReceiptStatus = 'draft' | 'received' | 'pending_condition_review' | 'accepted' | 'damaged' | 'assigned_to_production' | 'assigned_to_afs' | 'closed';
export type PhotoType = 'front' | 'rear' | 'left_side' | 'right_side' | 'chassis_plate' | 'damage' | 'other';

export interface VehicleReceipt {
  id: string;
  project_id: string | null;
  project_vehicle_line_id: string | null;
  chassis_number: string;
  received_date: string;
  received_by: string | null;
  vehicle_type: string;
  condition_status: string;
  mileage: number | null;
  storage_location: string | null;
  damage_notes: string | null;
  status: VehicleReceiptStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name'> | null;
  photos?: VehicleReceiptPhoto[];
}

export interface VehicleReceiptPhoto {
  id: string;
  vehicle_receipt_id: string;
  photo_type: PhotoType;
  file_name: string;
  storage_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  remarks: string | null;
}

export type CustodyApprovalStatus = 'not_required' | 'pending_approval' | 'approved' | 'rejected';
export type CustodyReceiverDecision = 'pending' | 'accepted' | 'rejected';
export type CustodyStatus = 'draft' | 'pending_approval' | 'approved_for_issue' | 'issued' | 'pending_acceptance' | 'in_custody' | 'installed' | 'returned' | 'consumed_by_project' | 'lost_or_damaged' | 'cancelled';

export interface MaterialCustodyRecord {
  id: string;
  custody_number: string;
  project_id: string | null;
  store_receipt_item_id: string | null;
  medical_serial_number_id: string | null;
  issued_to_role: string | null;
  issued_to_user_id: string | null;
  issued_to_department: string | null;
  issue_type: string;
  approval_required: boolean;
  approval_status: CustodyApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  issued_by: string | null;
  issued_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  receiver_decision: CustodyReceiverDecision;
  receiver_rejection_reason: string | null;
  installation_status: string;
  installed_at: string | null;
  returned_at: string | null;
  status: CustodyStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  project?: Pick<Project, 'project_code' | 'so_number' | 'customer_name'> | null;
  issued_by_profile?: { full_name: string | null } | null;
  accepted_by_profile?: { full_name: string | null } | null;
  item?: Pick<StoreReceiptItem, 'item_name' | 'item_code' | 'material_category'> | null;
}

// ── Phase 8: QC & Release Note ───────────────────────────────────────────────

export type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MaterialInspectionResult =
  | 'pending'
  | 'accepted'
  | 'accepted_with_comments'
  | 'rejected'
  | 'pending_supplier_clarification'
  | 'pending_rework';

export interface MaterialQcInspection {
  id: string;
  project_id: string | null;
  store_receipt_id: string | null;
  store_receipt_item_id: string;
  medical_serial_number_id: string | null;
  inspection_number: string;
  inspection_status: InspectionStatus;
  inspection_result: MaterialInspectionResult;
  inspected_by: string | null;
  inspected_at: string | null;
  rejection_reason: string | null;
  remarks: string | null;
  attachments_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  item?: Pick<StoreReceiptItem, 'item_name' | 'item_code' | 'material_category' | 'quantity_received' | 'unit'> | null;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  inspected_by_profile?: { full_name: string | null } | null;
}

export type NcrStatus =
  | 'open'
  | 'assigned'
  | 'corrective_action_in_progress'
  | 'pending_evidence'
  | 'closed'
  | 'rejected_closure'
  | 'cancelled';
export type NcrSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface MaterialNcr {
  id: string;
  project_id: string | null;
  material_qc_inspection_id: string;
  store_receipt_item_id: string | null;
  medical_serial_number_id: string | null;
  ncr_number: string;
  ncr_status: NcrStatus;
  severity: NcrSeverity;
  root_cause_category: string | null;
  description: string;
  corrective_action: string | null;
  preventive_action: string | null;
  owner_id: string | null;
  due_date: string | null;
  closed_by: string | null;
  closed_at: string | null;
  closure_evidence_document_id: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  item?: Pick<StoreReceiptItem, 'item_name' | 'material_category'> | null;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  owner?: { full_name: string | null } | null;
}

export type ProjectQcResult =
  | 'pending'
  | 'passed'
  | 'passed_with_comments'
  | 'failed'
  | 'rework_required';
export type ReadinessStatus = 'not_ready' | 'pending_rework' | 'ready_for_release' | 'released';

export interface ProjectQcInspection {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  factory_record_id: string | null;
  inspection_number: string;
  inspection_status: InspectionStatus;
  inspection_result: ProjectQcResult;
  inspected_by: string | null;
  inspected_at: string | null;
  readiness_status: ReadinessStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'customer_name' | 'manufacturing_location'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'line_number' | 'vehicle_type' | 'description' | 'quantity'> | null;
  inspected_by_profile?: { full_name: string | null } | null;
}

export type FindingStatus =
  | 'open'
  | 'assigned'
  | 'rework_in_progress'
  | 'pending_reinspection'
  | 'closed'
  | 'cancelled';
export type FindingType =
  | 'dimensional'
  | 'surface_finish'
  | 'functional'
  | 'documentation'
  | 'safety'
  | 'other';

export interface ProjectQcFinding {
  id: string;
  project_qc_inspection_id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  finding_number: string;
  finding_type: FindingType;
  severity: NcrSeverity;
  description: string;
  required_action: string;
  owner_role: string | null;
  owner_id: string | null;
  due_date: string | null;
  finding_status: FindingStatus;
  rework_required: boolean;
  rework_completed_by: string | null;
  rework_completed_at: string | null;
  closure_notes: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string | null } | null;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description'> | null;
}

export type ReleaseStatus = 'draft' | 'blocked' | 'ready_to_issue' | 'issued' | 'cancelled';
export type ReleaseType = 'project_release' | 'vehicle_line_release' | 'partial_release';

export interface ReleaseNote {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  release_note_number: string;
  release_status: ReleaseStatus;
  release_type: ReleaseType;
  issued_by: string | null;
  issued_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  document_id: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'customer_name' | 'manufacturing_location'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description'> | null;
  issued_by_profile?: { full_name: string | null } | null;
}

// ─── Phase 9: Dubai / AFS ────────────────────────────────────────────────────

export type DubaiStatus =
  | 'not_started'
  | 'pending_dubai_po'
  | 'dubai_po_sent'
  | 'under_dubai_production'
  | 'eta_confirmed'
  | 'in_transit'
  | 'arrived_ksa'
  | 'handed_to_afs'
  | 'ready_for_pre_delivery'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type EtaStatus = 'not_set' | 'on_track' | 'delayed' | 'changed' | 'arrived';

export interface DubaiProjectFollowup {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  pn_reference_id: string | null;
  dubai_po_number: string | null;
  dubai_po_date: string | null;
  dubai_status: DubaiStatus;
  eta_date: string | null;
  eta_status: EtaStatus;
  last_followup_date: string | null;
  next_followup_date: string | null;
  followed_by: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'customer_name' | 'manufacturing_location'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description' | 'quantity'> | null;
  followed_by_profile?: { full_name: string | null } | null;
}

export interface DubaiEtaHistory {
  id: string;
  dubai_followup_id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  old_eta: string | null;
  new_eta: string;
  changed_by: string;
  changed_at: string;
  reason: string;
  remarks: string | null;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  changed_by_profile?: { full_name: string | null } | null;
}

export type ArrivalStatus = 'pending' | 'arrived' | 'partially_arrived' | 'delayed';

export interface AfsArrivalReport {
  id: string;
  dubai_followup_id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  arrival_report_number: string;
  arrival_date: string;
  arrival_status: ArrivalStatus;
  received_by: string | null;
  received_quantity: number;
  expected_quantity: number;
  storage_location: string | null;
  condition_on_arrival: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description'> | null;
  received_by_profile?: { full_name: string | null } | null;
}

export type MissingItemStatus = 'open' | 'requested' | 'received' | 'waived' | 'cancelled';
export type MissingItemSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AfsMissingItem {
  id: string;
  arrival_report_id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  item_name: string;
  item_code: string | null;
  quantity_expected: number;
  quantity_received: number;
  missing_item_status: MissingItemStatus;
  severity: MissingItemSeverity;
  store_request_id: string | null;
  notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AfsPredeliveryReport {
  id: string;
  arrival_report_id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  predelivery_report_number: string;
  report_date: string;
  chassis_number: string | null;
  readiness_status: string;
  checklist_items_total: number;
  checklist_items_passed: number;
  open_missing_items: number;
  open_ncrs: number;
  release_note_issued: boolean;
  release_note_id: string | null;
  inspector_id: string | null;
  inspected_at: string | null;
  remarks: string | null;
  ready_for_delivery: boolean;
  delivery_approved_by: string | null;
  delivery_approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description'> | null;
}

export type ConditionReportStatus = 'open' | 'under_review' | 'resolved' | 'closed' | 'cancelled';
export type ConditionStatus = 'good' | 'minor_damage' | 'major_damage' | 'requires_repair';

export interface AfsConditionReport {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  condition_report_number: string;
  report_date: string;
  chassis_number: string | null;
  overall_condition: ConditionStatus;
  report_status: ConditionReportStatus;
  reported_by: string | null;
  assigned_to: string | null;
  description: string;
  root_cause: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description'> | null;
}

export type MaintenanceIssueType = 'mechanical' | 'electrical' | 'body_damage' | 'software' | 'upholstery' | 'other';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceStatus =
  | 'open'
  | 'assigned'
  | 'under_inspection'
  | 'parts_waiting'
  | 'in_repair'
  | 'completed'
  | 'closed'
  | 'cancelled';

export interface AfsMaintenanceRequest {
  id: string;
  project_id: string | null;
  project_vehicle_line_id: string | null;
  maintenance_request_number: string;
  customer_name: string;
  chassis_number: string | null;
  issue_type: MaintenanceIssueType;
  priority: MaintenancePriority;
  maintenance_status: MaintenanceStatus;
  title: string;
  description: string;
  reported_date: string;
  wo_reference: string | null;
  pn_reference: string | null;
  assigned_to: string | null;
  inspected_by: string | null;
  inspected_at: string | null;
  inspection_notes: string | null;
  parts_required: boolean;
  parts_notes: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'project_code' | 'customer_name'> | null;
  vehicle_line?: Pick<ProjectVehicleLine, 'vehicle_type' | 'description'> | null;
  assigned_to_profile?: { full_name: string | null } | null;
}

export type MaintenanceDocumentType = 'photo' | 'inspection_report' | 'parts_request' | 'resolution_report' | 'other';

export interface AfsMaintenanceAttachment {
  id: string;
  maintenance_request_id: string;
  document_type: MaintenanceDocumentType;
  file_name: string;
  storage_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  description: string | null;
}

// Phase 10 — Reports, SLA, Health Scores, Issues, CAPA

export type ReportCategory =
  | 'executive' | 'sales' | 'procurement' | 'factory' | 'store'
  | 'qc' | 'afs' | 'project' | 'supplier' | 'data_quality' | 'sla' | 'operational_excellence';

export interface ReportDefinition {
  id: string;
  report_key: string;
  report_name: string;
  report_category: ReportCategory;
  description: string;
  default_roles_allowed: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedReportView {
  id: string;
  user_id: string;
  view_name: string;
  report_key: string;
  filters_json: Record<string, unknown> | null;
  columns_json: Record<string, unknown> | null;
  sorting_json: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type SlaSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SlaRule {
  id: string;
  rule_key: string;
  rule_name: string;
  module_name: string;
  trigger_status: string;
  target_status: string;
  duration_hours: number;
  severity: SlaSeverity;
  applies_to_roles: string[];
  escalation_roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SlaEventStatus = 'open' | 'acknowledged' | 'escalated' | 'resolved' | 'cancelled';

export interface SlaEvent {
  id: string;
  rule_id: string;
  entity_type: string;
  entity_id: string;
  project_id: string | null;
  triggered_at: string;
  due_at: string;
  resolved_at: string | null;
  status: SlaEventStatus;
  severity: SlaSeverity;
  owner_role: string | null;
  owner_id: string | null;
  escalation_level: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  rule?: SlaRule;
}

export type ScoreBand = 'healthy' | 'watch' | 'at_risk' | 'critical';

export interface ProjectHealthScore {
  id: string;
  project_id: string;
  score: number;
  score_band: ScoreBand;
  delay_score: number;
  data_quality_score: number;
  procurement_score: number;
  factory_score: number;
  store_score: number;
  qc_score: number;
  afs_score: number;
  financial_visibility_score: number | null;
  blockers_count: number;
  open_risks_count: number;
  open_issues_count: number;
  calculated_at: string;
  created_at: string;
  project?: { project_code: string; customer_name: string; project_status: string } | null;
}

export interface DepartmentHealthScore {
  id: string;
  department_key: string;
  score: number;
  score_band: ScoreBand;
  open_tasks_count: number;
  overdue_tasks_count: number;
  sla_breaches_count: number;
  average_cycle_time_hours: number | null;
  calculated_at: string;
  created_at: string;
}

export interface SupplierScorecard {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  score: number;
  quality_score: number;
  delivery_score: number;
  responsiveness_score: number;
  ncr_count: number;
  delayed_po_count: number;
  total_po_count: number;
  calculated_at: string;
  created_at: string;
}

export type IssueType = 'blocker' | 'risk' | 'action_item' | 'observation' | 'escalation';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type OperationalIssueStatus = 'open' | 'assigned' | 'in_progress' | 'waiting_input' | 'resolved' | 'closed' | 'cancelled';

export interface OperationalIssue {
  id: string;
  issue_number: string;
  project_id: string | null;
  module_name: string;
  issue_type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  owner_role: string | null;
  owner_id: string | null;
  status: OperationalIssueStatus;
  due_date: string | null;
  closed_by: string | null;
  closed_at: string | null;
  closure_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: { project_code: string; customer_name: string } | null;
}

export type CapaStatus =
  | 'draft' | 'assigned' | 'in_progress' | 'pending_effectiveness_check'
  | 'effective' | 'ineffective' | 'closed' | 'cancelled';

export interface CapaRecord {
  id: string;
  issue_id: string | null;
  ncr_id: string | null;
  capa_number: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  owner_id: string | null;
  due_date: string | null;
  status: CapaStatus;
  effectiveness_check_date: string | null;
  effectiveness_result: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataQualityCheck {
  id: string;
  check_name: string;
  module: string;
  severity: IssueSeverity;
  count: number;
  example_ids: string[];
  owner_role: string;
  suggested_action: string;
  fix_path: string;
}

// ─── Pre-launch: User Profile / Access Requests ──────────────────────────────

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export type AccessRequestStatus =
  | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled';

export interface AccessRequest {
  id: string;
  employee_number: string | null;
  joining_date: string | null;
  job_title: string | null;
  full_name: string;
  email: string;
  mobile_number: string | null;
  extension_number: string | null;
  department: string | null;
  direct_manager_name: string | null;
  notes: string | null;
  requested_role: UserRole | null;
  request_status: AccessRequestStatus;
  admin_review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAccount {
  id: string;
  full_name: string | null;
  email: string;
  employee_number: string | null;
  joining_date: string | null;
  job_title: string | null;
  mobile_number: string | null;
  extension_number: string | null;
  department: string | null;
  direct_manager_name: string | null;
  account_status: AccountStatus;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Future detailed-permission foundation (role remains the live mechanism).
export const PERMISSION_KEYS = [
  'can_view_costs',
  'can_approve_po',
  'can_approve_templates',
  'can_manage_users',
  'can_export_reports',
  'can_issue_release_note',
  'can_approve_custody',
  'can_manage_sla',
  'can_manage_capa',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

// ─── Pre-launch: Template Management ─────────────────────────────────────────

export type TemplateType =
  | 'letter' | 'report' | 'form' | 'checklist' | 'pdf_template'
  | 'word_template' | 'email_template' | 'operational' | 'other';

export type TemplateFormat =
  | 'rich_text' | 'plain_text' | 'html' | 'file' | 'pdf' | 'docx' | 'other';

export type TemplateApprovalStatus =
  | 'draft' | 'submitted_for_approval' | 'approved' | 'rejected' | 'archived';

export type TemplateVisibilityScope = 'department' | 'all_departments' | 'admin_only';

export type TemplateFieldType =
  | 'text' | 'number' | 'date' | 'email' | 'phone' | 'dropdown' | 'textarea'
  | 'project_selector' | 'customer_selector' | 'vehicle_selector' | 'employee_selector';

export type GeneratedDocumentStatus = 'draft' | 'generated' | 'exported' | 'archived';

export interface DocumentTemplate {
  id: string;
  template_code: string;
  template_name: string;
  template_type: TemplateType;
  department: string | null;
  description: string | null;
  file_name: string | null;
  storage_path: string | null;
  template_body: string | null;
  template_format: TemplateFormat;
  approval_status: TemplateApprovalStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  version: string;
  is_active: boolean;
  visibility_scope: TemplateVisibilityScope;
  created_at: string;
  updated_at: string;
  submitted_by_profile?: { full_name: string | null } | null;
  fields?: TemplateField[];
}

export interface TemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: TemplateFieldType;
  is_required: boolean;
  default_value: string | null;
  help_text: string | null;
  display_order: number;
  options_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedDocument {
  id: string;
  template_id: string | null;
  generated_document_number: string;
  project_id: string | null;
  related_module: string | null;
  generated_by: string | null;
  generated_at: string;
  output_title: string;
  filled_values_json: Record<string, string>;
  rendered_content: string | null;
  exported_file_path: string | null;
  status: GeneratedDocumentStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  template?: Pick<DocumentTemplate, 'template_name' | 'template_code' | 'template_type'> | null;
}

// ─── Pre-launch: Notifications ───────────────────────────────────────────────

export type NotificationSeverity = 'routine' | 'important' | 'critical';
export type NotificationChannel = 'in_app' | 'email' | 'sms';
export type NotificationDeliveryStatus =
  | 'pending' | 'sent' | 'failed' | 'skipped' | 'read';

export interface NotificationEvent {
  id: string;
  event_key: string;
  event_name: string;
  module_name: string;
  severity: NotificationSeverity;
  default_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  event_key: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  module_name: string | null;
  event_key: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  severity: NotificationSeverity;
  channel: NotificationChannel;
  delivery_status: NotificationDeliveryStatus;
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface NotificationEscalationRule {
  id: string;
  rule_key: string;
  module_name: string;
  trigger_condition: string;
  first_level_roles: string[];
  second_level_roles: string[];
  escalation_after_hours: number;
  channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Pre-launch: Report Snapshots / Scheduled Reports ────────────────────────

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';
export type ReportSnapshotStatus = 'generated' | 'exported' | 'shared' | 'archived';

export interface ReportSnapshot {
  id: string;
  report_key: string;
  report_title: string;
  department: string | null;
  date_range_from: string | null;
  date_range_to: string | null;
  filters_json: Record<string, unknown>;
  summary_json: Record<string, unknown>;
  metrics_json: Record<string, unknown>;
  rows_json: unknown[];
  notes: string | null;
  status: ReportSnapshotStatus;
  generated_by: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReportSubscription {
  id: string;
  report_key: string;
  department: string | null;
  recipients_json: { name?: string; email?: string; role?: string }[];
  frequency: ReportFrequency;
  channels: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportDeliveryLog {
  id: string;
  subscription_id: string | null;
  report_key: string;
  generated_at: string;
  delivery_channel: string;
  delivery_status: NotificationDeliveryStatus;
  recipients_json: { name?: string; email?: string }[];
  error_message: string | null;
  created_at: string;
}

// ─── Pre-launch: Department report registry (shared by export foundation) ────

export interface DepartmentReportDef {
  report_key: string;
  title: string;
  department: string;
  description: string;
  roles: UserRole[];
}

// ─── Hot Projects ──────────────────────────────────────────────────────────────

export type HotProjectStage =
  | 'lead'
  | 'qualified'
  | 'proposal_required'
  | 'quotation_requested'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'cancelled';

export interface HotProject {
  id: string;
  hot_project_code: string;
  title: string;
  customer_name: string;
  customer_contact_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  opportunity_source: string | null;
  stage: HotProjectStage;
  probability: number;
  estimated_value: number | null;
  expected_close_date: string | null;
  linked_quotation_id: string | null;
  linked_project_id: string | null;
  sales_owner_id: string | null;
  notes: string | null;
  lost_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Invoicing Plans & Milestones ─────────────────────────────────────────────

export type MilestoneStatus =
  | 'planned'
  | 'ready_to_invoice'
  | 'submitted'
  | 'approved'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface ProjectInvoicingPlan {
  id: string;
  project_id: string;
  total_contract_value: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInvoiceMilestone {
  id: string;
  plan_id: string;
  project_id: string;
  milestone_name: string;
  milestone_status: MilestoneStatus;
  percentage: number | null;
  amount: number;
  due_date: string | null;
  invoice_number: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Receivables Aging ────────────────────────────────────────────────────────

export type AgingBucket = 'not_due' | 'due_0_30' | 'due_31_60' | 'due_61_90' | 'due_90_plus';

export interface ReceivablesAgingRow {
  milestone_id: string;
  plan_id: string;
  project_id: string;
  milestone_name: string;
  milestone_status: MilestoneStatus;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string | null;
  invoice_number: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  sort_order: number;
  project_code: string;
  so_number: string;
  customer_name: string;
  sales_owner_id: string | null;
  project_status: string;
  total_contract_value: number;
  aging_bucket: AgingBucket;
  days_overdue: number;
}
