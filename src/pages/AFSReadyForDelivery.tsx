import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_PREDELIVERY_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import type { AfsPredeliveryReport } from '../types';

type Tab = 'awaiting_release' | 'ready' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'awaiting_release', label: 'Awaiting Release Note' },
  { key: 'ready', label: 'Fully Ready' },
  { key: 'all', label: 'All' },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AFSReadyForDelivery() {
  const [items, setItems] = useState<AfsPredeliveryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('awaiting_release');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const all = mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS);
        setItems(all.filter(r => r.ready_for_delivery));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_predelivery_reports')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .eq('ready_for_delivery', true)
        .order('delivery_approved_at', { ascending: false, nullsFirst: true });
      setItems((data as unknown as AfsPredeliveryReport[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const tabCounts: Record<Tab, number> = {
    awaiting_release: items.filter(r => !r.release_note_issued).length,
    ready: items.filter(r => r.release_note_issued).length,
    all: items.length,
  };

  const reports = items.filter(r => {
    if (tab === 'awaiting_release') return !r.release_note_issued;
    if (tab === 'ready') return r.release_note_issued;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ready for Delivery"
        subtitle="Vehicles cleared for delivery — pre-delivery readiness confirmed. QC Release Note must be issued before delivery can proceed."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'Ready for Delivery' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl border p-3 text-left transition-all ${tab === t.key ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-gray-200 bg-white hover:border-sky-200'}`}>
            <div className={`text-xl font-bold ${t.key === 'awaiting_release' ? 'text-amber-600' : 'text-gray-900'}`}>
              {loading ? '—' : tabCounts[t.key]}
            </div>
            <div className="text-xs font-medium text-gray-600 mt-0.5">{t.label}</div>
          </button>
        ))}
      </div>

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
        ) : reports.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <PackageCheck size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              {tab === 'ready' ? 'No fully approved deliveries yet.' : 'No vehicles in this category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Report</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Vehicle</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Chassis</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Release Note</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Approved By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Approved Date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <PackageCheck size={13} className="text-green-500 shrink-0" />
                        <span className="font-mono text-xs text-sky-700 font-semibold">{r.predelivery_report_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="font-mono text-xs text-sky-700">{r.project?.project_code ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.project?.customer_name ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">{r.vehicle_line?.vehicle_type ?? '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-gray-600">{r.chassis_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      {r.release_note_issued
                        ? <Badge variant="success"><CheckCircle2 size={10} className="mr-1" />Issued</Badge>
                        : <Badge variant="warning">Pending</Badge>
                      }
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{r.delivery_approved_by ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(r.delivery_approved_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/dubai-afs/predelivery-reports/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          View <ChevronRight size={12} />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
