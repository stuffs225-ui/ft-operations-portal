import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_FACTORY_REQUIREMENTS } from '../data/mockFactory';
import type { FactoryItemRequirement, FactoryReqStatus } from '../types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const REQ_STATUS_MAP: Record<FactoryReqStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  pending:        { label: 'Pending',     variant: 'neutral' },
  in_progress:    { label: 'In Progress', variant: 'warning' },
  uploaded:       { label: 'Uploaded',    variant: 'info' },
  approved:       { label: 'Approved',    variant: 'success' },
  rejected:       { label: 'Rejected',    variant: 'critical' },
  not_applicable: { label: 'N/A',         variant: 'neutral' },
};

type FilterTab = 'all' | FactoryReqStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'not_applicable', label: 'N/A' },
];

export function FactoryRequirements() {
  const [items, setItems] = useState<FactoryItemRequirement[]>([]);
  const [filtered, setFiltered] = useState<FactoryItemRequirement[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(MOCK_FACTORY_REQUIREMENTS);
        setFiltered(MOCK_FACTORY_REQUIREMENTS);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('factory_item_requirements')
        .select('*, requirement_type:factory_requirement_types(*)')
        .order('created_at', { ascending: false });

      const loaded = (data as unknown as FactoryItemRequirement[]) ?? [];
      setItems(loaded);
      setFiltered(loaded);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let result = items;

    if (activeTab !== 'all') {
      result = result.filter((r) => r.status === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.project_id.toLowerCase().includes(q) ||
          (r.requirement_type?.name ?? '').toLowerCase().includes(q) ||
          (r.value_text ?? '').toLowerCase().includes(q),
      );
    }

    setFiltered(result);
  }, [search, activeTab, items]);

  const pendingCount = items.filter((r) => r.status === 'pending').length;

  const tabCounts = FILTER_TABS.reduce<Record<FilterTab, number>>((acc, tab) => {
    acc[tab.key] = tab.key === 'all' ? items.length : items.filter((r) => r.status === tab.key).length;
    return acc;
  }, {} as Record<FilterTab, number>);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Factory Requirements"
        subtitle="BOQ, BOM, GA Drawing, Detail Drawings, and other production requirements"
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Requirements' }]}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
          <FileText size={13} className="text-amber-600 shrink-0" />
          Dev mode — using mock factory data. Changes will not be persisted.
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-lg px-4 py-2 text-xs text-sky-800">
          <FileText size={13} className="text-sky-600 shrink-0" />
          <span>
            <strong>{pendingCount}</strong> requirement(s) are currently pending and require attention.
          </span>
        </div>
      )}

      {/* Search */}
      <Card className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project, requirement type, or value…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="No requirements found"
          description="Try adjusting your search or filter to find requirements."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Project', 'Vehicle Line', 'Requirement Type', 'Status', 'Value', 'Uploaded At', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((req) => {
                  const statusInfo = REQ_STATUS_MAP[req.status];
                  const value = req.value_text ?? (req.value_number != null ? String(req.value_number) : '—');
                  const lineLabel = req.project_vehicle_line_id
                    ? `Line: ${req.project_vehicle_line_id}`
                    : 'Project-level';

                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                        {req.project_id}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{lineLabel}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">
                        {req.requirement_type?.name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{value}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {req.uploaded_at ? formatDateTime(req.uploaded_at) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/factory/projects/${req.project_id}`}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 underline"
                        >
                          View Project
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
