import { PlaceholderPage } from './PlaceholderPage';

export function QuotationRequests() {
  return (
    <PlaceholderPage
      title="Quotation Requests"
      description="Manage quotation requests from Sales. Track estimation status, upload quotation PDFs, and convert to SO."
      phase={3}
      module="Quotation Management"
      roles={['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer']}
      features={[
        'Create Quotation Request',
        'Upload Specification Files',
        'Sales Coordinator Processing',
        'Send to Estimation (email log)',
        'Upload Quotation PDF + Number',
        'Quotation Line Values',
        'Convert to Hot Project or SO',
        'Quotation History',
      ]}
      governanceNotes={[
        'Cannot submit quotation without Specification File.',
        'Sales Coordinator must record "Sent to Estimation Date".',
        'Quotation cannot be returned to Sales without PDF and quotation number.',
        'Estimation Team operates outside the system via email.',
      ]}
    />
  );
}
