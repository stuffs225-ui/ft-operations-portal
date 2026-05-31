import type {
  MaterialQcInspection, MaterialNcr, ProjectQcInspection,
  ProjectQcFinding, ReleaseNote
} from '../types';

// 4 MaterialQcInspection records
export const MOCK_MATERIAL_QC_INSPECTIONS: MaterialQcInspection[] = [
  {
    id: 'mqc-001', project_id: 'proj-005', store_receipt_id: 'rcpt-001',
    store_receipt_item_id: 'rcpi-001', medical_serial_number_id: null,
    inspection_number: 'MQC-2025-0001', inspection_status: 'pending',
    inspection_result: 'pending', inspected_by: null, inspected_at: null,
    rejection_reason: null, remarks: null, attachments_count: 0,
    created_by: 'user-qc', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z',
    item: { item_name: 'AED Defibrillator Unit', item_code: 'MED-AED-001', material_category: 'medical', quantity_received: 3, unit: 'unit' },
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)' },
  },
  {
    id: 'mqc-002', project_id: 'proj-005', store_receipt_id: 'rcpt-002',
    store_receipt_item_id: 'rcpi-002', medical_serial_number_id: null,
    inspection_number: 'MQC-2025-0002', inspection_status: 'in_progress',
    inspection_result: 'pending', inspected_by: 'user-qc', inspected_at: null,
    rejection_reason: null, remarks: 'Checking electrical components', attachments_count: 1,
    created_by: 'user-qc', created_at: '2025-06-02T09:00:00Z', updated_at: '2025-06-02T10:00:00Z',
    item: { item_name: 'Hydraulic Pump Assembly', item_code: 'HYD-PMP-002', material_category: 'hydraulic', quantity_received: 2, unit: 'unit' },
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)' },
    inspected_by_profile: { full_name: 'QC Inspector' },
  },
  {
    id: 'mqc-003', project_id: 'proj-005', store_receipt_id: 'rcpt-001',
    store_receipt_item_id: 'rcpi-003', medical_serial_number_id: null,
    inspection_number: 'MQC-2025-0003', inspection_status: 'completed',
    inspection_result: 'accepted', inspected_by: 'user-qc', inspected_at: '2025-05-30T11:00:00Z',
    rejection_reason: null, remarks: 'All items within spec', attachments_count: 2,
    created_by: 'user-qc', created_at: '2025-05-29T08:00:00Z', updated_at: '2025-05-30T11:00:00Z',
    item: { item_name: 'Communication Radio Set', item_code: 'COMM-RAD-003', material_category: 'electrical', quantity_received: 5, unit: 'unit' },
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)' },
    inspected_by_profile: { full_name: 'QC Inspector' },
  },
  {
    id: 'mqc-004', project_id: 'proj-006', store_receipt_id: 'rcpt-003',
    store_receipt_item_id: 'rcpi-004', medical_serial_number_id: null,
    inspection_number: 'MQC-2025-0004', inspection_status: 'completed',
    inspection_result: 'rejected', inspected_by: 'user-qc', inspected_at: '2025-05-28T14:00:00Z',
    rejection_reason: 'Surface corrosion found on 3 of 4 items. Does not meet anti-corrosion spec.',
    remarks: 'Supplier must replace or provide evidence of re-treatment', attachments_count: 3,
    created_by: 'user-qc', created_at: '2025-05-27T08:00:00Z', updated_at: '2025-05-28T14:00:00Z',
    item: { item_name: 'Steel Frame Brackets', item_code: 'STR-BRK-004', material_category: 'structural', quantity_received: 4, unit: 'unit' },
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    inspected_by_profile: { full_name: 'QC Inspector' },
  },
];

// 2 MaterialNcr records
export const MOCK_MATERIAL_NCRS: MaterialNcr[] = [
  {
    id: 'ncr-001', project_id: 'proj-006', material_qc_inspection_id: 'mqc-004',
    store_receipt_item_id: 'rcpi-004', medical_serial_number_id: null,
    ncr_number: 'NCR-2025-0001', ncr_status: 'open', severity: 'critical',
    root_cause_category: 'Supplier Quality',
    description: 'Surface corrosion on steel frame brackets. 3 of 4 units fail anti-corrosion specification per DCD-SPEC-2025-003.',
    corrective_action: null, preventive_action: null,
    owner_id: null, due_date: '2025-06-15',
    closed_by: null, closed_at: null, closure_evidence_document_id: null,
    remarks: 'Supplier notified 2025-05-28. Awaiting response.',
    created_by: 'user-qc', created_at: '2025-05-28T15:00:00Z', updated_at: '2025-05-28T15:00:00Z',
    item: { item_name: 'Steel Frame Brackets', material_category: 'structural' },
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
  },
  {
    id: 'ncr-002', project_id: 'proj-005', material_qc_inspection_id: 'mqc-003',
    store_receipt_item_id: 'rcpi-003', medical_serial_number_id: null,
    ncr_number: 'NCR-2025-0002', ncr_status: 'closed', severity: 'medium',
    root_cause_category: 'Packaging Damage',
    description: 'Minor packaging damage on 1 communication radio unit. Functionality tested — unit passes operational tests.',
    corrective_action: 'Unit re-tested and accepted. Supplier warned about packaging standards.',
    preventive_action: 'Updated supplier packaging requirements in PO terms.',
    owner_id: null, due_date: '2025-06-01',
    closed_by: 'user-qc', closed_at: '2025-05-31T10:00:00Z', closure_evidence_document_id: null,
    remarks: 'Closed after successful re-test.',
    created_by: 'user-qc', created_at: '2025-05-29T10:00:00Z', updated_at: '2025-05-31T10:00:00Z',
    item: { item_name: 'Communication Radio Set', material_category: 'electrical' },
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)' },
  },
];

