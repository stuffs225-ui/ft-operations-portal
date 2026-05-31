import type {
  DubaiProjectFollowup, DubaiEtaHistory,
  AfsArrivalReport, AfsMissingItem,
  AfsPredeliveryReport, AfsConditionReport,
  AfsMaintenanceRequest,
} from '../types';

// ── Dubai Project Follow-ups ─────────────────────────────────────────────────

export const MOCK_DUBAI_FOLLOWUPS: DubaiProjectFollowup[] = [
  {
    id: 'dpf-001',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-005',
    pn_reference_id: 'exec-pn-001',
    dubai_po_number: 'DXB-PO-2025-001',
    dubai_po_date: '2025-03-10',
    dubai_status: 'in_transit',
    eta_date: '2025-06-15',
    eta_status: 'on_track',
    last_followup_date: '2025-05-20T09:00:00Z',
    next_followup_date: '2025-05-27T09:00:00Z',
    followed_by: 'user-ops',
    remarks: 'Vehicle chassis dispatched from Dubai factory on schedule.',
    created_at: '2025-03-10T08:00:00Z',
    updated_at: '2025-05-20T09:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence', manufacturing_location: 'dubai' },
    vehicle_line: { vehicle_type: 'Command Vehicle', description: 'Command & Control Unit', quantity: 2 },
    followed_by_profile: { full_name: 'Operations Manager' },
  },
  {
    id: 'dpf-002',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-006',
    pn_reference_id: 'exec-pn-001',
    dubai_po_number: 'DXB-PO-2025-001',
    dubai_po_date: '2025-03-10',
    dubai_status: 'eta_confirmed',
    eta_date: '2025-07-01',
    eta_status: 'delayed',
    last_followup_date: '2025-05-18T10:00:00Z',
    next_followup_date: '2025-05-25T10:00:00Z',
    followed_by: 'user-ops',
    remarks: 'ETA revised due to supplier delay on specialty equipment.',
    created_at: '2025-03-10T08:30:00Z',
    updated_at: '2025-05-18T10:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence', manufacturing_location: 'dubai' },
    vehicle_line: { vehicle_type: 'Support Vehicle', description: 'Logistics Support Unit', quantity: 3 },
    followed_by_profile: { full_name: 'Operations Manager' },
  },
  {
    id: 'dpf-003',
    project_id: 'proj-007',
    project_vehicle_line_id: null,
    pn_reference_id: null,
    dubai_po_number: null,
    dubai_po_date: null,
    dubai_status: 'pending_dubai_po',
    eta_date: null,
    eta_status: 'not_set',
    last_followup_date: null,
    next_followup_date: '2025-06-01T09:00:00Z',
    followed_by: null,
    remarks: 'Awaiting PN confirmation before Dubai PO can be issued.',
    created_at: '2025-05-01T08:00:00Z',
    updated_at: '2025-05-01T08:00:00Z',
    project: { project_code: 'FT-2025-0007', customer_name: 'Abu Dhabi Police', manufacturing_location: 'dubai' },
    vehicle_line: null,
    followed_by_profile: null,
  },
];

export function getMockDubaiFollowupsForProject(projectId: string): DubaiProjectFollowup[] {
  return MOCK_DUBAI_FOLLOWUPS.filter(f => f.project_id === projectId);
}

// ── Dubai ETA History ────────────────────────────────────────────────────────

export const MOCK_DUBAI_ETA_HISTORY: DubaiEtaHistory[] = [
  {
    id: 'deh-001',
    dubai_followup_id: 'dpf-002',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-006',
    old_eta: '2025-06-10',
    new_eta: '2025-07-01',
    changed_by: 'user-ops',
    changed_at: '2025-05-18T10:00:00Z',
    reason: 'Supplier delay on specialty lighting and siren equipment.',
    remarks: 'Dubai partner confirmed new ETA via email.',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    changed_by_profile: { full_name: 'Operations Manager' },
  },
  {
    id: 'deh-002',
    dubai_followup_id: 'dpf-001',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-005',
    old_eta: '2025-06-01',
    new_eta: '2025-06-15',
    changed_by: 'user-ops',
    changed_at: '2025-04-20T08:30:00Z',
    reason: 'Customs clearance processing time extended by 2 weeks.',
    remarks: null,
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    changed_by_profile: { full_name: 'Operations Manager' },
  },
];

