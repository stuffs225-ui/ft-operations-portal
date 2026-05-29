import { PlaceholderPage } from './PlaceholderPage';

export function AdminApprovals() {
  return (
    <PlaceholderPage
      title="Admin Approvals"
      description="Review and approve SO registrations, high-value PO to Supplier (>10,000 SAR), and temporary custody requests."
      phase={2}
      module="Approval Engine"
      roles={['admin', 'operations_manager']}
      features={[
        'SO Approval Queue',
        'Route Decision (Saudi / Dubai + Medical Yes/No)',
        'High-Value PO Approval (>10,000 SAR)',
        'Temporary Custody Approval',
        'Approval History & Audit',
        'Rejection with Reason',
      ]}
      governanceNotes={[
        'SO approval requires: Customer, PO/Contract, values, delivery date, Saudi/Dubai, Medical Yes/No.',
        'PO to Supplier above 10,000 SAR cannot be sent to supplier without Admin or Ops Manager approval.',
        'Temporary Custody requires Admin or Operations Manager approval.',
        'Approver must enter rejection reason if rejecting.',
      ]}
    />
  );
}
