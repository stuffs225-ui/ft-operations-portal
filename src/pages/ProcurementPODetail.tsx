import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart, Package, Clock, Shield, ArrowLeft,
  Loader2, Edit2, Check, X, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordProcurementEvent, recordEtaChange } from '../lib/procurementAudit';
import {
  MOCK_PURCHASE_ORDERS, MOCK_PO_ITEMS, MOCK_ETA_HISTORY,
  getMockPOItems, getMockEtaHistory,
} from '../data/mockProcurement';
import type { PurchaseOrder, PurchaseOrderItem, EtaChangeHistory, UserRole } from '../types';

// suppress unused import warnings for arrays used for type reference
void MOCK_PO_ITEMS;
void MOCK_ETA_HISTORY;

type TabKey = 'overview' | 'items' | 'eta' | 'approval' | 'timeline';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',  label: 'Overview',        icon: <ShoppingCart size={15} /> },
  { key: 'items',     label: 'Items',           icon: <Package size={15} /> },
  { key: 'eta',       label: 'ETA Management',  icon: <Clock size={15} /> },
  { key: 'approval',  label: 'Approval',        icon: <Shield size={15} /> },
  { key: 'timeline',  label: 'Timeline',        icon: <Clock size={15} /> },
];

const PO_STATUS_OPTIONS = [
  'draft', 'pending_approval', 'approved', 'rejected',
  'sent_to_supplier', 'eta_confirmed', 'in_transit',
  'partially_received', 'fully_received', 'delayed', 'cancelled', 'closed',
] as const;

