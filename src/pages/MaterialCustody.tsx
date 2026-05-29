import { PlaceholderPage } from './PlaceholderPage';

export function MaterialCustody() {
  return (
    <PlaceholderPage
      title="Material Custody"
      description="Track material movement after store acceptance: issuance, receiver acceptance, installation, return, and consumption."
      phase={7}
      module="Material Custody & Issuance"
      roles={['admin', 'operations_manager', 'store_user', 'factory_user', 'afs_user']}
      features={[
        'Custody Issuance Tracking',
        'Receiver Accept / Reject',
        'Temporary Custody (Approval Required)',
        'Assign to Project',
        'Installation Update',
        'Return to Store',
        'Material Status: In Store → Issued → In Custody → Installed',
        'Consumed / Lost / Damaged Recording',
      ]}
      governanceNotes={[
        'Temporary custody to Production/AFS/person requires Admin or Ops Manager approval.',
        'Receiver must accept or reject issued material within 1 day (SLA).',
        'Material states: In Store, Reserved, Pending Approval, Issued, Pending Acceptance, In Custody, Installed, Returned, Consumed, Lost/Damaged.',
        'Previous custody must be closed before new issuance of same material.',
      ]}
    />
  );
}
