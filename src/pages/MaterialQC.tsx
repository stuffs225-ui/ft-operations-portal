import { PlaceholderPage } from './PlaceholderPage';

export function MaterialQC() {
  return (
    <PlaceholderPage
      title="Material QC"
      description="Inspect incoming materials from Store. Accept or reject. Raise NCR for rejected items with root cause and corrective action."
      phase={8}
      module="Quality Control"
      roles={['admin', 'operations_manager', 'qc_user']}
      features={[
        'Material QC Task Queue',
        'Inspection Result (Accept / Reject)',
        'QC Remarks',
        'NCR (Non-Conformance Report) Creation',
        'Root Cause + Corrective Action',
        'Medical Item Serial Number Validation',
        'Supplier QC Rating',
        'QC History per Material',
      ]}
      governanceNotes={[
        'Material QC starts after Store Receipt.',
        'Medical items cannot be accepted or installed without a serial number.',
        'Rejected material creates an NCR with root cause, owner, and corrective action.',
        'QC user has no financial visibility.',
      ]}
    />
  );
}
