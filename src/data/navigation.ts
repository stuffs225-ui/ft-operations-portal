import type { NavItem } from '../types';

// ─── Step 10.5C → 18.7I — Role-Based Navigation ──────────────────────────────
// 18.7H: ops_mgr focused CONTROL TOWER / WORKSTREAM MONITORING / OPERATIONS REPORTING.
// 18.7I: admin focused SYSTEM ADMINISTRATION / SYSTEM GOVERNANCE sections.
//        Admin landing moved to /admin-dashboard. Admin removed from all dept-specific
//        workspace sub-items (PROCUREMENT, STORE OPERATIONS, QUALITY HANDOFF, QUALITY
//        CONTROL, FACTORY EXECUTION, FACTORY MATERIALS, DUBAI/AFS EXECUTION, AFS
//        MATERIALS, AFTER SALES). Admin keeps EXECUTION / QUALITY & RELEASE / DUBAI/AFS
//        hub items for oversight. Route paths are UNCHANGED.
// See: docs/implementation/step-18-7i-admin-work-center.md

// Remove duplicate navigation rows that resolve to the same destination AND show
// the same label (e.g. "Receivables & Aging" and "Quotation Requests" each
// appearing twice for admin, because the admin bypass surfaces role-specific
// entries alongside admin's own). First occurrence wins, so ordering and section
// placement are preserved. Separators (path === '#') are never deduped here — they
// are pruned separately once their children are known. Differently-labeled links
// to the same route are intentionally kept (distinct affordances).
export function dedupeNavItems(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.path === '#') return true;
    const key = `${item.path} ${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const NAV_ITEMS: NavItem[] = [
  // ── 1. MY WORK ────────────────────────────────────────────────────────────
  {
    id: 'sep-0',
    label: 'MY WORK',
    path: '#',
    icon: '',
  },
  // admin lands on /admin-dashboard (System Administration)
  {
    id: 'admin-dashboard',
    label: 'System Administration',
    path: '/admin-dashboard',
    icon: 'ShieldCheck',
    roles: ['admin'],
  },
  // viewer lands on /management-dashboard (Management Dashboard)
  {
    id: 'management-dashboard',
    label: 'Management Dashboard',
    path: '/management-dashboard',
    icon: 'LayoutDashboard',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'LayoutDashboard',
    // ops_mgr lands on /control-tower; sales_user/coordinator have dedicated landing items; admin has admin-dashboard; viewer has management-dashboard
    roles: ['procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user'],
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
  // sales_user gets their command center as the MY WORK landing item
  {
    id: 'sales-dashboard',
    label: 'My Sales Dashboard',
    path: '/sales',
    icon: 'TrendingUp',
    roles: ['sales_user'],
  },
  // sales_coordinator gets their coordination dashboard as the MY WORK landing item
  {
    id: 'coordinator-landing',
    label: 'Coordinator Dashboard',
    path: '/sales-coordinator',
    icon: 'ClipboardList',
    roles: ['sales_coordinator'],
  },
  // operations_manager gets the Control Tower as the MY WORK landing item
  {
    id: 'ops-control-tower',
    label: 'Operations Control Tower',
    path: '/control-tower',
    icon: 'Activity',
    roles: ['operations_manager'],
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
    // ops_mgr monitors Sales via WORKSTREAM MONITORING (ops-sales-monitor); viewer uses MANAGEMENT VISIBILITY
    roles: ['admin'],
  },
  {
    // Admin Projects/SO now lives directly under Sales Workspace as the second
    // SALES & COMMERCIAL item (moved out of the standalone PROJECTS section).
    id: 'sales-projects-so',
    label: 'Projects / SO',
    path: '/projects',
    icon: 'FolderKanban',
    roles: ['admin'],
  },
  // sales_user SALES & COMMERCIAL — ordered: Projects, Pipeline Projects,
  // Quotations, Collection & Aging, Sales Reports (per operations request).
  {
    id: 'sales-projects-link',
    label: 'Projects',
    path: '/projects',
    icon: 'FolderKanban',
    roles: ['sales_user'],
  },
  {
    id: 'hot-projects',
    label: 'Pipeline Projects',
    path: '/hot-projects',
    icon: 'Flame',
    // ops_mgr monitors Pipeline Projects via WORKSTREAM MONITORING; viewer uses MANAGEMENT VISIBILITY
    roles: ['admin', 'sales_user'],
  },
  {
    id: 'quotations',
    label: 'Quotations',
    path: '/quotations',
    icon: 'FileText',
    // ops_mgr monitors Quotations via WORKSTREAM MONITORING; viewer uses MANAGEMENT VISIBILITY
    roles: ['admin', 'sales_user'],
  },
  {
    id: 'receivables',
    label: 'Collection & Aging',
    path: '/receivables',
    icon: 'BarChart3',
    // viewer uses MANAGEMENT VISIBILITY section
    roles: ['admin'],
  },
  {
    id: 'sales-receivables',
    label: 'Collection & Aging',
    path: '/receivables',
    icon: 'BarChart3',
    roles: ['sales_user'],
  },
  {
    id: 'sales-reports-commercial',
    label: 'Sales Reports',
    path: '/reports/sales',
    icon: 'TrendingUp',
    roles: ['sales_user'],
  },

  // ── 2B. SALES COORDINATION (sales_coordinator workspace) ──────────────────
  {
    id: 'sep-coord',
    label: 'SALES COORDINATION',
    path: '#',
    icon: '',
  },
  {
    id: 'coord-quotations',
    label: 'Quotations',
    path: '/quotations',
    icon: 'FileText',
    roles: ['sales_coordinator'],
  },
  {
    id: 'coord-queue',
    label: 'Coordinator Queue',
    path: '/coordinator-queue',
    icon: 'ClipboardList',
    roles: ['sales_coordinator'],
  },
  {
    id: 'coord-reports',
    label: 'Coordination Reports',
    path: '/reports/sales',
    icon: 'BarChart2',
    roles: ['sales_coordinator'],
  },

  // ── 2C. CONTROL TOWER (operations_manager primary workspace) ──────────────
  {
    id: 'sep-ops-control-tower',
    label: 'CONTROL TOWER',
    path: '#',
    icon: '',
  },
  {
    id: 'ops-approvals',
    label: 'Approvals Center',
    path: '/admin-approvals',
    icon: 'ShieldCheck',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-wo-pn-gate',
    label: 'WO / PN Gate',
    path: '/wo-pn-gate',
    icon: 'GitBranch',
    roles: ['operations_manager'],
  },
  // ── 3. PROJECTS ───────────────────────────────────────────────────────────
  // Admin Projects/SO relocated to SALES & COMMERCIAL (see 'sales-projects-so').
  // ops_mgr sees Projects/SO via WORKSTREAM MONITORING (ops-projects).
  // ops_mgr sees Approvals/WO Gate via CONTROL TOWER section above.
  // admin-approvals and wo-pn-gate moved to SYSTEM GOVERNANCE section for admin


  // ── 3B. PROCUREMENT (procurement_user workspace) ──────────────────────────
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
    // admin accesses Procurement hub via EXECUTION section; ops_mgr via WORKSTREAM MONITORING
    roles: ['procurement_user'],
  },
  {
    id: 'proc-requests',
    label: 'Purchase Requests',
    path: '/procurement/requests',
    icon: 'FileText',
    roles: ['procurement_user'],
  },
  {
    id: 'proc-items-without-po',
    label: 'PR Items Without PO',
    path: '/procurement/pr-items-without-po',
    icon: 'AlertCircle',
    roles: ['procurement_user'],
  },
  {
    id: 'proc-purchase-orders',
    label: 'PO to Supplier',
    path: '/procurement/purchase-orders',
    icon: 'ShoppingCart',
    roles: ['procurement_user'],
  },
  {
    id: 'proc-eta',
    label: 'ETA Tracking',
    path: '/procurement/eta-history',
    icon: 'Clock',
    roles: ['procurement_user'],
  },
  {
    id: 'proc-suppliers',
    label: 'Approved Suppliers',
    path: '/procurement/suppliers',
    icon: 'Users',
    roles: ['procurement_user'],
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
    // admin accesses Store hub via EXECUTION section; ops_mgr via WORKSTREAM MONITORING
    roles: ['store_user'],
  },
  {
    id: 'store-inventory',
    label: 'Inventory',
    path: '/store/inventory',
    icon: 'Layers',
    roles: ['store_user'],
  },
  {
    id: 'store-receiving',
    label: 'Material Receiving',
    path: '/store/receipts',
    icon: 'Truck',
    roles: ['store_user'],
  },
  {
    id: 'store-vehicle',
    label: 'Vehicle Receiving',
    path: '/store/vehicle-receiving',
    icon: 'Truck',
    roles: ['store_user'],
  },
  {
    id: 'store-issuance',
    label: 'Material Issuance',
    path: '/store/issuance',
    icon: 'ArrowUpRight',
    roles: ['store_user'],
  },
  {
    id: 'store-custody',
    label: 'Material Custody',
    path: '/custody',
    icon: 'ShieldCheck',
    roles: ['store_user'],
  },
  {
    id: 'store-unallocated',
    label: 'Unallocated Materials',
    path: '/store/unallocated',
    icon: 'AlertCircle',
    roles: ['store_user'],
  },
  {
    id: 'store-serials',
    label: 'Serial Register',
    path: '/store/serials',
    icon: 'Hash',
    roles: ['store_user'],
  },
  {
    id: 'store-returns',
    label: 'Returns / Transfers',
    path: '/store/receipts',
    icon: 'RotateCcw',
    roles: ['store_user'],
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
    roles: ['store_user'],
  },
  {
    id: 'store-qc-accepted',
    label: 'QC Accepted Items',
    path: '/store/qc-handoff?status=accepted',
    icon: 'CheckCircle2',
    roles: ['store_user'],
  },
  {
    id: 'store-qc-rejected',
    label: 'QC Rejected / NCR',
    path: '/store/qc-handoff?status=rejected',
    icon: 'XCircle',
    roles: ['store_user'],
  },

  // ── 3D-QC. QUALITY CONTROL (qc_user workspace) ───────────────────────────
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
    // admin accesses QC via QUALITY & RELEASE section; ops_mgr via WORKSTREAM MONITORING
    roles: ['qc_user'],
  },
  {
    id: 'qc-work-queue',
    label: 'QC Work Queue',
    path: '/qc/work-queue',
    icon: 'ListChecks',
    roles: ['qc_user'],
  },
  {
    id: 'qc-material-qc',
    label: 'Material QC',
    path: '/material-qc',
    icon: 'Microscope',
    roles: ['qc_user'],
  },
  {
    id: 'qc-material-inspections',
    label: 'Material Inspections',
    path: '/material-qc/inspections',
    icon: 'ClipboardCheck',
    roles: ['qc_user'],
  },
  {
    id: 'qc-material-ncrs',
    label: 'Material NCRs',
    path: '/material-qc/ncrs',
    icon: 'AlertOctagon',
    roles: ['qc_user'],
  },
  {
    id: 'qc-project-qc',
    label: 'Project / Vehicle QC',
    path: '/project-qc',
    icon: 'ClipboardList',
    roles: ['qc_user'],
  },
  {
    id: 'qc-project-inspections',
    label: 'Project QC Inspections',
    path: '/project-qc/inspections',
    icon: 'Search',
    roles: ['qc_user'],
  },
  {
    id: 'qc-findings',
    label: 'QC Findings',
    path: '/project-qc/findings',
    icon: 'AlertTriangle',
    roles: ['qc_user'],
  },
  {
    id: 'qc-rework',
    label: 'Rework',
    path: '/qc/rework',
    icon: 'Wrench',
    roles: ['qc_user'],
  },
  {
    id: 'qc-release-notes',
    label: 'Release Notes',
    path: '/project-qc/release-notes',
    icon: 'FileCheck',
    roles: ['qc_user'],
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
    roles: ['qc_user'],
  },

  // ── 3E. FACTORY EXECUTION (factory_user workspace) ───────────────────────
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
    // admin accesses Factory hub via EXECUTION section; ops_mgr via WORKSTREAM MONITORING
    roles: ['factory_user'],
  },
  {
    id: 'factory-wo-gate',
    label: 'WO Gate / Missing WO',
    path: '/wo-pn-gate',
    icon: 'GitBranch',
    roles: ['factory_user'],
  },
  {
    id: 'factory-projects',
    label: 'Factory Projects',
    path: '/factory/projects',
    icon: 'Wrench',
    roles: ['factory_user'],
  },
  {
    id: 'factory-production-lines',
    label: 'Production Lines',
    path: '/factory/projects',
    icon: 'Layers',
    roles: ['factory_user'],
  },
  {
    id: 'factory-requirements',
    label: 'Factory Requirements',
    path: '/factory/requirements',
    icon: 'FileText',
    roles: ['factory_user'],
  },
  {
    id: 'factory-rmr',
    label: 'Raw Material Requests',
    path: '/factory/raw-material-requests',
    icon: 'Package',
    roles: ['factory_user'],
  },
  {
    id: 'factory-monthly-updates',
    label: 'Monthly Updates',
    path: '/factory/monthly-updates',
    icon: 'CalendarClock',
    roles: ['factory_user'],
  },
  {
    id: 'factory-send-to-qc',
    label: 'Send to QC',
    path: '/factory/send-to-qc',
    icon: 'CheckCircle2',
    roles: ['factory_user'],
  },

  // ── 3F. FACTORY MATERIALS ─────────────────────────────────────────────────
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
    roles: ['factory_user'],
  },
  {
    id: 'factory-materials-issued',
    label: 'Materials Issued to Factory',
    path: '/custody',
    icon: 'PackageCheck',
    roles: ['factory_user'],
  },
  {
    id: 'factory-custody',
    label: 'Factory Custody',
    path: '/custody',
    icon: 'ShieldCheck',
    roles: ['factory_user'],
  },

  // ── 4. EXECUTION ──────────────────────────────────────────────────────────
  // ops_mgr accesses all module dashboards via WORKSTREAM MONITORING section.
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
    roles: ['admin'],
  },
  {
    id: 'factory',
    label: 'Factory / Production',
    path: '/factory',
    icon: 'Factory',
    roles: ['admin'],
  },
  {
    id: 'store',
    label: 'Store / Warehouse',
    path: '/store',
    icon: 'Warehouse',
    roles: ['admin'],
  },
  {
    id: 'custody',
    label: 'Material Custody',
    path: '/custody',
    icon: 'PackageCheck',
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'vehicle-receiving',
    label: 'Vehicle Receiving',
    path: '/store/vehicle-receiving',
    icon: 'Truck',
    roles: ['admin', 'store_user'],
  },

  // ── 5. QUALITY & RELEASE ─────────────────────────────────────────────────
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
    roles: ['admin'],
  },
  {
    id: 'project-qc',
    label: 'Project / Vehicle QC',
    path: '/project-qc',
    icon: 'ClipboardCheck',
    roles: ['admin'],
  },

  // ── 3E-AFS. DUBAI/AFS EXECUTION (afs_user workspace) ─────────────────────
  {
    id: 'sep-afs',
    label: 'DUBAI / AFS EXECUTION',
    path: '#',
    icon: '',
  },
  {
    id: 'afs-dashboard',
    label: 'AFS Dashboard',
    path: '/dubai-afs',
    icon: 'Plane',
    // admin accesses Dubai/AFS hub via DUBAI / AFS section; ops_mgr via WORKSTREAM MONITORING
    roles: ['afs_user'],
  },
  {
    id: 'afs-pn-gate',
    label: 'PN Gate / Missing PN',
    path: '/afs/pn-gate',
    icon: 'ShieldCheck',
    roles: ['afs_user'],
  },
  {
    id: 'afs-followups',
    label: 'Dubai Follow-ups',
    path: '/dubai-afs/projects',
    icon: 'TrendingUp',
    roles: ['afs_user'],
  },
  {
    id: 'afs-eta',
    label: 'Dubai ETA Tracking',
    path: '/dubai-afs/eta',
    icon: 'Clock',
    roles: ['afs_user'],
  },
  {
    id: 'afs-arrivals',
    label: 'Vehicle Arrivals',
    path: '/dubai-afs/arrival-reports',
    icon: 'Truck',
    roles: ['afs_user'],
  },
  {
    id: 'afs-missing',
    label: 'Missing Items',
    path: '/dubai-afs/missing-items',
    icon: 'AlertTriangle',
    roles: ['afs_user'],
  },
  {
    id: 'afs-predelivery',
    label: 'Pre-Delivery Readiness',
    path: '/dubai-afs/predelivery-reports',
    icon: 'ClipboardCheck',
    roles: ['afs_user'],
  },
  {
    id: 'afs-ready-delivery',
    label: 'Ready for Delivery',
    path: '/afs/ready-for-delivery',
    icon: 'PackageCheck',
    roles: ['afs_user'],
  },

  // ── 3E-AFS-M. AFS MATERIALS ───────────────────────────────────────────────
  {
    id: 'sep-afs-materials',
    label: 'AFS MATERIALS',
    path: '#',
    icon: '',
  },
  {
    id: 'afs-materials',
    label: 'AFS Materials',
    path: '/afs/materials',
    icon: 'Package',
    roles: ['afs_user'],
  },
  {
    id: 'afs-custody',
    label: 'Materials in Custody',
    path: '/custody',
    icon: 'PackageCheck',
    roles: ['afs_user'],
  },

  // ── 3E-AFS-AS. AFTER SALES ────────────────────────────────────────────────
  {
    id: 'sep-after-sales',
    label: 'AFTER SALES',
    path: '#',
    icon: '',
  },
  {
    id: 'after-sales-maintenance',
    label: 'Maintenance Requests',
    path: '/after-sales/maintenance',
    icon: 'Wrench',
    roles: ['afs_user'],
  },
  {
    id: 'after-sales-new',
    label: 'New Maintenance Request',
    path: '/after-sales/maintenance/new',
    icon: 'FilePlus',
    roles: ['afs_user'],
  },

  // ── 6. DUBAI / AFS (admin generic — afs_user uses sections above) ─────────
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
    roles: ['admin'],
  },
  {
    id: 'after-sales',
    label: 'After Sales Maintenance',
    path: '/after-sales',
    icon: 'Wrench',
    roles: ['admin'],
  },

  // ── 6B. WORKSTREAM MONITORING (operations_manager oversight links) ─────────
  {
    id: 'sep-ops-monitoring',
    label: 'WORKSTREAM MONITORING',
    path: '#',
    icon: '',
  },
  {
    id: 'ops-sales-monitor',
    label: 'Sales & Quotations',
    path: '/quotations',
    icon: 'TrendingUp',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-hot-projects',
    label: 'Pipeline Projects',
    path: '/hot-projects',
    icon: 'Flame',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-projects',
    label: 'Projects / SO',
    path: '/projects',
    icon: 'FolderKanban',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-procurement-monitor',
    label: 'Procurement Monitor',
    path: '/procurement',
    icon: 'ShoppingCart',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-store-monitor',
    label: 'Store Monitor',
    path: '/store',
    icon: 'Warehouse',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-factory-monitor',
    label: 'Factory Monitor',
    path: '/factory',
    icon: 'Factory',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-qc-monitor',
    label: 'QC / Release Monitor',
    path: '/qc',
    icon: 'ShieldCheck',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-afs-monitor',
    label: 'AFS / Delivery Monitor',
    path: '/dubai-afs',
    icon: 'Plane',
    roles: ['operations_manager'],
  },

  // ── 7. REPORTING ─────────────────────────────────────────────────────────
  // ops_mgr uses OPERATIONS REPORTING section below.
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
    // viewer uses Operations Overview in MANAGEMENT VISIBILITY section
    roles: ['admin'],
  },
  {
    id: 'reports',
    label: 'Reports Hub',
    path: '/reports',
    icon: 'BarChart2',
    // viewer uses Reports Hub in EXECUTIVE REPORTS section
    roles: ['admin'],
  },
  // Per-role direct report links for operational roles
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

  // ── 7B. OPERATIONS REPORTING (operations_manager) ─────────────────────────
  {
    id: 'sep-ops-reporting',
    label: 'OPERATIONS REPORTING',
    path: '#',
    icon: '',
  },
  {
    id: 'ops-report-executive',
    label: 'Operations Overview',
    path: '/reports/executive',
    icon: 'BarChart2',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-report-sla',
    label: 'SLA & Delays',
    path: '/reports/sla',
    icon: 'Clock',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-report-health',
    label: 'Health Scores',
    path: '/reports/health-scores',
    icon: 'Activity',
    roles: ['operations_manager'],
  },
  {
    id: 'ops-report-all',
    label: 'All Reports',
    path: '/reports',
    icon: 'BarChart3',
    roles: ['operations_manager'],
  },

  // ── 7C. MANAGEMENT VISIBILITY (viewer read-only overview links) ──────────────
  // strict: true prevents admin bypass — these are viewer-only nav items.
  {
    id: 'sep-viewer-visibility',
    label: 'MANAGEMENT VISIBILITY',
    path: '#',
    icon: '',
  },
  {
    id: 'viewer-portfolio',
    label: 'Portfolio Overview',
    path: '/projects',
    icon: 'FolderKanban',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-ops-overview',
    label: 'Operations Overview',
    path: '/control-tower',
    icon: 'Activity',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-hot-projects',
    label: 'Pipeline Projects',
    path: '/hot-projects',
    icon: 'Flame',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-quotations',
    label: 'Quotation Pipeline',
    path: '/quotations',
    icon: 'FileText',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-receivables',
    label: 'Collection & Aging',
    path: '/receivables',
    icon: 'BarChart3',
    roles: ['viewer'],
    strict: true,
  },

  // ── 7D. EXECUTIVE REPORTS (viewer read-only report links) ─────────────────
  {
    id: 'sep-viewer-reports',
    label: 'EXECUTIVE REPORTS',
    path: '#',
    icon: '',
  },
  {
    id: 'viewer-reports-hub',
    label: 'Reports Hub',
    path: '/reports',
    icon: 'BarChart2',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-report-executive',
    label: 'Executive Report',
    path: '/reports/executive',
    icon: 'TrendingUp',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-report-sla',
    label: 'SLA & Delays',
    path: '/reports/sla',
    icon: 'Clock',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-report-health',
    label: 'Health Scores',
    path: '/reports/health-scores',
    icon: 'Activity',
    roles: ['viewer'],
    strict: true,
  },
  {
    id: 'viewer-report-data-quality',
    label: 'Data Quality',
    path: '/reports/data-quality',
    icon: 'ClipboardCheck',
    roles: ['viewer'],
    strict: true,
  },

  // ── 8. SYSTEM ADMINISTRATION (admin only) ────────────────────────────────
  {
    id: 'sep-system-admin',
    label: 'SYSTEM ADMINISTRATION',
    path: '#',
    icon: '',
  },
  {
    id: 'admin-users',
    label: 'User Management',
    path: '/admin/users',
    icon: 'Users',
    roles: ['admin'],
  },
  {
    id: 'admin-access-requests',
    label: 'Access Requests',
    path: '/admin/access-requests',
    icon: 'UserPlus',
    roles: ['admin'],
  },
  {
    id: 'admin-notification-rules',
    label: 'Notification Rules',
    path: '/admin/notification-rules',
    icon: 'BellRing',
    roles: ['admin'],
  },
  {
    id: 'admin-report-subscriptions',
    label: 'Report Subscriptions',
    path: '/admin/report-subscriptions',
    icon: 'CalendarClock',
    roles: ['admin'],
  },
  {
    id: 'admin-sales-console',
    label: 'Sales Admin Console',
    path: '/admin/sales-console',
    icon: 'Gauge',
    roles: ['admin'],
  },
  {
    id: 'admin-procurement-console',
    label: 'Procurement Admin Console',
    path: '/admin/procurement-console',
    icon: 'ShoppingCart',
    roles: ['admin'],
  },
  {
    id: 'admin-store-console',
    label: 'Store Admin Console',
    path: '/admin/store-console',
    icon: 'Warehouse',
    roles: ['admin'],
  },
  {
    id: 'admin-invoicing-schedule',
    label: 'Invoicing Schedule',
    path: '/admin/invoicing-schedule',
    icon: 'CalendarRange',
    roles: ['admin'],
  },
  {
    id: 'admin-sales-targets',
    label: 'Sales Annual Targets',
    path: '/admin/sales-targets',
    icon: 'Target',
    roles: ['admin'],
  },
  {
    id: 'admin-aging-upload',
    label: 'Monthly Aging Upload',
    path: '/admin/aging-upload',
    icon: 'UploadCloud',
    roles: ['admin'],
  },

  // ── 9. SYSTEM GOVERNANCE (admin only) ────────────────────────────────────
  {
    id: 'sep-system-gov',
    label: 'SYSTEM GOVERNANCE',
    path: '#',
    icon: '',
  },
  {
    id: 'sys-admin-approvals',
    label: 'Admin Approvals',
    path: '/admin-approvals',
    icon: 'ShieldCheck',
    roles: ['admin'],
  },
  {
    id: 'sys-wo-pn-gate',
    label: 'WO / PN Gate',
    path: '/wo-pn-gate',
    icon: 'GitBranch',
    roles: ['admin'],
  },
  {
    id: 'audit-log',
    label: 'Audit Log',
    path: '/audit-log',
    icon: 'ScrollText',
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'System Settings',
    path: '/settings',
    icon: 'Settings',
    roles: ['admin'],
  },
  {
    id: 'templates',
    label: 'Document Templates',
    path: '/templates',
    icon: 'FileStack',
    roles: ['admin', 'sales_user'],
  },
];
