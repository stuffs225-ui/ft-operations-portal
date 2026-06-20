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
