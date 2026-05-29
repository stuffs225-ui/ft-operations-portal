import { PlaceholderPage } from './PlaceholderPage';

export function Factory() {
  return (
    <PlaceholderPage
      title="Factory / Production"
      description="Saudi factory workspace. Manage WO, BOQ, BOM, GA Drawings, Raw Material Requests, and production progress per vehicle line."
      phase={6}
      module="Saudi Factory"
      roles={['admin', 'operations_manager', 'factory_user']}
      features={[
        'WO Number Entry',
        'BOQ Upload (per Vehicle Line)',
        'BOM Management (Excel-ready)',
        'GA Drawing Upload',
        'Detail Drawings',
        'Required Manhours Tracking',
        'Raw Material Requests (Project/WO or Stock)',
        'Production Progress Updates',
        'Send to QC',
        '30-Day Update Rule Enforcement',
      ]}
      governanceNotes={[
        'WO is mandatory before any factory action (BOQ, BOM, Drawings, Raw Materials, Progress).',
        'Factory works only on approved Saudi-routed projects.',
        '30-Day Rule: Every production line must be updated at least once every 30 days.',
        'Raw Material Requests must be linked to WO/Project or declared as Stock requests.',
        'No financial values visible to factory users.',
      ]}
    />
  );
}
