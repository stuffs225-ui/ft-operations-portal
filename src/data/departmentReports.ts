import type { DepartmentReportDef } from '../types';

// Registry of department report types. Used by the export foundation and the
// scheduled-report subscription UI. Reports read EXISTING workflow data — they
// do not introduce new manual data entry.
export const DEPARTMENT_REPORTS: DepartmentReportDef[] = [
  { report_key: 'sales_project',          title: 'Sales Project Report',          department: 'Sales',           description: 'Active SOs, value pipeline, ownership.', roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator'] },
  { report_key: 'quotation_status',       title: 'Quotation Status Report',       department: 'Sales',           description: 'Quotation funnel and aging.',           roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator'] },
  { report_key: 'procurement_pr_po',      title: 'Procurement PR / PO Report',    department: 'Procurement',     description: 'PR pipeline and PO to Supplier status.', roles: ['admin', 'operations_manager', 'procurement_user'] },
  { report_key: 'eta_delay',              title: 'ETA Delay Report',              department: 'Procurement',     description: 'Delayed POs and ETA changes.',          roles: ['admin', 'operations_manager', 'procurement_user'] },
  { report_key: 'supplier',               title: 'Supplier Report',               department: 'Procurement',     description: 'Supplier scorecards and performance.',  roles: ['admin', 'operations_manager', 'procurement_user'] },
  { report_key: 'factory_progress',       title: 'Factory Progress Report',       department: 'Factory',         description: 'Production status and progress.',        roles: ['admin', 'operations_manager', 'factory_user'] },
  { report_key: 'raw_material_request',   title: 'Raw Material Request Report',   department: 'Factory',         description: 'RMR pipeline and fulfilment.',          roles: ['admin', 'operations_manager', 'factory_user'] },
  { report_key: 'store_receipt',          title: 'Store Receipt Report',          department: 'Store',           description: 'Material receipts and acceptance.',      roles: ['admin', 'operations_manager', 'store_user'] },
  { report_key: 'vehicle_receiving',      title: 'Vehicle Receiving Report',      department: 'Store',           description: 'Vehicle receipts and condition.',       roles: ['admin', 'operations_manager', 'store_user'] },
  { report_key: 'custody',                title: 'Custody Report',                department: 'Store',           description: 'Material custody and acceptance.',      roles: ['admin', 'operations_manager', 'store_user'] },
  { report_key: 'medical_serial',         title: 'Medical Serial Tracking Report',department: 'Store',           description: 'Medical item serial chain of custody.', roles: ['admin', 'operations_manager', 'store_user', 'qc_user'] },
  { report_key: 'material_qc',            title: 'Material QC Report',            department: 'QC',              description: 'Material inspection results.',          roles: ['admin', 'operations_manager', 'qc_user'] },
  { report_key: 'ncr',                    title: 'NCR Report',                    department: 'QC',              description: 'Non-conformance reports and status.',   roles: ['admin', 'operations_manager', 'qc_user'] },
  { report_key: 'project_qc',             title: 'Project QC Report',             department: 'QC',              description: 'Project inspections and findings.',     roles: ['admin', 'operations_manager', 'qc_user'] },
  { report_key: 'release_note_readiness', title: 'Release Note Readiness Report', department: 'QC',              description: 'Release readiness and blockers.',       roles: ['admin', 'operations_manager', 'qc_user'] },
  { report_key: 'afs_followup',           title: 'Dubai / AFS Follow-up Report',  department: 'AFS',             description: 'Dubai follow-up and arrivals.',         roles: ['admin', 'operations_manager', 'afs_user'] },
  { report_key: 'after_sales_maintenance',title: 'After Sales Maintenance Report',department: 'AFS',             description: 'Maintenance requests and resolution.',  roles: ['admin', 'operations_manager', 'afs_user'] },
  { report_key: 'department_performance', title: 'Department Performance Report', department: 'Admin / Ops',     description: 'Cross-department health and throughput.',roles: ['admin', 'operations_manager'] },
  { report_key: 'sla_breach',             title: 'SLA Breach Report',             department: 'Admin / Ops',     description: 'Open and escalated SLA breaches.',      roles: ['admin', 'operations_manager'] },
  { report_key: 'data_quality_gap',       title: 'Data Quality Gap Report',       department: 'Admin / Ops',     description: 'Open data-quality gaps by module.',    roles: ['admin', 'operations_manager'] },
];

export function getReportDef(key: string): DepartmentReportDef | undefined {
  return DEPARTMENT_REPORTS.find((r) => r.report_key === key);
}
