import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Wrench, Plus, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_MAINTENANCE_REQUESTS } from '../data/mockAfs';
import type { AfsMaintenanceRequest, MaintenanceStatus, UserRole } from '../types';

// Mirrors the afs_maintenance_requests write RLS (migration 047) and the
// /after-sales/maintenance/new route guard. sales_user is read-only here.
const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'afs_user'];

type Tab = 'open' | 'critical' | 'in_progress' | 'completed' | 'closed' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'critical', label: 'Critical' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Closed / Cancelled' },
  { key: 'all', label: 'All' },
];

const IN_PROGRESS_STATUSES: MaintenanceStatus[] = ['assigned', 'under_inspection', 'parts_waiting', 'in_repair'];
const CLOSED_STATUSES: MaintenanceStatus[] = ['closed', 'cancelled'];

function priorityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function statusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open' || s === 'assigned') return 'critical';
  if (s === 'under_inspection' || s === 'parts_waiting' || s === 'in_repair') return 'warning';
  if (s === 'completed' || s === 'closed') return 'success';
  return 'neutral';
}

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function nextAction(r: AfsMaintenanceRequest): string {
  if (r.maintenance_status === 'open') return 'Assign to technician';
  if (r.maintenance_status === 'assigned') return 'Begin inspection';
  if (r.maintenance_status === 'under_inspection') return 'Complete inspection report';
  if (r.maintenance_status === 'parts_waiting') return 'Confirm parts receipt';
  if (r.maintenance_status === 'in_repair') return 'Complete repair & close';
  if (r.maintenance_status === 'completed') return 'Close request';
  return '—';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AfterSalesMaintenance() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const [searchParams] = useSearchParams();

  // Deep-link support: After Sales dashboard KPI cards link here with ?tab=<key>
  const urlTab = searchParams.get('tab');
  const initialTab: Tab =
    urlTab && TABS.some((t) => t.key === urlTab) ? (urlTab as Tab) : 'open';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [allRequests, setAllRequests] = useState<AfsMaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setAllRequests(MOCK_AFS_MAINTENANCE_REQUESTS);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_maintenance_requests')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
        .order('created_at', { ascending: false });
      setAllRequests((data as unknown as AfsMaintenanceRequest[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const tabCounts: Record<Tab, number> = {
    open: allRequests.filter(r => r.maintenance_status === 'open').length,
    critical: allRequests.filter(r => r.priority === 'critical' && !CLOSED_STATUSES.includes(r.maintenance_status) && r.maintenance_status !== 'completed').length,
    in_progress: allRequests.filter(r => IN_PROGRESS_STATUSES.includes(r.maintenance_status)).length,
    completed: allRequests.filter(r => r.maintenance_status === 'completed').length,
    closed: allRequests.filter(r => CLOSED_STATUSES.includes(r.maintenance_status)).length,
    all: allRequests.length,
  };

  const requests = allRequests.filter(r => {
    if (tab === 'open') return r.maintenance_status === 'open';
    if (tab === 'critical') return r.priority === 'critical' && !CLOSED_STATUSES.includes(r.maintenance_status) && r.maintenance_status !== 'completed';
    if (tab === 'in_progress') return IN_PROGRESS_STATUSES.includes(r.maintenance_status);
    if (tab === 'completed') return r.maintenance_status === 'completed';
    if (tab === 'closed') return CLOSED_STATUSES.includes(r.maintenance_status);
    return true;
  });

  const criticalOpen = allRequests.filter(r => r.priority === 'critical' && r.maintenance_status === 'open').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance Requests"
        subtitle="After-sales maintenance and repair tracking. All requests must be linked to a delivered project and vehicle."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'Maintenance Requests' }]}
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <Link to="/after-sales/maintenance/new">
                <Button variant="primary" size="sm"><Plus size={13} className="mr-1" /> New Request</Button>
              </Link>
            )}
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {!loading && criticalOpen > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <span><strong>{criticalOpen}</strong> critical maintenance request{criticalOpen !== 1 ? 's' : ''} open — immediate action required.</span>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {!loading && tabCounts[t.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === t.key ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No maintenance requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Request</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Chassis</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Days Open</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Next Action</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Reported</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => {
                  const days = daysOpen(r.reported_date);
                  const isActive = !CLOSED_STATUSES.includes(r.maintenance_status) && r.maintenance_status !== 'completed';
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 ${r.priority === 'critical' && isActive ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Wrench size={13} className="text-purple-400 shrink-0" />
                          <span className="font-mono text-xs text-sky-700 font-semibold">{r.maintenance_request_number}</span>
                        </div>
                        <div className="text-xs text-gray-700 mt-0.5 ml-5 truncate max-w-[160px]">{r.title}</div>
                        {r.project?.project_code && (
                          <div className="text-xs text-gray-400 mt-0.5 ml-5 font-mono">{r.project.project_code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-700">{r.customer_name}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-gray-600">{r.chassis_number ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge>
                        {r.parts_required && (
                          <div className="mt-0.5"><Badge variant="warning">Parts</Badge></div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(r.maintenance_status)}>
                          {r.maintenance_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {isActive ? (
                          <span className={`text-xs font-medium ${days > 30 ? 'text-red-600' : days > 14 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {days}d
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600">{nextAction(r)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(r.reported_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/after-sales/maintenance/${r.id}`}>
                          <Button variant="ghost" size="sm">
                            View <ChevronRight size={12} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
