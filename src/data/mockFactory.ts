import type {
  FactoryRecord, FactoryRequirementType, FactoryItemRequirement,
  RawMaterialRequest, RawMaterialRequestFile, RawMaterialRequestItem,
} from '../types';

// ── Requirement Types ─────────────────────────────────────────────────────────

export const MOCK_REQUIREMENT_TYPES: FactoryRequirementType[] = [
  { id: 'rqt-001', name: 'BOQ',                   description: 'Bill of Quantities',                                sort_order: 1, is_active: true },
  { id: 'rqt-002', name: 'BOM',                   description: 'Bill of Materials',                                 sort_order: 2, is_active: true },
  { id: 'rqt-003', name: 'GA Drawing',            description: 'General Arrangement Drawing',                       sort_order: 3, is_active: true },
  { id: 'rqt-004', name: 'Detail Drawings',       description: 'Detailed Engineering Drawings',                     sort_order: 4, is_active: true },
  { id: 'rqt-005', name: 'Required Manhours',     description: 'Estimated manhours for production',                 sort_order: 5, is_active: true },
  { id: 'rqt-006', name: 'Pending Raw Materials', description: 'List of materials pending procurement or delivery', sort_order: 6, is_active: true },
  { id: 'rqt-007', name: 'Production Plan',       description: 'Production schedule and milestones',               sort_order: 7, is_active: true },
  { id: 'rqt-008', name: 'Other',                 description: 'Other factory requirement',                         sort_order: 8, is_active: true },
];

// ── Factory Records ───────────────────────────────────────────────────────────
// proj-005 (FT-2025-0005, GACA) is the only approved Saudi project with a confirmed WO

export const MOCK_FACTORY_RECORDS: FactoryRecord[] = [
  {
    id: 'fr-001',
    project_id: 'proj-005',
    project_vehicle_line_id: 'pvl-005-1',
    wo_reference_id: 'wo-001',
    production_status: 'in_production',
    progress_percentage: 65,
    expected_completion_date: '2025-06-30',
    actual_completion_date: null,
    monthly_update_required: true,
    last_updated_by: 'dev-usr-001',
    last_updated_at: '2025-05-01T08:00:00Z',
    remarks: 'Hydraulic system assembly 65% complete. Foam system integration in progress.',
    created_at: '2025-02-01T08:00:00Z',
    updated_at: '2025-05-01T08:00:00Z',
    project: { project_code: 'FT-2025-0005', so_number: 'SO-GACA-2025-0003', customer_name: 'General Authority of Civil Aviation' },
    vehicle_line: { vehicle_type: 'Fire Truck', description: 'Airport ARFF Truck — Category 7', quantity: 2 },
  },
  {
    id: 'fr-002',
    project_id: 'proj-005',
    project_vehicle_line_id: 'pvl-005-2',
    wo_reference_id: 'wo-001',
    production_status: 'boq_uploaded',
    progress_percentage: 30,
    expected_completion_date: '2025-07-31',
    actual_completion_date: null,
    monthly_update_required: false,
    last_updated_by: 'dev-usr-001',
    last_updated_at: '2025-04-15T10:00:00Z',
    remarks: 'BOQ uploaded. GA Drawing in review. Awaiting detail drawings.',
    created_at: '2025-02-05T09:00:00Z',
    updated_at: '2025-04-15T10:00:00Z',
    project: { project_code: 'FT-2025-0005', so_number: 'SO-GACA-2025-0003', customer_name: 'General Authority of Civil Aviation' },
    vehicle_line: { vehicle_type: 'Fire Truck', description: 'Airport ARFF Truck — Category 9', quantity: 1 },
  },
  {
    id: 'fr-003',
    project_id: 'proj-005',
    project_vehicle_line_id: null,
    wo_reference_id: 'wo-001',
    production_status: 'on_hold',
    progress_percentage: 0,
    expected_completion_date: null,
    actual_completion_date: null,
    monthly_update_required: false,
    last_updated_by: 'dev-usr-001',
    last_updated_at: '2025-03-20T14:00:00Z',
    remarks: 'On hold pending customer specification clarification.',
    created_at: '2025-03-20T14:00:00Z',
    updated_at: '2025-03-20T14:00:00Z',
    project: { project_code: 'FT-2025-0005', so_number: 'SO-GACA-2025-0003', customer_name: 'General Authority of Civil Aviation' },
    vehicle_line: null,
  },
  {
    id: 'fr-004',
    project_id: 'proj-005',
    project_vehicle_line_id: 'pvl-005-3',
    wo_reference_id: 'wo-001',
    production_status: 'not_started',
    progress_percentage: 0,
    expected_completion_date: null,
    actual_completion_date: null,
    monthly_update_required: false,
    last_updated_by: null,
    last_updated_at: '2025-02-01T08:00:00Z',
    remarks: null,
    created_at: '2025-02-01T08:00:00Z',
    updated_at: '2025-02-01T08:00:00Z',
    project: { project_code: 'FT-2025-0005', so_number: 'SO-GACA-2025-0003', customer_name: 'General Authority of Civil Aviation' },
    vehicle_line: { vehicle_type: 'Support Vehicle', description: 'Command & Control Unit', quantity: 1 },
  },
];

