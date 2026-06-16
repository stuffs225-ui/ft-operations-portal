import type { NavItem } from '../types';

// ─── Step 10.5C — Role-Based Navigation Restructure ───────────────────────────
// 8 sections replacing the former 7 (CONTROL CENTER renamed MY WORK;
// OPERATIONS renamed EXECUTION; QUALITY renamed QUALITY & RELEASE;
// REPORTS & ADMIN split into REPORTING + ADMIN & SYSTEM).
// All route paths are UNCHANGED — this is a display/grouping restructure only.
// See: docs/implementation/step-10-5c-role-based-navigation-restructure.md

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
    // sales_user lands on /sales instead; Dashboard is for management/ops roles
    roles: ['admin', 'operations_manager', 'sales_coordinator', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer'],
  },
  {
    id: 'inbox',
    label: 'Action Inbox',
    path: '/inbox',
    icon: 'Inbox',
    // No static badge — counts must come from real data only (see Sidebar).
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: 'Bell',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer'],
  },

  // ── 2. SALES & COMMERCIAL ─────────────────────────────────────────────────
  // Renamed from "SALES & QUOTATION". Receivables moved here from REPORTS & ADMIN
  // (Step 10.5B decision: Receivables is a commercial-finance tool, not an admin tool).
  {
    id: 'sep-1',
    label: 'SALES & COMMERCIAL',
    path: '#',
    icon: '',
  },
  {
    id: 'quotations',
    label: 'Quotation Requests',
    path: '/quotations',
    icon: 'FileText',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer'],
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
  // WO/PN Gate and Admin Approvals promoted here as project governance gates
  // (Step 10.5B decision: governance gates belong alongside the Projects list).
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
    roles: ['admin', 'operations_manager', 'factory_user'],
  },

  // ── 4. EXECUTION ──────────────────────────────────────────────────────────
  // Renamed from "OPERATIONS" — "Operations" is the name of the operations_manager
  // role, causing persistent confusion. EXECUTION better reflects active production work.
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
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },
  {
    id: 'factory',
    label: 'Factory / Production',
    path: '/factory',
    icon: 'Factory',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    id: 'store',
    label: 'Store / Warehouse',
    path: '/store',
    icon: 'Warehouse',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    id: 'custody',
    label: 'Material Custody',
    path: '/custody',
    icon: 'PackageCheck',
    roles: ['admin', 'operations_manager', 'store_user', 'factory_user', 'afs_user'],
  },
  {
    id: 'vehicle-receiving',
    label: 'Vehicle Receiving',
    path: '/store/vehicle-receiving',
    icon: 'Truck',
    roles: ['admin', 'operations_manager', 'store_user'],
  },

  // ── 5. QUALITY & RELEASE ─────────────────────────────────────────────────
  // Renamed from "QUALITY" — Release Notes live here; name should reflect that.
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
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    id: 'project-qc',
    label: 'Project / Vehicle QC',
    path: '/project-qc',
    icon: 'ClipboardCheck',
    roles: ['admin', 'operations_manager', 'qc_user'],
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
  // Split from the former "REPORTS & ADMIN" — reporting tools only.
  // Control Tower renamed "Operations Overview" to eliminate confusion with the
  // Dashboard page (which is already titled "Operations Control Tower").
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
    label: 'Reports',
    path: '/reports',
    icon: 'BarChart2',
    // Sales reach their sales-specific figures via the Sales Workspace; the mixed
    // Reports hub is reserved for management/operational roles to keep Sales focused.
    roles: ['admin', 'operations_manager', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'sales_coordinator', 'viewer'],
  },

  // ── 8. ADMIN & SYSTEM ─────────────────────────────────────────────────────
  // Split from the former "REPORTS & ADMIN" — admin/config tools only.
  // Notifications moved to MY WORK; Receivables moved to SALES & COMMERCIAL.
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
    roles: ['admin', 'operations_manager', 'sales_user', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user'],
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
