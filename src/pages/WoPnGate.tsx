import { PlaceholderPage } from './PlaceholderPage';

export function WoPnGate() {
  return (
    <PlaceholderPage
      title="WO / PN Gate"
      description="Enter Work Order numbers for Saudi projects and Project Numbers for Dubai projects. Gate that unlocks all downstream execution workflows."
      phase={4}
      module="SO-WO/PN Gate"
      roles={['admin', 'operations_manager', 'factory_user']}
      features={[
        'SO Approved — Awaiting WO/PN List',
        'Enter WO Number (Saudi Route)',
        'Enter PN Number (Dubai Route)',
        'Execution Workflow Unlock',
        'WO/PN History',
        'SLA Tracking (2-day escalation)',
      ]}
      governanceNotes={[
        'WO is mandatory before: BOQ, BOM, Drawings, Raw Material Requests, Production Progress, Send to QC.',
        'PN is mandatory before: Dubai ETA, Dubai PO, AFS readiness, vehicle arrival tracking.',
        'System blocks all factory/Dubai actions until the correct execution reference is entered.',
        'If Saudi route selected: Factory/Production enters WO. If Dubai: Production/Operations enters PN.',
      ]}
    />
  );
}
