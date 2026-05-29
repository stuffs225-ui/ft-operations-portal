import { PlaceholderPage } from './PlaceholderPage';

export function Sales() {
  return (
    <PlaceholderPage
      title="Sales Workspace"
      description="Manage quotation requests, hot projects, SO registration, invoicing plans, and aging."
      phase={2}
      module="Sales Operations"
      roles={['admin', 'operations_manager', 'sales_user', 'viewer']}
      features={[
        'Quotation Requests',
        'Hot Projects Management',
        'SO Registration',
        'Invoicing Plan',
        'Aging / Receivables',
        'My Projects View',
      ]}
      governanceNotes={[
        'Sales can only see their own projects and quotation values.',
        'SO registration triggers Admin Approval workflow.',
        'Hot Projects are pre-SO opportunities tracked by Sales.',
      ]}
    />
  );
}
