import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Search, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_STORE_RECEIPTS } from '../data/mockStore';
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

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

export function StoreReceipts() {
  const { role } = useAuth();
  const [statusTab, setStatusTab] = useState<'all' | ReceiptStatus>('all');
  const [search, setSearch] = useState('');

  const receipts: StoreReceipt[] = mockOrEmpty(MOCK_STORE_RECEIPTS);
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const filtered = useMemo(() => {
    let list = receipts;
    if (statusTab !== 'all') list = list.filter(r => r.status === statusTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.receipt_number.toLowerCase().includes(q) ||
        (r.supplier_name ?? '').toLowerCase().includes(q) ||
        (r.project?.project_code ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [receipts, statusTab, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material Receipts"
        subtitle="Incoming materials and goods received from suppliers"
        action={
          canCreate ? (
            <Link to="/store/receipts/new">
              <Button variant="primary" size="sm">
                <Plus size={14} className="mr-1" /> New Receipt
              </Button>
            </Link>
          ) : undefined
        }
      />

      <DataSourceBadge variant="preview" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                statusTab === t.key
                  ? 'text-sky-700 border-b-2 border-sky-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by receipt #, supplier, project…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 w-full"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Package size={24} className="text-gray-400" />}
              title="No receipts found"
              description="Create a new material receipt to log received goods."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Receipt #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Supplier</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Received</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{r.receipt_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {r.project ? (
                        <span className="font-mono text-xs">{r.project.project_code}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unallocated</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{r.supplier_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{formatDate(r.received_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{r.receipt_type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/store/receipts/${r.id}`}>
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