export function getMockEtaHistoryForFollowup(followupId: string): DubaiEtaHistory[] {
  return MOCK_DUBAI_ETA_HISTORY.filter(h => h.dubai_followup_id === followupId);
}

// ── AFS Arrival Reports ──────────────────────────────────────────────────────

export const MOCK_AFS_ARRIVAL_REPORTS: AfsArrivalReport[] = [
  {
    id: 'aar-001',
    dubai_followup_id: 'dpf-001',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-005',
    arrival_report_number: 'ARR-2025-0001',
    arrival_date: '2025-05-28',
    arrival_status: 'arrived',
    received_by: 'user-afs',
    received_quantity: 2,
    expected_quantity: 2,
    storage_location: 'AFS Bay A-1',
    condition_on_arrival: 'Good — minor cosmetic marks on Unit 2 rear bumper.',
    remarks: 'Both units received and checked into AFS facility.',
    created_by: 'user-afs',
    created_at: '2025-05-28T11:00:00Z',
    updated_at: '2025-05-28T11:30:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    vehicle_line: { vehicle_type: 'Command Vehicle', description: 'Command & Control Unit' },
    received_by_profile: { full_name: 'AFS Inspector' },
  },
  {
    id: 'aar-002',
    dubai_followup_id: 'dpf-002',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-006',
    arrival_report_number: 'ARR-2025-0002',
    arrival_date: '2025-07-01',
    arrival_status: 'pending',
    received_by: null,
    received_quantity: 0,
    expected_quantity: 3,
    storage_location: null,
    condition_on_arrival: null,
    remarks: 'Awaiting arrival — ETA confirmed for 01 Jul 2025.',
    created_by: 'user-ops',
    created_at: '2025-05-18T10:30:00Z',
    updated_at: '2025-05-18T10:30:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    vehicle_line: { vehicle_type: 'Support Vehicle', description: 'Logistics Support Unit' },
    received_by_profile: null,
  },
];

export function getMockArrivalReportsForProject(projectId: string): AfsArrivalReport[] {
  return MOCK_AFS_ARRIVAL_REPORTS.filter(r => r.project_id === projectId);
}

// ── AFS Missing Items ────────────────────────────────────────────────────────

export const MOCK_AFS_MISSING_ITEMS: AfsMissingItem[] = [
  {
    id: 'ami-001',
    arrival_report_id: 'aar-001',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-005',
    item_name: 'Emergency Lighting Kit',
    item_code: 'ELK-001',
    quantity_expected: 2,
    quantity_received: 1,
    missing_item_status: 'requested',
    severity: 'high',
    store_request_id: null,
    notes: 'One unit missing from shipment. Store request raised.',
    resolved_at: null,
    resolved_by: null,
    created_at: '2025-05-28T12:00:00Z',
    updated_at: '2025-05-29T09:00:00Z',
  },
  {
    id: 'ami-002',
    arrival_report_id: 'aar-001',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-005',
    item_name: 'User Manual (Arabic)',
    item_code: 'DOC-AR-001',
    quantity_expected: 2,
    quantity_received: 0,
    missing_item_status: 'open',
    severity: 'low',
    store_request_id: null,
    notes: 'Documents not included in shipment.',
    resolved_at: null,
    resolved_by: null,
    created_at: '2025-05-28T12:10:00Z',
    updated_at: '2025-05-28T12:10:00Z',
  },
];

export function getMockMissingItemsForArrival(arrivalReportId: string): AfsMissingItem[] {
  return MOCK_AFS_MISSING_ITEMS.filter(i => i.arrival_report_id === arrivalReportId);
}