// ── Factory Item Requirements ─────────────────────────────────────────────────

export const MOCK_FACTORY_REQUIREMENTS: FactoryItemRequirement[] = [
  {
    id: 'fir-001', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1',
    requirement_type_id: 'rqt-001', status: 'uploaded',
    document_id: null, value_text: 'BOQ-ARFF-CAT7-Rev2.xlsx', value_number: null,
    uploaded_by: 'dev-usr-001', uploaded_at: '2025-02-10T09:00:00Z',
    remarks: 'BOQ Rev2 uploaded. Approved by Engineering.',
    created_at: '2025-02-01T08:00:00Z', updated_at: '2025-02-10T09:00:00Z',
    requirement_type: MOCK_REQUIREMENT_TYPES[0],
  },
  {
    id: 'fir-002', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1',
    requirement_type_id: 'rqt-002', status: 'pending',
    document_id: null, value_text: null, value_number: null,
    uploaded_by: null, uploaded_at: null, remarks: 'BOM not yet uploaded.',
    created_at: '2025-02-01T08:00:00Z', updated_at: '2025-02-01T08:00:00Z',
    requirement_type: MOCK_REQUIREMENT_TYPES[1],
  },
  {
    id: 'fir-003', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1',
    requirement_type_id: 'rqt-003', status: 'uploaded',
    document_id: null, value_text: 'GA-ARFF-CAT7-RevA.pdf', value_number: null,
    uploaded_by: 'dev-usr-001', uploaded_at: '2025-02-20T11:00:00Z', remarks: null,
    created_at: '2025-02-01T08:00:00Z', updated_at: '2025-02-20T11:00:00Z',
    requirement_type: MOCK_REQUIREMENT_TYPES[2],
  },
  {
    id: 'fir-004', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1',
    requirement_type_id: 'rqt-004', status: 'in_progress',
    document_id: null, value_text: null, value_number: null,
    uploaded_by: null, uploaded_at: null,
    remarks: 'Detail drawings in preparation — expected 2025-03-10.',
    created_at: '2025-02-01T08:00:00Z', updated_at: '2025-03-01T09:00:00Z',
    requirement_type: MOCK_REQUIREMENT_TYPES[3],
  },
  {
    id: 'fir-005', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1',
    requirement_type_id: 'rqt-005', status: 'uploaded',
    document_id: null, value_text: null, value_number: 480,
    uploaded_by: 'dev-usr-001', uploaded_at: '2025-02-25T10:00:00Z',
    remarks: '480 manhours estimated for 2 units.',
    created_at: '2025-02-01T08:00:00Z', updated_at: '2025-02-25T10:00:00Z',
    requirement_type: MOCK_REQUIREMENT_TYPES[4],
  },
  {
    id: 'fir-006', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-2',
    requirement_type_id: 'rqt-001', status: 'uploaded',
    document_id: null, value_text: 'BOQ-ARFF-CAT9-Rev1.xlsx', value_number: null,
    uploaded_by: 'dev-usr-001', uploaded_at: '2025-04-10T09:00:00Z', remarks: null,
    created_at: '2025-02-05T09:00:00Z', updated_at: '2025-04-10T09:00:00Z',
    requirement_type: MOCK_REQUIREMENT_TYPES[0],
  },
  {
    id: 'fir-007', project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-2',
    requirement_type_id: 'rqt-003', status: 'pending',
    document_id: null, value_text: null, value_number: null,
    uploaded_by: null, uploaded_at: null,
    remarks: 'GA Drawing not yet uploaded — blocking detail drawings.',
    created_at: '2025-02-05T09:00:00Z', updated_at: '2025-02-05T09:00:00Z',
    requirement_type: MOCK_REQUIREMENT_TYPES[2],
  },
];

