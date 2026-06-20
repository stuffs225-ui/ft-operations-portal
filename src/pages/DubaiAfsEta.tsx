import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_DUBAI_FOLLOWUPS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import type { DubaiProjectFollowup } from '../types';

type EtaFilter = 'all' | 'delayed' | 'due_this_week' | 'no_eta' | 'recent';

const FILTERS: { key: EtaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'due_this_week', label: 'Due This Week' },
  { key: 'no_eta', label: 'No ETA' },
  { key: 'recent', label: 'Recently Updated' },
];

function etaVariant(s: string): 'neutral' | 'warning' | 'success' | 'info' | 'critical' | 'default' {
  if (s === 'delayed') return 'warning';
  if (s === 'on_track') return 'success';
  if (s === 'arrived') return 'info';
  if (s === 'not_set') return 'neutral';
  return 'neutral';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysDiff(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function isThisWeek(iso: string | null | undefined): boolean {
  const d = daysDiff(iso);
  return d !== null && d >= 0 && d <= 7;
}

function isRecentlyUpdated(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 3;
}

export function DubaiAfsEta() {
  const [items, setItems] = useState<DubaiProjectFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EtaFilter>('all');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_DUBAI_FOLLOWUPS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('dubai_project_followups')
        .select('*, project:projects(project_code, customer_name, manufacturing_location), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .not('dubai_status', 'in', '("completed","cancelled")')
        .order('eta_date', { ascending: true, nullsFirst: false });
      setItems((data as unknown as DubaiProjectFollowup[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const counts: Record<EtaFilter, number> = {
    all: items.length,
    delayed: items.filter(f => f.eta_status === 'delayed').length,
    due_this_week: items.filter(f => isThisWeek(f.eta_date)).length,
    no_eta: items.filter(f => !f.eta_date || f.eta_status === 'not_set').length,
    recent: items.filter(f => isRecentlyUpdated(f.updated_at)).length,
  };

  const filtered = items.filter(f => {
    if (filter === 'delayed') return f.eta_status === 'delayed';
    if (filter === 'due_this_week') return isThisWeek(f.eta_date);
    if (filter === 'no_eta') return !f.eta_date || f.eta_status === 'not_set';
    if (filter === 'recent') return isRecentlyUpdated(f.updated_at);
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="ETA Tracking"
        subtitle="Monitor vehicle arrival ETAs, delay status, and required ETA updates for all active Dubai follow-ups."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'ETA Tracking' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {!loading && counts.delayed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span><strong>{counts.delayed}</strong> delayed ETA{counts.delayed !== 1 ? 's' : ''} — each requires a documented reason for the delay.</span>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${filter === f.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {f.label}
            {!loading && counts[f.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${filter === f.key ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No ETAs match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Vehicle Line</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">ETA Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Delay Days</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">ETA Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Updated</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => {
                  const daysLeft = daysDiff(f.eta_date);
                  const isDelayed = f.eta_status === 'delayed';
                  return (
                    <tr key={f.id} className={`hover:bg-gray-50 ${isDelayed ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-sky-400 shrink-0" />
                          <span className="font-mono text-sm font-semibold text-sky-700">{f.project?.project_code ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-700">{f.project?.customer_name ?? '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">{f.vehicle_line?.vehicle_type ?? 'Project-wide'}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {formatDate(f.eta_date)}
                        {daysLeft !== null && f.eta_status !== 'arrived' && (
                          <div className={`text-xs mt-0.5 ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `in ${daysLeft}d`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isDelayed && daysLeft !== null && daysLeft < 0 ? (
                          <span className="text-xs font-semibold text-red-600">{Math.abs(daysLeft)}d</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={etaVariant(f.eta_status)}>{f.eta_status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(f.updated_at)}</td>
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
