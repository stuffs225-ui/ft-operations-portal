/**
 * Module metadata for screenshot organisation.
 * Matches the directory slugs under docs/artifact-context/screenshots/<account-key>/<slug>/
 */

export const MODULES = [
  {
    order: 1,
    slug: '01-sales',
    label: 'Sales',
    description: 'Sales pipeline, quotations, hot projects, and sales dashboard.',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator'],
  },
  {
    order: 2,
    slug: '02-sales-coordinator',
    label: 'Sales Coordinator',
    description: 'Sales coordinator view — coordinating quotes and handoffs.',
    roles: ['admin', 'operations_manager', 'sales_coordinator'],
  },
  {
    order: 3,
    slug: '03-projects-so',
    label: 'Projects / Sales Orders',
    description: 'Project list, detail, invoicing, and creation wizard.',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'procurement_user', 'factory_user', 'store_user', 'qc_user'],
  },
  {
    order: 4,
    slug: '04-procurement',
    label: 'Procurement',
    description: 'Purchase requisitions, purchase orders, supplier management.',
    roles: ['admin', 'operations_manager', 'procurement_user'],
  },
  {
    order: 5,
    slug: '05-store-warehouse',
    label: 'Store / Warehouse',
    description: 'Store inventory, items, and goods-in/out.',
    roles: ['admin', 'operations_manager', 'store_user'],
  },
  {
    order: 6,
    slug: '06-factory',
    label: 'Factory',
    description: 'Factory production, work orders, and execution gate.',
    roles: ['admin', 'operations_manager', 'factory_user'],
  },
  {
    order: 7,
    slug: '07-qc',
    label: 'Quality Control',
    description: 'QC inspections and sign-off workflows.',
    roles: ['admin', 'operations_manager', 'qc_user'],
  },
  {
    order: 8,
    slug: '08-dubai-afs',
    label: 'Dubai AFS',
    description: 'After-field-service projects in Dubai.',
    roles: ['admin', 'operations_manager', 'afs_user'],
  },
  {
    order: 9,
    slug: '09-after-sales',
    label: 'After Sales',
    description: 'After-sales service requests and tracking.',
    roles: ['admin', 'operations_manager', 'sales_user', 'afs_user'],
  },
  {
    order: 10,
    slug: '10-reports',
    label: 'Reports',
    description: 'Reporting and analytics pages.',
    roles: ['admin', 'operations_manager'],
  },
  {
    order: 11,
    slug: '11-control-tower',
    label: 'Control Tower',
    description: 'Operations manager overview dashboard.',
    roles: ['admin', 'operations_manager'],
  },
  {
    order: 12,
    slug: '12-admin',
    label: 'Admin',
    description: 'Admin panel, user management, system settings.',
    roles: ['admin'],
  },
  {
    order: 13,
    slug: '13-viewer-management',
    label: 'Viewer / Management Dashboard',
    description: 'Read-only management dashboard for executives.',
    roles: ['admin', 'viewer'],
  },
  {
    order: 14,
    slug: '14-shared',
    label: 'Shared',
    description: 'Pages accessible to multiple roles: inbox, notifications, templates, settings.',
    roles: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer'],
  },
];

export function getModuleBySlug(slug) {
  return MODULES.find((m) => m.slug === slug);
}
