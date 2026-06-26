import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Clock, AlertTriangle, CheckCircle, Plus, Package } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_MAINTENANCE_REQUESTS } from '../data/mockAfs';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { AfsMaintenanceRequest, UserRole } from '../types';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'sales_user', 'afs_user'];

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

function KpiCard({ icon, label, value, to, variant }: {
  icon: React.ReactNode; label: string; value: number | string; to: string;
  variant?: 'warning' | 'critical' | 'success' | 'default';
}) {
  const border = variant === 'critical' ? 'border-red-200' : variant === 'warning' ? 'border-amber-200' : variant === 'success' ? 'border-green-200' : 'border-gray-100';
  const bg = variant === 'critical' ? 'bg-red-50' : variant === 'warning' ? 'bg-amber-50' : variant === 'success' ? 'bg-green-50' : 'bg-white';
  const text = variant === 'critical' ? 'text-red-700' : variant === 'warning' ? 'text-amber-700' : variant === 'success' ? 'text-green-700' : 'text-gray-900';
  return (
    <Link to={to}>
      <Card className={`p-5 hover:shadow-md transition-shadow cursor-pointer border ${border} ${bg}`}>
        <div className={`p-2 rounded-lg mb-2 w-fit ${variant === 'critical' ? 'bg-red-100' : variant === 'warning' ? 'bg-amber-100' : variant === 'success' ? 'bg-green-100' : 'bg-gray-100'}`}>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${text}`}>{value}</div>
        <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
      </Card>
    </Link>
  );
}

interface KpiData {
  open: number;
  inProgress: number;
  partsWaiting: number;
  critical: number;
  completed: number;
  total: number;
  recentRequests: AfsMaintenanceRequest[];
}

export function AfterSales() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const requests = MOCK_AFS_MAINTENANCE_REQUESTS;
        setKpi({
          open: requests.filter(r => r.maintenance_status === 'open').length,
          inProgress: requests.filter(r => ['assigned', 'under_inspection', 'in_repair'].includes(r.maintenance_status)).length,
          partsWaiting: requests.filter(r => r.maintenance_status === 'parts_waiting').length,
          critical: requests.filter(r => r.priority === 'critical' && !['completed', 'closed', 'cancelled'].includes(r.maintenance_status)).length,
          completed: requests.filter(r => r.maintenance_status === 'completed').length,
          total: requests.length,
          recentRequests: requests.slice(0, 5),
        });
        setLoading(false);
        return;
      }
      const [openRes, inProgRes, partsRes, critRes, completedRes, totalRes, recentRes] = await Promise.all([
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true }).eq('maintenance_status', 'open'),
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true }).in('maintenance_status', ['assigned', 'under_inspection', 'in_repair']),
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true }).eq('maintenance_status', 'parts_waiting'),
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true }).eq('priority', 'critical').not('maintenance_status', 'in', '(completed,closed,cancelled)'),
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true }).eq('maintenance_status', 'completed'),
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true }),
        supabase.from('afs_maintenance_requests')
          .select('*, project:projects(project_code, customer_name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      setKpi({
        open: openRes.count ?? 0,
        inProgress: inProgRes.count ?? 0,
        partsWaiting: partsRes.count ?? 0,
        critical: critRes.count ?? 0,
        completed: completedRes.count ?? 0,
        total: totalRes.count ?? 0,
        recentRequests: (recentRes.data as unknown as AfsMaintenanceRequest[]) ?? [],
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  const open = kpi?.open ?? 0;
  const inProgress = kpi?.inProgress ?? 0;
  const partsWaiting = kpi?.partsWaiting ?? 0;
  const critical = kpi?.critical ?? 0;
  const completed = kpi?.completed ?? 0;
  const total = kpi?.total ?? 0;
  const recentRequests = kpi?.recentRequests ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="After Sales Maintenance"
        subtitle="Post-delivery maintenance requests, inspection, repair, and resolution tracking"
        actions={canCreate ? (
          <Link to="/after-sales/maintenance/new">
            <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Request</Button>
          </Link>
        ) : undefined}
      />
      <DataSourceBadge variant="auto" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<AlertTriangle size={18} className="text-red-600" />} label="Open Requests" value={open} to="/after-sales/maintenance?tab=open" variant={open > 0 ? 'critical' : 'default'} />
        <KpiCard icon={<Wrench size={18} className="text-amber-600" />} label="In Progress" value={inProgress} to="/after-sales/maintenance?tab=in_progress" variant={inProgress > 0 ? 'warning' : 'default'} />
        <KpiCard icon={<Package size={18} className="text-orange-600" />} label="Parts Waiting" value={partsWaiting} to="/after-sales/maintenance?tab=in_progress" variant={partsWaiting > 0 ? 'warning' : 'default'} />
        <KpiCard icon={<Clock size={18} className="text-red-600" />} label="Critical Priority" value={critical} to="/after-sales/maintenance?tab=critical" variant={critical > 0 ? 'critical' : 'default'} />
        <KpiCard icon={<CheckCircle size={18} className="text-green-600" />} label="Completed" value={completed} to="/after-sales/maintenance?tab=completed" variant="success" />
        <KpiCard icon={<Wrench size={18} className="text-sky-600" />} label="Total Requests" value={total} to="/after-sales/maintenance?tab=all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Recent Requests</h3>
            <Link to="/after-sales/maintenance" className="text-xs text-sky-600 hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No requests found.</p>
            ) : recentRequests.map(r => (
              <Link key={r.id} to={`/after-sales/maintenance/${r.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-gray-900 truncate block">{r.title}</span>
                  <span className="text-xs text-gray-500">{r.customer_name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge>
                  <Badge variant={statusVariant(r.maintenance_status)}>{r.maintenance_status.replace(/_/g, ' ')}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Governance Rules</h3>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>Maintenance request must be linked to the original project (SO) where applicable.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>Link to WO or PN when applicable.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>Resolution notes are required to close a request.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>Requests can be raised by Sales, Operations, or AFS team.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
