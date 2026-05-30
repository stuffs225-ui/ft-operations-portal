import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Truck, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { MOCK_VEHICLE_RECEIPTS, getMockVehiclePhotos } from '../data/mockStore';
import type { VehicleReceiptStatus, PhotoType, UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

const REQUIRED_PHOTO_TYPES: PhotoType[] = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];
const ALL_PHOTO_LABELS: Record<PhotoType, string> = {
  front: 'Front', rear: 'Rear', left_side: 'Left Side', right_side: 'Right Side',
  chassis_plate: 'Chassis Plate', damage: 'Damage', other: 'Other',
};

const STATUS_VARIANT: Record<VehicleReceiptStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  draft: 'neutral', received: 'info', pending_condition_review: 'warning',
  accepted: 'success', damaged: 'critical', assigned_to_production: 'default',
  assigned_to_afs: 'default', closed: 'neutral',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CAN_ACT: UserRole[] = ['admin', 'operations_manager', 'store_user'];
const ALL_PHOTO_TYPES: PhotoType[] = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate', 'damage', 'other'];

export function StoreVehicleReceivingDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [devMsg, setDevMsg] = useState('');
  const [addPhotoType, setAddPhotoType] = useState<PhotoType>('front');
  const [addPhotoFile, setAddPhotoFile] = useState('');
  const [showPhotoForm, setShowPhotoForm] = useState(false);

  const vehicle = MOCK_VEHICLE_RECEIPTS.find(v => v.id === id);
  const photos = id ? getMockVehiclePhotos(id) : [];
  const uploadedRequired = photos.filter(p => REQUIRED_PHOTO_TYPES.includes(p.photo_type)).length;
  const allRequiredUploaded = uploadedRequired >= REQUIRED_PHOTO_TYPES.length;
  const canAct = role ? CAN_ACT.includes(role) : false;

  if (!vehicle) {
    return (
      <div className="space-y-5">
        <PageHeader title="Vehicle Receipt Not Found" />
        <EmptyState
          icon={<Truck size={24} className="text-gray-400" />}
          title="Vehicle receipt not found"
          description="This vehicle receipt does not exist."
        />
        <Link to="/store/vehicle-receiving" className="text-sm text-sky-600 hover:underline">← Back</Link>
      </div>
    );
  }

  function handleAction(action: string) {
    if (!isSupabaseConfigured) {
      setDevMsg(`Dev Mode — "${action}" recorded (not persisted).`);
      return;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={vehicle.chassis_number}
        subtitle={`${vehicle.vehicle_type} — ${vehicle.project?.customer_name ?? 'Unallocated'}`}
        action={
          <Link to="/store/vehicle-receiving">
            <Button variant="ghost" size="sm"><ArrowLeft size={14} className="mr-1" /> Back</Button>
          </Link>
        }
      />

      {devMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">{devMsg}</div>
      )}

      {/* Photo completeness banner */}
      <div className={`rounded-xl border px-5 py-3 flex items-center gap-3 ${
        allRequiredUploaded ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        {allRequiredUploaded
          ? <><CheckCircle size={18} className="text-green-600" /><span className="text-sm font-medium text-green-700">Vehicle receipt complete — all required photos uploaded</span></>
          : <><AlertCircle size={18} className="text-red-500" /><span className="text-sm font-medium text-red-700">{REQUIRED_PHOTO_TYPES.length - uploadedRequired} required photo(s) missing — receipt is incomplete</span></>
        }
      </div>

      {/* Details */}
      <Card>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <Badge variant={STATUS_VARIANT[vehicle.status]}>{vehicle.status.replace(/_/g, ' ')}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Condition</p>
            <Badge variant={vehicle.condition_status === 'good' ? 'success' : 'critical'}>{vehicle.condition_status.replace(/_/g, ' ')}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Received Date</p>
            <p className="font-medium">{formatDate(vehicle.received_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Mileage</p>
            <p>{vehicle.mileage != null ? `${vehicle.mileage} km` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Storage Location</p>
            <p>{vehicle.storage_location ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Project</p>
            <p className="font-mono text-xs">{vehicle.project?.project_code ?? 'Unallocated'}</p>
          </div>
          {vehicle.damage_notes && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-gray-500 mb-1">Damage Notes</p>
              <p className="text-sm text-red-700">{vehicle.damage_notes}</p>
            </div>
          )}
        </div>
        {canAct && (
          <div className="px-5 pb-4 flex flex-wrap gap-2">
            {(vehicle.status === 'received' || vehicle.status === 'pending_condition_review') && (
              <Button variant="primary" size="sm" onClick={() => handleAction('Accept Vehicle')}>Accept Vehicle</Button>
            )}
            {vehicle.condition_status !== 'good' && vehicle.status !== 'damaged' && (
              <Button variant="secondary" size="sm" onClick={() => handleAction('Mark as Damaged')}>Mark as Damaged</Button>
            )}
            {vehicle.status === 'accepted' && vehicle.project?.project_code?.startsWith('FT') && (
              <Button variant="secondary" size="sm" onClick={() => handleAction('Assign to Production')}>Assign to Production</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowPhotoForm(!showPhotoForm)}>Add Photo</Button>
          </div>
        )}
      </Card>

      {/* Add photo form */}
      {showPhotoForm && canAct && (
        <Card>
          <div className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Add Photo</h4>
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Photo Type</label>
                <select value={addPhotoType} onChange={e => setAddPhotoType(e.target.value as PhotoType)}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  {ALL_PHOTO_TYPES.map(t => <option key={t} value={t}>{ALL_PHOTO_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">File Name</label>
                <input type="text" value={addPhotoFile} onChange={e => setAddPhotoFile(e.target.value)}
                  placeholder="photo.jpg"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <Button variant="primary" size="sm" onClick={() => handleAction(`Upload ${addPhotoType} photo`)}>
                Save
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Photos grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Photos ({photos.length} uploaded)</h3>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_PHOTO_TYPES.map(type => {
            const photo = photos.find(p => p.photo_type === type);
            const required = REQUIRED_PHOTO_TYPES.includes(type);
            return (
              <div key={type} className={`rounded-lg border p-3 ${
                photo ? 'border-green-200 bg-green-50' : required ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{ALL_PHOTO_LABELS[type]}</span>
                  {photo
                    ? <CheckCircle size={13} className="text-green-500" />
                    : required
                      ? <AlertCircle size={13} className="text-red-400" />
                      : null}
                </div>
                {photo ? (
                  <p className="text-xs text-gray-500 truncate">{photo.file_name}</p>
                ) : (
                  <p className="text-xs text-gray-400">{required ? 'Missing (Required)' : 'Not uploaded'}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
