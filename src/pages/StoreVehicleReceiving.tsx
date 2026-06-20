import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Plus, Search, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_VEHICLE_RECEIPTS, MOCK_VEHICLE_PHOTOS } from '../data/mockStore';
import type { VehicleReceipt, VehicleReceiptStatus, PhotoType, UserRole } from '../types';

const REQUIRED_PHOTOS: PhotoType[] = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];

const STATUS_TABS: { key: 'all' | VehicleReceiptStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'received', label: 'Received' },
  { key: 'pending_condition_review', label: 'Under Review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'damaged', label: 'Damaged' },
];

const STATUS_VARIANT: Record<VehicleReceiptStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  draft: 'neutral',
  received: 'info',
  pending_condition_review: 'warning',
  accepted: 'success',
  damaged: 'critical',
  assigned_to_production: 'default',
  assigned_to_afs: 'default',
  closed: 'neutral',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function nextAction(status: VehicleReceiptStatus, photosComplete: boolean): string {
  if (!photosComplete) return 'Upload required photos';
  switch (status) {
    case 'draft': return 'Mark as Received';
    case 'received': return 'Review Condition';
    case 'pending_condition_review': return 'Accept or Flag';
    case 'accepted': return 'Assign to Project';
    case 'damaged': return 'Log Damage Report';
    case 'closed': return '—';
    default: return '—';
  }
}

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

interface LiveVehicle extends VehicleReceipt {
  photo_count: number;
  photos_complete: boolean;
}

export function StoreVehicleReceiving() {
  const { role } = useAuth();
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'all' | VehicleReceiptStatus>('all');
  const [missingPhotosOnly, setMissingPhotosOnly] = useState(false);
  const [search, setSearch] = useState('');

  const canCreate = role ? CAN_CREATE.includes(role as UserRole) : false;

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('vehicle_receipts')
          .select('*, project:projects(project_code, so_number, customer_name)')
          .order('received_date', { ascending: false })
          .limit(200);

        if (data) {
          // Fetch photo summaries separately (join not in generated schema types)
          const { data: photoRows } = await supabase
            .from('vehicle_receipt_photos')
            .select('vehicle_receipt_id, photo_type, storage_path');

          const photosByVehicle: Record<string, { photo_type: string; storage_path: string | null }[]> = {};
          for (const p of (photoRows ?? []) as { vehicle_receipt_id: string; photo_type: string; storage_path: string | null }[]) {
            if (!photosByVehicle[p.vehicle_receipt_id]) photosByVehicle[p.vehicle_receipt_id] = [];
            photosByVehicle[p.vehicle_receipt_id].push(p);
          }

          const mapped: LiveVehicle[] = (data as unknown as VehicleReceipt[]).map(v => {
            const vPhotos = photosByVehicle[v.id] ?? [];
            const uploaded = vPhotos.filter(p => REQUIRED_PHOTOS.includes(p.photo_type as PhotoType) && p.storage_path).length;
            return { ...v, photo_count: uploaded, photos_complete: uploaded >= REQUIRED_PHOTOS.length };
          });
          setVehicles(mapped);
        }
      } else {
        const mock: LiveVehicle[] = mockOrEmpty(MOCK_VEHICLE_RECEIPTS).map(v => {
          const photos = MOCK_VEHICLE_PHOTOS[v.id] ?? [];
          const uploaded = photos.filter(p => REQUIRED_PHOTOS.includes(p.photo_type) && p.storage_path).length;
          return { ...v, photo_count: uploaded, photos_complete: uploaded >= REQUIRED_PHOTOS.length };
        });
        setVehicles(mock);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = vehicles;
    if (statusTab !== 'all') list = list.filter(v => v.status === statusTab);
    if (missingPhotosOnly) list = list.filter(v => !v.photos_complete);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.chassis_number.toLowerCase().includes(q) ||
        v.vehicle_type.toLowerCase().includes(q) ||
        (v.project?.project_code ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, statusTab, missingPhotosOnly, search]);

  const missingCount = vehicles.filter(v => !v.photos_complete).length;
  const damagedCount = vehicles.filter(v => v.status === 'damaged').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vehicle Receiving"
        subtitle="Register incoming vehicles — chassis number and required photos mandatory"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'Vehicle Receiving' }]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            {canCreate && (
              <Link to="/store/vehicle-receiving/new">
                <Button variant="primary" size="sm">
                  <Plus size={14} className="mr-1" /> New Vehicle
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {missingCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            <strong>{missingCount}</strong> vehicle{missingCount !== 1 ? 's' : ''} missing required photos —
            vehicles cannot be accepted until all 5 photos are uploaded.
          </span>
        </div>
      )}

      {damagedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-amber-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            <strong>{damagedCount}</strong> damaged vehicle{damagedCount !== 1 ? 's' : ''} — log damage reports before proceeding.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Status tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                statusTab === t.key
                  ? 'text-cyan-700 border-cyan-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chassis #, vehicle type, project…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 w-56"
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={missingPhotosOnly}
              onChange={e => setMissingPhotosOnly(e.target.checked)}
            />
            Missing photos only
          </label>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading vehicles…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Truck size={24} className="text-gray-400" />}
              title={vehicles.length === 0 ? 'No vehicles received yet' : 'No vehicles match filters'}
              description={
                vehicles.length === 0
                  ? 'Register an incoming vehicle to begin tracking. Chassis number is required.'
                  : 'Adjust status filter or clear search to see more.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Chassis #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Received</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Photos</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Next Action</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono font-medium text-cyan-700">{v.chassis_number}</p>
                      {v.condition_status && v.condition_status !== 'good' && (
                        <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">
                          {v.condition_status.replace(/_/g, ' ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.vehicle_type}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {v.project ? (
                        <span className="text-xs font-mono text-gray-700">{v.project.project_code}</span>
                      ) : (
                        <span className="text-xs text-amber-600 italic">Unallocated</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                      {formatDate(v.received_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        v.photos_complete ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {v.photos_complete
                          ? <><CheckCircle size={11} /> Complete</>
                          : <><AlertCircle size={11} /> {v.photo_count}/{REQUIRED_PHOTOS.length}</>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[v.status] ?? 'neutral'}>
                        {v.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className={`text-xs font-medium ${
                        !v.photos_complete || v.status === 'pending_condition_review'
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      }`}>
                        {nextAction(v.status, v.photos_complete)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/store/vehicle-receiving/${v.id}`}>
                        <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Required photos legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-600">
        <span className="font-medium text-gray-700">Required photos (5): </span>
        {REQUIRED_PHOTOS.map(p => p.replace(/_/g, ' ')).join(' · ')}
        {' '}— photos must be uploaded to storage before a vehicle can be accepted.
      </div>
    </div>
  );
}
