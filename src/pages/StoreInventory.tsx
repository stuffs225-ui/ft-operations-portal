import { useState, useMemo } from 'react';
import { Search, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_STORE_RECEIPTS, MOCK_RECEIPT_ITEMS } from '../data/mockStore';
import type { ItemStatus, StoreReceiptItem } from '../types';

const ITEM_STATUS_VARIANT: Record<ItemStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  received: 'info', pending_qc: 'warning', accepted_by_qc: 'success', rejected_by_qc: 'critical',
  in_store: 'success', issued: 'default', in_custody: 'default', installed: 'success',
  returned: 'neutral', consumed: 'neutral', lost_or_damaged: 'critical',
};

export function StoreInventory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [medicalOnly, setMedicalOnly] = useState(false);

  // Collect all items across all receipts
  const allItems: (StoreReceiptItem & { receipt_number: string })[] = useMemo(() => {
    const result: (StoreReceiptItem & { receipt_number: string })[] = [];
    mockOrEmpty(MOCK_STORE_RECEIPTS).forEach(r => {
      const items = MOCK_RECEIPT_ITEMS[r.id] ?? [];
      items.forEach(item => result.push({ ...item, receipt_number: r.receipt_number }));
    });
    return result;
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(allItems.map(i => i.material_category));
    return ['all', ...Array.from(cats)];
  }, [allItems]);

  const filtered = useMemo(() => {
    let list = allItems;
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
  }, [allItems, statusFilter, categoryFilter, medicalOnly, search]);

  const inStore = allItems.filter(i => i.status === 'in_store').length;
  const issued = allItems.filter(i => ['issued', 'in_custody'].includes(i.status)).length;
  const pendingQc = allItems.filter(i => i.status === 'pending_qc').length;

  return (
    <div className="space-y-5">
      <PageHeader title="Store Inventory" subtitle="All received materials and their current status" />

      <DataSourceBadge variant="preview" />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In Store', value: inStore, color: 'border-l-green-400' },
          { label: 'Issued / In Custody', value: issued, color: 'border-l-sky-400' },
          { label: 'Pending QC', value: pendingQc, color: 'border-l-amber-400' },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${card.color}`}>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
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
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 w-52"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | ItemStatus)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
            <option value="all">All Statuses</option>
            <option value="in_store">In Store</option>
            <option value="issued">Issued</option>
            <option value="in_custody">In Custody</option>
            <option value="pending_qc">Pending QC</option>
            <option value="installed">Installed</option>
            <option value="returned">Returned</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={medicalOnly} onChange={e => setMedicalOnly(e.target.checked)} />
            Medical only
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Package size={24} className="text-gray-400" />}
              title="No items found"
              description="Adjust filters or receive new materials."
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
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Serial?</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                      {item.item_code && <p className="text-xs text-gray-400 font-mono">{item.item_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.material_category}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.quantity_received} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{item.storage_location ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.serial_required ? 'warning' : 'neutral'}>{item.serial_required ? 'Yes' : 'No'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ITEM_STATUS_VARIANT[item.status] ?? 'neutral'}>{item.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm hidden xl:table-cell">
                      <Link to={`/store/receipts/${item.store_receipt_id}`} className="text-sky-600 hover:underline font-mono text-xs">
                        {(item as StoreReceiptItem & { receipt_number: string }).receipt_number}
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
