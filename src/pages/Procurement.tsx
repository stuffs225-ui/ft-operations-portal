import { PlaceholderPage } from './PlaceholderPage';

export function Procurement() {
  return (
    <PlaceholderPage
      title="Procurement"
      description="Manage Purchase Requests (PR), PO to Supplier, ETAs, and approved supplier relationships."
      phase={5}
      module="Procurement & PO Approval"
      roles={['admin', 'operations_manager', 'procurement_user']}
      features={[
        'Purchase Request (PR) Management',
        'PR Items',
        'PO to Supplier Upload',
        'High-Value PO Approval (>10,000 SAR)',
        'ETA Tracking',
        'ETA Change History (Old + New + Reason)',
        'Approved Supplier List',
        'Supplier Status Management',
        'Store Receiving Trigger',
      ]}
      governanceNotes={[
        'PO to Supplier ≤ 10,000 SAR: no extra approval needed.',
        'PO to Supplier > 10,000 SAR: requires Admin or Operations Manager approval before sending.',
        'Cannot consider PO as sent or active if above 10,000 SAR without approval.',
        'ETA changes must log Old ETA, New ETA, and reason.',
        'Use "PO to Supplier" — never use the term "BO".',
      ]}
    />
  );
}
