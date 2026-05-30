import type { ExecutionReference } from '../types';

// Mock execution references for the 8 mock projects.
// proj-005: approved Saudi → has WO (confirmed)
// proj-006: approved Dubai → has PN (confirmed)
// proj-003: submitted Saudi → no WO yet (not yet approved)
// proj-004: submitted Dubai → no PN yet (not yet approved)
// All others are draft/sent-back/rejected → no reference

export const MOCK_EXECUTION_REFERENCES: ExecutionReference[] = [
  // WO for proj-005 (approved Saudi — GACA)
  {
    id: 'exref-005-wo',
    project_id: 'proj-005',
    reference_type: 'wo',
    reference_number: 'WO-2025-0041',
    manufacturing_location: 'saudi',
    status: 'confirmed',
    created_by: 'dev-usr-001',
    created_at: '2025-01-13T08:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
    confirmed_by: 'dev-usr-001',
    confirmed_at: '2025-01-14T10:00:00Z',
    remarks: 'ARFF Category 7 — priority execution',
    project: {
      project_code: 'FT-2025-0005',
      so_number: 'SO-GACA-2025-0003',
      customer_name: 'General Authority of Civil Aviation',
      project_status: 'approved',
    },
    created_by_profile: { full_name: 'Dev Admin', email: 'admin@ft-ops.local' },
    confirmed_by_profile: { full_name: 'Dev Admin' },
  },
  // PN for proj-006 (approved Dubai — DCD)
  {
    id: 'exref-006-pn',
    project_id: 'proj-006',
    reference_type: 'pn',
    reference_number: 'PN-2025-0018',
    manufacturing_location: 'dubai',
    status: 'confirmed',
    created_by: 'dev-usr-001',
    created_at: '2025-01-28T09:00:00Z',
    updated_at: '2025-01-29T11:00:00Z',
    confirmed_by: 'dev-usr-001',
    confirmed_at: '2025-01-29T11:00:00Z',
    remarks: 'Dubai Civil Defence — USAR units',
    project: {
      project_code: 'FT-2025-0006',
      so_number: 'SO-DCD-2025-0031',
      customer_name: 'Dubai Civil Defence',
      project_status: 'approved',
    },
    created_by_profile: { full_name: 'Dev Admin', email: 'admin@ft-ops.local' },
    confirmed_by_profile: { full_name: 'Dev Admin' },
  },
];

// Projects approved + Saudi but missing WO (for dashboard / gate page)
export const MOCK_SAUDI_MISSING_WO_PROJECT_IDS: string[] = [];
// In mock data, only proj-005 is approved+Saudi and it already has a WO.
// To simulate the "missing WO" state on the dashboard, the existing
// DASHBOARD_KPI_CARDS already shows hardcoded "4 SO without WO".

// Projects approved + Dubai but missing PN
export const MOCK_DUBAI_MISSING_PN_PROJECT_IDS: string[] = [];
// Similarly proj-006 already has a PN.

// Helper: get reference for a project
export function getMockReference(
  projectId: string,
  type: 'wo' | 'pn',
): ExecutionReference | null {
  return (
    MOCK_EXECUTION_REFERENCES.find(
      (r) => r.project_id === projectId && r.reference_type === type && r.status !== 'cancelled' && r.status !== 'superseded',
    ) ?? null
  );
}