export function getMockMissingItemsForProject(projectId: string): AfsMissingItem[] {
  return MOCK_AFS_MISSING_ITEMS.filter(i => i.project_id === projectId);
}

// ── AFS Pre-Delivery Reports ─────────────────────────────────────────────────

export const MOCK_AFS_PREDELIVERY_REPORTS: AfsPredeliveryReport[] = [
  {
    id: 'apdr-001',
    arrival_report_id: 'aar-001',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-005',
    predelivery_report_number: 'PDR-2025-0001',
    report_date: '2025-05-30',
    chassis_number: 'CMD-VEH-001',
    readiness_status: 'pending',
    checklist_items_total: 12,
    checklist_items_passed: 9,
    open_missing_items: 2,
    open_ncrs: 0,
    release_note_issued: false,
    release_note_id: null,
    inspector_id: 'user-afs',
    inspected_at: '2025-05-30T10:00:00Z',
    remarks: 'Missing emergency lighting kit blocks delivery readiness.',
    ready_for_delivery: false,
    delivery_approved_by: null,
    delivery_approved_at: null,
    created_by: 'user-afs',
    created_at: '2025-05-30T10:00:00Z',
    updated_at: '2025-05-30T10:30:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    vehicle_line: { vehicle_type: 'Command Vehicle', description: 'Command & Control Unit' },
  },
];

export function getMockPredeliveryReportsForProject(projectId: string): AfsPredeliveryReport[] {
  return MOCK_AFS_PREDELIVERY_REPORTS.filter(r => r.project_id === projectId);
}

// ── AFS Condition Reports ────────────────────────────────────────────────────

export const MOCK_AFS_CONDITION_REPORTS: AfsConditionReport[] = [
  {
    id: 'acr-001',
    project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-005',
    condition_report_number: 'CND-2025-0001',
    report_date: '2025-05-28',
    chassis_number: 'CMD-VEH-002',
    overall_condition: 'minor_damage',
    report_status: 'open',
    reported_by: 'user-afs',
    assigned_to: 'user-ops',
    description: 'Minor paint scratch on rear bumper — Unit 2. Approximately 5 cm horizontal scratch, surface level only.',
    root_cause: null,
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    created_at: '2025-05-28T13:00:00Z',
    updated_at: '2025-05-28T13:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    vehicle_line: { vehicle_type: 'Command Vehicle', description: 'Command & Control Unit' },
  },
];

export function getMockConditionReportsForProject(projectId: string): AfsConditionReport[] {
  return MOCK_AFS_CONDITION_REPORTS.filter(r => r.project_id === projectId);
}

// ── AFS Maintenance Requests ─────────────────────────────────────────────────

