import { Link } from 'react-router-dom';
import { Plane, Clock, AlertTriangle, CheckCircle, Package, FileSearch, Wrench, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MOCK_DUBAI_FOLLOWUPS, MOCK_AFS_ARRIVAL_REPORTS, MOCK_AFS_MISSING_ITEMS, MOCK_AFS_PREDELIVERY_REPORTS } from '../data/mockAfs';

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

export function DubaiAFS() {
  const followups = MOCK_DUBAI_FOLLOWUPS;
  const arrivalReports = MOCK_AFS_ARRIVAL_REPORTS;
  const missingItems = MOCK_AFS_MISSING_ITEMS;
  const predeliveryReports = MOCK_AFS_PREDELIVERY_REPORTS;

  const activeFollowups = followups.filter(f => !['completed', 'cancelled'].includes(f.dubai_status)).length;
  const delayedEta = followups.filter(f => f.eta_status === 'delayed').length;
  const pendingArrival = arrivalReports.filter(r => r.arrival_status === 'pending').length;
  const openMissing = missingItems.filter(i => i.missing_item_status === 'open' || i.missing_item_status === 'requested').length;
  const notReadyPredelivery = predeliveryReports.filter(r => !r.ready_for_delivery).length;
  const readyForDelivery = predeliveryReports.filter(r => r.ready_for_delivery).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dubai / AFS" subtitle="Dubai project follow-up, AFS arrival, pre-delivery and condition tracking" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp size={18} className="text-sky-600" />} label="Active Follow-ups" value={activeFollowups} to="/dubai-afs/projects" />
        <KpiCard icon={<Clock size={18} className="text-amber-600" />} label="Delayed ETAs" value={delayedEta} sub="ETA behind schedule" to="/dubai-afs/eta" variant={delayedEta > 0 ? 'warning' : 'default'} />
        <KpiCard icon={<Plane size={18} className="text-sky-600" />} label="Pending Arrival" value={pendingArrival} sub="Vehicles not yet arrived" to="/dubai-afs/arrival-reports" />
        <KpiCard icon={<AlertTriangle size={18} className="text-red-600" />} label="Open Missing Items" value={openMissing} sub="Blocking pre-delivery" to="/dubai-afs/missing-items" variant={openMissing > 0 ? 'critical' : 'default'} />
        <KpiCard icon={<FileSearch size={18} className="text-orange-600" />} label="Not Ready for Delivery" value={notReadyPredelivery} to="/dubai-afs/predelivery-reports" variant={notReadyPredelivery > 0 ? 'warning' : 'default'} />
        <KpiCard icon={<CheckCircle size={18} className="text-green-600" />} label="Ready for Delivery" value={readyForDelivery} to="/dubai-afs/predelivery-reports" variant={readyForDelivery > 0 ? 'success' : 'default'} />
        <KpiCard icon={<Package size={18} className="text-gray-600" />} label="Total Arrivals" value={arrivalReports.length} to="/dubai-afs/arrival-reports" />
        <KpiCard icon={<Wrench size={18} className="text-purple-600" />} label="Condition Reports" value={0} to="/dubai-afs/condition-reports" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dubai Follow-ups</h3>
          <div className="space-y-2">
            {followups.slice(0, 3).map(f => (
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
