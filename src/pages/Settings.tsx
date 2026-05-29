import { PlaceholderPage } from './PlaceholderPage';

export function Settings() {
  return (
    <PlaceholderPage
      title="Settings"
      description="System configuration: master data lists, SLA rules, checklist templates, document types, and notification settings."
      phase={1}
      module="Foundation"
      roles={['admin']}
      features={[
        'Vehicle Types Master List',
        'Material Categories',
        'Supplier Categories',
        'Customer Master List',
        'Document Types',
        'Root Cause Categories',
        'Issue Types',
        'SLA Rules Configuration',
        'Checklist Templates',
        'Store Locations',
        'WO/PN Status Lists',
        'Notification Settings',
      ]}
      governanceNotes={[
        'Settings are Admin-only.',
        'Master data changes are audited.',
        'SLA rules determine escalation triggers and timelines.',
      ]}
    />
  );
}
