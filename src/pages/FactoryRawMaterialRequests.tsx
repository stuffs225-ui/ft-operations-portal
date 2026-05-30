import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_RAW_MATERIAL_REQUESTS } from '../data/mockFactory';
import type { RawMaterialRequest, RawMaterialRequestStatus, UserRole } from '../types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const RMR_STATUS_MAP: Record<RawMaterialRequestStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                { label: 'Draft',                variant: 'neutral' },
  submitted:            { label: 'Submitted',            variant: 'info' },
  under_review:         { label: 'Under Review',         variant: 'warning' },
  sent_to_procurement:  { label: 'Sent to Procurement',  variant: 'info' },
  partially_fulfilled:  { label: 'Partially Fulfilled',  variant: 'warning' },
  fulfilled:            { label: 'Fulfilled',            variant: 'success' },
  rejected:             { label: 'Rejected',             variant: 'critical' },
  cancelled:            { label: 'Cancelled',            variant: 'neutral' },
};

type FilterTab = 'all' | 'draft' | 'submitted' | 'under_review' | 'sent_to_procurement' | 'fulfilled' | 'rejected';
type TypeFilter = 'all' | 'project_related' | 'stock';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'sent_to_procurement', label: 'Sent to Procurement' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'rejected', label: 'Rejected' },
];

const CAN_CREATE_ROLES: UserRole[] = ['admin', 'operations_manager', 'factory_user'];

export function FactoryRawMaterialRequests() {
  const { role } = useAuth();
  const [items, setItems] = useState<RawMaterialRequest[]>([]);
  const [filtered, setFiltered] = useState<RawMaterialRequest[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);

  const canCreate = !!role && CAN_CREATE_ROLES.includes(role);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setItems(MOCK_RAW_MATERIAL_REQUESTS);
      setFiltered(MOCK_RAW_MATERIAL_REQUESTS);
      setLoading(false);
      return;
    }
    // Supabase placeholder
    setItems([]);
    setFiltered([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let result = items;

    if (activeTab !== 'all') {
      result = result.filter((r) => r.status === activeTab);
    }

    if (typeFilter !== 'all') {
      result = result.filter((r) => r.request_type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.request_number.toLowerCase().includes(q) ||
          (r.project?.project_code ?? '').toLowerCase().includes(q),
      );
    }

    setFiltered(result);
  }, [search, activeTab, typeFilter, items]);

  const tabCounts = FILTER_TABS.reduce<Record<FilterTab, number>>((acc, tab) => {
    acc[tab.key] = tab.key === 'all' ? items.length : items.filter((r) => r.status === tab.key).length;
    return acc;
  }, {} as Record<FilterTab, number>);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Raw Material Requests"
        subtitle="Project-related and stock raw material requests"
        icon={<Package size={18} />}
        breadcrumb={[{ label: 'Factory', path: '/factory' }, { label: 'Raw Material Requests' }]}
        action={
          canCreate ? (
            <Link to="/factory/raw-material-requests/new">
              <Button size="sm" icon={<Plus size={14} />}>
                New Request
              </Button>
            </Link>
          ) : undefined
        }
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
          <Package size={13} className="text-amber-600 shrink-0" />
          Dev mode — using mock factory data. Changes will not be persisted.
        </div>
      )}

      {/* Search */}
      <Card className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by RMR number or project code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </Card>

      {/* Type filter chips */}
      <div className="flex gap-2">
        {(['all', 'project_related', 'stock'] as TypeFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === t
                ? 'bg-brand-100 text-brand-800 ring-1 ring-brand-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'all' ? 'All Types' : t === 'project_related' ? 'Project-Related' : 'Stock'}
          </button>
        ))}
      </div>

      {/* Status tabs */}
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
        <Card className="p-8 text-center text-sm text-gray-500">Loading raw material requests…</Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title="No raw material requests found"
          description="Try adjusting your filters or create a new request."
          action={
            canCreate ? (
              <Link to="/factory/raw-material-requests/new">
                <Button size="sm" icon={<Plus size={14} />}>New Request</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Request Number', 'Type', 'Project', 'Status', 'Requested By', 'Requested At', 'Sent to Procurement', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((rmr) => {
                  const statusInfo = RMR_STATUS_MAP[rmr.status];
                  return (
                    <tr key={rmr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                        {rmr.request_number}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rmr.request_type === 'project_related' ? 'info' : 'neutral'}>
                          {rmr.request_type === 'project_related' ? 'Project-Related' : 'Stock'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {rmr.project ? (
                          <span className="font-mono">{rmr.project.project_code}</span>
                        ) : (
                          <span className="text-gray-400 italic">Stock Request</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {rmr.requested_by_profile?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(rmr.requested_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {rmr.sent_to_procurement_at ? formatDateTime(rmr.sent_to_procurement_at) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 font-mono">{rmr.request_number}</span>
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