// ── Raw Material Requests ─────────────────────────────────────────────────────

export const MOCK_RAW_MATERIAL_REQUESTS: RawMaterialRequest[] = [
  {
    id: 'rmr-001',
    project_id: 'proj-005', project_vehicle_line_id: 'pvl-005-1', wo_reference_id: 'wo-001',
    request_type: 'project_related', request_number: 'RMR-2025-0001',
    status: 'sent_to_procurement',
    requested_by: 'dev-usr-001', requested_at: '2025-03-01T08:00:00Z',
    reviewed_by: 'dev-usr-001', reviewed_at: '2025-03-03T10:00:00Z',
    sent_to_procurement_at: '2025-03-03T10:00:00Z',
    remarks: 'Hydraulic components and foam chemicals for ARFF Cat 7.',
    created_at: '2025-03-01T08:00:00Z', updated_at: '2025-03-03T10:00:00Z',
    project: { project_code: 'FT-2025-0005', so_number: 'SO-GACA-2025-0003', customer_name: 'General Authority of Civil Aviation' },
    requested_by_profile: { full_name: 'Dev Admin' },
  },
  {
    id: 'rmr-002',
    project_id: 'proj-005', project_vehicle_line_id: null, wo_reference_id: 'wo-001',
    request_type: 'project_related', request_number: 'RMR-2025-0002',
    status: 'draft',
    requested_by: 'dev-usr-001', requested_at: '2025-04-20T09:00:00Z',
    reviewed_by: null, reviewed_at: null, sent_to_procurement_at: null,
    remarks: 'Electrical wiring harnesses and control panels.',
    created_at: '2025-04-20T09:00:00Z', updated_at: '2025-04-20T09:00:00Z',
    project: { project_code: 'FT-2025-0005', so_number: 'SO-GACA-2025-0003', customer_name: 'General Authority of Civil Aviation' },
    requested_by_profile: { full_name: 'Dev Admin' },
  },
  {
    id: 'rmr-003',
    project_id: null, project_vehicle_line_id: null, wo_reference_id: null,
    request_type: 'stock', request_number: 'RMR-2025-0003',
    status: 'submitted',
    requested_by: 'dev-usr-001', requested_at: '2025-04-28T11:00:00Z',
    reviewed_by: null, reviewed_at: null, sent_to_procurement_at: null,
    remarks: 'General workshop consumables — stock replenishment.',
    created_at: '2025-04-28T11:00:00Z', updated_at: '2025-04-28T11:00:00Z',
    project: null, requested_by_profile: { full_name: 'Dev Admin' },
  },
];

// ── RMR Files ─────────────────────────────────────────────────────────────────

