import { PlaceholderPage } from './PlaceholderPage';

export function Store() {
  return (
    <PlaceholderPage
      title="Store / Warehouse"
      description="Receive materials and vehicles, manage inventory, link items to projects, issue to Production/AFS, and handle temporary custody."
      phase={7}
      module="Store & Warehouse"
      roles={['admin', 'operations_manager', 'store_user']}
      features={[
        'Material Receiving (linked to PR & PO to Supplier)',
        'Vehicle Receiving (Chassis Number + Photos)',
        'Inventory Search (by Item Code, Serial, Project)',
        'Material Issuance to Production / AFS',
        'Temporary Custody (Admin/Ops approval)',
        'Unallocated Materials Management',
        'Send to Material QC',
      ]}
      governanceNotes={[
        'Vehicle receipt is incomplete without chassis number and required photos.',
        'Medical items must be received with serial numbers.',
        'Temporary custody handover requires Admin or Operations Manager approval.',
        'Materials must be linked to PR and PO to Supplier upon receipt.',
      ]}
    />
  );
}
