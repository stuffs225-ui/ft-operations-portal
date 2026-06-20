import type { UserRole } from '../types';

export interface RoleMatrixEntry {
  key: UserRole;
  label: string;
  type: 'admin' | 'management' | 'operational';
  landingRoute: string;
  moduleAccentColor: string;
  badgeClass: string;
  rules: string[];
}

export const ROLE_MATRIX: Record<UserRole, RoleMatrixEntry> = {
  admin: {
    key: 'admin',
    label: 'Admin',
    type: 'admin',
    landingRoute: '/',
    moduleAccentColor: 'bg-purple-600',
    badgeClass: 'bg-purple-100 text-purple-800',
    rules: [
      'All governance rules apply — you have full visibility',
      'PO > 10,000 SAR requires your approval',
      'Temporary Custody requires your approval',
      'Review and approve all SO submissions',
      'Manage user roles and access requests',
    ],
  },
  operations_manager: {
    key: 'operations_manager',
    label: 'Operations Manager',
    type: 'management',
    landingRoute: '/',
    moduleAccentColor: 'bg-indigo-600',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    rules: [
      'PO > 10,000 SAR requires your approval',
      'Temporary Custody requests require your approval',
      'SO approval queue managed via Admin Approvals',
      'WO/PN Gate escalations require your action',
      'Release Note disputes escalate to you',
    ],
  },
  sales_user: {
    key: 'sales_user',
    label: 'Sales User',
    type: 'operational',
    landingRoute: '/sales',
    moduleAccentColor: 'bg-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    rules: [
      'Convert quotations to SO only after estimation is complete',
      'New project requires approved SO reference',
      'Do not commit delivery dates without WO/PN confirmation',
      'Hot Projects flag requires Operations Manager approval',
    ],
  },
  sales_coordinator: {
    key: 'sales_coordinator',
    label: 'Sales Coordinator',
    type: 'operational',
    landingRoute: '/sales-coordinator',
    moduleAccentColor: 'bg-teal-600',
    badgeClass: 'bg-teal-100 text-teal-800',
    rules: [
      'Process all incoming quotation requests within 24 hours',
      'Upload estimation PDF before returning to Sales',
      'Do not close a quotation without recording a reason',
      'Line values must be entered before sending to estimation',
    ],
  },
  procurement_user: {
    key: 'procurement_user',
    label: 'Procurement User',
    type: 'operational',
    landingRoute: '/procurement',
    moduleAccentColor: 'bg-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800',
    rules: [
      'PR items must be linked to a PO before placing a supplier order',
      'PO to Supplier > SAR 10,000 requires Admin or Operations Manager approval',
      'Do not mark PO as sent/active before required approval is granted',
      'Supplier must be on the approved register before issuing a PO',
      'ETA changes require a reason — record all updates in ETA Tracking',
      'Received materials must be handed off to Store Receiving promptly',
    ],
  },
  factory_user: {
    key: 'factory_user',
    label: 'Factory User',
    type: 'operational',
    landingRoute: '/factory',
    moduleAccentColor: 'bg-orange-600',
    badgeClass: 'bg-orange-100 text-orange-800',
    rules: [
      'WO (Work Order) is mandatory before any Saudi project execution',
      'No BOQ, BOM, drawings, or Raw Material Requests before WO is issued',
      'Report production blockers immediately via your module',
      'Factory records must be updated before requesting QC inspection',
    ],
  },
  store_user: {
    key: 'store_user',
    label: 'Store User',
    type: 'operational',
    landingRoute: '/store',
    moduleAccentColor: 'bg-cyan-600',
    badgeClass: 'bg-cyan-100 text-cyan-800',
    rules: [
      'Vehicle receiving requires chassis number and photo documentation',
      'Medical items must be tracked by serial number',
      'Temporary Custody requires Admin or Operations Manager approval',
      'All material issuance must be logged against a project',
    ],
  },
  qc_user: {
    key: 'qc_user',
    label: 'QC User',
    type: 'operational',
    landingRoute: '/material-qc',
    moduleAccentColor: 'bg-purple-600',
    badgeClass: 'bg-violet-100 text-violet-800',
    rules: [
      'NCR (Non-Conformance Report) blocks release until closed',
      'All QC findings must be closed before Release Note can be issued',
      'Rework must be completed and re-inspected before closure',
      'Release Note blocked until NCRs, findings, and rework are all resolved',
    ],
  },
  afs_user: {
    key: 'afs_user',
    label: 'AFS User',
    type: 'operational',
    landingRoute: '/dubai-afs',
    moduleAccentColor: 'bg-sky-600',
    badgeClass: 'bg-sky-100 text-sky-800',
    rules: [
      'PN (Project Number) is mandatory before any Dubai AFS follow-up',
      'No Dubai ETA, Dubai PO, or AFS readiness activities before PN',
      'Arrival report must be completed within 48 hours of vehicle arrival',
      'Pre-delivery inspection required before vehicle handover',
    ],
  },
  viewer: {
    key: 'viewer',
    label: 'Viewer',
    type: 'management',
    landingRoute: '/',
    moduleAccentColor: 'bg-slate-600',
    badgeClass: 'bg-gray-100 text-gray-700',
    rules: [
      'Read-only access — no write operations available',
      'Report discrepancies to Operations Manager',
      'Do not share report data externally without approval',
    ],
  },
};
