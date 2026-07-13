import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane, Clock, AlertTriangle, CheckCircle2, Package, FileSearch,
  Wrench, TrendingUp, ShieldCheck, PackageCheck, Plus, ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_DUBAI_FOLLOWUPS, MOCK_AFS_ARRIVAL_REPORTS,
  MOCK_AFS_MISSING_ITEMS, MOCK_AFS_PREDELIVERY_REPORTS,
  MOCK_AFS_MAINTENANCE_REQUESTS,
} from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import { useAuth } from '../hooks/useAuth';
import type { DubaiProjectFollowup } from '../types';

interface DashboardKpis {
  missingPn: number;
  activeFollowups: number;
  delayedEta: number;
  pendingArrival: number;
  openMissing: number;
  notReady: number;
  readyForDelivery: number;
  openMaintenance: number;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DubaiAFS() {
  const { role } = useAuth();
  const [kpis, setKpis] = useState<DashboardKpis>({
    missingPn: 0, activeFollowups: 0, delayedEta: 0,
    pendingArrival: 0, openMissing: 0, notReady: 0, readyForDelivery: 0, openMaintenance: 0,
  });
  const [recentFollowups, setRecentFollowups] = useState<DubaiProjectFollowup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const followups = mockOrEmpty(MOCK_DUBAI_FOLLOWUPS);
        const arrivals = mockOrEmpty(MOCK_AFS_ARRIVAL_REPORTS);
        const missing = mockOrEmpty(MOCK_AFS_MISSING_ITEMS);
        const predelivery = mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS);
        const maintenance = mockOrEmpty(MOCK_AFS_MAINTENANCE_REQUESTS);
        setKpis({
          missingPn: followups.filter(f => !f.pn_reference_id).length,
          activeFollowups: followups.filter(f => !['completed', 'cancelled'].includes(f.dubai_status)).length,
          delayedEta: followups.filter(f => f.eta_status === 'delayed').length,
          pendingArrival: arrivals.filter(r => r.arrival_status === 'pending').length,
          openMissing: missing.filter(i => ['open', 'requested'].includes(i.missing_item_status)).length,
          notReady: predelivery.filter(r => !r.ready_for_delivery).length,
          readyForDelivery: predelivery.filter(r => r.ready_for_delivery).length,
          openMaintenance: maintenance.filter(m => !['completed', 'closed', 'cancelled'].includes(m.maintenance_status)).length,
        });
        setRecentFollowups(followups.slice(0, 5));
        setLoading(false);
        return;
      }
      const [missingPn, active, delayed, pendingArr, openMiss, notReady, ready, openMaint, recent] = await Promise.all([
        supabase.from('dubai_project_followups').select('*', { count: 'exact', head: true }).is('pn_reference_id', null),
        supabase.from('dubai_project_followups').select('*', { count: 'exact', head: true }).not('dubai_status', 'in', '("completed","cancelled")'),
        supabase.from('dubai_project_followups').select('*', { count: 'exact', head: true }).eq('eta_status', 'delayed'),
        supabase.from('afs_arrival_reports').select('*', { count: 'exact', head: true }).eq('arrival_status', 'pending'),
        supabase.from('afs_missing_items').select('*', { count: 'exact', head: true }).in('missing_item_status', ['open', 'requested']),
        supabase.from('afs_predelivery_reports').select('*', { count: 'exact', head: true }).eq('ready_for_delivery', false),
        supabase.from('afs_predelivery_reports').select('*', { count: 'exact', head: true }).eq('ready_for_delivery', true),
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true }).not('maintenance_status', 'in', '("completed","closed","cancelled")'),
        supabase.from('dubai_project_followups')
          .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
          .not('dubai_status', 'in', '("completed","cancelled")')
          .order('updated_at', { ascending: false })
          .limit(5),
      ]);
      setKpis({
        missingPn: missingPn.count ?? 0,
        activeFollowups: active.count ?? 0,
        delayedEta: delayed.count ?? 0,
        pendingArrival: pendingArr.count ?? 0,
        openMissing: openMiss.count ?? 0,
        notReady: notReady.count ?? 0,
        readyForDelivery: ready.count ?? 0,
        openMaintenance: openMaint.count ?? 0,
      });
      setRecentFollowups((recent.data as unknown as DubaiProjectFollowup[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AFS Dashboard"
        subtitle="Manage PN readiness, Dubai follow-ups, ETA updates, vehicle arrivals, missing items, pre-delivery readiness, and after-sales requests."
        actions={
          <div className="flex items-center gap-2">
            {role && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_MATRIX.afs_user.badgeClass}`}>
                AFS User
              </span>
            )}
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {/* Top actions */}
      <div className="flex flex-wrap gap-2">
        <Link to="/dubai-afs/eta"><Button variant="secondary" size="sm"><Clock size={13} className="mr-1" /> Update Dubai ETA</Button></Link>
        <Link to="/dubai-afs/arrival-reports"><Button variant="secondary" size="sm"><Plane size={13} className="mr-1" /> Register Arrival</Button></Link>
        <Link to="/dubai-afs/missing-items"><Button variant="secondary" size="sm"><Package size={13} className="mr-1" /> Add Missing Item</Button></Link>
        <Link to="/dubai-afs/predelivery-reports"><Button variant="secondary" size="sm"><FileSearch size={13} className="mr-1" /> Pre-Delivery Check</Button></Link>
        <Link to="/after-sales/maintenance/new"><Button variant="primary" size="sm"><Plus size={13} className="mr-1" /> New Maintenance Request</Button></Link>
      </div>

      {/* Critical alerts */}
      {kpis.missingPn > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="shrink-0 text-red-500" />
            <span><strong>{kpis.missingPn}</strong> Dubai project{kpis.missingPn !== 1 ? 's' : ''} missing PN — Dubai follow-up and pre-delivery readiness require PN.</span>
          </div>
          <Link to="/afs/pn-gate"><Button variant="secondary" size="sm">View PN Gate</Button></Link>
        </div>
      )}

      {/* ── Zone A: Dubai / Pre-Delivery ─── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Dubai / Pre-Delivery Execution</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Missing PN', value: kpis.missingPn, icon: <ShieldCheck size={16} className="text-red-500" />, to: '/afs/pn-gate', variant: kpis.missingPn > 0 ? 'border-l-red-500' : 'border-l-gray-200' },
            { label: 'Active Follow-ups', value: kpis.activeFollowups, icon: <TrendingUp size={16} className="text-sky-500" />, to: '/dubai-afs/projects', variant: 'border-l-sky-400' },
            { label: 'Delayed ETAs', value: kpis.delayedEta, icon: <Clock size={16} className="text-amber-500" />, to: '/dubai-afs/eta', variant: kpis.delayedEta > 0 ? 'border-l-amber-400' : 'border-l-gray-200' },
            { label: 'Pending Arrival', value: kpis.pendingArrival, icon: <Plane size={16} className="text-sky-500" />, to: '/dubai-afs/arrival-reports', variant: 'border-l-sky-400' },
            { label: 'Open Missing Items', value: kpis.openMissing, icon: <AlertTriangle size={16} className="text-red-500" />, to: '/dubai-afs/missing-items', variant: kpis.openMissing > 0 ? 'border-l-red-500' : 'border-l-green-400' },
            { label: 'Not Ready for Delivery', value: kpis.notReady, icon: <FileSearch size={16} className="text-orange-500" />, to: '/dubai-afs/predelivery-reports', variant: kpis.notReady > 0 ? 'border-l-orange-400' : 'border-l-green-400' },
            { label: 'Ready for Delivery', value: kpis.readyForDelivery, icon: <PackageCheck size={16} className="text-green-500" />, to: '/afs/ready-for-delivery', variant: kpis.readyForDelivery > 0 ? 'border-l-green-500' : 'border-l-gray-200' },
            { label: 'Open Maintenance', value: kpis.openMaintenance, icon: <Wrench size={16} className="text-purple-500" />, to: '/after-sales/maintenance', variant: kpis.openMaintenance > 0 ? 'border-l-purple-400' : 'border-l-gray-200' },
          ].map(k => (
            <Link key={k.label} to={k.to}>
              <div className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 hover:shadow-md transition-shadow ${k.variant}`}>
                <div className="text-gray-400 mb-2">{k.icon}</div>
                <div className={`text-2xl font-bold ${loading ? 'text-gray-300' : 'text-gray-900'}`}>{loading ? '—' : k.value}</div>
                <div className="text-sm font-medium text-gray-700 mt-0.5">{k.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Work queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Active Follow-ups */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp size={14} className="text-sky-500" /> Dubai Follow-ups
            </h3>
            <Link to="/dubai-afs/projects"><Button variant="ghost" size="sm">View All <ChevronRight size={13} /></Button></Link>
          </div>
          {recentFollowups.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-400 text-center">No active follow-ups.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentFollowups.map(f => (
                <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-medium text-sky-700">{f.project?.project_code ?? '—'}</span>
                      {!f.pn_reference_id && <Badge variant="critical">No PN</Badge>}
                      <Badge variant={f.eta_status === 'delayed' ? 'warning' : f.eta_status === 'on_track' ? 'success' : 'neutral'}>
                        {f.eta_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{f.project?.customer_name} · {f.vehicle_line?.vehicle_type ?? 'Project-wide'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">{formatDate(f.eta_date)}</div>
                    <Link to={`/dubai-afs/projects/${f.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Zone B: After Sales ─── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">After Sales Maintenance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Maintenance Requests', to: '/after-sales/maintenance', icon: <Wrench size={14} className="mr-1.5" />, description: 'View and manage all open maintenance requests' },
            { label: 'New Request', to: '/after-sales/maintenance/new', icon: <Plus size={14} className="mr-1.5" />, description: 'Log a new after-sales maintenance request' },
            { label: 'AFS Reports', to: '/reports/afs', icon: <CheckCircle2 size={14} className="mr-1.5" />, description: 'ETA delays, arrivals, missing items, maintenance' },
          ].map(t => (
            <Link key={t.label} to={t.to}>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-sky-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-1">{t.icon}{t.label}</div>
                <p className="text-xs text-gray-500">{t.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
