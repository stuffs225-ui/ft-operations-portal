import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Package, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_CUSTODY_RECORDS as MOCK_CUSTODY_RECORDS_RAW } from '../data/mockStore';
import type { MaterialCustodyRecord } from '../types';

const MOCK_CUSTODY_RECORDS = mockOrEmpty(MOCK_CUSTODY_RECORDS_RAW);

const STATUS_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved_for_issue: 'info',
  issued: 'info',
  pending_acceptance: 'warning',
  in_custody: 'success',
  installed: 'success',
  returned: 'neutral',
  consumed_by_project: 'neutral',
  lost_or_damaged: 'critical',
  cancelled: 'neutral',
};

type IssuanceTab = 'all' | 'issued' | 'in_custody' | 'returned';

const TABS: { id: IssuanceTab; label: string }[] = [
  { id: 'all', label: 'All Issuances' },
  { id: 'issued', label: 'Issued' },
  { id: 'in_custody', label: 'In Custody' },
  { id: 'returned', label: 'Returned' },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function StoreIssuance() {
  const [records, setRecords] = useState<MaterialCustodyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<IssuanceTab>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('material_custody_records')
          .select('*, project:projects(project_code, customer_name), item:store_receipt_items(item_name, item_code)')
          .order('issued_at', { ascending: false })
          .limit(300);
        if (data) setRecords(data as unknown as MaterialCustodyRecord[]);
      } else {
        setRecords(MOCK_CUSTODY_RECORDS);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = records.filter(r => {
    if (tab === 'issued') return r.status === 'issued' || r.status === 'approved_for_issue';
    if (tab === 'in_custody') return r.status === 'in_custody' || r.status === 'pending_acceptance';
    if (tab === 'returned') return r.status === 'returned' || r.status === 'consumed_by_project';
    return true;
  }).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.custody_number?.toLowerCase().includes(q) ||
      (r.project as any)?.project_code?.toLowerCase().includes(q) ||
      (r.item as any)?.item_name?.toLowerCase().includes(q) ||
      (r.issued_to_role ?? '').toLowerCase().includes(q)
    );
  });

  const counts = {
    all: records.length,
    issued: records.filter(r => r.status === 'issued' || r.status === 'approved_for_issue').length,
    in_custody: records.filter(r => r.status === 'in_custody' || r.status === 'pending_acceptance').length,
    returned: records.filter(r => r.status === 'returned' || r.status === 'consumed_by_project').length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material Issuance"
        subtitle="Track materials issued out of the store"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'Issuance' }]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            <Link
              to="/custody/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
            >
              <ArrowUpRight size={14} /> Issue Material
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.id
                ? 'border-cyan-600 text-cyan-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.label}
            {counts[t.id] > 0 && (
              <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Custody #, project, item…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 w-56"
            />
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading issuance records…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Package size={24} className="text-gray-400" />}
              title="No issuance records"
              description={
                records.length === 0
                  ? 'Issue material to a project to start tracking here.'
                  : 'No records match the current filter.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Custody #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Issued To</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Issued</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/custody/${r.id}`}
                        className="text-sm font-mono font-medium text-cyan-700 hover:underline"
                      >
                        {r.custody_number}
                      </Link>
                      {r.issue_type && (
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                          {r.issue_type.replace(/_/g, ' ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-800">
                        {(r.item as any)?.item_name ?? '—'}
                      </p>
                      {(r.item as any)?.item_code && (
                        <p className="text-xs text-gray-400 font-mono">
                          {(r.item as any).item_code}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {(r.project as any)?.project_code ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                      {r.issued_to_role?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">
                      {formatDate(r.issued_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">
                      {formatDate(r.returned_at)}
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
