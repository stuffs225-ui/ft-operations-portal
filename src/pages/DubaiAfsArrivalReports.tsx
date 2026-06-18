import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_ARRIVAL_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { AfsArrivalReport, ArrivalStatus } from '../types';

type Tab = 'all' | ArrivalStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'partially_arrived', label: 'Partial' },
  { key: 'pending', label: 'Pending' },
  { key: 'delayed', label: 'Delayed' },
];

function arrivalVariant(s: ArrivalStatus): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'arrived') return 'success';
  if (s === 'partially_arrived') return 'warning';
  if (s === 'delayed') return 'critical';
  return 'neutral';
}

export function DubaiAfsArrivalReports() {
  const [items, setItems] = useState<AfsArrivalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_AFS_ARRIVAL_REPORTS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_arrival_reports')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .order('arrival_date', { ascending: false });
      setItems((data as unknown as AfsArrivalReport[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const reports = items.filter(r => tab === 'all' ? true : r.arrival_status === tab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Arrival Reports"
        subtitle="AFS vehicle arrival registrations and condition on arrival"
        breadcrumb={[{ label: 'Dubai / AFS', href: '/dubai-afs' }, { label: 'Arrival Reports' }]}
      />
      <DataSourceBadge variant="auto" />

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white border border-b-white border-gray-100 text-sky-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <Card>
          {reports.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No arrival reports found.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reports.map(r => (
                <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Plane size={14} className="text-sky-500" />
                      <span className="text-sm font-mono font-semibold text-sky-700">{r.arrival_report_number}</span>
                      <Badge variant={arrivalVariant(r.arrival_status)}>{r.arrival_status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{r.project?.customer_name} — {r.vehicle_line?.vehicle_type ?? 'Project-wide'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Arrived: {new Date(r.arrival_date).toLocaleDateString('en-GB')} ·
                      {r.received_quantity}/{r.expected_quantity} units ·
                      {r.storage_location ?? 'No location set'}
                    </div>
                  </div>
                  <Link to={`/dubai-afs/arrival-reports/${r.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
