import { PlaceholderPage } from './PlaceholderPage';

export function Reports() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Generate operational reports from real workflow data across all modules. No manual data duplication."
      phase={10}
      module="Reports & KPIs"
      roles={['admin', 'operations_manager', 'viewer']}
      features={[
        'Quotation Reports (Turnaround, Conversion to SO)',
        'Execution Reference Reports (SO without WO/PN)',
        'Procurement Reports (PR, PO, ETA, Approval Delays)',
        'Store / Custody Reports (Materials, Serials)',
        'Vehicle Receiving Reports (Chassis, Damage)',
        'Raw Material Reports',
        'Supplier Quality Scorecard',
        'QC Reports (NCR, Rework, Release Notes)',
        'SLA Breach Reports',
        'Control Tower Exports',
      ]}
      governanceNotes={[
        'Reports are generated from real workflow data only.',
        'No manual data entry for reporting purposes.',
        'Reports respect role-based financial visibility.',
        'All KPIs derive from live system records.',
      ]}
    />
  );
}
