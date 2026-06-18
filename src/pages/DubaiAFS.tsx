import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Clock, AlertTriangle, CheckCircle, Package, FileSearch, Wrench, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_DUBAI_FOLLOWUPS, MOCK_AFS_ARRIVAL_REPORTS, MOCK_AFS_MISSING_ITEMS, MOCK_AFS_PREDELIVERY_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { DubaiProjectFollowup } from '../types';

function KpiCard({ icon, label, value, sub, to, variant }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; to: string; variant?: 'warning' | 'critical' | 'success' | 'default';
}) {
  const border = variant === 'critical' ? 'border-red-200' : variant === 'warning' ? 'border-amber-200' : variant === 'success' ? 'border-green-200' : 'border-gray-100';
  const bg = variant === 'critical' ? 'bg-red-50' : variant === 'warning' ? 'bg-amber-50' : variant === 'success' ? 'bg-green-50' : 'bg-white';
  const text = variant === 'critical' ? 'text-red-700' : variant === 'warning' ? 'text-amber-700' : variant === 'success' ? 'text-green-700' : 'text-gray-900';
  return (
    <Link to={to}>
      <Card className={`p-5 hover:shadow-md transition-shadow cursor-pointer border ${border} ${bg}`}>
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg ${variant === 'critical' ? 'bg-red-100' : variant === 'warning' ? 'bg-amber-100' : variant === 'success' ? 'bg-green-100' : 'bg-gray-100'}`}>
            {icon}
          </div>
        </div>
        <div className={`text-2xl font-bold ${text}`}>{value}</div>
        <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </Card>
    </Link>
  );
}

interface DashboardKpis {
  activeFollowups: number;
  delayedEta: number;
  pendingArrival: number;
  openMissing: number;
  notReadyPredelivery: number;
  readyForDelivery: number;
  totalArrivals: number;
  conditionReports: number;
}

export function DubaiAFS() {
  const [kpis, setKpis] = useState<DashboardKpis>({
    activeFollowups: 0, delayedEta: 0, pendingArrival: 0, openMissing: 0,
    notReadyPredelivery: 0, readyForDelivery: 0, totalArrivals: 0, conditionReports: 0,
  });
  const [recentFollowups, setRecentFollowups] = useState<DubaiProjectFollowup[]>([]);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const followups = mockOrEmpty(MOCK_DUBAI_FOLLOWUPS);
        const arrivalReports = mockOrEmpty(MOCK_AFS_ARRIVAL_REPORTS);
        const missingItems = mockOrEmpty(MOCK_AFS_MISSING_ITEMS);
        const predeliveryReports = mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS);
        setKpis({
          activeFollowups: followups.filter(f => !['completed', 'cancelled'].includes(f.dubai_status)).length,
          delayedEta: followups.filter(f => f.eta_status === 'delayed').length,
          pendingArrival: arrivalReports.filter(r => r.arrival_status === 'pending').length,
          openMissing: missingItems.filter(i => i.missing_item_status === 'open' || i.missing_item_status === 'requested').length,
          notReadyPredelivery: predeliveryReports.filter(r => !r.ready_for_delivery).length,
          readyForDelivery: predeliveryReports.filter(r => r.ready_for_delivery).length,
          totalArrivals: arrivalReports.length,
          conditionReports: 0,
        });
        setRecentFollowups(followups.slice(0, 3));
        return;
      }
      const [active, delayed, pendingArr, openMiss, notReady, ready, totalArr, condRep, recent] = await Promise.all([
        supabase.from('dubai_project_followups').select('*', { count: 'exact', head: true }).not('dubai_status', 'in', '("completed","cancelled")'),
        supabase.from('dubai_project_followups').select('*', { count: 'exact', head: true }).eq('eta_status', 'delayed'),
        supabase.from('afs_arrival_reports').select('*', { count: 'exact', head: true }).eq('arrival_status', 'pending'),
        supabase.from('afs_missing_items').select('*', { count: 'exact', head: true }).in('missing_item_status', ['open', 'requested']),
        supabase.from('afs_predelivery_reports').select('*', { count: 'exact', head: true }).eq('ready_for_delivery', false),
        supabase.from('afs_predelivery_reports').select('*', { count: 'exact', head: true }).eq('ready_for_delivery', true),
        supabase.from('afs_arrival_reports').select('*', { count: 'exact', head: true }),
        supabase.from('afs_condition_reports').select('*', { count: 'exact', head: true }),
        supabase.from('dubai_project_followups')
          .select('*, project:projects(project_code, customer_name, manufacturing_location)')
          .not('dubai_status', 'in', '("completed","cancelled")')
          .order('updated_at', { ascending: false })
          .limit(3),
      ]);
      setKpis({
        activeFollowups: active.count ?? 0,
        delayedEta: delayed.count ?? 0,
        pendingArrival: pendingArr.count ?? 0,
        openMissing: openMiss.count ?? 0,
        notReadyPredelivery: notReady.count ?? 0,
        readyForDelivery: ready.count ?? 0,
        totalArrivals: totalArr.count ?? 0,
        conditionReports: condRep.count ?? 0,
      });
      setRecentFollowups((recent.data as unknown as DubaiProjectFollowup[]) ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Dubai / AFS" subtitle="Dubai project follow-up, AFS arrival, pre-delivery and condition tracking" />
      <DataSourceBadge variant="auto" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp size={18} className="text-sky-600" />} label="Active Follow-ups" value={kpis.activeFollowups} to="/dubai-afs/projects" />
        <KpiCard icon={<Clock size={18} className="text-amber-600" />} label="Delayed ETAs" value={kpis.delayedEta} sub="ETA behind schedule" to="/dubai-afs/eta" variant={kpis.delayedEta > 0 ? 'warning' : 'default'} />
        <KpiCard icon={<Plane size={18} className="text-sky-600" />} label="Pending Arrival" value={kpis.pendingArrival} sub="Vehicles not yet arrived" to="/dubai-afs/arrival-reports" />
        <KpiCard icon={<AlertTriangle size={18} className="text-red-600" />} label="Open Missing Items" value={kpis.openMissing} sub="Blocking pre-delivery" to="/dubai-afs/missing-items" variant={kpis.openMissing > 0 ? 'critical' : 'default'} />
        <KpiCard icon={<FileSearch size={18} className="text-orange-600" />} label="Not Ready for Delivery" value={kpis.notReadyPredelivery} to="/dubai-afs/predelivery-reports" variant={kpis.notReadyPredelivery > 0 ? 'warning' : 'default'} />
        <KpiCard icon={<CheckCircle size={18} className="text-green-600" />} label="Ready for Delivery" value={kpis.readyForDelivery} to="/dubai-afs/predelivery-reports" variant={kpis.readyForDelivery > 0 ? 'success' : 'default'} />
        <KpiCard icon={<Package size={18} className="text-gray-600" />} label="Total Arrivals" value={kpis.totalArrivals} to="/dubai-afs/arrival-reports" />
        <KpiCard icon={<Wrench size={18} className="text-purple-600" />} label="Condition Reports" value={kpis.conditionReports} to="/dubai-afs/condition-reports" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dubai Follow-ups</h3>
          <div className="space-y-2">
            {recentFollowups.map(f => (
              <Link key={f.id} to={`/dubai-afs/projects/${f.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{f.project?.project_code}</span>
                  <span className="text-gray-500 ml-2">{f.vehicle_line?.vehicle_type ?? 'Project-wide'}</span>
                </div>
                <Badge variant={f.eta_status === 'delayed' ? 'warning' : f.eta_status === 'on_track' ? 'success' : 'neutral'}>
                  {f.eta_status.replace(/_/g, ' ')}
                </Badge>
              </Link>
            ))}
            <Link to="/dubai-afs/projects" className="text-xs text-sky-600 hover:underline block text-right">View all →</Link>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Governance Rules</h3>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>PN is mandatory before any Dubai tracking can begin.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>Dubai projects do not go through Saudi factory workflow.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>ETA change requires a documented reason.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>Open missing items block pre-delivery readiness.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 mt-0.5">▸</span>Release Note is required before vehicle is ready for delivery.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
