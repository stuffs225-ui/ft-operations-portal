import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_DUBAI_FOLLOWUPS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import type { DubaiProjectFollowup, DubaiStatus } from '../types';

type Tab = 'all' | 'active' | 'delayed' | 'arrived' | 'completed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delayed', label: 'Delayed ETA' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'completed', label: 'Completed' },
];

function statusVariant(s: DubaiStatus): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (s === 'completed') return 'success';
  if (s === 'in_transit' || s === 'eta_confirmed') return 'info';
  if (s === 'on_hold' || s === 'cancelled') return 'neutral';
  if (s === 'arrived_ksa' || s === 'handed_to_afs' || s === 'ready_for_pre_delivery') return 'success';
  return 'neutral';
}

function etaVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'delayed') return 'warning';
  if (s === 'on_track') return 'success';
  if (s === 'arrived') return 'info';
  return 'neutral';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function etaDaysRemaining(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function DubaiAfsProjects() {
  const [items, setItems] = useState<DubaiProjectFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_DUBAI_FOLLOWUPS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('dubai_project_followups')
        .select('*, project:projects(project_code, so_number, customer_name, manufacturing_location), vehicle_line:project_vehicle_lines(vehicle_type, description, quantity)')
        .order('updated_at', { ascending: false });
      setItems((data as unknown as DubaiProjectFollowup[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const tabCounts: Record<Tab, number> = {
    all: items.length,
    active: items.filter(f => !['completed', 'cancelled', 'arrived_ksa', 'handed_to_afs', 'ready_for_pre_delivery'].includes(f.dubai_status)).length,
    delayed: items.filter(f => f.eta_status === 'delayed').length,
    arrived: items.filter(f => ['arrived_ksa', 'handed_to_afs', 'ready_for_pre_delivery'].includes(f.dubai_status)).length,
    completed: items.filter(f => f.dubai_status === 'completed').length,
  };

  const filtered = items.filter(f => {
    if (tab === 'active') return !['completed', 'cancelled', 'arrived_ksa', 'handed_to_afs', 'ready_for_pre_delivery'].includes(f.dubai_status);
    if (tab === 'delayed') return f.eta_status === 'delayed';
    if (tab === 'arrived') return ['arrived_ksa', 'handed_to_afs', 'ready_for_pre_delivery'].includes(f.dubai_status);
    if (tab === 'completed') return f.dubai_status === 'completed';
    return true;
  });

  const missingPn = filtered.filter(f => !f.pn_reference_id).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dubai Follow-ups"
        subtitle="Track Dubai project execution, ETA progress, and pre-delivery readiness for all active follow-ups."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'Follow-ups' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {missingPn > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <span><strong>{missingPn}</strong> follow-up{missingPn !== 1 ? 's' : ''} in this view missing PN — Dubai progress is blocked.</span>
          </div>
          <Link to="/afs/pn-gate"><Button variant="secondary" size="sm">PN Gate</Button></Link>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'}`}>
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
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No follow-ups found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">PN</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">ETA</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">ETA Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Follow-up</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => {
                  const hasPn = !!f.pn_reference_id;
                  const daysLeft = etaDaysRemaining(f.eta_date);
                  return (
                    <tr key={f.id} className={`hover:bg-gray-50 ${!hasPn ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Plane size={12} className="text-sky-400 shrink-0" />
                          <span className="font-mono text-sm font-semibold text-sky-700">{f.project?.project_code ?? '—'}</span>
                        </div>
                        {f.vehicle_line?.vehicle_type && (
                          <div className="text-xs text-gray-500 mt-0.5 ml-4">{f.vehicle_line.vehicle_type}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-700 text-xs">{f.project?.customer_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {hasPn
                          ? <Badge variant="success">PN OK</Badge>
                          : <Badge variant="critical">No PN</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(f.dubai_status)}>
                          {f.dubai_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant={etaVariant(f.eta_status)}>
                          {f.eta_status.replace(/_/g, ' ')}
                        </Badge>
                        {f.eta_status === 'delayed' && daysLeft !== null && daysLeft < 0 && (
                          <div className="text-xs text-red-600 mt-0.5">{Math.abs(daysLeft)}d overdue</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600">
                        {formatDate(f.eta_date)}
                        {daysLeft !== null && f.eta_status !== 'arrived' && (
                          <div className={`text-xs mt-0.5 ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                        {formatDate(f.last_followup_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/dubai-afs/projects/${f.id}`}>
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
