import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, CheckCircle2, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_PREDELIVERY_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import type { AfsPredeliveryReport } from '../types';

type Tab = 'not_ready' | 'ready' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'not_ready', label: 'Not Ready' },
  { key: 'ready', label: 'Ready for Delivery' },
  { key: 'all', label: 'All' },
];

function readinessVariant(r: AfsPredeliveryReport) {
  if (r.ready_for_delivery && r.release_note_issued) return 'success';
  if (r.ready_for_delivery && !r.release_note_issued) return 'warning';
  return 'critical';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DubaiAfsPredeliveryReports() {
  const [items, setItems] = useState<AfsPredeliveryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('not_ready');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_predelivery_reports')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .order('report_date', { ascending: false });
      setItems((data as unknown as AfsPredeliveryReport[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const tabCounts = {
    not_ready: items.filter(r => !r.ready_for_delivery).length,
    ready: items.filter(r => r.ready_for_delivery).length,
    all: items.length,
  };

  const reports = items.filter(r => {
    if (tab === 'ready') return r.ready_for_delivery;
    if (tab === 'not_ready') return !r.ready_for_delivery;
    return true;
  });

  const blockers = reports.filter(r => !r.ready_for_delivery && (r.open_missing_items > 0 || r.open_ncrs > 0));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pre-Delivery Readiness"
        subtitle="AFS pre-delivery readiness checks and delivery approval. QC Release Note is required before marking ready for delivery."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'Pre-Delivery Reports' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {!loading && blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <span>
            <strong>{blockers.length}</strong> report{blockers.length !== 1 ? 's' : ''} have open missing items or NCRs — pre-delivery cannot be approved until all issues are resolved.
          </span>
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
        ) : reports.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Report</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Checklist</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Issues</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Readiness</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Release Note</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Report Date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map(r => {
                  const hasIssues = r.open_missing_items > 0 || r.open_ncrs > 0;
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 ${!r.ready_for_delivery ? 'bg-orange-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileSearch size={13} className="text-sky-400 shrink-0" />
                          <span className="font-mono text-xs text-sky-700 font-semibold">{r.predelivery_report_number}</span>
                        </div>
                        {r.chassis_number && (
                          <div className="text-xs text-gray-500 mt-0.5 ml-5">Chassis: {r.chassis_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="font-mono text-xs text-sky-700">{r.project?.project_code ?? '—'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.vehicle_line?.vehicle_type ?? 'Project-wide'}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-sky-500 h-1.5 rounded-full"
                              style={{ width: r.checklist_items_total > 0 ? `${(r.checklist_items_passed / r.checklist_items_total) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{r.checklist_items_passed}/{r.checklist_items_total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {hasIssues ? (
                          <div className="text-xs space-y-0.5">
                            {r.open_missing_items > 0 && (
                              <div className="text-red-600 flex items-center gap-1">
                                <XCircle size={10} /> {r.open_missing_items} missing
                              </div>
                            )}
                            {r.open_ncrs > 0 && (
                              <div className="text-red-600 flex items-center gap-1">
                                <XCircle size={10} /> {r.open_ncrs} NCR{r.open_ncrs !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Clear
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={readinessVariant(r)}>
                          {r.ready_for_delivery ? 'Ready' : 'Not Ready'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.release_note_issued
                          ? <Badge variant="success"><CheckCircle2 size={10} className="mr-1" />Issued</Badge>
                          : <Badge variant="critical"><XCircle size={10} className="mr-1" />Not Issued</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(r.report_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/dubai-afs/predelivery-reports/${r.id}`}>
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
