import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Plus, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_RAW_MATERIAL_REQUESTS } from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';
import type { RawMaterialRequest, RawMaterialRequestStatus, UserRole } from '../types';

const MOCK_RMRS = mockOrEmpty(MOCK_RAW_MATERIAL_REQUESTS as RawMaterialRequest[]);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_MAP: Record<RawMaterialRequestStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                { label: 'Draft',                variant: 'neutral' },
  submitted:            { label: 'Submitted',            variant: 'info' },
  under_review:         { label: 'Under Review',         variant: 'warning' },
  sent_to_procurement:  { label: 'With Procurement',     variant: 'info' },
  partially_fulfilled:  { label: 'Partially Fulfilled',  variant: 'warning' },
  fulfilled:            { label: 'Fulfilled',            variant: 'success' },
  rejected:             { label: 'Rejected',             variant: 'critical' },
  cancelled:            { label: 'Cancelled',            variant: 'neutral' },
};

function getNextAction(rmr: RawMaterialRequest): { label: string; warn: boolean } {
  switch (rmr.status) {
    case 'draft': return { label: 'Submit Request', warn: true };
    case 'submitted': return { label: 'Awaiting Review', warn: false };
    case 'under_review': return { label: 'Under Review', warn: false };
    case 'sent_to_procurement': return { label: 'With Procurement', warn: false };
    case 'partially_fulfilled': return { label: 'Follow Up', warn: true };
    case 'fulfilled': return { label: '—', warn: false };
    case 'rejected': return { label: 'Review & Resubmit', warn: true };
    case 'cancelled': return { label: '—', warn: false };
    default: return { label: '—', warn: false };
  }
}

type FilterTab = 'all' | 'draft' | 'submitted' | 'under_review' | 'sent_to_procurement' | 'fulfilled' | 'rejected';
type TypeFilter = 'all' | 'project_related' | 'stock';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'sent_to_procurement', label: 'With Procurement' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'rejected', label: 'Rejected' },
];

const CAN_CREATE_ROLES: UserRole[] = ['admin', 'operations_manager', 'factory_user'];

export function FactoryRawMaterialRequests() {
  const { role } = useAuth();
  const [items, setItems] = useState<RawMaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');

  const canCreate = !!role && CAN_CREATE_ROLES.includes(role);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        setItems(MOCK_RMRS);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('production_raw_material_requests')
        .select('*, project:projects(project_code, so_number, customer_name)')
        .order('requested_at', { ascending: false });
      setItems((data as unknown as RawMaterialRequest[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (activeTab !== 'all') list = list.filter((r) => r.status === activeTab);
    if (typeFilter !== 'all') list = list.filter((r) => r.request_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.request_number.toLowerCase().includes(q) ||
        (r.project?.project_code ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, activeTab, typeFilter, search]);

  const tabCounts = FILTER_TABS.reduce<Record<FilterTab, number>>((acc, t) => {
    acc[t.key] = t.key === 'all' ? items.length : items.filter((r) => r.status === t.key).length;
    return acc;
  }, {} as Record<FilterTab, number>);

  const openCount = items.filter((r) => !['fulfilled', 'rejected', 'cancelled'].includes(r.status)).length;
  const projectWithoutWo = items.filter((r) => r.request_type === 'project_related' && !r.wo_reference_id).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Raw Material Requests"
        subtitle="Project-based and stock raw material requests — WO required for project requests"
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Raw Material Requests' }]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            {canCreate && (
              <Link to="/factory/raw-material-requests/new">
                <Button size="sm" variant="primary" className="bg-orange-600 hover:bg-orange-700 border-0 text-white">
                  <Plus size={14} className="mr-1" /> New Request
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {projectWithoutWo > 0 && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span><strong>{projectWithoutWo}</strong> project-based request{projectWithoutWo !== 1 ? 's' : ''} missing WO linkage — link to WO before procurement.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Status tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {FILTER_TABS.map((t) => (
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

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Request #, project code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'project_related', 'stock'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  typeFilter === t
                    ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'all' ? 'All Types' : t === 'project_related' ? 'Project-Related' : 'Stock'}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} request${filtered.length !== 1 ? 's' : ''} · ${openCount} open`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading raw material requests…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Package size={24} className="text-gray-400" />}
              title={items.length === 0 ? 'No raw material requests yet' : 'No requests match the current filters'}
              description={
                items.length === 0
                  ? 'Create a new request. Project-based requests require a confirmed WO.'
                  : 'Try adjusting the status or type filters.'
              }
              action={canCreate ? (
                <Link to="/factory/raw-material-requests/new">
                  <Button size="sm" variant="primary" className="bg-orange-600 hover:bg-orange-700 border-0 text-white">
                    <Plus size={14} className="mr-1" /> New Request
                  </Button>
                </Link>
              ) : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Request #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">WO Linked</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Requested</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((rmr) => {
                  const statusInfo = STATUS_MAP[rmr.status];
                  const next = getNextAction(rmr);
                  return (
                    <tr key={rmr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-orange-700">{rmr.request_number}</td>
                      <td className="px-4 py-3">
                        <Badge variant={rmr.request_type === 'project_related' ? 'info' : 'neutral'}>
                          {rmr.request_type === 'project_related' ? 'Project' : 'Stock'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {rmr.project
                          ? <span className="text-xs font-mono text-gray-700">{rmr.project.project_code}</span>
                          : <span className="text-xs text-gray-400 italic">Stock request</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {rmr.wo_reference_id
                          ? <Badge variant="success" size="sm">WO Linked</Badge>
                          : rmr.request_type === 'project_related'
                            ? <Badge variant="critical" size="sm">No WO</Badge>
                            : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{formatDate(rmr.requested_at)}</td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className={`text-xs font-medium ${next.warn ? 'text-amber-600' : 'text-gray-500'}`}>
                          {next.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
