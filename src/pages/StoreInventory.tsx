import { useState, useEffect, useMemo } from 'react';
import { Search, Package, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_STORE_RECEIPTS, MOCK_RECEIPT_ITEMS } from '../data/mockStore';
import type { ItemStatus, StoreReceiptItem } from '../types';

const ITEM_STATUS_VARIANT: Record<ItemStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  received: 'info', pending_qc: 'warning', accepted_by_qc: 'success', rejected_by_qc: 'critical',
  in_store: 'success', issued: 'default', in_custody: 'default', installed: 'success',
  returned: 'neutral', consumed: 'neutral', lost_or_damaged: 'critical',
};

function nextAction(status: ItemStatus): { label: string; warn?: boolean } {
  switch (status) {
    case 'received': return { label: 'Confirm Receipt' };
    case 'pending_qc': return { label: 'Awaiting QC', warn: true };
    case 'accepted_by_qc': return { label: 'Move to Store' };
    case 'rejected_by_qc': return { label: 'Review NCR', warn: true };
    case 'in_store': return { label: 'Ready to Issue' };
    case 'issued': return { label: 'Issued Out' };
    case 'in_custody': return { label: 'In Custody' };
    case 'installed': return { label: 'Installed' };
    case 'returned': return { label: 'Returned' };
    case 'consumed': return { label: 'Consumed' };
    case 'lost_or_damaged': return { label: 'Report Loss', warn: true };
    default: return { label: '—' };
  }
}

interface LiveItem extends StoreReceiptItem {
  receipt_number: string;
  project_code?: string | null;
}

export function StoreInventory() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [medicalOnly, setMedicalOnly] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('store_receipt_items')
          .select('*, store_receipt:store_receipts(receipt_number, project:projects(project_code))')
          .order('created_at', { ascending: false })
          .limit(500);

        if (data) {
          const mapped: LiveItem[] = (data as any[]).map(item => ({
            ...item,
            receipt_number: (item.store_receipt as any)?.receipt_number ?? '—',
            project_code: (item.store_receipt as any)?.project?.project_code ?? null,
          }));
          setItems(mapped);
        }
      } else {
        const result: LiveItem[] = [];
        mockOrEmpty(MOCK_STORE_RECEIPTS).forEach(r => {
          const receiptItems = MOCK_RECEIPT_ITEMS[r.id] ?? [];
          receiptItems.forEach(item => result.push({
            ...item,
            receipt_number: r.receipt_number,
            project_code: r.project?.project_code ?? null,
          }));
        });
        setItems(result);
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.material_category));
    return ['all', ...Array.from(cats).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter(i => i.material_category === categoryFilter);
    if (medicalOnly) list = list.filter(i => i.serial_required);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.item_name.toLowerCase().includes(q) ||
        (i.item_code ?? '').toLowerCase().includes(q) ||
        (i.storage_location ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, statusFilter, categoryFilter, medicalOnly, search]);

  const inStore = items.filter(i => i.status === 'in_store').length;
  const issuedOut = items.filter(i => ['issued', 'in_custody'].includes(i.status)).length;
  const pendingQc = items.filter(i => i.status === 'pending_qc').length;
  const qcIssues = items.filter(i => i.status === 'rejected_by_qc').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        subtitle="All received materials and their current status"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'Inventory' }]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            <Link
              to="/store/receipts/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              <Layers size={14} /> Receive Material
            </Link>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'In Store', value: inStore, color: 'border-l-emerald-400' },
          { label: 'Issued / In Custody', value: issuedOut, color: 'border-l-gray-300' },
          { label: 'Pending QC', value: pendingQc, color: pendingQc > 0 ? 'border-l-amber-400' : 'border-l-gray-200' },
          { label: 'QC Rejected', value: qcIssues, color: qcIssues > 0 ? 'border-l-red-500' : 'border-l-gray-200' },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${card.color}`}>
            <div className="text-2xl font-bold text-gray-900">{loading ? '…' : card.value}</div>
            <div className="text-sm text-gray-600 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Item name, code, location…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-52"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | ItemStatus)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="received">Received</option>
            <option value="pending_qc">Pending QC</option>
            <option value="accepted_by_qc">QC Accepted</option>
            <option value="rejected_by_qc">QC Rejected</option>
            <option value="in_store">In Store</option>
            <option value="issued">Issued</option>
            <option value="in_custody">In Custody</option>
            <option value="installed">Installed</option>
            <option value="returned">Returned</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={medicalOnly} onChange={e => setMedicalOnly(e.target.checked)} />
            Serialized only
          </label>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Package size={24} className="text-gray-400" />}
              title={items.length === 0 ? 'No materials received yet' : 'No items match filters'}
              description={
                items.length === 0
                  ? 'Receive material to start tracking inventory.'
                  : 'Adjust filters or search to see more results.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Location</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Next Action</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => {
                  const action = nextAction(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                        {item.item_code && (
                          <p className="text-xs text-gray-400 font-mono">{item.item_code}</p>
                        )}
                        {item.serial_required && (
                          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Serialized</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {item.material_category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.quantity_received} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                        {item.storage_location ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ITEM_STATUS_VARIANT[item.status] ?? 'neutral'}>
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className={`text-xs font-medium ${action.warn ? 'text-red-600' : 'text-gray-500'}`}>
                          {action.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm hidden xl:table-cell">
                        <Link
                          to={`/store/receipts/${item.store_receipt_id}`}
                          className="text-brand-600 hover:underline font-mono text-xs"
                        >
                          {item.receipt_number}
                        </Link>
                        {item.project_code && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.project_code}</p>
                        )}
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