// 4 ProjectQcInspection records
export const MOCK_PROJECT_QC_INSPECTIONS: ProjectQcInspection[] = [
  {
    id: 'pqc-001', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1',
    factory_record_id: 'fr-001',
    inspection_number: 'PQC-2025-0001', inspection_status: 'pending',
    inspection_result: 'pending', inspected_by: null, inspected_at: null,
    readiness_status: 'not_ready', remarks: null,
    created_by: 'user-qc', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z',
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)', manufacturing_location: 'saudi' },
    vehicle_line: { line_number: 1, vehicle_type: 'Command Vehicle', description: 'Armoured Command and Control Unit', quantity: 3 },
  },
  {
    id: 'pqc-002', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1',
    factory_record_id: null,
    inspection_number: 'PQC-2025-0002', inspection_status: 'in_progress',
    inspection_result: 'pending', inspected_by: 'user-qc', inspected_at: null,
    readiness_status: 'not_ready', remarks: 'Inspection started — checking vehicle fitout',
    created_by: 'user-qc', created_at: '2025-06-02T09:00:00Z', updated_at: '2025-06-03T09:00:00Z',
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)', manufacturing_location: 'saudi' },
    vehicle_line: { line_number: 2, vehicle_type: 'Rescue Vehicle', description: 'Light Rescue and Recovery Unit', quantity: 5 },
    inspected_by_profile: { full_name: 'QC Inspector' },
  },
  {
    id: 'pqc-003', project_id: 'proj-005', project_vehicle_line_id: null,
    factory_record_id: null,
    inspection_number: 'PQC-2025-0003', inspection_status: 'completed',
    inspection_result: 'passed', inspected_by: 'user-qc', inspected_at: '2025-05-25T15:00:00Z',
    readiness_status: 'ready_for_release', remarks: 'All vehicle lines inspected and approved. Ready for delivery.',
    created_by: 'user-qc', created_at: '2025-05-20T08:00:00Z', updated_at: '2025-05-25T15:00:00Z',
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)', manufacturing_location: 'saudi' },
    inspected_by_profile: { full_name: 'QC Inspector' },
  },
  {
    id: 'pqc-004', project_id: 'proj-006', project_vehicle_line_id: 'pvl-006-1',
    factory_record_id: null,
    inspection_number: 'PQC-2025-0004', inspection_status: 'completed',
    inspection_result: 'rework_required', inspected_by: 'user-qc', inspected_at: '2025-05-30T11:00:00Z',
    readiness_status: 'pending_rework', remarks: 'Two findings raised. Rework required before release.',
    created_by: 'user-qc', created_at: '2025-05-28T08:00:00Z', updated_at: '2025-05-30T11:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence', manufacturing_location: 'dubai' },
    vehicle_line: { line_number: 1, vehicle_type: 'Fire Tender', description: 'Heavy Duty Fire Fighting Tender', quantity: 2 },
    inspected_by_profile: { full_name: 'QC Inspector' },
  },
];

