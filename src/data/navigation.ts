import type { NavItem } from '../types';

// ─── Step 10.5C → 18.7H — Role-Based Navigation ──────────────────────────────
// 18.7H changes: operations_manager removed from all module sub-items and generic
// sections. Replaced with focused CONTROL TOWER, WORKSTREAM MONITORING, and
// OPERATIONS REPORTING sections. Admin-only items (access-requests, notification-
// rules, report-subscriptions) restricted to admin only. ops_mgr landing moved to
// /control-tower. Route paths are UNCHANGED.
// See: docs/implementation/step-18-7h-operations-manager-control-tower.md

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
    // ops_mgr lands on /control-tower; sales_user/coordinator have dedicated landing items
    roles: ['admin', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer'],
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
    // ops_mgr monitors Sales via WORKSTREAM MONITORING (ops-sales-monitor)
    roles: ['admin', 'viewer'],
  },
  {
    id: 'hot-projects',
    label: 'Hot Projects',
    path: '/hot-projects',
    icon: 'Flame',
    // ops_mgr monitors Hot Projects via WORKSTREAM MONITORING (ops-hot-projects)
    roles: ['admin', 'sales_user', 'viewer'],
  },
  {
    id: 'quotations',
    label: 'Quotation Requests',
    path: '/quotations',
    icon: 'FileText',
    // ops_mgr monitors Quotations via WORKSTREAM MONITORING (ops-sales-monitor)
    roles: ['admin', 'sales_user', 'viewer'],
  },
  {
    id: 'receivables',
    label: 'Receivables & Aging',
    path: '/receivables',
    icon: 'BarChart3',
    roles: ['admin', 'viewer'],
  },
  // sales_user-specific SALES & COMMERCIAL entries
  {
    id: 'sales-receivables',
    label: 'Receivables & Aging',
    path: '/receivables',
    icon: 'BarChart3',
    roles: ['sales_user'],
  },
  {
    id: 'sales-projects-link',
    label: 'Projects / SO',
    path: '/projects',
    icon: 'FolderKanban',
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
    label: 'Quotation Requests',
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
  // ops_mgr sees Projects/SO via WORKSTREAM MONITORING (ops-projects).
  // ops_mgr sees Approvals/WO Gate via CONTROL TOWER section above.
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
    roles: ['admin', 'viewer'],
  },
  {
    id: 'admin-approvals',
    label: 'Admin Approvals',
    path: '/admin-approvals',
    icon: 'ShieldCheck',
    // ops_mgr uses ops-approvals in CONTROL TOWER section
    roles: ['admin'],
  },
  {
    id: 'wo-pn-gate',
    label: 'WO / PN Gate',
    path: '/wo-pn-gate',
    icon: 'GitBranch',
    // ops_mgr uses ops-wo-pn-gate in CONTROL TOWER section
    // factory_user uses factory-wo-gate in FACTORY EXECUTION section
    roles: ['admin'],
  },

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
    // ops_mgr monitors Procurement via WORKSTREAM MONITORING (ops-procurement-monitor)
    roles: ['admin', 'procurement_user'],
  },
  {
    id: 'proc-requests',
    label: 'Purchase Requests',
    path: '/procurement/requests',
    icon: 'FileText',
    roles: ['admin', 'procurement_user'],
  },
  {
    id: 'proc-items-without-po',
    label: 'PR Items Without PO',
    path: '/procurement/pr-items-without-po',
    icon: 'AlertCircle',
    roles: ['admin', 'procurement_user'],
  },
  {
    id: 'proc-purchase-orders',
    label: 'PO to Supplier',
    path: '/procurement/purchase-orders',
    icon: 'ShoppingCart',
    roles: ['admin', 'procurement_user'],
  },
  {
    id: 'proc-eta',
    label: 'ETA Tracking',
    path: '/procurement/eta-history',
    icon: 'Clock',
    roles: ['admin', 'procurement_user'],
  },
  {
    id: 'proc-suppliers',
    label: 'Approved Suppliers',
    path: '/procurement/suppliers',
    icon: 'Users',
    roles: ['admin', 'procurement_user'],
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
    // ops_mgr monitors Store via WORKSTREAM MONITORING (ops-store-monitor)
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-inventory',
    label: 'Inventory',
    path: '/store/inventory',
    icon: 'Layers',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-receiving',
    label: 'Material Receiving',
    path: '/store/receipts',
    icon: 'Truck',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-vehicle',
    label: 'Vehicle Receiving',
    path: '/store/vehicle-receiving',
    icon: 'Truck',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-issuance',
    label: 'Material Issuance',
    path: '/store/issuance',
    icon: 'ArrowUpRight',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-custody',
    label: 'Material Custody',
    path: '/custody',
    icon: 'ShieldCheck',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-unallocated',
    label: 'Unallocated Materials',
    path: '/store/unallocated',
    icon: 'AlertCircle',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-serials',
    label: 'Serial Register',
    path: '/store/serials',
    icon: 'Hash',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-returns',
    label: 'Returns / Transfers',
    path: '/store/receipts',
    icon: 'RotateCcw',
    roles: ['admin', 'store_user'],
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
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-qc-accepted',
    label: 'QC Accepted Items',
    path: '/store/qc-handoff?status=accepted',
    icon: 'CheckCircle2',
    roles: ['admin', 'store_user'],
  },
  {
    id: 'store-qc-rejected',
    label: 'QC Rejected / NCR',
    path: '/store/qc-handoff?status=rejected',
    icon: 'XCircle',
    roles: ['admin', 'store_user'],
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
    // ops_mgr monitors QC via WORKSTREAM MONITORING (ops-qc-monitor)
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-work-queue',
    label: 'QC Work Queue',
    path: '/qc/work-queue',
    icon: 'ListChecks',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-material-qc',
    label: 'Material QC',
    path: '/material-qc',
    icon: 'Microscope',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-material-inspections',
    label: 'Material Inspections',
    path: '/material-qc/inspections',
    icon: 'ClipboardCheck',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-material-ncrs',
    label: 'Material NCRs',
    path: '/material-qc/ncrs',
    icon: 'AlertOctagon',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-project-qc',
    label: 'Project / Vehicle QC',
    path: '/project-qc',
    icon: 'ClipboardList',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-project-inspections',
    label: 'Project QC Inspections',
    path: '/project-qc/inspections',
    icon: 'Search',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-findings',
    label: 'QC Findings',
    path: '/project-qc/findings',
    icon: 'AlertTriangle',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-rework',
    label: 'Rework',
    path: '/qc/rework',
    icon: 'Wrench',
    roles: ['admin', 'qc_user'],
  },
  {
    id: 'qc-release-notes',
    label: 'Release Notes',
    path: '/project-qc/release-notes',
    icon: 'FileCheck',
    roles: ['admin', 'qc_user'],
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
    roles: ['admin', 'qc_user'],
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
    // ops_mgr monitors Factory via WORKSTREAM MONITORING (ops-factory-monitor)
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-wo-gate',
    label: 'WO Gate / Missing WO',
    path: '/wo-pn-gate',
    icon: 'GitBranch',
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-projects',
    label: 'Factory Projects',
    path: '/factory/projects',
    icon: 'Wrench',
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-production-lines',
    label: 'Production Lines',
    path: '/factory/projects',
    icon: 'Layers',
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-requirements',
    label: 'Factory Requirements',
    path: '/factory/requirements',
    icon: 'FileText',
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-rmr',
    label: 'Raw Material Requests',
    path: '/factory/raw-material-requests',
    icon: 'Package',
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-monthly-updates',
    label: 'Monthly Updates',
    path: '/factory/monthly-updates',
    icon: 'CalendarClock',
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-send-to-qc',
    label: 'Send to QC',
    path: '/factory/send-to-qc',
    icon: 'CheckCircle2',
    roles: ['admin', 'factory_user'],
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
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-materials-issued',
    label: 'Materials Issued to Factory',
    path: '/custody',
    icon: 'PackageCheck',
    roles: ['admin', 'factory_user'],
  },
  {
    id: 'factory-custody',
    label: 'Factory Custody',
    path: '/custody',
    icon: 'ShieldCheck',
    roles: ['admin', 'factory_user'],
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
    // ops_mgr monitors AFS via WORKSTREAM MONITORING (ops-afs-monitor)
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-pn-gate',
    label: 'PN Gate / Missing PN',
    path: '/afs/pn-gate',
    icon: 'ShieldCheck',
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-followups',
    label: 'Dubai Follow-ups',
    path: '/dubai-afs/projects',
    icon: 'TrendingUp',
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-eta',
    label: 'Dubai ETA Tracking',
    path: '/dubai-afs/eta',
    icon: 'Clock',
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-arrivals',
    label: 'Vehicle Arrivals',
    path: '/dubai-afs/arrival-reports',
    icon: 'Truck',
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-missing',
    label: 'Missing Items',
    path: '/dubai-afs/missing-items',
    icon: 'AlertTriangle',
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-predelivery',
    label: 'Pre-Delivery Readiness',
    path: '/dubai-afs/predelivery-reports',
    icon: 'ClipboardCheck',
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-ready-delivery',
    label: 'Ready for Delivery',
    path: '/afs/ready-for-delivery',
    icon: 'PackageCheck',
    roles: ['admin', 'afs_user'],
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
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'afs-custody',
    label: 'Materials in Custody',
    path: '/custody',
    icon: 'PackageCheck',
    roles: ['admin', 'afs_user'],
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
    roles: ['admin', 'afs_user'],
  },
  {
    id: 'after-sales-new',
    label: 'New Maintenance Request',
    path: '/after-sales/maintenance/new',
    icon: 'FilePlus',
    roles: ['admin', 'afs_user'],
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
    label: 'Hot Projects',
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
    roles: ['admin', 'viewer'],
  },
  {
    id: 'reports',
    label: 'Reports Hub',
    path: '/reports',
    icon: 'BarChart2',
    roles: ['admin', 'viewer'],
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
    roles: ['admin', 'sales_user'],
  },
  {
    id: 'admin-access-requests',
    label: 'Access Requests',
    path: '/admin/access-requests',
    icon: 'UserPlus',
    // User management is admin-only per governance rules
    roles: ['admin'],
  },
  {
    id: 'admin-notification-rules',
    label: 'Notification Rules',
    path: '/admin/notification-rules',
    icon: 'BellRing',
    // System configuration is admin-only per governance rules
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
