import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Search, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_PROCUREMENT_REQUESTS, MOCK_PR_ITEMS } from '../data/mockProcurement';
import type { ProcurementRequestItem, ProcurementRequest } from '../types';

interface PRItemWithContext extends ProcurementRequestItem {
  pr_number?: string;
  project_code?: string;
  customer_name?: string;
  days_waiting: number;
}

const UNLINKED_STATUSES: ProcurementRequestItem['status'][] = [
  'pending',
  'waiting_for_po_to_supplier',
];

function daysWaiting(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function priorityBadge(days: number) {
  if (days >= 14) return <Badge variant="critical">Overdue {days}d</Badge>;
  if (days >= 7) return <Badge variant="warning">{days}d waiting</Badge>;
  return <Badge variant="neutral">{days}d waiting</Badge>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    pending: { label: 'Pending', variant: 'neutral' },
    waiting_for_po_to_supplier: { label: 'Waiting for PO', variant: 'warning' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

const CAN_CREATE = ['admin', 'operations_manager', 'procurement_user'];

export function ProcurementPrItemsWithoutPo() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const [items, setItems] = useState<PRItemWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const prMap = new Map<string, ProcurementRequest>(
          MOCK_PROCUREMENT_REQUESTS.map((pr) => [pr.id, pr]),
        );
        const unlinked = MOCK_PR_ITEMS
          .filter((item) => UNLINKED_STATUSES.includes(item.status as ProcurementRequestItem['status']))
          .map((item) => {
            const pr = prMap.get(item.procurement_request_id);
            return {
              ...item,
              pr_number: pr?.pr_number,
              project_code: pr?.project?.project_code,
              customer_name: pr?.project?.customer_name,
              days_waiting: daysWaiting(item.created_at),
            };
          })
          .sort((a, b) => b.days_waiting - a.days_waiting);
        setItems(unlinked);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('procurement_request_items')
        .select(`
          *,
          procurement_request:procurement_requests(
            pr_number,
            project:projects(project_code, customer_name)
          )
        `)
        .in('status', UNLINKED_STATUSES)
        .order('created_at', { ascending: true });
      if (error) console.error(error);
      const mapped: PRItemWithContext[] = ((data ?? []) as unknown as (ProcurementRequestItem & {
        procurement_request?: { pr_number: string; project?: { project_code: string; customer_name: string } | null } | null;
      })[]).map((row) => ({
        ...row,
        pr_number: row.procurement_request?.pr_number,
        project_code: row.procurement_request?.project?.project_code,
        customer_name: row.procurement_request?.project?.customer_name,
        days_waiting: daysWaiting(row.created_at),
      })).sort((a, b) => b.days_waiting - a.days_waiting);
      setItems(mapped);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(q) ||
      (item.item_code ?? '').toLowerCase().includes(q) ||
      (item.pr_number ?? '').toLowerCase().includes(q) ||
      (item.project_code ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="PR Items Without PO"
        subtitle="Purchase request items that are not yet linked to a PO to Supplier."
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'PR Items Without PO' },
        ]}
        actions={
          canCreate ? (
            <Link to="/procurement/purchase-orders/new">
              <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <ShoppingCart size={15} />
                Create PO to Supplier
              </button>
            </Link>
          ) : undefined
        }
        className="mb-4"
      />

      {items.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
          <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong>{items.length} item{items.length !== 1 ? 's' : ''}</strong> awaiting PO to Supplier.
            Governance: link PR items to a PO before ordering.
          </span>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item name, code, PR number, project…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title={search ? 'No items match your search' : 'All PR items are linked to supplier POs'}
          description={
            search
              ? 'Try adjusting your search terms.'
              : 'No open purchase request items are waiting for a PO to Supplier. Great work!'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">PR Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Item</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Waiting</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a')) return;
                      navigate(`/procurement/requests/${item.procurement_request_id}`);
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900 text-xs">
                        {item.pr_number ?? item.procurement_request_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-xs">{item.project_code ?? '—'}</div>
                      {item.customer_name && (
                        <div className="text-xs text-gray-400">{item.customer_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      {item.item_code && (
                        <div className="text-xs text-gray-500 font-mono">{item.item_code}</div>
                      )}
                      {item.material_category && (
                        <div className="text-xs text-gray-400">{item.material_category}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {item.quantity_required} <span className="text-xs text-gray-500">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3">{priorityBadge(item.days_waiting)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canCreate && (
                          <Link
                            to="/procurement/purchase-orders/new"
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Create PO
                          </Link>
                        )}
                        <Link
                          to={`/procurement/requests/${item.procurement_request_id}`}
                          className="text-xs font-medium text-brand-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View PR
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} awaiting PO
          </div>
        </Card>
      )}
    </div>
  );
}