// 3 ProjectQcFinding records
export const MOCK_PROJECT_QC_FINDINGS: ProjectQcFinding[] = [
  {
    id: 'fnd-001', project_qc_inspection_id: 'pqc-004', project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-006-1',
    finding_number: 'FND-2025-0001', finding_type: 'functional', severity: 'high',
    description: 'Pump discharge pressure below specification — 8 bar measured vs 10 bar required.',
    required_action: 'Rework pump assembly. Recalibrate pressure regulator. Re-test to spec.',
    owner_role: 'factory_user', owner_id: null, due_date: '2025-06-10',
    finding_status: 'rework_in_progress', rework_required: true,
    rework_completed_by: null, rework_completed_at: null,
    closure_notes: null, closed_by: null, closed_at: null,
    created_at: '2025-05-30T12:00:00Z', updated_at: '2025-06-01T09:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    vehicle_line: { vehicle_type: 'Fire Tender', description: 'Heavy Duty Fire Fighting Tender' },
  },
  {
    id: 'fnd-002', project_qc_inspection_id: 'pqc-004', project_id: 'proj-006',
    project_vehicle_line_id: 'pvl-006-1',
    finding_number: 'FND-2025-0002', finding_type: 'documentation', severity: 'low',
    description: 'Vehicle handover documentation incomplete. Missing proof-of-test report for water tank.',
    required_action: 'Generate and attach water tank test report signed by factory supervisor.',
    owner_role: 'factory_user', owner_id: null, due_date: '2025-06-08',
    finding_status: 'assigned', rework_required: false,
    rework_completed_by: null, rework_completed_at: null,
    closure_notes: null, closed_by: null, closed_at: null,
    created_at: '2025-05-30T12:30:00Z', updated_at: '2025-05-31T08:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence' },
    vehicle_line: { vehicle_type: 'Fire Tender', description: 'Heavy Duty Fire Fighting Tender' },
  },
  {
    id: 'fnd-003', project_qc_inspection_id: 'pqc-003', project_id: 'proj-005',
    project_vehicle_line_id: 'pvl-005-1',
    finding_number: 'FND-2025-0003', finding_type: 'surface_finish', severity: 'low',
    description: 'Minor paint blemish on rear quarter panel. Cosmetic only — no structural impact.',
    required_action: 'Touch-up paint and re-polish affected area.',
    owner_role: 'factory_user', owner_id: null, due_date: '2025-05-24',
    finding_status: 'closed', rework_required: true,
    rework_completed_by: 'user-factory', rework_completed_at: '2025-05-23T14:00:00Z',
    closure_notes: 'Rework completed and verified. Surface finish acceptable.',
    closed_by: 'user-qc', closed_at: '2025-05-25T09:00:00Z',
    created_at: '2025-05-20T13:00:00Z', updated_at: '2025-05-25T09:00:00Z',
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)' },
    vehicle_line: { vehicle_type: 'Command Vehicle', description: 'Armoured Command and Control Unit' },
  },
];

// 2 ReleaseNote records
export const MOCK_RELEASE_NOTES: ReleaseNote[] = [
  {
    id: 'rn-001', project_id: 'proj-006', project_vehicle_line_id: null,
    release_note_number: 'RN-2025-0001', release_status: 'blocked',
    release_type: 'project_release', issued_by: null, issued_at: null,
    approved_by: null, approved_at: null, document_id: null,
    remarks: 'Blocked: 1 open NCR (NCR-2025-0001) and 2 open QC findings (FND-2025-0001, FND-2025-0002)',
    created_by: 'user-qc', created_at: '2025-05-30T16:00:00Z', updated_at: '2025-05-30T16:00:00Z',
    project: { project_code: 'FT-2025-0006', customer_name: 'Dubai Civil Defence', manufacturing_location: 'dubai' },
  },
  {
    id: 'rn-002', project_id: 'proj-005', project_vehicle_line_id: null,
    release_note_number: 'RN-2025-0002', release_status: 'issued',
    release_type: 'project_release', issued_by: 'user-qc', issued_at: '2025-05-26T10:00:00Z',
    approved_by: 'user-admin', approved_at: '2025-05-26T09:30:00Z', document_id: null,
    remarks: 'All QC inspections passed. All findings closed. Ready for delivery.',
    created_by: 'user-qc', created_at: '2025-05-25T16:00:00Z', updated_at: '2025-05-26T10:00:00Z',
    project: { project_code: 'FT-2025-0005', customer_name: 'GACA (Saudi Arabia)', manufacturing_location: 'saudi' },
    issued_by_profile: { full_name: 'QC Inspector' },
  },
];

export function getMockMaterialQcForProject(projectId: string): MaterialQcInspection[] {
  return MOCK_MATERIAL_QC_INSPECTIONS.filter(i => i.project_id === projectId);
}

export function getMockNcrsForProject(projectId: string): MaterialNcr[] {
  return MOCK_MATERIAL_NCRS.filter(n => n.project_id === projectId);
}

export function getMockProjectQcForProject(projectId: string): ProjectQcInspection[] {
  return MOCK_PROJECT_QC_INSPECTIONS.filter(i => i.project_id === projectId);
}

export function getMockFindingsForInspection(inspectionId: string): ProjectQcFinding[] {
  return MOCK_PROJECT_QC_FINDINGS.filter(f => f.project_qc_inspection_id === inspectionId);
}

export function getMockFindingsForProject(projectId: string): ProjectQcFinding[] {
  return MOCK_PROJECT_QC_FINDINGS.filter(f => f.project_id === projectId);
}

export function getMockReleaseNotesForProject(projectId: string): ReleaseNote[] {
  return MOCK_RELEASE_NOTES.filter(r => r.project_id === projectId);
}
