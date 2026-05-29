import { PlaceholderPage } from './PlaceholderPage';

export function Projects() {
  return (
    <PlaceholderPage
      title="Projects / SO"
      description="All active Sales Orders. View project status, route, vehicle lines, WO/PN status, and linked workflows."
      phase={2}
      module="Project Core"
      roles={['admin', 'operations_manager', 'sales_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer']}
      features={[
        'SO List with Status Line',
        'Project Header (SO, Customer, Sales Owner, Value)',
        'Vehicle / Item Lines',
        'Route: Saudi or Dubai',
        'Medical Flag',
        'WO / PN Status',
        'Overall Project Timeline',
        'Linked Procurement, Factory, Store, QC',
        'Audit Log per Project',
      ]}
      governanceNotes={[
        'SO is the commercial reference. WO/PN are execution references.',
        'Projects are managed at vehicle/item line level, not just header level.',
        'Route selection triggers WO (Saudi) or PN (Dubai) requirement.',
        'SO cannot be approved without Customer, PO/Contract, values, and delivery date.',
      ]}
    />
  );
}
