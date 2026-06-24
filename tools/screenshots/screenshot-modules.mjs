export const MODULES = [
  { order: 1,  slug: '01-sales',              label: 'Sales',                        description: 'Sales dashboard, hot projects, quotations, receivables.' },
  { order: 2,  slug: '02-sales-coordinator',  label: 'Sales Coordinator',             description: 'Coordinator dashboard, queue, and project reports.' },
  { order: 3,  slug: '03-projects-so',        label: 'Projects / Sales Orders',       description: 'Project list, creation wizard, approvals, WO/PN gate.' },
  { order: 4,  slug: '04-procurement',        label: 'Procurement',                   description: 'PRs, POs, suppliers, ETA tracking.' },
  { order: 5,  slug: '05-store-warehouse',    label: 'Store / Warehouse',             description: 'Receipts, vehicle receiving, inventory, issuance, custody.' },
  { order: 6,  slug: '06-factory',            label: 'Factory / Production',          description: 'Factory projects, requirements, RMRs, QC handoff.' },
  { order: 7,  slug: '07-qc',                 label: 'QC / NCR / Release',            description: 'QC inspections, NCRs, findings, release notes.' },
  { order: 8,  slug: '08-dubai-afs',          label: 'Dubai / AFS',                   description: 'AFS projects, ETA, arrival, missing items, pre-delivery.' },
  { order: 9,  slug: '09-after-sales',        label: 'After Sales',                   description: 'Maintenance requests post-delivery.' },
  { order: 10, slug: '10-reports',            label: 'Reports',                       description: 'Cross-module reports hub and per-module analytics.' },
  { order: 11, slug: '11-control-tower',      label: 'Control Tower',                 description: 'Ops manager cross-functional command centre.' },
  { order: 12, slug: '12-admin',              label: 'Admin',                         description: 'User management, settings, audit log, access requests.' },
  { order: 13, slug: '13-viewer-management',  label: 'Viewer / Management',           description: 'Read-only executive management dashboard.' },
  { order: 14, slug: '14-shared',             label: 'Shared',                        description: 'Inbox, notifications, templates — accessible to all roles.' },
];

export function getModuleBySlug(slug) {
  return MODULES.find((m) => m.slug === slug);
}
