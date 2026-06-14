import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Search, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_PURCHASE_ORDERS } from '../data/mockProcurement';
import type { PurchaseOrder, UserRole } from '../types';

type POFilterStatus =
  | 'all' | 'draft' | 'pending_approval' | 'approved' | 'sent_to_supplier'
  | 'in_transit' | 'partially_received' | 'fully_received' | 'delayed' | 'cancelled';

const STATUS_TABS: { key: POFilterStatus; label: string }[] = [
  { key: 'all',               label: 'All' },
  { key: 'draft',             label: 'Draft' },
  { key: 'pending_approval',  label: 'Pending Approval' },
  { key: 'approved',          label: 'Approved' },
  { key: 'sent_to_supplier',  label: 'Sent to Supplier' },
  { key: 'in_transit',        label: 'In Transit' },
  { key: 'partially_received', label: 'Partially Received' },
  { key: 'fully_received',    label: 'Received' },
  { key: 'delayed',           label: 'Delayed' },
  { key: 'cancelled',         label: 'Cancelled' },
];

function poStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    draft:              { label: 'Draft',               variant: 'neutral' },
    pending_approval:   { label: 'Pending Approval',    variant: 'warning' },
    approved:           { label: 'Approved',            variant: 'success' },
    rejected:           { label: 'Rejected',            variant: 'critical' },
    sent_to_supplier:   { label: 'Sent to Supplier',    variant: 'info' },
    eta_confirmed:      { label: 'ETA Confirmed',       variant: 'info' },
    in_transit:         { label: 'In Transit',          variant: 'warning' },
    partially_received: { label: 'Partially Received',  variant: 'warning' },
    fully_received:     { label: 'Fully Received',      variant: 'success' },
    delayed:            { label: 'Delayed',             variant: 'critical' },
    cancelled:          { label: 'Cancelled',           variant: 'neutral' },
    closed:             { label: 'Closed',              variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

const COST_VISIBLE_ROLES: UserRole[] = ['admin', 'operations_manager', 'procurement_user'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProcurementPurchaseOrders() {
  const { role } = useAuth();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<POFilterStatus>('all');
  const [search, setSearch] = useState('');

  const canSeeCost = role ? COST_VISIBLE_ROLES.includes(role as UserRole) : false;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setOrders(MOCK_PURCHASE_ORDERS);
      setLoading(false);
      return;
    }
    supabase
      .from('purchase_orders_to_supplier')
      .select('*, project:projects(project_code, so_number, customer_name)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setOrders((data as unknown as PurchaseOrder[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = orders.filter((po) => {
    if (activeStatus !== 'all' && po.po_status !== activeStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        po.po_number.toLowerCase().includes(q) ||
        po.supplier_name.toLowerCase().includes(q) ||
        (po.project?.project_code ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="PO to Supplier"
        subtitle="All Purchase Orders sent to suppliers."
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'PO to Supplier' },
        ]}
      />

      {!canSeeCost && (
        <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-xs text-gray-600">
          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-gray-400" />
          <span>Purchase cost values are hidden for your role.</span>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PO number, supplier, project code…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors -mb-px ${
              activeStatus === tab.key
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={28} />}
          title="No purchase orders found"
          description={search ? 'Try adjusting your search terms.' : 'No POs match the selected filter.'}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">PO Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
                  {canSeeCost && <th className="text-right px-4 py-3 font-semibold text-gray-700">Value</th>}
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Currency</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Approval</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">ETA</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{po.po_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{po.project?.project_code ?? '—'}</div>
                      <div className="text-xs text-gray-500">{po.project?.customer_name ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{po.supplier_name}</td>
                    {canSeeCost && (
                      <td className="px-4 py-3 text-right font-medium">
                        {po.purchase_value.toLocaleString()}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700">{po.currency}</td>
                    <td className="px-4 py-3">{poStatusBadge(po.po_status)}</td>
                    <td className="px-4 py-3">
                      {po.approval_required && po.approval_status === 'pending' ? (
                        <Badge variant="warning">Needs Approval</Badge>
                      ) : po.approval_required ? (
                        <Badge variant={po.approval_status === 'approved' ? 'success' : po.approval_status === 'rejected' ? 'critical' : 'neutral'}>
                          {po.approval_status.replace(/_/g, ' ')}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {po.eta_date ? formatDate(po.eta_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/procurement/purchase-orders/${po.id}`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
