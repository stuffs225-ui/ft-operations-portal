import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText, Package, ShoppingCart, Clock, ArrowLeft,
  Loader2, Plus, Edit2, Check, X, CalendarClock, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordProcurementEvent } from '../lib/procurementAudit';
import {
  MOCK_PROCUREMENT_REQUESTS, MOCK_PR_ITEMS,
  getMockPRItems, getMockPOsForProject,
} from '../data/mockProcurement';
import type { ProcurementRequest, ProcurementRequestItem, PurchaseOrder, UserRole } from '../types';

// suppress unused import warnings for mock data arrays used for type reference
void MOCK_PR_ITEMS;

type TabKey = 'overview' | 'items' | 'purchase_orders' | 'timeline';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',       label: 'Overview',        icon: <FileText size={15} /> },
  { key: 'items',          label: 'Items',           icon: <Package size={15} /> },
  { key: 'purchase_orders', label: 'PO to Supplier', icon: <ShoppingCart size={15} /> },
  { key: 'timeline',       label: 'Timeline',        icon: <Clock size={15} /> },
];

const PR_STATUS_OPTIONS = [
  'draft', 'pr_received', 'in_progress', 'partially_ordered', 'fully_ordered', 'cancelled', 'closed',
] as const;

function prStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    draft:             { label: 'Draft',             variant: 'neutral' },
    pr_received:       { label: 'PR Received',       variant: 'info' },
    in_progress:       { label: 'In Progress',       variant: 'warning' },
    partially_ordered: { label: 'Partially Ordered', variant: 'warning' },
    fully_ordered:     { label: 'Fully Ordered',     variant: 'success' },
    cancelled:         { label: 'Cancelled',         variant: 'neutral' },
    closed:            { label: 'Closed',            variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function prItemStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    pending:                   { label: 'Pending',                variant: 'neutral' },
    waiting_for_po_to_supplier: { label: 'Waiting for PO',        variant: 'warning' },
    po_to_supplier_created:    { label: 'PO Created',             variant: 'info' },
    eta_confirmed:             { label: 'ETA Confirmed',          variant: 'info' },
    in_transit:                { label: 'In Transit',             variant: 'warning' },
    partially_received:        { label: 'Partially Received',     variant: 'warning' },
    fully_received:            { label: 'Fully Received',         variant: 'success' },
    delayed:                   { label: 'Delayed',                variant: 'critical' },
    cancelled:                 { label: 'Cancelled',              variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

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

// A PR line counts as covered once a PO to supplier exists for it — either the
// ordered quantity meets the requirement or the line status shows a PO was cut.
const COVERED_ITEM_STATUSES = [
  'po_to_supplier_created', 'eta_confirmed', 'in_transit',
  'partially_received', 'fully_received',
];

function isLineCovered(item: ProcurementRequestItem): boolean {
  return item.status !== 'cancelled' && (
    item.quantity_ordered >= item.quantity_required ||
    COVERED_ITEM_STATUSES.includes(item.status)
  );
}

export function ProcurementRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();

  const [pr, setPr] = useState<ProcurementRequest | null>(null);
  const [items, setItems] = useState<ProcurementRequestItem[]>([]);
  const [relatedPOs, setRelatedPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Add-line form (Procurement enters only code + quantity + description)
  const [lineCode, setLineCode] = useState('');
  const [lineQty, setLineQty] = useState(1);
  const [lineDesc, setLineDesc] = useState('');
  const [lineSaving, setLineSaving] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);

  // Inline ETA edit per line (records into eta_change_history)
  const [etaEditId, setEtaEditId] = useState<string | null>(null);
  const [etaDate, setEtaDate] = useState('');
  const [etaReason, setEtaReason] = useState('');
  const [etaSaving, setEtaSaving] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);

  const canSeeCost = ['admin', 'operations_manager', 'procurement_user'].includes(role ?? '');
  const canUpdateStatus = role ? CAN_UPDATE_STATUS.includes(role as UserRole) : false;

  useEffect(() => {
    (async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }

      if (!isSupabaseConfigured || !supabase) {
        const found = MOCK_PROCUREMENT_REQUESTS.find((p) => p.id === id);
        if (!found) { setNotFound(true); setLoading(false); return; }
        setPr(found);
        setNewStatus(found.status);
        setItems(getMockPRItems(id));
        setRelatedPOs(getMockPOsForProject(found.project_id).filter(
          (po) => po.procurement_request_id === id,
        ));
        setLoading(false);
        return;
      }

      const sb = supabase;
      const { data, error } = await sb
        .from('procurement_requests')
        .select('*, project:projects(project_code, so_number, customer_name)')
        .eq('id', id)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      const prData = data as unknown as ProcurementRequest;
      setPr(prData);
      setNewStatus(prData.status);

      const [{ data: itemData }, { data: poData }] = await Promise.all([
        sb.from('procurement_request_items').select('*').eq('procurement_request_id', id),
        sb
          .from('purchase_orders_to_supplier')
          .select('*, project:projects(project_code, so_number, customer_name)')
          .eq('procurement_request_id', id),
      ]);
      setItems((itemData as unknown as ProcurementRequestItem[]) ?? []);
      setRelatedPOs((poData as unknown as PurchaseOrder[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  function handleStatusSave() {
    if (!pr || !newStatus) return;

    // The PR cannot be declared fully ordered while any line lacks a PO.
    if (newStatus === 'fully_ordered') {
      const uncovered = items.filter((i) => !isLineCovered(i)).length;
      if (uncovered > 0) {
        setStatusMsg(`Cannot mark as fully ordered — ${uncovered} line(s) still have no PO to supplier.`);
        return;
      }
    }

    setStatusSaving(true);
    setStatusMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setPr({ ...pr, status: newStatus as ProcurementRequest['status'] });
      setEditingStatus(false);
      setStatusSaving(false);
      setStatusMsg('Dev mode — changes not persisted');
      return;
    }

    supabase
      .from('procurement_requests')
      .update({ status: newStatus })
      .eq('id', pr.id)
      .then(({ error }) => {
        if (error) {
          setStatusMsg('Error: ' + error.message);
          setStatusSaving(false);
          return;
        }
        recordProcurementEvent(
          'procurement_request', pr.id, pr.project_id,
          'status_updated', `PR status updated to ${newStatus}`,
          null, profile?.id ?? null, profile?.full_name ?? null,
          { old_status: pr.status, new_status: newStatus },
        );
        setPr({ ...pr, status: newStatus as ProcurementRequest['status'] });
        setEditingStatus(false);
        setStatusSaving(false);
        setStatusMsg('Status updated.');
      });
  }

  async function handleAddLine() {
    if (!pr || !lineDesc.trim() || lineQty <= 0) return;
    setLineSaving(true);
    setLineError(null);

    if (!isSupabaseConfigured || !supabase) {
      setLineSaving(false);
      setLineError('Dev mode — lines are not persisted.');
      return;
    }

    const { data, error } = await supabase
      .from('procurement_request_items')
      .insert({
        procurement_request_id: pr.id,
        project_id: pr.project_id,
        item_code: lineCode.trim() || null,
        item_name: lineDesc.trim(),
        description: lineDesc.trim(),
        quantity_required: lineQty,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      setLineError(error.message);
      setLineSaving(false);
      return;
    }

    recordProcurementEvent(
      'procurement_request', pr.id, pr.project_id,
      'line_added', `PR line added: ${lineDesc.trim()} × ${lineQty}`,
      null, profile?.id ?? null, profile?.full_name ?? null,
      { item_code: lineCode.trim() || null, quantity: lineQty },
    );
    setItems((prev) => [...prev, data as unknown as ProcurementRequestItem]);
    setLineCode('');
    setLineQty(1);
    setLineDesc('');
    setLineSaving(false);
  }

  async function handleEtaSave(item: ProcurementRequestItem) {
    if (!pr || !etaDate) return;
    if (!etaReason.trim()) {
      setEtaError('A reason is required for every ETA change.');
      return;
    }
    setEtaSaving(true);
    setEtaError(null);

    if (!isSupabaseConfigured || !supabase) {
      setEtaSaving(false);
      setEtaEditId(null);
      return;
    }

    const { error } = await supabase
      .from('procurement_request_items')
      .update({ expected_arrival_date: etaDate })
      .eq('id', item.id);

    if (error) {
      setEtaError(error.message);
      setEtaSaving(false);
      return;
    }

    // ETA follow-up trail — every change is recorded with its reason.
    await supabase.from('eta_change_history').insert({
      entity_type: 'pr_item',
      entity_id: item.id,
      project_id: pr.project_id,
      old_eta: item.expected_arrival_date,
      new_eta: etaDate,
      changed_by: profile?.id ?? null,
      reason: etaReason.trim(),
    });

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, expected_arrival_date: etaDate } : i)));
    setEtaEditId(null);
    setEtaDate('');
    setEtaReason('');
    setEtaSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !pr) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Purchase request not found.</p>
        <Link to="/procurement/requests">
          <Button variant="secondary" icon={<ArrowLeft size={16} />}>Back to PRs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={pr.pr_number}
        subtitle={`${pr.project?.project_code ?? '—'} — ${pr.project?.customer_name ?? '—'}`}
        icon={<FileText size={18} />}
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests', href: '/procurement/requests' },
          { label: pr.pr_number },
        ]}
        actions={prStatusBadge(pr.status)}
        className="mb-6"
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
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
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">PR Details</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">PR Number</dt>
                <dd className="font-mono font-semibold">{pr.pr_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Project</dt>
                <dd className="font-medium">{pr.project?.project_code ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer</dt>
                <dd className="text-right max-w-[200px]">{pr.project?.customer_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">PR Type</dt>
                <dd>
                  {pr.pr_type === 'neg'
                    ? <Badge variant="info">NEG — NAFFCO Dubai</Badge>
                    : <Badge variant="neutral">Local</Badge>}
                </dd>
              </div>
              {pr.pr_type === 'neg' && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">NEG PO Number</dt>
                  <dd className="font-mono font-semibold">{pr.neg_po_number ?? '—'}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Source Department</dt>
                <dd>{pr.source_department ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>{prStatusBadge(pr.status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Received Date</dt>
                <dd>{pr.received_date ? formatDate(pr.received_date) : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created At</dt>
                <dd>{formatDateTime(pr.created_at)}</dd>
              </div>
            </dl>
          </Card>

          {pr.remarks && (
            <Card className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Remarks</h3>
              <p className="text-sm text-gray-700">{pr.remarks}</p>
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
                    {PR_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleStatusSave} loading={statusSaving} icon={<Check size={14} />}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingStatus(false); setNewStatus(pr.status); }} disabled={statusSaving} icon={<X size={14} />}>
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
        <div className="space-y-4">
          {/* PO coverage — the PR stays pending until every line has a PO */}
          {items.length > 0 && (() => {
            const covered = items.filter(isLineCovered).length;
            const allCovered = covered === items.length;
            return (
              <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 text-sm ${
                allCovered ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {allCovered ? <Check size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
                <span>
                  <strong>{covered} of {items.length}</strong> line{items.length === 1 ? '' : 's'} covered by a PO to supplier.
                  {!allCovered && ' The PR stays pending until every line has a PO.'}
                </span>
              </div>
            );
          })()}

          {/* Add line — code + quantity + description only */}
          {canUpdateStatus && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Line</h3>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={lineCode}
                  onChange={(e) => setLineCode(e.target.value)}
                  placeholder="Code"
                  className="col-span-3 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="number"
                  min={1}
                  value={lineQty}
                  onChange={(e) => setLineQty(Number(e.target.value))}
                  placeholder="Qty"
                  className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="text"
                  value={lineDesc}
                  onChange={(e) => setLineDesc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddLine(); } }}
                  placeholder="Description"
                  className="col-span-5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button
                  size="sm"
                  className="col-span-2"
                  onClick={() => void handleAddLine()}
                  loading={lineSaving}
                  disabled={!lineDesc.trim() || lineQty <= 0}
                  icon={<Plus size={14} />}
                >
                  Add
                </Button>
              </div>
              {lineError && (
                <p className="text-xs text-red-600 mt-2">{lineError}</p>
              )}
            </Card>
          )}

          {items.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">No items on this purchase request.</Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Code</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Name</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty Req.</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty Ordered</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty Received</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">PO Coverage</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.item_code ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.item_name}</div>
                          {item.description && item.description !== item.item_name && (
                            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity_required} {item.unit}</td>
                        <td className="px-4 py-3 text-right">{item.quantity_ordered}</td>
                        <td className="px-4 py-3 text-right">{item.quantity_received}</td>
                        <td className="px-4 py-3">{prItemStatusBadge(item.status)}</td>
                        <td className="px-4 py-3">
                          {isLineCovered(item)
                            ? <Badge variant="success">PO raised</Badge>
                            : <Badge variant="warning">No PO yet</Badge>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {etaEditId === item.id ? (
                            <div className="space-y-1.5 min-w-[220px]">
                              <input
                                type="date"
                                value={etaDate}
                                onChange={(e) => setEtaDate(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                              <input
                                type="text"
                                value={etaReason}
                                onChange={(e) => setEtaReason(e.target.value)}
                                placeholder="Reason for ETA change"
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                              {etaError && <p className="text-[11px] text-red-600">{etaError}</p>}
                              <div className="flex items-center gap-1.5">
                                <Button size="sm" onClick={() => void handleEtaSave(item)} loading={etaSaving} disabled={!etaDate} icon={<Check size={12} />}>
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEtaEditId(null); setEtaError(null); }} disabled={etaSaving} icon={<X size={12} />}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{item.expected_arrival_date ? formatDate(item.expected_arrival_date) : '—'}</span>
                              {canUpdateStatus && (
                                <button
                                  onClick={() => {
                                    setEtaEditId(item.id);
                                    setEtaDate(item.expected_arrival_date ?? '');
                                    setEtaReason('');
                                    setEtaError(null);
                                  }}
                                  className="text-gray-400 hover:text-brand-600 transition-colors"
                                  title="Set / update ETA"
                                >
                                  <CalendarClock size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {!canSeeCost && (
            <p className="text-xs text-gray-400 mt-3">Purchase cost values are hidden for your role.</p>
          )}
        </div>
      )}

      {/* ── PO to Supplier ── */}
      {activeTab === 'purchase_orders' && (
        <div>
          {relatedPOs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">No POs to Supplier linked to this PR.</p>
              {canUpdateStatus && (
                <Link to="/procurement/purchase-orders">
                  <Button size="sm" variant="secondary" icon={<Plus size={14} />}>
                    Create PO to Supplier
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">PO Number</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
                      {canSeeCost && <th className="text-right px-4 py-3 font-semibold text-gray-700">Value</th>}
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">ETA</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relatedPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{po.po_number}</td>
                        <td className="px-4 py-3 text-gray-700">{po.supplier_name}</td>
                        {canSeeCost && (
                          <td className="px-4 py-3 text-right font-medium">
                            {po.currency} {po.purchase_value.toLocaleString()}
                          </td>
                        )}
                        <td className="px-4 py-3">{poStatusBadge(po.po_status)}</td>
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