export const MOCK_RMR_FILES: RawMaterialRequestFile[] = [
  {
    id: 'rmrf-001', raw_material_request_id: 'rmr-001',
    file_name: 'BOM-ARFF-CAT7-Materials.xlsx', storage_path: null, file_type: 'excel_bom',
    uploaded_by: 'dev-usr-001', uploaded_at: '2025-03-01T08:00:00Z',
    parsing_status: 'pending_future_parser', remarks: 'Uploaded from Engineering team.',
  },
  {
    id: 'rmrf-002', raw_material_request_id: 'rmr-003',
    file_name: 'Stock-Replenishment-Q2-2025.xlsx', storage_path: null, file_type: 'excel_boq',
    uploaded_by: 'dev-usr-001', uploaded_at: '2025-04-28T11:00:00Z',
    parsing_status: 'not_parsed', remarks: null,
  },
];

// ── RMR Items ─────────────────────────────────────────────────────────────────

export const MOCK_RMR_ITEMS: RawMaterialRequestItem[] = [
  {
    id: 'rmri-001', raw_material_request_id: 'rmr-001',
    item_code: 'ARFF-HYD-02', item_name: 'Hydraulic Hose Assembly',
    description: 'High-pressure hydraulic hose 25mm × 3m',
    quantity: 12, unit: 'unit', material_category: 'Hydraulic Systems',
    required_for: 'Fire pump hydraulic circuit', vehicle_line_id: 'pvl-005-1',
    remarks: null, created_at: '2025-03-01T08:00:00Z', updated_at: '2025-03-01T08:00:00Z',
  },
  {
    id: 'rmri-002', raw_material_request_id: 'rmr-001',
    item_code: 'ARFF-VALVE-01', item_name: 'Ball Valve 2 inch',
    description: 'Stainless steel ball valve for foam system',
    quantity: 8, unit: 'unit', material_category: 'Hydraulic Systems',
    required_for: 'Foam proportioning system', vehicle_line_id: 'pvl-005-1',
    remarks: null, created_at: '2025-03-01T08:00:00Z', updated_at: '2025-03-01T08:00:00Z',
  },
  {
    id: 'rmri-003', raw_material_request_id: 'rmr-001',
    item_code: 'ELEC-WIRE-01', item_name: 'Electrical Cable 6mm²',
    description: 'Flexible multi-core electrical cable for vehicle wiring',
    quantity: 150, unit: 'meter', material_category: 'Electrical & Electronics',
    required_for: 'Main wiring harness', vehicle_line_id: null,
    remarks: 'Specify fire-rated specification', created_at: '2025-03-01T08:00:00Z', updated_at: '2025-03-01T08:00:00Z',
  },
  {
    id: 'rmri-004', raw_material_request_id: 'rmr-001',
    item_code: 'BODY-ALUM-01', item_name: 'Aluminium Profile 50×50mm',
    description: '6061-T6 aluminium structural profile',
    quantity: 40, unit: 'meter', material_category: 'Structural Materials',
    required_for: 'Body compartment framing', vehicle_line_id: 'pvl-005-1',
    remarks: null, created_at: '2025-03-01T08:00:00Z', updated_at: '2025-03-01T08:00:00Z',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMockFactoryRecordsForProject(projectId: string): FactoryRecord[] {
  return MOCK_FACTORY_RECORDS.filter((r) => r.project_id === projectId);
}

export function getMockRequirementsForProject(projectId: string): FactoryItemRequirement[] {
  return MOCK_FACTORY_REQUIREMENTS.filter((r) => r.project_id === projectId);
}

export function getMockRequirementsForLine(lineId: string): FactoryItemRequirement[] {
  return MOCK_FACTORY_REQUIREMENTS.filter((r) => r.project_vehicle_line_id === lineId);
}

export function getMockRMRsForProject(projectId: string): RawMaterialRequest[] {
  return MOCK_RAW_MATERIAL_REQUESTS.filter((r) => r.project_id === projectId);
}

export function getMockRMRFiles(rmrId: string): RawMaterialRequestFile[] {
  return MOCK_RMR_FILES.filter((f) => f.raw_material_request_id === rmrId);
}

export function getMockRMRItems(rmrId: string): RawMaterialRequestItem[] {
  return MOCK_RMR_ITEMS.filter((i) => i.raw_material_request_id === rmrId);
}
