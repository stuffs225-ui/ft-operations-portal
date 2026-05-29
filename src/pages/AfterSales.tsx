import { PlaceholderPage } from './PlaceholderPage';

export function AfterSales() {
  return (
    <PlaceholderPage
      title="After Sales Maintenance"
      description="Post-delivery maintenance requests. Link issues to the original project, vehicle line, and WO/PN. Track inspection, repair, parts, and resolution."
      phase={9}
      module="After Sales"
      roles={['admin', 'operations_manager', 'sales_user', 'afs_user']}
      features={[
        'AFS Maintenance Request Creation',
        'Link to Project / SO',
        'Link to WO or PN',
        'Affected Vehicle / Line',
        'Issue Type & Priority',
        'Photo / Document Attachments',
        'AFS Inspection & Issue Recording',
        'Parts Waiting Tracking',
        'Resolution Notes',
        'Closed Status',
      ]}
      governanceNotes={[
        'AFS maintenance request must be linked to the original delivered project (SO).',
        'Link to WO or PN if applicable.',
        'Can be raised by Sales, Operations, or AFS team.',
        'Resolution notes required to close the request.',
      ]}
    />
  );
}