export const MOCK_AFS_MAINTENANCE_REQUESTS: AfsMaintenanceRequest[] = [
  {
    id: 'amr-001',
    project_id: 'proj-005',
    project_vehicle_line_id: null,
    maintenance_request_number: 'MNT-2025-0001',
    customer_name: 'GACA',
    chassis_number: 'GACA-001',
    issue_type: 'mechanical',
    priority: 'high',
    maintenance_status: 'under_inspection',
    title: 'Engine coolant leak — Unit GACA-001',
    description: 'Customer reported coolant leak from front of engine bay. Visible drip when stationary.',
    reported_date: '2025-05-25',
    wo_reference: 'WO-2025-0001',
    pn_reference: null,
    assigned_to: 'user-afs',
    inspected_by: 'user-afs',
    inspected_at: '2025-05-26T09:00:00Z',
    inspection_notes: 'Confirmed leak from lower radiator hose junction. Hose clamp requires replacement.',
    parts_required: true,
    parts_notes: 'Require: Radiator hose clamp (x2), coolant top-up fluid (2L)',
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    closed_at: null,
    closed_by: null,
    created_by: 'user-sales',
    created_at: '2025-05-25T10:00:00Z',
    updated_at: '2025-05-26T09:30:00Z',
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA' },
    vehicle_line: null,
    assigned_to_profile: { full_name: 'AFS Inspector' },
  },
  {
    id: 'amr-002',
    project_id: 'proj-006',
    project_vehicle_line_id: null,
    maintenance_request_number: 'MNT-2025-0002',
    customer_name: 'Dubai Civil Defence',
    chassis_number: 'CMD-VEH-001',
    issue_type: 'electrical',
    priority: 'critical',
    maintenance_status: 'parts_waiting',
    title: 'Siren control unit non-functional',
    description: 'Primary siren control unit showing fault code E-404. Unit does not respond to activation.',
    reported_date: '2025-05-27',
    wo_reference: null,
    pn_reference: 'PN-DXB-2025-001',
    assigned_to: 'user-afs',
    inspected_by: 'user-afs',
    inspected_at: '2025-05-27T14:00:00Z',
    inspection_notes: 'Control unit confirmed faulty. Replacement unit required from supplier.',
    parts_required: true,
    parts_notes: 'Replacement siren control unit SCU-v2 ordered from Dubai supplier. ETA 3 days.',
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    closed_at: null,
    closed_by: null,
    created_by: 'user-afs',
    created_at: '2025-05-27T14:30:00Z',
    updated_at: '2025-05-28T08:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    vehicle_line: null,
    assigned_to_profile: { full_name: 'AFS Inspector' },
  },
  {
    id: 'amr-003',
    project_id: 'proj-005',
    project_vehicle_line_id: null,
    maintenance_request_number: 'MNT-2025-0003',
    customer_name: 'GACA',
    chassis_number: 'GACA-003',
    issue_type: 'body_damage',
    priority: 'medium',
    maintenance_status: 'completed',
    title: 'Door panel replacement — Unit GACA-003',
    description: 'Customer-reported dent on rear passenger door from parking incident.',
    reported_date: '2025-05-10',
    wo_reference: 'WO-2025-0001',
    pn_reference: null,
    assigned_to: 'user-afs',
    inspected_by: 'user-afs',
    inspected_at: '2025-05-11T09:00:00Z',
    inspection_notes: 'Confirmed dent on rear door. Panel replacement required.',
    parts_required: true,
    parts_notes: 'Replacement door panel installed on 2025-05-20.',
    resolution_notes: 'Door panel replaced and repainted. Customer notified. Quality check passed.',
    resolved_at: '2025-05-22T15:00:00Z',
    resolved_by: 'user-afs',
    closed_at: null,
    closed_by: null,
    created_by: 'user-sales',
    created_at: '2025-05-10T11:00:00Z',
    updated_at: '2025-05-22T15:00:00Z',
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA' },
    vehicle_line: null,
    assigned_to_profile: { full_name: 'AFS Inspector' },
  },
  {
    id: 'amr-004',
    project_id: null,
    project_vehicle_line_id: null,
    maintenance_request_number: 'MNT-2025-0004',
    customer_name: 'General Customer',
    chassis_number: null,
    issue_type: 'software',
    priority: 'low',
    maintenance_status: 'open',
    title: 'Navigation system software update required',
    description: 'Customer requesting software update for navigation and infotainment system to latest firmware.',
    reported_date: '2025-05-29',
    wo_reference: null,
    pn_reference: null,
    assigned_to: null,
    inspected_by: null,
    inspected_at: null,
    inspection_notes: null,
    parts_required: false,
    parts_notes: null,
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    closed_at: null,
    closed_by: null,
    created_by: 'user-afs',
    created_at: '2025-05-29T09:00:00Z',
    updated_at: '2025-05-29T09:00:00Z',
    project: null,
    vehicle_line: null,
    assigned_to_profile: null,
  },
];

export function getMockMaintenanceRequestsForProject(projectId: string): AfsMaintenanceRequest[] {
  return MOCK_AFS_MAINTENANCE_REQUESTS.filter(r => r.project_id === projectId);
}
