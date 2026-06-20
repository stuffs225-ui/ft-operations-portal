import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, AlertCircle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_FACTORY_REQUIREMENTS } from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';
import type { FactoryItemRequirement, FactoryReqStatus } from '../types';

const MOCK_REQS = mockOrEmpty(MOCK_FACTORY_REQUIREMENTS as FactoryItemRequirement[]);

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_MAP: Record<FactoryReqStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  pending:        { label: 'Missing / Pending', variant: 'critical' },
  in_progress:    { label: 'In Progress',       variant: 'warning' },
  uploaded:       { label: 'Submitted',          variant: 'info' },
  approved:       { label: 'Approved',           variant: 'success' },
  rejected:       { label: 'Rejected',           variant: 'critical' },
  not_applicable: { label: 'N/A',               variant: 'neutral' },
};

type FilterTab = 'all' | 'missing' | 'submitted' | 'under_review' | 'approved' | 'rejected';

const TABS: { key: FilterTab; label: string; statuses: FactoryReqStatus[] }[] = [
  { key: 'all', label: 'All', statuses: [] },
  { key: 'missing', label: 'Missing / Pending', statuses: ['pending'] },
  { key: 'submitted', label: 'Submitted', statuses: ['uploaded'] },
  { key: 'under_review', label: 'In Review', statuses: ['in_progress'] },
  { key: 'approved', label: 'Approved', statuses: ['approved'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
];

const REQ_TYPE_PRIORITY = ['BOQ', 'BOM', 'GA Drawing', 'Detail Drawing', 'Manhours'];

export function FactoryRequirements() {
  const [items, setItems] = useState<FactoryItemRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        setItems(MOCK_REQS);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('factory_item_requirements')
        .select('*, requirement_type:factory_requirement_types(*)')
        .order('created_at', { ascending: false });
      setItems((data as unknown as FactoryItemRequirement[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    let list = items;
    if (tab && tab.statuses.length > 0) {
      list = list.filter((r) => tab.statuses.includes(r.status));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.project_id.toLowerCase().includes(q) ||
        (r.requirement_type?.name ?? '').toLowerCase().includes(q) ||
        (r.value_text ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, activeTab, search]);

  const tabCounts = TABS.reduce<Record<FilterTab, number>>((acc, t) => {
    acc[t.key] = t.key === 'all' ? items.length : items.filter((r) => t.statuses.includes(r.status)).length;
    return acc;
  }, {} as Record<FilterTab, number>);

  const missingCount = items.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Factory Requirements"
        subtitle="BOQ, BOM, GA Drawings, Detail Drawings, and Manhours — required before production can start"
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Requirements' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* WO governance note */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 text-sm text-orange-800">
        Requirements can only be submitted after a Work Order is confirmed.{' '}
        <Link to="/wo-pn-gate" className="font-semibold underline">Check WO Gate →</Link>
      </div>

      {missingCount > 0 && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span><strong>{missingCount}</strong> requirement{missingCount !== 1 ? 's' : ''} pending — upload to unblock production.</span>
        </div>
      )}

      {/* Requirement types legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-600">
        <span className="font-medium text-gray-700">Tracked requirements: </span>
        {REQ_TYPE_PRIORITY.join(' · ')}
        {' '}— all must be submitted and approved before production can progress.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === t.key
                  ? 'text-orange-700 border-orange-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
              {tabCounts[t.key] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === t.key ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tabCounts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Project, requirement type, or value…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-64"
            />
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} requirement${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading requirements…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<FileText size={24} className="text-gray-400" />}
              title={items.length === 0 ? 'No requirements yet' : 'No requirements match the current filter'}
              description={
                items.length === 0
                  ? 'Requirements are created when a factory project is set up. Ensure WO is confirmed first.'
                  : 'Try a different status tab or clear the search.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Requirement</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Scope</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Value / Version</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Uploaded</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((req) => {
                  const statusInfo = STATUS_MAP[req.status];
                  const value = req.value_text ?? (req.value_number != null ? String(req.value_number) : '—');
                  const scopeLabel = req.project_vehicle_line_id
                    ? `Vehicle Line`
                    : 'Project-level';
                  const isPriority = REQ_TYPE_PRIORITY.includes(req.requirement_type?.name ?? '');
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-orange-700">{req.project_id.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800">{req.requirement_type?.name ?? 'Unknown'}</span>
                          {isPriority && <Badge variant="info" size="sm">Required</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{scopeLabel}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">{value}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{formatDate(req.uploaded_at)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/factory/projects/${req.project_id}`}>
                          <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schema note */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-xs text-gray-500">
        File attachment upload is managed through the Factory Project workspace. Line-level requirements are tracked via vehicle line ID where available.
      </div>
    </div>
  );
}
