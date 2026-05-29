import { PlaceholderPage } from './PlaceholderPage';

export function DubaiAFS() {
  return (
    <PlaceholderPage
      title="Dubai / AFS"
      description="Manage Dubai-routed projects. Track PN, PO from Saudi to Dubai, vehicle ETA, arrival reports, pre-delivery checks, and AFS readiness."
      phase={6}
      module="Dubai Projects & AFS"
      roles={['admin', 'operations_manager', 'afs_user']}
      features={[
        'PN Number Entry',
        'PO from Saudi to Dubai',
        'Vehicle ETA per Line',
        'Dubai Project Status',
        'Vehicle Arrival Registration',
        'Arrival Report',
        'Pre-Delivery Report',
        'Missing Items Registration',
        'Material Request from Store',
        'AFS Delivery Readiness',
      ]}
      governanceNotes={[
        'PN is mandatory before any Dubai tracking: ETA, Dubai PO, AFS readiness, vehicle arrival.',
        'Dubai projects do NOT go through the Saudi factory workflow.',
        'AFS registers vehicle arrival and files Arrival + Pre-Delivery reports.',
        'AFS can request materials from Store when needed.',
      ]}
    />
  );
}
