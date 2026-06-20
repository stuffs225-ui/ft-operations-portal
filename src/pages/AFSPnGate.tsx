import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_DUBAI_FOLLOWUPS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import type { DubaiProjectFollowup } from '../types';

type PnFilter = 'missing' | 'entered' | 'active' | 'blocked';

const FILTERS: { key: PnFilter; label: string }[] = [
  { key: 'missing', label: 'Missing PN' },
  { key: 'entered', label: 'PN Entered' },
  { key: 'active', label: 'Active Follow-up' },
  { key: 'blocked', label: 'Blocked' },
];

function daysWaiting(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function nextAction(f: DubaiProjectFollowup): string {
  if (!f.pn_reference_id) return 'Obtain PN — required before AFS can proceed';
  if (f.dubai_status === 'on_hold') return 'Resolve hold — follow up with Dubai team';
  if (f.eta_status === 'delayed') return 'Update ETA with documented reason';
  if (!f.eta_date) return 'Set ETA date';
  if (f.dubai_status === 'completed') return 'Completed';
  return 'Continue follow-up';
}

function isBlocked(f: DubaiProjectFollowup): boolean {
  return !f.pn_reference_id || f.dubai_status === 'on_hold' || f.eta_status === 'delayed';
}

export function AFSPnGate() {
  const [items, setItems] = useState<DubaiProjectFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PnFilter>('missing');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_DUBAI_FOLLOWUPS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('dubai_project_followups')
        .select('*, project:projects(project_code, so_number, customer_name, manufacturing_location), vehicle_line:project_vehicle_lines(vehicle_type)')
        .not('dubai_status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: true });
      setItems((data as unknown as DubaiProjectFollowup[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const missing = items.filter(f => !f.pn_reference_id);
  const entered = items.filter(f => !!f.pn_reference_id);
  const active = items.filter(f => !['completed', 'cancelled', 'on_hold'].includes(f.dubai_status));
  const blocked = items.filter(isBlocked);

  const counts: Record<PnFilter, number> = {
    missing: missing.length,
    entered: entered.length,
    active: active.length,
    blocked: blocked.length,
  };

  const filtered: DubaiProjectFollowup[] =
    filter === 'missing' ? missing
    : filter === 'entered' ? entered
    : filter === 'active' ? active
    : blocked;

  return (
    <div className="space-y-5">
      <PageHeader
        title="PN Gate / Missing PN"
        subtitle="PN (Part Number reference) is required before Dubai follow-up, ETA tracking, and pre-delivery readiness can proceed. Resolve all Missing PN entries before advancing any Dubai project."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'PN Gate' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* Governance banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-4 space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
          <ShieldCheck size={15} className="text-sky-600 shrink-0" />
          PN Gate — Governance Enforcement
        </div>
        <ul className="text-sm text-sky-800 space-y-0.5 ml-5 list-disc">
          <li>No Dubai follow-up activity may advance without a PN reference.</li>
          <li>ETA tracking and pre-delivery readiness checks are blocked until PN is entered.</li>
          <li>Contact the responsible team to obtain and enter the PN reference immediately.</li>
        </ul>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-xl border p-3 text-left transition-all ${filter === f.key ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-gray-200 bg-white hover:border-sky-200'}`}>
            <div className={`text-xl font-bold ${f.key === 'missing' || f.key === 'blocked' ? 'text-red-600' : 'text-gray-900'}`}>
              {loading ? '—' : counts[f.key]}
            </div>
            <div className="text-xs font-medium text-gray-600 mt-0.5">{f.label}</div>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
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

      {/* Table */}
      <Card>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-green-400 mb-2" />
            <p className="text-sm text-gray-500">
              {filter === 'missing' ? 'No missing PNs — all active follow-ups have a PN reference.' : 'No entries for this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">SO Number</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Route</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">PN Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Days Waiting</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Next Action</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => {
                  const days = daysWaiting(f.created_at);
                  const hasPn = !!f.pn_reference_id;
                  return (
                    <tr key={f.id} className={`hover:bg-gray-50 ${!hasPn ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-sky-700">{f.project?.project_code ?? '—'}</span>
                        {f.vehicle_line?.vehicle_type && (
                          <div className="text-xs text-gray-500 mt-0.5">{f.vehicle_line.vehicle_type}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-700">{f.project?.customer_name ?? '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-gray-600">{(f.project as { so_number?: string | null })?.so_number ?? '—'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600">{f.project?.manufacturing_location ?? '—'}</td>
                      <td className="px-4 py-3">
                        {hasPn
                          ? <Badge variant="success"><CheckCircle2 size={10} className="mr-1" />PN Entered</Badge>
                          : <Badge variant="critical"><AlertTriangle size={10} className="mr-1" />Missing PN</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {!hasPn && days > 0 ? (
                          <span className={`text-xs font-medium ${days > 7 ? 'text-red-600' : days > 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {days}d
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className={`text-xs ${!hasPn ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                          {nextAction(f)}
                        </span>
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

      {/* Tip */}
      {!loading && counts.missing > 0 && (
        <div className="text-xs text-gray-500 px-1 flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
          {counts.missing} project{counts.missing !== 1 ? 's' : ''} still missing PN. Open the follow-up record to enter the PN reference.
        </div>
      )}
    </div>
  );
}
