/**
 * screenshot-routes.mjs
 *
 * Route catalogue derived directly from src/app/App.tsx and src/lib/roleMatrix.ts.
 *
 * Key rule from RequireRole.tsx: admin role ALWAYS passes every guard.
 * Route roles below list the guards exactly as they appear in App.tsx.
 * The admin role is omitted from role arrays (it always passes) except for
 * routes that are admin-only.
 *
 * Dynamic routes are marked dynamic: true and require a sampleEnvKey.
 * They are skipped unless the env var is set.
 */

// ---------------------------------------------------------------------------
// Route definition shape
// {
//   path: string,
//   name: string,
//   module: string,
//   moduleSlug: string,  // directory name under screenshots/<account>/
//   moduleOrder: number,
//   roles: string[],     // roles that can access this route (admin always can)
//   dynamic: boolean,
//   sampleEnvKey?: string,
// }
// ---------------------------------------------------------------------------

export const ROUTE_CATALOGUE = [

  // ── 01 Sales ────────────────────────────────────────────────────────────
  { path: '/sales',              name: 'Sales Dashboard',         module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/hot-projects',       name: 'Hot Projects',            module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1, roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: false },
  { path: '/hot-projects/new',   name: 'New Hot Project',         module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1, roles: ['admin','operations_manager','sales_user'], dynamic: false },
  { path: '/receivables',        name: 'Receivables & Aging',     module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1, roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: false },
  { path: '/reports/sales',      name: 'Sales Reports',           module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1, roles: ['admin','operations_manager','viewer','sales_user','sales_coordinator'], dynamic: false },

  // Dynamic
  { path: '/hot-projects/:id',   name: 'Hot Project Detail',      module: 'Sales', moduleSlug: '01-sales', moduleOrder: 1, roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: true, sampleEnvKey: 'SAMPLE_HOT_PROJECT_ID' },

  // ── 02 Sales Coordinator ────────────────────────────────────────────────
  { path: '/sales-coordinator',  name: 'Sales Coordinator Dashboard', module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2, roles: ['admin','sales_coordinator','operations_manager'], dynamic: false },
  { path: '/coordinator-queue',  name: 'Coordinator Queue',           module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2, roles: ['admin','sales_coordinator','operations_manager'], dynamic: false },
  { path: '/quotations',         name: 'Quotations List',             module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/quotations/new',     name: 'New Quotation',               module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/reports/projects',   name: 'Projects Reports',            module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2, roles: ['admin','operations_manager','viewer','sales_coordinator'], dynamic: false },

  // Dynamic
  { path: '/quotations/:id',     name: 'Quotation Detail',            module: 'Sales Coordinator', moduleSlug: '02-sales-coordinator', moduleOrder: 2, roles: ['admin','operations_manager','sales_user','sales_coordinator'], dynamic: true, sampleEnvKey: 'SAMPLE_QUOTATION_ID' },

  // ── 03 Projects / Sales Orders ──────────────────────────────────────────
  { path: '/projects',                   name: 'Projects List',         module: 'Projects / Sales Orders', moduleSlug: '03-projects-so', moduleOrder: 3, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/projects/new',               name: 'New Project (SO)',       module: 'Projects / Sales Orders', moduleSlug: '03-projects-so', moduleOrder: 3, roles: ['admin','operations_manager','sales_user'], dynamic: false },
  { path: '/admin-approvals',            name: 'Admin Approvals',        module: 'Projects / Sales Orders', moduleSlug: '03-projects-so', moduleOrder: 3, roles: ['admin','operations_manager'], dynamic: false },
  { path: '/wo-pn-gate',                 name: 'WO / PN Gate',           module: 'Projects / Sales Orders', moduleSlug: '03-projects-so', moduleOrder: 3, roles: ['admin','operations_manager','factory_user'], dynamic: false },

  // Dynamic
  { path: '/projects/:id',               name: 'Project Detail',         module: 'Projects / Sales Orders', moduleSlug: '03-projects-so', moduleOrder: 3, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: true, sampleEnvKey: 'SAMPLE_PROJECT_ID' },
  { path: '/projects/:projectId/invoicing', name: 'Project Invoicing',   module: 'Projects / Sales Orders', moduleSlug: '03-projects-so', moduleOrder: 3, roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'], dynamic: true, sampleEnvKey: 'SAMPLE_PROJECT_ID' },

  // ── 04 Procurement ──────────────────────────────────────────────────────
  { path: '/procurement',                     name: 'Procurement Dashboard',     module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/procurement/requests',            name: 'Purchase Requests (PR)',    module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/procurement/requests/new',        name: 'New Purchase Request',      module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/procurement/purchase-orders',     name: 'Purchase Orders',           module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/procurement/purchase-orders/new', name: 'New Purchase Order',        module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/procurement/pr-items-without-po', name: 'PR Items Without PO',       module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/procurement/suppliers',           name: 'Suppliers',                 module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/procurement/eta-history',         name: 'ETA History',               module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: false },
  { path: '/reports/procurement',             name: 'Procurement Reports',       module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','operations_manager','procurement_user'], dynamic: false },
  { path: '/reports/suppliers',               name: 'Supplier Reports',          module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','operations_manager','procurement_user'], dynamic: false },

  // Dynamic
  { path: '/procurement/requests/:id',        name: 'PR Detail',                 module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_PO_ID' },
  { path: '/procurement/purchase-orders/:id', name: 'PO Detail',                 module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_PO_ID' },
  { path: '/procurement/suppliers/:id',       name: 'Supplier Detail',           module: 'Procurement', moduleSlug: '04-procurement', moduleOrder: 4, roles: ['admin','procurement_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_SUPPLIER_ID' },

  // ── 05 Store / Warehouse ─────────────────────────────────────────────────
  { path: '/store',                     name: 'Store Dashboard',        module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/receipts',            name: 'Store Receipts',         module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/receipts/new',        name: 'New Store Receipt',      module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/vehicle-receiving',   name: 'Store Vehicle Receiving',module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/vehicle-receiving/new', name: 'New Vehicle Receiving',module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/inventory',           name: 'Store Inventory',        module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/issuance',            name: 'Material Issuance',      module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/serials',             name: 'Store Serials',          module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/qc-handoff',          name: 'QC Handoff',             module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/store/unallocated',         name: 'Unallocated Materials',  module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/custody',                   name: 'Material Custody',       module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','factory_user','afs_user','operations_manager'], dynamic: false },
  { path: '/custody/new',               name: 'New Custody',            module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','factory_user','afs_user','operations_manager'], dynamic: false },
  { path: '/vehicle-receiving',         name: 'Vehicle Receiving',      module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: false },
  { path: '/reports/store',             name: 'Store Reports',          module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','operations_manager','store_user'], dynamic: false },

  // Dynamic
  { path: '/store/receipts/:id',        name: 'Store Receipt Detail',   module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_STORE_ITEM_ID' },
  { path: '/store/vehicle-receiving/:id', name: 'Vehicle Receiving Detail', module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_STORE_ITEM_ID' },
  { path: '/custody/:id',               name: 'Custody Detail',         module: 'Store / Warehouse', moduleSlug: '05-store-warehouse', moduleOrder: 5, roles: ['admin','store_user','factory_user','afs_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_STORE_ITEM_ID' },

  // ── 06 Factory / Production ──────────────────────────────────────────────
  { path: '/factory',                             name: 'Factory Dashboard',           module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/factory/projects',                    name: 'Factory Projects',            module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/factory/requirements',                name: 'Factory Requirements',        module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/factory/raw-material-requests',       name: 'Raw Material Requests',       module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/factory/raw-material-requests/new',   name: 'New Raw Material Request',    module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/factory/monthly-updates',             name: 'Monthly Updates',             module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/factory/send-to-qc',                  name: 'Send to QC',                  module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/factory/pending-raw-materials',        name: 'Pending Raw Materials',       module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: false },
  { path: '/reports/factory',                     name: 'Factory Reports',             module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','operations_manager','factory_user'], dynamic: false },

  // Dynamic
  { path: '/factory/projects/:projectId',         name: 'Factory Project Workspace',   module: 'Factory / Production', moduleSlug: '06-factory', moduleOrder: 6, roles: ['admin','factory_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_FACTORY_PROJECT_ID' },

  // ── 07 QC / NCR / Release ────────────────────────────────────────────────
  { path: '/qc',                          name: 'QC Dashboard',            module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/qc/work-queue',               name: 'QC Work Queue',           module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/qc/rework',                   name: 'QC Rework',               module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/material-qc',                 name: 'Material QC',             module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/material-qc/inspections',     name: 'Material QC Inspections', module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/material-qc/ncrs',            name: 'Material NCRs',           module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/project-qc',                  name: 'Project QC',              module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/project-qc/inspections',      name: 'Project QC Inspections',  module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/project-qc/findings',         name: 'QC Findings',             module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/project-qc/release-notes',    name: 'QC Release Notes',        module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: false },
  { path: '/reports/qc',                  name: 'QC Reports',              module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','operations_manager','qc_user'], dynamic: false },
  { path: '/reports/issues',              name: 'Issues Reports',          module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','operations_manager','viewer','qc_user'], dynamic: false },
  { path: '/reports/capa',                name: 'CAPA Reports',            module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','operations_manager','qc_user'], dynamic: false },

  // Dynamic
  { path: '/material-qc/inspections/:id',   name: 'Material QC Inspection Detail', module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_QC_INSPECTION_ID' },
  { path: '/material-qc/ncrs/:id',          name: 'Material NCR Detail',           module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_QC_INSPECTION_ID' },
  { path: '/project-qc/inspections/:id',    name: 'Project QC Inspection Detail',  module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_QC_INSPECTION_ID' },
  { path: '/project-qc/findings/:id',       name: 'QC Finding Detail',             module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_QC_INSPECTION_ID' },
  { path: '/project-qc/release-notes/:id',  name: 'QC Release Note Detail',        module: 'QC / NCR / Release', moduleSlug: '07-qc', moduleOrder: 7, roles: ['admin','qc_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_QC_INSPECTION_ID' },

  // ── 08 Dubai / AFS ──────────────────────────────────────────────────────
  { path: '/dubai-afs',                     name: 'Dubai AFS Dashboard',      module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/dubai-afs/projects',            name: 'AFS Projects',             module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/dubai-afs/eta',                 name: 'AFS ETA Tracking',         module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/dubai-afs/arrival-reports',     name: 'AFS Arrival Reports',      module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/dubai-afs/missing-items',       name: 'AFS Missing Items',        module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/dubai-afs/predelivery-reports', name: 'AFS Pre-Delivery Reports', module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/dubai-afs/condition-reports',   name: 'AFS Condition Reports',    module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/afs/pn-gate',                   name: 'AFS PN Gate',              module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/afs/ready-for-delivery',        name: 'AFS Ready for Delivery',   module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/afs/materials',                 name: 'AFS Materials',            module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/reports/afs',                   name: 'AFS Reports',              module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','operations_manager','afs_user'], dynamic: false },

  // Dynamic
  { path: '/dubai-afs/projects/:id',            name: 'AFS Project Detail',         module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_AFS_PROJECT_ID' },
  { path: '/dubai-afs/arrival-reports/:id',     name: 'AFS Arrival Report Detail',  module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_AFS_PROJECT_ID' },
  { path: '/dubai-afs/predelivery-reports/:id', name: 'AFS Pre-Delivery Detail',    module: 'Dubai / AFS', moduleSlug: '08-dubai-afs', moduleOrder: 8, roles: ['admin','afs_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_AFS_PROJECT_ID' },

  // ── 09 After Sales ──────────────────────────────────────────────────────
  { path: '/after-sales',               name: 'After Sales Dashboard',       module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/after-sales/maintenance',   name: 'Maintenance Requests',        module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9, roles: ['admin','afs_user','operations_manager'], dynamic: false },
  { path: '/after-sales/maintenance/new', name: 'New Maintenance Request',   module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9, roles: ['admin','afs_user','operations_manager'], dynamic: false },

  // Dynamic
  { path: '/after-sales/maintenance/:id', name: 'Maintenance Request Detail', module: 'After Sales', moduleSlug: '09-after-sales', moduleOrder: 9, roles: ['admin','afs_user','operations_manager'], dynamic: true, sampleEnvKey: 'SAMPLE_AFTER_SALES_ID' },

  // ── 10 Reports ──────────────────────────────────────────────────────────
  { path: '/reports',                   name: 'Reports Hub',             module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10, roles: ['admin','operations_manager','viewer','procurement_user','factory_user','store_user','qc_user','afs_user','sales_coordinator'], dynamic: false },
  { path: '/reports/executive',         name: 'Executive Reports',       module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10, roles: ['admin','operations_manager','viewer'], dynamic: false },
  { path: '/reports/health-scores',     name: 'Health Scores',           module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10, roles: ['admin','operations_manager','viewer'], dynamic: false },
  { path: '/reports/data-quality',      name: 'Data Quality',            module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10, roles: ['admin','operations_manager','viewer'], dynamic: false },
  { path: '/reports/sla',               name: 'SLA Reports',             module: 'Reports', moduleSlug: '10-reports', moduleOrder: 10, roles: ['admin','operations_manager','viewer'], dynamic: false },

  // ── 11 Control Tower / Operations Manager ───────────────────────────────
  { path: '/control-tower',             name: 'Control Tower',           module: 'Control Tower', moduleSlug: '11-control-tower', moduleOrder: 11, roles: ['admin','operations_manager','viewer'], dynamic: false },

  // ── 12 Admin ────────────────────────────────────────────────────────────
  { path: '/admin-dashboard',           name: 'Admin Dashboard',         module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: false },
  { path: '/settings',                  name: 'System Settings',         module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: false },
  { path: '/admin/users',               name: 'User Management',         module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: false },
  { path: '/audit-log',                 name: 'Audit Log',               module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: false },
  { path: '/admin/access-requests',     name: 'Access Requests',         module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: false },
  { path: '/admin/notification-rules',  name: 'Notification Rules',      module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: false },
  { path: '/admin/report-subscriptions', name: 'Report Subscriptions',   module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: false },
  { path: '/templates/approvals',       name: 'Template Approvals',      module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin','operations_manager'], dynamic: false },

  // Dynamic
  { path: '/admin/access-requests/:id',       name: 'Access Request Detail',      module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: true, sampleEnvKey: null },
  { path: '/admin/report-subscriptions/:id',  name: 'Report Subscription Detail', module: 'Admin', moduleSlug: '12-admin', moduleOrder: 12, roles: ['admin'], dynamic: true, sampleEnvKey: null },

  // ── 13 Viewer / Management ──────────────────────────────────────────────
  { path: '/management-dashboard',      name: 'Management Dashboard',    module: 'Viewer / Management', moduleSlug: '13-viewer-management', moduleOrder: 13, roles: ['viewer'], dynamic: false },

  // ── 14 Shared ───────────────────────────────────────────────────────────
  { path: '/',                          name: 'Root / Landing',          module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/inbox',                     name: 'Action Inbox',            module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/notifications',             name: 'Notifications',           module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/notifications/settings',    name: 'Notification Settings',   module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/templates',                 name: 'Template Library',        module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/templates/new',             name: 'New Template',            module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },
  { path: '/templates/generated',       name: 'Generated Documents',     module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: false },

  // Dynamic shared
  { path: '/templates/:id',             name: 'Template Detail',         module: 'Shared', moduleSlug: '14-shared', moduleOrder: 14, roles: ['admin','operations_manager','sales_user','sales_coordinator','procurement_user','factory_user','store_user','qc_user','afs_user','viewer'], dynamic: true, sampleEnvKey: null },
];

export function getStaticRoutes() {
  return ROUTE_CATALOGUE.filter((r) => !r.dynamic);
}

export function getRoutesForRole(role) {
  // admin bypasses all guards
  if (role === 'admin') return ROUTE_CATALOGUE;
  return ROUTE_CATALOGUE.filter((r) => r.roles.includes(role));
}

export function getStaticRoutesForRole(role) {
  return getRoutesForRole(role).filter((r) => !r.dynamic);
}

export function getDynamicRoutesForRole(role, env) {
  return getRoutesForRole(role)
    .filter((r) => r.dynamic && r.sampleEnvKey && env[r.sampleEnvKey]);
}

export const STATIC_ROUTE_COUNT = ROUTE_CATALOGUE.filter((r) => !r.dynamic).length;
export const TOTAL_ROUTE_COUNT = ROUTE_CATALOGUE.length;
