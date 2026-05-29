import { PlaceholderPage } from './PlaceholderPage';

export function ProjectQC() {
  return (
    <PlaceholderPage
      title="Project / Vehicle QC"
      description="Final vehicle and project quality inspection. Manage findings, rework assignments, and issue Release Notes after all findings are closed."
      phase={8}
      module="QC and Release"
      roles={['admin', 'operations_manager', 'qc_user']}
      features={[
        'Vehicle QC Inspection',
        'QC Checklist per Vehicle Line',
        'Findings Management',
        'Rework Assignment',
        'Rework Closure Tracking',
        'Release Note Issuance',
        'Release Note Approval Timestamp',
        'Project Delivery Readiness Checklist',
      ]}
      governanceNotes={[
        'Vehicle QC starts after Factory (Saudi) or AFS (Dubai) sends item to inspection.',
        'Release Note cannot be issued if any finding has Rework Required status.',
        'Release Note requires all QC findings and rework to be closed first.',
        'Release Note issuance is logged in Timeline and Audit.',
      ]}
    />
  );
}
