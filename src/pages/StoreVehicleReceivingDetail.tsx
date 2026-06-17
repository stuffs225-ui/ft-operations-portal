import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Truck, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_VEHICLE_RECEIPTS, getMockVehiclePhotos } from '../data/mockStore';
import type { VehicleReceipt, VehicleReceiptPhoto, VehicleReceiptStatus, PhotoType, UserRole } from '../types';

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

  const [vehicle, setVehicle] = useState<VehicleReceipt | null>(null);
  const [photos, setPhotos] = useState<VehicleReceiptPhoto[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [notFound, setNotFound] = useState(!id);

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [devMsg, setDevMsg] = useState('');

  // Only photos with a real storage_path count toward completion (migration 095).
  // Filename-only records (storage_path = null) do not satisfy the acceptance gate.
  const uploadedRequired = photos.filter(
    p => REQUIRED_PHOTO_TYPES.includes(p.photo_type) && p.storage_path != null && p.storage_path !== ''
  ).length;
  const allRequiredUploaded = uploadedRequired >= REQUIRED_PHOTO_TYPES.length;
  const canAct = role ? CAN_ACT.includes(role) : false;

  useEffect(() => {
    if (!id) return;

    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const found = MOCK_VEHICLE_RECEIPTS.find(v => v.id === id);
        if (!found) { setNotFound(true); setLoading(false); return; }
        setVehicle(found);
        setPhotos(getMockVehiclePhotos(id));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vehicle_receipts')
        .select('*, project:projects(project_code, so_number, customer_name)')
        .eq('id', id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setVehicle(data as unknown as VehicleReceipt);

      const { data: photoData } = await supabase
        .from('vehicle_receipt_photos')
        .select('*')
        .eq('vehicle_receipt_id', id);

      setPhotos((photoData as unknown as VehicleReceiptPhoto[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  async function handleAction(action: string) {
    if (!isSupabaseConfigured || !supabase) {
      setDevMsg(`Dev Mode — "${action}" recorded (not persisted).`);
      return;
    }
    if (!vehicle) return;

    let newStatus: VehicleReceiptStatus | null = null;

    if (action === 'Accept Vehicle') {
      // App-layer gate mirrors DB trigger enforce_vehicle_photo_completion() (migration 095).
      // Requires all 5 photo types with a real storage_path — filename-only records do not qualify.
      if (!allRequiredUploaded) {
        setActionError(
          `Vehicle acceptance requires all 5 required photos to be uploaded as real files ` +
          `(front, rear, left side, right side, chassis plate). ` +
          `Photo file upload is not yet implemented — acceptance is blocked until ` +
          `file upload functionality is available and all 5 photos are on file.`,
        );
        return;
      }
      newStatus = 'accepted';
    } else if (action === 'Mark as Damaged') {
      newStatus = 'damaged';
    } else if (action === 'Assign to Production') {
      newStatus = 'assigned_to_production';
    }

    if (!newStatus) return;

    setActing(true);
    setActionError(null);

    try {
      const { error } = await supabase
        .from('vehicle_receipts')
        .update({ status: newStatus })
        .eq('id', vehicle.id);

      if (error) throw error;
      setVehicle(v => v ? { ...v, status: newStatus! } : v);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update vehicle receipt.');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (notFound || !vehicle) {
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
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{actionError}</div>
      )}

      {/* Photo completeness banner */}
      <div className={`rounded-xl border px-5 py-3 flex items-center gap-3 ${
        allRequiredUploaded ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`}>
        {allRequiredUploaded
          ? <><CheckCircle size={18} className="text-green-600" /><span className="text-sm font-medium text-green-700">Vehicle receipt complete — all required photos uploaded</span></>
          : <><AlertCircle size={18} className="text-amber-500" /><span className="text-sm font-medium text-amber-700">Photo file upload not yet implemented — acceptance is blocked until all 5 required photos are uploaded as real files</span></>
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
              <Button variant="primary" size="sm" onClick={() => handleAction('Accept Vehicle')} disabled={acting}>
                {acting ? 'Saving…' : 'Accept Vehicle'}
              </Button>
            )}
            {vehicle.condition_status !== 'good' && vehicle.status !== 'damaged' && (
              <Button variant="secondary" size="sm" onClick={() => handleAction('Mark as Damaged')} disabled={acting}>Mark as Damaged</Button>
            )}
            {vehicle.status === 'accepted' && vehicle.project?.project_code?.startsWith('FT') && (
              <Button variant="secondary" size="sm" onClick={() => handleAction('Assign to Production')} disabled={acting}>Assign to Production</Button>
            )}
          </div>
        )}
      </Card>

      {/* Photos grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Photos ({photos.length} recorded)</h3>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_PHOTO_TYPES.map(type => {
            const photo = photos.find(p => p.photo_type === type);
            const hasRealUpload = photo != null && photo.storage_path != null && photo.storage_path !== '';
            const hasRecord = photo != null;
            const required = REQUIRED_PHOTO_TYPES.includes(type);
            return (
              <div key={type} className={`rounded-lg border p-3 ${
                hasRealUpload ? 'border-green-200 bg-green-50'
                : hasRecord ? 'border-amber-200 bg-amber-50'
                : required ? 'border-red-200 bg-red-50'
                : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{ALL_PHOTO_LABELS[type]}</span>
                  {hasRealUpload
                    ? <CheckCircle size={13} className="text-green-500" />
                    : hasRecord
                      ? <AlertCircle size={13} className="text-amber-400" />
                      : required
                        ? <AlertCircle size={13} className="text-red-400" />
                        : null}
                </div>
                {hasRealUpload ? (
                  <p className="text-xs text-gray-500 truncate">{photo!.file_name}</p>
                ) : hasRecord ? (
                  <p className="text-xs text-amber-600">Filename recorded — upload pending</p>
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
