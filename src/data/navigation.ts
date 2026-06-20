import type { NavItem } from '../types';

// ─── Step 10.5C → 18.6A — Role-Based Navigation ──────────────────────────────
// 18.6A changes: Projects/SO restricted to oversight roles; generic Reports hub
// restricted to management; per-role direct report links added for operational
// roles; Document Templates restricted to sales/management roles.
// Route paths are UNCHANGED. See: docs/implementation/step-18-6a-role-ia-visual-foundation.md

export const NAV_ITEMS: NavItem[] = [
  // ── 1. MY WORK ────────────────────────────────────────────────────────────
  {
    id: 'sep-0',
    label: 'MY WORK',
    path: '#',
    icon: '',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'LayoutDashboard',
    roles: ['admin', 'operations_manager', 'sales_coordinator', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer'],
  },
  {
    id: 'inbox',
    label: 'Action Inbox',
    path: '/inbox',
    icon: 'Inbox',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: 'Bell',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer'],
  },

  // ── 2. SALES & COMMERCIAL ─────────────────────────────────────────────────
  {
    id: 'sep-1',
    label: 'SALES & COMMERCIAL',
    path: '#',
    icon: '',
  },
  {
    id: 'sales',
    label: 'Sales Workspace',
    path: '/sales',
    icon: 'TrendingUp',
    roles: ['admin', 'operations_manager', 'sales_user', 'viewer'],
  },
  {
    id: 'hot-projects',
    label: 'Hot Projects',
    path: '/hot-projects',
    icon: 'Flame',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer'],
  },
  {
    id: 'quotations',
    label: 'Quotation Requests',
    path: '/quotations',
    icon: 'FileText',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer'],
  },
  {
    id: 'sales-coordinator',
    label: 'Sales Coordinator',
    path: '/sales-coordinator',
    icon: 'UserCheck',
    roles: ['admin', 'operations_manager', 'sales_coordinator'],
  },
  {
    id: 'receivables',
    label: 'Receivables',
    path: '/receivables',
    icon: 'BarChart3',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer'],
  },

  // ── 3. PROJECTS ───────────────────────────────────────────────────────────
  // Restricted to oversight and commercial roles (18.6A).
  // Operational roles access project context through their own module.
  {
    id: 'sep-2',
    label: 'PROJECTS',
    path: '#',
    icon: '',
  },
  {
    id: 'projects',
    label: 'Projects / SO',
    path: '/projects',
    icon: 'FolderKanban',
    roles: ['admin', 'operations_manager', 'sales_user', 'viewer'],
  },
  {
    id: 'admin-approvals',
    label: 'Admin Approvals',
    path: '/admin-approvals',
    icon: 'ShieldCheck',
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'wo-pn-gate',
    label: 'WO / PN Gate',
    path: '/wo-pn-gate',
    icon: 'GitBranch',
    // factory_user accesses WO Gate via FACTORY EXECUTION section
    roles: ['admin', 'operations_manager'],
  },

  // ── 3B. PROCUREMENT (procurement_user workspace) ──────────────────────────
  // 18.7A: dedicated procurement section replacing generic EXECUTION entry for
  // procurement_user. Admin/ops_manager also see these as direct deep links.
  {
    id: 'sep-proc',
    label: 'PROCUREMENT',
    path: '#',
    icon: '',
  },
  {
    id: 'proc-dashboard',
    label: 'Procurement Dashboard',
    path: '/procurement',
    icon: 'ShoppingCart',
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },
  {
    id: 'proc-requests',
    label: 'Purchase Requests',
    path: '/procurement/requests',
    icon: 'FileText',
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },
  {
    id: 'proc-items-without-po',
    label: 'PR Items Without PO',
    path: '/procurement/pr-items-without-po',
    icon: 'AlertCircle',
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },
  {
    id: 'proc-purchase-orders',
    label: 'PO to Supplier',
    path: '/procurement/purchase-orders',
    icon: 'ShoppingCart',
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },
  {
    id: 'proc-eta',
    label: 'ETA Tracking',
    path: '/procurement/eta-history',
    icon: 'Clock',
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },
  {
    id: 'proc-suppliers',
    label: 'Approved Suppliers',
    path: '/procurement/suppliers',
    icon: 'Users',
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },

  // ── 3C. STORE OPERATIONS (store_user workspace) ───────────────────────────
  {
    id: 'sep-store',
    label: 'STORE OPERATIONS',
    path: '#',
    icon: '',
  },
  {
    id: 'store-dashboard',
    label: 'Store Dashboard',
    path: '/store',
    icon: 'Warehouse',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-inventory',
    label: 'Inventory',
    path: '/store/inventory',
    icon: 'Layers',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-receiving',
    label: 'Material Receiving',
    path: '/store/receipts',
    icon: 'Truck',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-vehicle',
    label: 'Vehicle Receiving',
    path: '/store/vehicle-receiving',
    icon: 'Truck',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-issuance',
    label: 'Material Issuance',
    path: '/store/issuance',
    icon: 'ArrowUpRight',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-custody',
    label: 'Material Custody',
    path: '/custody',
    icon: 'ShieldCheck',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-unallocated',
    label: 'Unallocated Materials',
    path: '/store/unallocated',
    icon: 'AlertCircle',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-serials',
    label: 'Serial Register',
    path: '/store/serials',
    icon: 'Hash',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-returns',
    label: 'Returns / Transfers',
    path: '/store/receipts',
    icon: 'RotateCcw',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  // ── 3D. QUALITY HANDOFF (store-side) ──────────────────────────────────────
  {
    id: 'sep-store-qc',
    label: 'QUALITY HANDOFF',
    path: '#',
    icon: '',
  },
  {
    id: 'store-qc-pending',
    label: 'Pending Material QC',
    path: '/store/qc-handoff',
    icon: 'ClipboardCheck',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-qc-accepted',
    label: 'QC Accepted Items',
    path: '/store/qc-handoff?status=accepted',
    icon: 'CheckCircle2',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'store-qc-rejected',
    label: 'QC Rejected / NCR',
    path: '/store/qc-handoff?status=rejected',
    icon: 'XCircle',
    roles: ['admin', 'operations_manager', 'store_user'],
  },

  // ── 3D-QC. QUALITY CONTROL (qc_user workspace) ──────────────────────────────
  // 18.7D: dedicated QC section replacing generic QUALITY & RELEASE for qc_user.
  {
    id: 'sep-qc',
    label: 'QUALITY CONTROL',
    path: '#',
    icon: '',
  },
  {
    id: 'qc-dashboard',
    label: 'QC Dashboard',
    path: '/qc',
    icon: 'ShieldCheck',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-work-queue',
    label: 'QC Work Queue',
    path: '/qc/work-queue',
    icon: 'ListChecks',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-material-qc',
    label: 'Material QC',
    path: '/material-qc',
    icon: 'Microscope',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-material-inspections',
    label: 'Material Inspections',
    path: '/material-qc/inspections',
    icon: 'ClipboardCheck',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-material-ncrs',
    label: 'Material NCRs',
    path: '/material-qc/ncrs',
    icon: 'AlertOctagon',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-project-qc',
    label: 'Project / Vehicle QC',
    path: '/project-qc',
    icon: 'ClipboardList',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-project-inspections',
    label: 'Project QC Inspections',
    path: '/project-qc/inspections',
    icon: 'Search',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-findings',
    label: 'QC Findings',
    path: '/project-qc/findings',
    icon: 'AlertTriangle',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-rework',
    label: 'Rework',
    path: '/qc/rework',
    icon: 'Wrench',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'qc-release-notes',
    label: 'Release Notes',
    path: '/project-qc/release-notes',
    icon: 'FileCheck',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  // ── 3D-QC-R. QUALITY REPORTING ────────────────────────────────────────────
  {
    id: 'sep-qc-reports',
    label: 'QUALITY REPORTING',
    path: '#',
    icon: '',
  },
  {
    id: 'qc-reports-link',
    label: 'QC Reports',
    path: '/reports/qc',
    icon: 'BarChart2',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },

  // ── 3E. FACTORY EXECUTION (factory_user workspace) ───────────────────────────
  // 18.7C: dedicated factory section replacing generic EXECUTION entry for
  // factory_user. Admin/ops_manager also see these as direct deep links.
  {
    id: 'sep-factory',
    label: 'FACTORY EXECUTION',
    path: '#',
    icon: '',
  },
  {
    id: 'factory-dashboard',
    label: 'Factory Dashboard',
    path: '/factory',
    icon: 'Factory',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-wo-gate',
    label: 'WO Gate / Missing WO',
    path: '/wo-pn-gate',
    icon: 'GitBranch',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-projects',
    label: 'Factory Projects',
    path: '/factory/projects',
    icon: 'Wrench',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-production-lines',
    label: 'Production Lines',
    path: '/factory/projects',
    icon: 'Layers',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-requirements',
    label: 'Factory Requirements',
    path: '/factory/requirements',
    icon: 'FileText',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-rmr',
    label: 'Raw Material Requests',
    path: '/factory/raw-material-requests',
    icon: 'Package',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-monthly-updates',
    label: 'Monthly Updates',
    path: '/factory/monthly-updates',
    icon: 'CalendarClock',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-send-to-qc',
    label: 'Send to QC',
    path: '/factory/send-to-qc',
    icon: 'CheckCircle2',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  // ── 3F. FACTORY MATERIALS ─────────────────────────────────────────────────────
  {
    id: 'sep-factory-materials',
    label: 'FACTORY MATERIALS',
    path: '#',
    icon: '',
  },
  {
    id: 'factory-materials-requested',
    label: 'Materials Requested',
    path: '/factory/raw-material-requests',
    icon: 'Package',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-materials-issued',
    label: 'Materials Issued to Factory',
    path: '/custody',
    icon: 'PackageCheck',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'factory-custody',
    label: 'Factory Custody',
    path: '/custody',
    icon: 'ShieldCheck',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },

  // ── 4. EXECUTION ──────────────────────────────────────────────────────────
  {
    id: 'sep-3',
    label: 'EXECUTION',
    path: '#',
    icon: '',
  },
  {
    id: 'procurement',
    label: 'Procurement',
    path: '/procurement',
    icon: 'ShoppingCart',
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'factory',
    label: 'Factory / Production',
    path: '/factory',
    icon: 'Factory',
    // factory_user uses the dedicated FACTORY EXECUTION section above
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'store',
    label: 'Store / Warehouse',
    path: '/store',
    icon: 'Warehouse',
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'custody',
    label: 'Material Custody',
    path: '/custody',
    icon: 'PackageCheck',
    // factory_user uses FACTORY MATERIALS section above; afs_user keeps this entry
    roles: ['admin', 'operations_manager', 'afs_user'],
  },
  {
    id: 'vehicle-receiving',
    label: 'Vehicle Receiving',
    path: '/store/vehicle-receiving',
    icon: 'Truck',
    roles: ['admin', 'operations_manager', 'store_user'],
  },

  // ── 5. QUALITY & RELEASE ─────────────────────────────────────────────────
  // qc_user uses the dedicated QUALITY CONTROL section above.
  // Admin/ops_manager still see these for quick access.
  {
    id: 'sep-4',
    label: 'QUALITY & RELEASE',
    path: '#',
    icon: '',
  },
  {
    id: 'material-qc',
    label: 'Material QC',
    path: '/material-qc',
    icon: 'Microscope',
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'project-qc',
    label: 'Project / Vehicle QC',
    path: '/project-qc',
    icon: 'ClipboardCheck',
    roles: ['admin', 'operations_manager'],
  },

  // ── 6. DUBAI / AFS ────────────────────────────────────────────────────────
  {
    id: 'sep-5',
    label: 'DUBAI / AFS',
    path: '#',
    icon: '',
  },
  {
    id: 'dubai-afs',
    label: 'Dubai / AFS',
    path: '/dubai-afs',
    icon: 'Plane',
    roles: ['admin', 'operations_manager', 'afs_user'],
  },
  {
    id: 'after-sales',
    label: 'After Sales Maintenance',
    path: '/after-sales',
    icon: 'Wrench',
    roles: ['admin', 'operations_manager', 'afs_user'],
  },

  // ── 7. REPORTING ─────────────────────────────────────────────────────────
  // Generic hub restricted to management/oversight (18.6A).
  // Operational roles get direct role-specific report links instead.
  {
    id: 'sep-6',
    label: 'REPORTING',
    path: '#',
    icon: '',
  },
  {
    id: 'control-tower',
    label: 'Operations Overview',
    path: '/control-tower',
    icon: 'Activity',
    roles: ['admin', 'operations_manager', 'viewer'],
  },
  {
    id: 'reports',
    label: 'Reports Hub',
    path: '/reports',
    icon: 'BarChart2',
    roles: ['admin', 'operations_manager', 'viewer', 'sales_coordinator'],
  },
  // Per-role direct report links (avoids the broken Reports Hub for operational roles)
  {
    id: 'sales-reports',
    label: 'Sales Reports',
    path: '/reports/sales',
    icon: 'TrendingUp',
    roles: ['sales_user'],
  },
  {
    id: 'procurement-reports',
    label: 'Procurement Reports',
    path: '/reports/procurement',
    icon: 'ShoppingCart',
    roles: ['procurement_user'],
  },
  {
    id: 'factory-reports',
    label: 'Factory Reports',
    path: '/reports/factory',
    icon: 'Factory',
    roles: ['factory_user'],
  },
  {
    id: 'store-reports',
    label: 'Store Reports',
    path: '/reports/store',
    icon: 'Warehouse',
    roles: ['store_user'],
  },
  {
    id: 'qc-reports',
    label: 'QC Reports',
    path: '/reports/qc',
    icon: 'ClipboardCheck',
    roles: ['qc_user'],
  },
  {
    id: 'afs-reports',
    label: 'AFS Reports',
    path: '/reports/afs',
    icon: 'Plane',
    roles: ['afs_user'],
  },

  // ── 8. ADMIN & SYSTEM ─────────────────────────────────────────────────────
  {
    id: 'sep-7',
    label: 'ADMIN & SYSTEM',
    path: '#',
    icon: '',
  },
  {
    id: 'templates',
    label: 'Document Templates',
    path: '/templates',
    icon: 'FileStack',
    // Restricted to sales/management in 18.6A — operational roles access
    // templates through their module in a later role-specific PR.
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator'],
  },
  {
    id: 'admin-access-requests',
    label: 'Access Requests',
    path: '/admin/access-requests',
    icon: 'UserPlus',
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'admin-notification-rules',
    label: 'Notification Rules',
    path: '/admin/notification-rules',
    icon: 'BellRing',
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'admin-report-subscriptions',
    label: 'Report Subscriptions',
    path: '/admin/report-subscriptions',
    icon: 'CalendarClock',
    roles: ['admin', 'operations_manager'],
  },
  {
    id: 'admin-users',
    label: 'Admin / Users',
    path: '/admin/users',
    icon: 'Users',
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    roles: ['admin'],
  },
  {
    id: 'audit-log',
    label: 'Audit Log',
    path: '/audit-log',
    icon: 'ScrollText',
    roles: ['admin'],
  },
];
