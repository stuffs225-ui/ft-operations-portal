import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Search, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { StatusTabsWithCounts } from '../components/store/StoreUI';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_STORE_RECEIPTS, MOCK_RECEIPT_ITEMS } from '../data/mockStore';
import type { StoreReceipt, ReceiptStatus, UserRole } from '../types';

const STATUS_TABS: { key: 'all' | ReceiptStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'received', label: 'Received' },
  { key: 'partially_received', label: 'Partial' },
  { key: 'pending_material_qc', label: 'Pending QC' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_VARIANT: Record<ReceiptStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  draft: 'neutral',
  received: 'info',
  partially_received: 'warning',
  pending_material_qc: 'warning',
  accepted: 'success',
  rejected: 'critical',
  closed: 'neutral',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function nextAction(status: ReceiptStatus): { label: string; warn?: boolean } {
  switch (status) {
    case 'draft': return { label: 'Mark as Received' };
    case 'received': return { label: 'Check Items' };
    case 'partially_received': return { label: 'Complete Receipt', warn: true };
    case 'pending_material_qc': return { label: 'Awaiting QC', warn: true };
    case 'accepted': return { label: 'Ready to Issue' };
    case 'rejected': return { label: 'Review Issues', warn: true };
    case 'closed': return { label: '—' };
    default: return { label: '—' };
  }
}

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

interface LiveReceipt extends StoreReceipt {
  item_count: number;
}

export function StoreReceipts() {
  const { role } = useAuth();
  const [receipts, setReceipts] = useState<LiveReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'all' | ReceiptStatus>('all');
  const [search, setSearch] = useState('');

  const canCreate = role ? CAN_CREATE.includes(role as UserRole) : false;

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('store_receipts')
          .select('*, project:projects(project_code, so_number, customer_name)')
          .order('received_date', { ascending: false })
          .limit(300);

        if (data) {
          setReceipts((data as unknown as StoreReceipt[]).map(r => ({ ...r, item_count: 0 })));
        }
      } else {
        const mock = mockOrEmpty(MOCK_STORE_RECEIPTS).map(r => ({
          ...r,
          item_count: (MOCK_RECEIPT_ITEMS[r.id] ?? []).length,
        }));
        setReceipts(mock);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = receipts;
    if (statusTab !== 'all') list = list.filter(r => r.status === statusTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.receipt_number.toLowerCase().includes(q) ||
        (r.supplier_name ?? '').toLowerCase().includes(q) ||
        (r.project?.project_code ?? '').toLowerCase().includes(q) ||
        (r.delivery_note_number ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [receipts, statusTab, search]);

  const pendingQc = receipts.filter(r => r.status === 'pending_material_qc').length;

  // Tab counts derived from already-loaded receipts (no new query).
  const statusCounts: Record<string, number> = { all: receipts.length };
  for (const t of STATUS_TABS) {
    if (t.key === 'all') continue;
    statusCounts[t.key] = receipts.filter(r => r.status === t.key).length;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material Receiving"
        subtitle="Incoming materials and goods received from suppliers"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'Material Receiving' }]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            {canCreate && (
              <Link to="/store/receipts/new">
                <Button variant="primary" size="sm">
                  <Plus size={14} className="mr-1" /> Receive Material
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {pendingQc > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-amber-700">
          <Package size={16} className="shrink-0" />
          <span>
            <strong>{pendingQc}</strong> receipt{pendingQc !== 1 ? 's' : ''} pending material QC — materials must not be issued before QC acceptance.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Status tabs with counts */}
        <div className="px-4 pt-3">
          <StatusTabsWithCounts
            tabs={STATUS_TABS}
            active={statusTab}
            counts={statusCounts}
            onSelect={setStatusTab}
          />
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Receipt #, supplier, project, delivery note…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
            />
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} receipt${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading receipts…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Package size={24} className="text-gray-400" />}
              title={receipts.length === 0 ? 'No materials received yet' : 'No receipts match filters'}
              description={
                receipts.length === 0
                  ? 'Receive material to start warehouse tracking.'
                  : 'Adjust status filter or clear search to see more.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Receipt #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Supplier</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Items</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Received</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Next Action</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const action = nextAction(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-gray-900">{r.receipt_number}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{r.receipt_type}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {r.project ? (
                          <span className="text-xs font-mono text-gray-700">{r.project.project_code}</span>
                        ) : (
                          <span className="text-xs text-amber-600 italic">Unallocated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {r.supplier_name ?? '—'}
                        {r.delivery_note_number && (
                          <p className="text-[10px] text-gray-400 font-mono">{r.delivery_note_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {r.item_count > 0 ? `${r.item_count} item${r.item_count !== 1 ? 's' : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                        {formatDate(r.received_date)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>
                          {r.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className={`text-xs font-medium ${action.warn ? 'text-amber-600' : 'text-gray-500'}`}>
                          {action.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/store/receipts/${r.id}`}>
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
    </div>
  );
}
