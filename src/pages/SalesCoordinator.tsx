import { PlaceholderPage } from './PlaceholderPage';

export function SalesCoordinator() {
  return (
    <PlaceholderPage
      title="Sales Coordinator"
      description="Process quotation requests, record estimation emails, upload PDFs, and return quotations to Sales."
      phase={3}
      module="Sales Coordinator"
      roles={['admin', 'operations_manager', 'sales_coordinator']}
      features={[
        'Coordinator Dashboard',
        'Pending Estimation Queue',
        'Record Sent to Estimation Date',
        'Upload Quotation PDF',
        'Enter Quotation Number',
        'Enter Quotation Value per Line',
        'Enter Validity Date',
        'Request Clarification from Sales',
        'Returned Quotations',
        'Quotation History',
      ]}
      governanceNotes={[
        'Estimation Team is outside the system. Coordinator logs the email action.',
        'Cannot return quotation to Sales without PDF and quotation number.',
        'Coordinator can request clarification — request returns to Sales.',
        'Only Admin can delete a quotation request.',
      ]}
    />
  );
}
