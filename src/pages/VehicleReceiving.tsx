import { PlaceholderPage } from './PlaceholderPage';

export function VehicleReceiving() {
  return (
    <PlaceholderPage
      title="Vehicle Receiving"
      description="Register incoming vehicles. Mandatory: chassis number, condition assessment, and photo documentation."
      phase={7}
      module="Vehicle Receiving"
      roles={['admin', 'operations_manager', 'store_user']}
      features={[
        'Link Vehicle to Project / Vehicle Line',
        'Chassis Number Entry',
        'Received Date & By',
        'Condition Assessment',
        'Photo Upload (Front, Rear, Left, Right, Chassis Plate, Damage)',
        'Receiving Report Generation',
        'Incomplete Receipt Alerts',
      ]}
      governanceNotes={[
        'Vehicle receipt is NOT complete without chassis number and essential photos.',
        'Damage must be documented with photos if present.',
        'Chassis number is the mandatory vehicle reference for all downstream tracking.',
        'Vehicle receiving records appear in Project Timeline.',
      ]}
    />
  );
}
