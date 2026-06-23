/**
 * screenshot-routes.mjs
 * Curated static route catalogue extracted from src/app/App.tsx and src/lib/roleMatrix.ts.
 * Dynamic routes (requiring :id) are listed separately and skipped unless sample IDs are provided.
 *
 * Module order follows the UX improvement sequence:
 * 01-sales → 02-sales-coordinator → 03-projects-so → 04-procurement →
 * 05-store-warehouse → 06-factory → 07-qc → 08-dubai-afs →
 * 09-after-sales → 10-reports → 11-control-tower → 12-admin →
 * 13-viewer-management → 14-shared
 */

/** @type {Array<{path: string, name: string, module: string, moduleSlug: string, moduleOrder: number, roles: string[], dynamic: boolean, sampleEnvKey?: string}>} */
export const ROUTE_CATALOGUE = [

  // ── 01 Sales ─────────────────────────────────────────────────────────────────
  { path: '/sales',           name: 'Sales Dashboard',   module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/hot-projects',    name: 'Hot Projects',      module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: false },
  { path: '/hot-projects/new',name: 'New Hot Project',   module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1,
    roles: ['admin','operations_manager','sales_user'], dynamic: false },
  { path: '/receivables',     name: 'Receivables',       module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: false },

  // Dynamic: hot-projects/:id — requires SAMPLE_HOT_PROJECT_ID
  { path: '/hot-projects/:id', name: 'Hot Project Detail', module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: true, sampleEnvKey: 'SAMPLE_HOT_PROJECT_ID' },

  // ── 02 Sales Coordinator ──────────────────────────────────────────────────────
  { path: '/sales-coordinator', name: 'Sales Coordinator Hub', module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2,
    roles: ['admin','operations_manager','sales_coordinator'], dynamic: false },
  { path: '/coordinator-queue', name: 'Coordinator Queue',     module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2,
    roles: ['admin','operations_manager','sales_coordinator'], dynamic: false },
  { path: '/quotations',        name: 'Quotations',            module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/quotations/new',    name: 'New Quotation',         module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2,
    roles: ['admin','operations_manager','sales_user','sales_coordinator'], dynamic: false },

  // Dynamic: quotations/:id — requires SAMPLE_QUOTATION_ID
  { path: '/quotations/:id', name: 'Quotation Detail', module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2,
    roles: ['admin','operations_manager','sales_user','sales_coordinator'], dynamic: true, sampleEnvKey: 'SAMPLE_QUOTATION_ID' },

  // ── 03 Projects / Sales Orders ───────────────────────────────────────────────
  { path: '/projects',        name: 'Projects / Sales Orders', module: 'Projects / SO', moduleSlug: '03-projects-so', moduleOrder: 3,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/projects/new',    name: 'New Sales Order',         module: 'Projects / SO', moduleSlug: '03-projects-so', moduleOrder: 3,
    roles: ['admin','operations_manager','sales_user'], dynamic: false },
  { path: '/admin-approvals', name: 'SO Approvals',            module: 'Projects / SO', moduleSlug: '03-projects-so', moduleOrder: 3,
    roles: ['admin','operations_manager'], dynamic: false },
  { path: '/wo-pn-gate',      name: 'WO / PN Gate',            module: 'Projects / SO', moduleSlug: '03-projects-so', moduleOrder: 3,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },

  // Dynamic: projects/:id
  { path: '/projects/:id', name: 'Project Detail', module: 'Projects / SO', moduleSlug: '03-projects-so', moduleOrder: 3,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: true, sampleEnvKey: 'SAMPLE_PROJECT_ID' },
  { path: '/projects/:id/invoicing', name: 'Project Invoicing', module: 'Projects / SO', moduleSlug: '03-projects-so', moduleOrder: 3,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: true, sampleEnvKey: 'SAMPLE_PROJECT_ID' },

  // ── 04 Procurement ────────────────────────────────────────────────────────────
  { path: '/procurement',                        name: 'Procurement Hub',          module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/procurement/requests',               name: 'Purchase Requests',        module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/procurement/requests/new',           name: 'New Purchase Request',     module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/procurement/purchase-orders',        name: 'Purchase Orders',          module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/procurement/purchase-orders/new',    name: 'New Purchase Order',       module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/procurement/pr-items-without-po',    name: 'PR Items Without PO',      module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/procurement/suppliers',              name: 'Supplier Register',        module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/procurement/eta-history',            name: 'ETA History',              module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },

  // Dynamic: procurement/:id
  { path: '/procurement/requests/:id',        name: 'PR Detail',       module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: true, sampleEnvKey: 'SAMPLE_PO_ID' },
  { path: '/procurement/purchase-orders/:id', name: 'PO Detail',       module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: true, sampleEnvKey: 'SAMPLE_PO_ID' },
  { path: '/procurement/suppliers/:id',       name: 'Supplier Detail', module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4,
    roles: ['admin','operations_manager','procurement_user'], dynamic: true, sampleEnvKey: 'SAMPLE_SUPPLIER_ID' },

  // ── 05 Store / Warehouse ──────────────────────────────────────────────────────
  { path: '/store',                    name: 'Store Hub',              module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/receipts',           name: 'Material Receipts',      module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/receipts/new',       name: 'New Receipt',            module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/vehicle-receiving',  name: 'Vehicle Receiving',      module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/vehicle-receiving/new', name: 'New Vehicle Receiving', module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/inventory',          name: 'Store Inventory',        module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/issuance',           name: 'Material Issuance',      module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/serials',            name: 'Serial Numbers',         module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/qc-handoff',         name: 'QC Handoff',             module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/store/unallocated',        name: 'Unallocated Materials',  module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/custody',                  name: 'Material Custody',       module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user','factory_user','afs_user'], dynamic: false },
  { path: '/custody/new',              name: 'New Custody Request',    module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user','factory_user','afs_user'], dynamic: false },
  { path: '/vehicle-receiving',        name: 'Vehicle Receiving (legacy)', module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: false },

  // Dynamic: store
  { path: '/store/receipts/:id',          name: 'Receipt Detail',          module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: true, sampleEnvKey: 'SAMPLE_STORE_ITEM_ID' },
  { path: '/store/vehicle-receiving/:id', name: 'Vehicle Receiving Detail', module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5,
    roles: ['admin','operations_manager','store_user'], dynamic: true, sampleEnvKey: 'SAMPLE_STORE_ITEM_ID' },

  // ── 06 Factory / Production ───────────────────────────────────────────────────
  { path: '/factory',                          name: 'Factory Hub',             module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/factory/projects',                 name: 'Factory Projects',        module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/factory/requirements',             name: 'Factory Requirements',    module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/factory/raw-material-requests',    name: 'Raw Material Requests',   module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/factory/raw-material-requests/new','name': 'New RMR',               module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/factory/monthly-updates',          name: 'Monthly Updates',         module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/factory/send-to-qc',               name: 'Send to QC',              module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/factory/pending-raw-materials',    name: 'Pending Raw Materials',   module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },

  // Dynamic: factory
  { path: '/factory/projects/:projectId', name: 'Factory Project Workspace', module: 'Factory', moduleSlug: '06-factory', moduleOrder: 6,
    roles: ['admin','operations_manager','factory_user'], dynamic: true, sampleEnvKey: 'SAMPLE_FACTORY_PROJECT_ID' },

  // ── 07 QC / NCR / Release ─────────────────────────────────────────────────────
  { path: '/qc',                          name: 'QC Hub',                   module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/qc/work-queue',               name: 'QC Work Queue',            module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/qc/rework',                   name: 'QC Rework',                module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/material-qc',                 name: 'Material QC Hub',          module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/material-qc/inspections',     name: 'Material Inspections',     module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/material-qc/ncrs',            name: 'Material NCRs',            module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/project-qc',                  name: 'Project QC Hub',           module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/project-qc/inspections',      name: 'Project Inspections',      module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/project-qc/findings',         name: 'QC Findings',              module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/project-qc/release-notes',    name: 'Release Notes',            module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },

  // Dynamic: QC
  { path: '/material-qc/inspections/:id', name: 'Material Inspection Detail', module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: true, sampleEnvKey: 'SAMPLE_QC_INSPECTION_ID' },
  { path: '/project-qc/inspections/:id',  name: 'Project Inspection Detail',  module: 'QC', moduleSlug: '07-qc', moduleOrder: 7,
    roles: ['admin','operations_manager','qc_user'], dynamic: true, sampleEnvKey: 'SAMPLE_QC_INSPECTION_ID' },

  // ── 08 Dubai / AFS ───────────────────────────────────────────────────────────
  { path: '/dubai-afs',                       name: 'Dubai AFS Hub',           module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/dubai-afs/projects',              name: 'AFS Projects',            module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/dubai-afs/eta',                   name: 'AFS ETA Tracking',        module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/dubai-afs/arrival-reports',       name: 'Arrival Reports',         module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/dubai-afs/missing-items',         name: 'Missing Items',           module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/dubai-afs/predelivery-reports',   name: 'Pre-Delivery Reports',    module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/dubai-afs/condition-reports',     name: 'Condition Reports',       module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/afs/pn-gate',                     name: 'AFS PN Gate',             module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/afs/ready-for-delivery',          name: 'Ready for Delivery',      module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/afs/materials',                   name: 'AFS Materials',           module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },

  // Dynamic: AFS
  { path: '/dubai-afs/projects/:id',         name: 'AFS Project Detail',        module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: true, sampleEnvKey: 'SAMPLE_AFS_PROJECT_ID' },
  { path: '/dubai-afs/arrival-reports/:id',  name: 'Arrival Report Detail',     module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8,
    roles: ['admin','operations_manager','afs_user'], dynamic: true, sampleEnvKey: 'SAMPLE_AFS_PROJECT_ID' },

  // ── 09 After Sales ────────────────────────────────────────────────────────────
  { path: '/after-sales',                   name: 'After Sales Hub',          module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/after-sales/maintenance',       name: 'Maintenance Requests',     module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/after-sales/maintenance/new',   name: 'New Maintenance Request',  module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },

  // Dynamic: after-sales
  { path: '/after-sales/maintenance/:id', name: 'Maintenance Detail', module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9,
    roles: ['admin','operations_manager','afs_user'], dynamic: true, sampleEnvKey: 'SAMPLE_AFTER_SALES_ID' },

  // ── 10 Reports ────────────────────────────────────────────────────────────────
  { path: '/reports',                name: 'Reports Hub',           module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer','procurement_user','factory_user','store_user','qc_user','afs_user','sales_coordinator'], dynamic: false },
  { path: '/reports/executive',      name: 'Executive Report',      module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer'], dynamic: false },
  { path: '/reports/projects',       name: 'Projects Report',       module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer','sales_coordinator'], dynamic: false },
  { path: '/reports/sales',          name: 'Sales Report',          module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer','sales_user','sales_coordinator'], dynamic: false },
  { path: '/reports/procurement',    name: 'Procurement Report',    module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/reports/factory',        name: 'Factory Report',        module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','factory_user'], dynamic: false },
  { path: '/reports/store',          name: 'Store Report',          module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','store_user'], dynamic: false },
  { path: '/reports/qc',             name: 'QC Report',             module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/reports/afs',            name: 'AFS Report',            module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','afs_user'], dynamic: false },
  { path: '/reports/suppliers',      name: 'Suppliers Report',      module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/reports/sla',            name: 'SLA Report',            module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer'], dynamic: false },
  { path: '/reports/data-quality',   name: 'Data Quality',          module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer'], dynamic: false },
  { path: '/reports/health-scores',  name: 'Health Scores',         module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer'], dynamic: false },
  { path: '/reports/issues',         name: 'Issues Report',         module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','viewer','qc_user'], dynamic: false },
  { path: '/reports/capa',           name: 'CAPA Report',           module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10,
    roles: ['admin','operations_manager','qc_user'], dynamic: false },

  // ── 11 Control Tower ─────────────────────────────────────────────────────────
  { path: '/control-tower', name: 'Control Tower', module: 'Control Tower', moduleSlug: '11-control-tower', moduleOrder: 11,
    roles: ['admin','operations_manager','viewer'], dynamic: false },

  // ── 12 Admin ──────────────────────────────────────────────────────────────────
  { path: '/admin-dashboard',              name: 'Admin Dashboard',          module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin'], dynamic: false },
  { path: '/settings',                     name: 'System Settings',          module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin'], dynamic: false },
  { path: '/admin/users',                  name: 'User Management',          module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin'], dynamic: false },
  { path: '/audit-log',                    name: 'Audit Log',                module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin'], dynamic: false },
  { path: '/admin/access-requests',        name: 'Access Requests',          module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin'], dynamic: false },
  { path: '/admin/notification-rules',     name: 'Notification Rules',       module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin'], dynamic: false },
  { path: '/admin/report-subscriptions',   name: 'Report Subscriptions',     module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin'], dynamic: false },
  { path: '/templates/approvals',          name: 'Template Approvals',       module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12,
    roles: ['admin','operations_manager'], dynamic: false },

  // ── 13 Viewer / Management ────────────────────────────────────────────────────
  { path: '/management-dashboard', name: 'Management Dashboard', module: 'Viewer / Management', moduleSlug: '13-viewer-management', moduleOrder: 13,
    roles: ['admin','viewer'], dynamic: false },

  // ── 14 Shared (all authenticated users) ──────────────────────────────────────
  { path: '/',                        name: 'Dashboard / Landing',       module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/inbox',                   name: 'Action Inbox',              module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/notifications',           name: 'Notifications',             module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/notifications/settings',  name: 'Notification Settings',     module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/templates',               name: 'Document Templates',        module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/templates/generated',     name: 'Generated Documents',       module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14,
    roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/templates/new',           name: 'New Template',              module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14,
    roles: ['admin','operations_manager'], dynamic: false },
];

/**
 * Get static routes only (no dynamic segments).
 */
export function getStaticRoutes() {
  return ROUTE_CATALOGUE.filter(r => !r.dynamic);
}

/**
 * Get routes accessible by a given role.
 */
export function getRoutesForRole(role) {
  return ROUTE_CATALOGUE.filter(r => r.roles.includes(role) || r.roles.includes('all'));
}

/**
 * Get static routes for a role.
 */
export function getStaticRoutesForRole(role) {
  return getStaticRoutes().filter(r => r.roles.includes(role) || r.roles.includes('all'));
}

/**
 * Total static routes in the catalogue.
 */
export const STATIC_ROUTE_COUNT = ROUTE_CATALOGUE.filter(r => !r.dynamic).length;
export const TOTAL_ROUTE_COUNT = ROUTE_CATALOGUE.length;
