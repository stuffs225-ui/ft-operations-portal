import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { StatusBadge } from '@/components/status/status-badge';
import { PriorityBadge } from '@/components/status/priority-badge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '@/components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '@/lib/dataMode';
import { MOCK_MATERIAL_NCRS } from '@/data/mockQc';
import type { MaterialNcr, NcrStatus, NcrSeverity } from '@/types';

type StatusTab = 'all' | NcrStatus;
type SeverityFilter = 'all' | NcrSeverity;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'corrective_action_in_progress', label: 'In Progress' },
  { key: 'pending_evidence', label: 'Pending Evidence' },
  { key: 'closed', label: 'Closed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MaterialNcrs() {
  const [items, setItems] = useState<MaterialNcr[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_MATERIAL_NCRS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('material_ncrs')
        .select('*, project:projects(project_code, customer_name), item:store_receipt_items(item_name, material_category)')
        .order('created_at', { ascending: false });
      setItems((data as unknown as MaterialNcr[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(n => {
    if (statusTab !== 'all' && n.ncr_status !== statusTab) return false;
    if (severityFilter !== 'all' && n.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material NCRs"
        subtitle="Non-Conformance Reports for rejected or non-compliant materials"
        breadcrumb={[{ label: 'Material QC', href: '/material-qc' }, { label: 'NCRs' }]}
      />

      <DataSourceBadge variant="auto" />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Severity:</span>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                statusTab === t.key ? 'text-violet-700 border-b-2 border-violet-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10"><PageLoader /></div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState icon={<AlertTriangle size={24} className="text-gray-400" />} title="No NCRs" description="No NCRs match the current filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">NCR #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Root Cause</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Blocks Release</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(n => (
                  <tr key={n.id} className={`hover:bg-gray-50 transition-colors ${n.severity === 'critical' ? 'border-l-4 border-l-red-500' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{n.ncr_number}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={n.severity} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{n.item?.item_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{n.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{n.root_cause_category ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={n.ncr_status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{n.due_date ? formatDate(n.due_date) : '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled' && n.project_id
                        ? <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium"><XCircle size={12} /> Blocking</span>
                        : <Badge variant="success">No</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/material-qc/ncrs/${n.id}`}>
                        <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
