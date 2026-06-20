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
      'Quotation requests must include enough detail for coordination — incomplete requests cause delays',
      'Returned quotations require immediate review and a documented next action',
      'SO / project creation follows the approval and routing workflow — do not bypass',
      'Sales can track high-level execution status but cannot perform operational gate actions',
      'Receivables must be reviewed when invoicing milestones are created or overdue',
      'Commercial updates should be traceable — use timeline/audit where supported',
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
      'Process all incoming quotation requests within 24 hours — new requests trigger the SLA clock',
      'Assign or acknowledge each new request before beginning processing',
      'Record sent-to-estimation date when forwarding to the estimation team',
      'Request clarification from Sales when scope or customer details are incomplete',
      'Upload or record the quotation output (number and value) before returning to Sales',
      'Return completed quotations to Sales with the quotation number and coordinator remarks',
      'Do not close or cancel a quotation without recording the reason in coordinator remarks',
      'Do not bypass the Sales or SO approval workflow — quotation conversion is a Sales action',
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
      'WO (Work Order) is mandatory before Saudi Factory execution begins',
      'No BOQ, BOM, drawings, manhours, or project Raw Material Requests before WO is issued',
      'Project-based Raw Material Requests must be linked to a Project and WO',
      'Monthly production updates must be submitted on time — overdue records are escalated',
      'Completed factory work must be sent to QC for inspection before handoff',
      'Materials issued from Store must be accepted, tracked, and resolved (used, returned, or reported)',
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
      'Vehicle receiving requires chassis number and all 5 required photos before acceptance',
      'Medical and serialized items must be tracked by serial number before issuance',
      'Temporary Custody requires Admin or Operations Manager approval and receiver acceptance',
      'Materials requiring QC must not be issued before QC acceptance',
      'All material issuance must be logged against a project',
      'Unallocated materials should be assigned, stocked, or resolved — not left open',
    ],
  },
  qc_user: {
    key: 'qc_user',
    label: 'QC User',
    type: 'operational',
    landingRoute: '/qc',
    moduleAccentColor: 'bg-violet-600',
    badgeClass: 'bg-violet-100 text-violet-800',
    rules: [
      'Store-received materials requiring QC must be inspected before issuance',
      'Rejected material must create or link to an NCR with root cause and corrective action',
      'Open NCRs block Release Note issuance for the linked project',
      'Project / Vehicle QC inspection must reach ready_for_release before Release Note can be issued',
      'All QC findings and rework must be closed before Release Note can be issued',
      'QC decisions must be traceable — use the audit/timeline where supported',
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
      'PN is required before Dubai follow-up, ETA tracking, and pre-delivery readiness',
      'Dubai projects are separate from Saudi factory execution',
      'ETA changes require a documented reason',
      'Arrival report must be recorded after vehicle arrival at AFS facility',
      'Open missing items block pre-delivery readiness',
      'QC Release Note is required before marking ready for delivery',
      'After Sales Maintenance requests are post-delivery and must link to delivered project/vehicle',
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
