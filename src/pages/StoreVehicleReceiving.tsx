import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Plus, Search, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_VEHICLE_RECEIPTS, MOCK_VEHICLE_PHOTOS } from '../data/mockStore';
import type { VehicleReceiptStatus, UserRole } from '../types';

const REQUIRED_PHOTOS = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];

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

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

export function StoreVehicleReceiving() {
  const { role } = useAuth();
  const [statusTab, setStatusTab] = useState<'all' | VehicleReceiptStatus>('all');
  const [search, setSearch] = useState('');

  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const filtered = useMemo(() => {
    let list = mockOrEmpty(MOCK_VEHICLE_RECEIPTS);
    if (statusTab !== 'all') list = list.filter(v => v.status === statusTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.chassis_number.toLowerCase().includes(q) ||
        v.vehicle_type.toLowerCase().includes(q) ||
        (v.project?.project_code ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [statusTab, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vehicle Receiving"
        subtitle="Register incoming vehicles — chassis number and required photos mandatory"
        action={
          canCreate ? (
            <Link to="/store/vehicle-receiving/new">
              <Button variant="primary" size="sm">
                <Plus size={14} className="mr-1" /> New Vehicle Receipt
              </Button>
            </Link>
          ) : undefined
        }
      />

      <DataSourceBadge variant="preview" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                statusTab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chassis #, vehicle type, project…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 w-full"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Truck size={24} className="text-gray-400" />}
              title="No vehicle receipts found"
              description="Register an incoming vehicle to begin tracking."
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
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => {
                  const photos = MOCK_VEHICLE_PHOTOS[v.id] ?? [];
                  const uploadedRequired = photos.filter(p => REQUIRED_PHOTOS.includes(p.photo_type)).length;
                  const complete = uploadedRequired >= REQUIRED_PHOTOS.length;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{v.chassis_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{v.vehicle_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {v.project ? (
                          <span className="font-mono text-xs">{v.project.project_code}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unallocated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{formatDate(v.received_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          complete ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {complete
                            ? <><CheckCircle size={11} /> Complete</>
                            : <><AlertCircle size={11} /> {uploadedRequired}/{REQUIRED_PHOTOS.length}</>
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[v.status] ?? 'neutral'}>
                          {v.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/store/vehicle-receiving/${v.id}`}>
                          <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