const ETA_REASON_OPTIONS = [
  'Supplier delay',
  'Shipping congestion',
  'Manufacturing delay',
  'Customs clearance',
  'Weather / force majeure',
  'Internal decision',
  'Other',
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

function approvalStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    not_required: { label: 'Not Required', variant: 'neutral' },
    pending:      { label: 'Pending',      variant: 'warning' },
    approved:     { label: 'Approved',     variant: 'success' },
    rejected:     { label: 'Rejected',     variant: 'critical' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CAN_UPDATE_STATUS: UserRole[] = ['admin', 'operations_manager', 'procurement_user'];
const CAN_APPROVE: UserRole[] = ['admin', 'operations_manager'];

export function ProcurementPODetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [etaHistory, setEtaHistory] = useState<EtaChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Status editing
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // ETA update
  const [newEta, setNewEta] = useState('');
  const [etaReason, setEtaReason] = useState('');
  const [etaRemarks, setEtaRemarks] = useState('');
  const [etaSaving, setEtaSaving] = useState(false);
  const [etaMsg, setEtaMsg] = useState<string | null>(null);

  // Approval
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [approvalMsg, setApprovalMsg] = useState<string | null>(null);

  const canSeeCost = ['admin', 'operations_manager', 'procurement_user'].includes(role ?? '');
  const canUpdateStatus = role ? CAN_UPDATE_STATUS.includes(role as UserRole) : false;
  const canApprove = role ? CAN_APPROVE.includes(role as UserRole) : false;

  useEffect(() => {
    (async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }

      if (!isSupabaseConfigured || !supabase) {
        const found = MOCK_PURCHASE_ORDERS.find((p) => p.id === id);
        if (!found) { setNotFound(true); setLoading(false); return; }
        setPo(found);
        setNewStatus(found.po_status);
        setNewEta(found.eta_date ?? '');
        setItems(getMockPOItems(id));
        setEtaHistory(getMockEtaHistory(id));
        setLoading(false);
        return;
      }

      const sb = supabase;
      const { data, error } = await sb
        .from('purchase_orders_to_supplier')
        .select('*, project:projects(project_code, so_number, customer_name), approved_by_profile:profiles!purchase_orders_to_supplier_approved_by_fkey(full_name)')
        .eq('id', id)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      const poData = data as unknown as PurchaseOrder;
      setPo(poData);
      setNewStatus(poData.po_status);
      setNewEta(poData.eta_date ?? '');

      const [{ data: itemData }, { data: etaData }] = await Promise.all([
        sb.from('purchase_order_items').select('*').eq('purchase_order_id', id),
        sb
          .from('eta_change_history')
          .select('*')
          .eq('entity_id', id)
          .eq('entity_type', 'po_to_supplier')
          .order('changed_at', { ascending: false }),
      ]);
      setItems((itemData as unknown as PurchaseOrderItem[]) ?? []);
      setEtaHistory((etaData as unknown as EtaChangeHistory[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  function handleStatusSave() {
    if (!po || !newStatus) return;
    setStatusSaving(true);
    setStatusMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setPo({ ...po, po_status: newStatus as PurchaseOrder['po_status'] });
      setEditingStatus(false);
      setStatusSaving(false);
      setStatusMsg('Dev mode — changes not persisted');
      return;
    }

    supabase
      .from('purchase_orders_to_supplier')
      .update({ po_status: newStatus })
      .eq('id', po.id)
      .then(({ error }) => {
        if (error) {
          setStatusMsg('Error: ' + error.message);
          setStatusSaving(false);
          return;
        }
        recordProcurementEvent(
          'purchase_order', po.id, po.project_id,
          'status_updated', `PO status updated to ${newStatus}`,
          null, profile?.id ?? null, profile?.full_name ?? null,
          { old_status: po.po_status, new_status: newStatus },
        );
        setPo({ ...po, po_status: newStatus as PurchaseOrder['po_status'] });
        setEditingStatus(false);
        setStatusSaving(false);
        setStatusMsg('Status updated.');
      });
  }

  function handleEtaUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!po || !newEta || !etaReason.trim()) return;
    setEtaSaving(true);
    setEtaMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      const newEntry: EtaChangeHistory = {
        id: `eta-${Date.now()}`,
        entity_type: 'po_to_supplier',
        entity_id: po.id,
        project_id: po.project_id,
        old_eta: po.eta_date,
        new_eta: newEta,
        changed_by: profile?.id ?? null,
        changed_at: new Date().toISOString(),
        reason: etaReason,
        remarks: etaRemarks.trim() || null,
        changed_by_profile: { full_name: profile?.full_name ?? null },
      };
      setEtaHistory((prev) => [newEntry, ...prev]);
      setPo({ ...po, eta_date: newEta });
      setEtaReason('');
      setEtaRemarks('');
      setEtaSaving(false);
      setEtaMsg('Dev mode — ETA updated in memory only, not persisted');
      return;
    }

    recordEtaChange(
      'po_to_supplier', po.id, po.project_id,
      po.eta_date, newEta, etaReason, etaRemarks.trim() || null, profile?.id ?? null,
    );

    supabase
      .from('purchase_orders_to_supplier')
      .update({ eta_date: newEta })
      .eq('id', po.id)
      .then(({ error }) => {
        if (error) {
          setEtaMsg('Error: ' + error.message);
          setEtaSaving(false);
          return;
        }
        // Re-fetch history
        supabase!
          .from('eta_change_history')
          .select('*')
          .eq('entity_id', po.id)
          .eq('entity_type', 'po_to_supplier')
          .order('changed_at', { ascending: false })
          .then(({ data: etaData }) => {
            setEtaHistory((etaData as unknown as EtaChangeHistory[]) ?? []);
          });
        setPo({ ...po, eta_date: newEta });
        setEtaReason('');
        setEtaRemarks('');
        setEtaSaving(false);
        setEtaMsg('ETA updated successfully.');
      });
  }

  function handleApprove() {
    if (!po) return;
    setApprovalSaving(true);
    setApprovalMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setPo({ ...po, po_status: 'approved', approval_status: 'approved', approved_by: profile?.id ?? null, approved_at: new Date().toISOString() });
      setApprovalSaving(false);
      setApprovalMsg('Dev mode — changes not persisted');
      return;
    }

    const now = new Date().toISOString();
    supabase
      .from('purchase_orders_to_supplier')
      .update({ po_status: 'approved', approval_status: 'approved', approved_by: profile?.id ?? null, approved_at: now })
      .eq('id', po.id)
      .then(({ error }) => {
        if (error) {
          setApprovalMsg('Error: ' + error.message);
          setApprovalSaving(false);
          return;
        }
        recordProcurementEvent(
          'purchase_order', po.id, po.project_id,
          'po_approved', `PO ${po.po_number} approved`,
          null, profile?.id ?? null, profile?.full_name ?? null,
        );
        setPo({ ...po, po_status: 'approved', approval_status: 'approved', approved_by: profile?.id ?? null, approved_at: now });
        setApprovalSaving(false);
        setApprovalMsg('PO approved.');
      });
  }

  function handleReject() {
    if (!po || !rejectionReason.trim()) return;
    setApprovalSaving(true);
    setApprovalMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setPo({ ...po, po_status: 'rejected', approval_status: 'rejected', rejection_reason: rejectionReason.trim(), rejected_by: profile?.id ?? null, rejected_at: new Date().toISOString() });
      setApprovalSaving(false);
      setApprovalMsg('Dev mode — changes not persisted');
      return;
    }

    const now = new Date().toISOString();
    supabase
      .from('purchase_orders_to_supplier')
      .update({ po_status: 'rejected', approval_status: 'rejected', rejection_reason: rejectionReason.trim(), rejected_by: profile?.id ?? null, rejected_at: now })
      .eq('id', po.id)
      .then(({ error }) => {
        if (error) {
          setApprovalMsg('Error: ' + error.message);
          setApprovalSaving(false);
          return;
        }
        recordProcurementEvent(
          'purchase_order', po.id, po.project_id,
          'po_rejected', `PO ${po.po_number} rejected: ${rejectionReason.trim()}`,
          null, profile?.id ?? null, profile?.full_name ?? null,
          { rejection_reason: rejectionReason.trim() },
        );
        setPo({ ...po, po_status: 'rejected', approval_status: 'rejected', rejection_reason: rejectionReason.trim(), rejected_by: profile?.id ?? null, rejected_at: now });
        setRejectionReason('');
        setApprovalSaving(false);
        setApprovalMsg('PO rejected.');
      });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !po) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Purchase order not found.</p>
        <Link to="/procurement/purchase-orders">
          <Button variant="secondary" icon={<ArrowLeft size={16} />}>Back to POs</Button>
        </Link>
      </div>
    );
  }

  const showApprovalTab = po.approval_required || canApprove;

  return (
    <div>
      <PageHeader
        title={po.po_number}
        subtitle={`${po.project?.project_code ?? '—'} — ${po.supplier_name}`}
        icon={<ShoppingCart size={18} />}
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'PO to Supplier', href: '/procurement/purchase-orders' },
          { label: po.po_number },
        ]}
        actions={poStatusBadge(po.po_status)}
        className="mb-6"
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.filter((t) => {
            if (t.key === 'approval' && !showApprovalTab) return false;
            return true;
          }).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'approval' && po.approval_status === 'pending' && (
                <span className="ml-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">PO Details</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">PO Number</dt>
                <dd className="font-mono font-semibold">{po.po_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Project</dt>
                <dd className="font-medium">{po.project?.project_code ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Supplier</dt>
                <dd className="font-medium">{po.supplier_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">PO Date</dt>
                <dd>{formatDate(po.po_date)}</dd>
              </div>
              {canSeeCost && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Purchase Value</dt>
                  <dd className="font-semibold">{po.currency} {po.purchase_value.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>{poStatusBadge(po.po_status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">ETA</dt>
                <dd>{po.eta_date ? formatDate(po.eta_date) : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Approval Required</dt>
                <dd>{po.approval_required ? 'Yes' : 'No'}</dd>
              </div>
              {po.approval_required && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Approval Status</dt>
                  <dd>{approvalStatusBadge(po.approval_status)}</dd>
                </div>
              )}
              {po.approved_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Approved At</dt>
                  <dd>{formatDateTime(po.approved_at)}</dd>
                </div>
              )}
              {po.rejected_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rejected At</dt>
                  <dd>{formatDateTime(po.rejected_at)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {po.remarks && (
            <Card className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Remarks</h3>
              <p className="text-sm text-gray-700">{po.remarks}</p>
            </Card>
          )}

          {po.rejection_reason && (
            <Card className="p-5 border-red-200 bg-red-50 md:col-span-2">
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Rejection Reason</h3>
              <p className="text-sm text-red-800">{po.rejection_reason}</p>
            </Card>
          )}

          {canUpdateStatus && (
            <Card className="p-5 md:col-span-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Update Status</h3>
              {!isSupabaseConfigured && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
                  Dev mode — changes not persisted
                </div>
              )}
              {statusMsg && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  {statusMsg}
                </div>
              )}
              {editingStatus ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {PO_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleStatusSave} loading={statusSaving} icon={<Check size={14} />}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingStatus(false); setNewStatus(po.po_status); }} disabled={statusSaving} icon={<X size={14} />}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEditingStatus(true)} icon={<Edit2 size={14} />}>
                  Change Status
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── Items ── */}
      {activeTab === 'items' && (
        <div>
          {items.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">No items on this PO.</Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Code</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Name</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Unit</th>
                      {canSeeCost && (
                        <>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">Unit Price</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">Line Total</th>
                        </>
                      )}
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.item_code ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.item_name}</div>
                          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity_ordered}</td>
                        <td className="px-4 py-3 text-gray-700">{item.unit}</td>
                        {canSeeCost && (
                          <>
                            <td className="px-4 py-3 text-right">{item.unit_price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-semibold">{item.line_total.toLocaleString()}</td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <Badge variant="neutral">{item.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.expected_arrival_date ? formatDate(item.expected_arrival_date) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {canSeeCost && items.length > 0 && (
                    <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {items.reduce((s, i) => s + i.line_total, 0).toLocaleString()}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── ETA Management ── */}
      {activeTab === 'eta' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Current ETA</h3>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-gray-400" />
              <span className="text-lg font-semibold text-gray-900">
                {po.eta_date ? formatDate(po.eta_date) : 'Not set'}
              </span>
            </div>
          </Card>

          {canUpdateStatus && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Update ETA</h3>
              {!isSupabaseConfigured && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
                  Dev mode — ETA change will be added to history in memory only
                </div>
              )}
              {etaMsg && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  {etaMsg}
                </div>
              )}
              <form onSubmit={handleEtaUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    New ETA Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newEta}
                    onChange={(e) => setNewEta(e.target.value)}
                    required
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={etaReason}
                    onChange={(e) => setEtaReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select reason…</option>
                    {ETA_REASON_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (optional)</label>
                  <textarea
                    value={etaRemarks}
                    onChange={(e) => setEtaRemarks(e.target.value)}
                    rows={3}
                    placeholder="Additional context…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  loading={etaSaving}
                  disabled={!newEta || !etaReason}
                  icon={<Check size={14} />}
                >
                  Update ETA
                </Button>
              </form>
            </Card>
          )}

          {etaHistory.length > 0 && (
            <Card>
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">ETA Change History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Old ETA</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">New ETA</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Reason</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Remarks</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Changed By</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Changed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {etaHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{entry.old_eta ? formatDate(entry.old_eta) : '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.new_eta ? formatDate(entry.new_eta) : '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{entry.reason}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{entry.remarks ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{entry.changed_by_profile?.full_name ?? entry.changed_by ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDateTime(entry.changed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Approval ── */}
      {activeTab === 'approval' && showApprovalTab && (
        <div className="space-y-4">
          <Card className="p-5 bg-sky-50 border-sky-200">
            <div className="flex items-start gap-2 text-xs text-sky-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-sky-600" />
              <span>
                <strong>Governance:</strong> PO to Supplier &gt; 10,000 SAR requires Admin or Operations Manager
                approval before sending to supplier.
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Approval Status</h3>
            <div className="flex items-center gap-3 mb-4">
              {approvalStatusBadge(po.approval_status)}
              {!po.approval_required && (
                <span className="text-xs text-gray-500">This PO does not require approval.</span>
              )}
            </div>

            {po.approval_required && po.approval_status === 'approved' && po.approved_at && (
              <div className="text-sm text-gray-700">
                Approved on {formatDateTime(po.approved_at)}
                {po.approved_by_profile?.full_name && ` by ${po.approved_by_profile.full_name}`}
              </div>
            )}

            {po.approval_required && po.approval_status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                <strong>Rejected</strong>
                {po.rejected_at && ` on ${formatDateTime(po.rejected_at)}`}
                {po.rejection_reason && (
                  <p className="mt-1">Reason: {po.rejection_reason}</p>
                )}
              </div>
            )}
          </Card>

          {canApprove && po.approval_required && po.approval_status === 'pending' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Review & Decision</h3>
              {!isSupabaseConfigured && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
                  Dev mode — changes not persisted
                </div>
              )}
              {approvalMsg && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  {approvalMsg}
                </div>
              )}
              {canSeeCost && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-900">
                    PO Value: {po.currency} {po.purchase_value.toLocaleString()}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Supplier: {po.supplier_name}
                  </p>
                </div>
              )}
              <div className="flex gap-3 flex-wrap mb-4">
                <Button
                  onClick={handleApprove}
                  loading={approvalSaving}
                  icon={<Check size={14} />}
                >
                  Approve PO
                </Button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  Rejection Reason (required to reject)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="State the reason for rejection…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <Button
                  variant="danger"
                  onClick={handleReject}
                  loading={approvalSaving}
                  disabled={!rejectionReason.trim()}
                  icon={<X size={14} />}
                >
                  Reject PO
                </Button>
              </div>
            </Card>
          )}

          {!canApprove && po.approval_required && po.approval_status === 'pending' && (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
              Approval actions are restricted to Admin and Operations Manager roles.
            </div>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {activeTab === 'timeline' && (
        <Card className="p-8 text-center text-gray-500 text-sm">
          Timeline events will appear here.
        </Card>
      )}
    </div>
  );
}
