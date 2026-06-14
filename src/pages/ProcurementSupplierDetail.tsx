import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users, ShoppingCart, Shield, Phone, ArrowLeft,
  Loader2, Edit2, Check, X, Star,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_SUPPLIERS, MOCK_PURCHASE_ORDERS,
} from '../data/mockProcurement';
import type { ApprovedSupplier, PurchaseOrder, UserRole } from '../types';

type TabKey = 'overview' | 'procurement' | 'qc' | 'purchase_orders' | 'contacts';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',        label: 'Overview',        icon: <Users size={15} /> },
  { key: 'procurement',     label: 'Procurement',     icon: <ShoppingCart size={15} /> },
  { key: 'qc',              label: 'QC Assessment',   icon: <Shield size={15} /> },
  { key: 'purchase_orders', label: 'Purchase Orders', icon: <ShoppingCart size={15} /> },
  { key: 'contacts',        label: 'Contacts',        icon: <Phone size={15} /> },
];

const PROCUREMENT_STATUS_OPTIONS = [
  'draft', 'pending_review', 'approved', 'approved_with_conditions',
  'suspended', 'blacklisted', 'inactive',
] as const;

const QC_STATUS_OPTIONS = [
  'not_assessed', 'assessed', 'approved', 'approved_with_conditions', 'rejected',
] as const;

const COST_VISIBLE_ROLES: UserRole[] = ['admin', 'operations_manager', 'procurement_user'];

function procurementStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    approved:                { label: 'Approved',                 variant: 'success' },
    approved_with_conditions: { label: 'Approved w/ Conditions', variant: 'warning' },
    suspended:               { label: 'Suspended',               variant: 'critical' },
    blacklisted:             { label: 'Blacklisted',             variant: 'critical' },
    pending_review:          { label: 'Pending Review',          variant: 'info' },
    draft:                   { label: 'Draft',                   variant: 'neutral' },
    inactive:                { label: 'Inactive',                variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function qcStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    approved:                { label: 'Approved',                 variant: 'success' },
    approved_with_conditions: { label: 'Approved w/ Conditions', variant: 'warning' },
    rejected:                { label: 'Rejected',                variant: 'critical' },
    assessed:                { label: 'Assessed',                variant: 'info' },
    not_assessed:            { label: 'Not Assessed',            variant: 'neutral' },
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

function StarRatingDisplay({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-sm text-gray-400">Not rated</span>;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200'}
        />
      ))}
      <span className="text-sm text-gray-600 ml-1">{rating}/5</span>
    </div>
  );
}

function StarRatingSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            size={20}
            className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200 hover:text-amber-300'}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CAN_UPDATE_PROCUREMENT: UserRole[] = ['admin', 'operations_manager', 'procurement_user'];
const CAN_UPDATE_QC: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

export function ProcurementSupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();

  const [supplier, setSupplier] = useState<ApprovedSupplier | null>(null);
  const [supplierPOs, setSupplierPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Procurement status edit
  const [editingProcStatus, setEditingProcStatus] = useState(false);
  const [newProcStatus, setNewProcStatus] = useState('');
  const [procRemarks, setProcRemarks] = useState('');
  const [procSaving, setProcSaving] = useState(false);
  const [procMsg, setProcMsg] = useState<string | null>(null);

  // QC status edit
  const [editingQCStatus, setEditingQCStatus] = useState(false);
  const [newQCStatus, setNewQCStatus] = useState('');
  const [newQualityRating, setNewQualityRating] = useState(0);
  const [qcRemarks, setQcRemarks] = useState('');
  const [qcSaving, setQcSaving] = useState(false);
  const [qcMsg, setQcMsg] = useState<string | null>(null);

  const canSeeCost = role ? COST_VISIBLE_ROLES.includes(role as UserRole) : false;
  const canUpdateProcurement = role ? CAN_UPDATE_PROCUREMENT.includes(role as UserRole) : false;
  const canUpdateQC = role ? CAN_UPDATE_QC.includes(role as UserRole) : false;

  // suppress unused profile warning
  void profile;

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    if (!isSupabaseConfigured || !supabase) {
      const found = MOCK_SUPPLIERS.find((s) => s.id === id);
      if (!found) { setNotFound(true); setLoading(false); return; }
      setSupplier(found);
      setNewProcStatus(found.procurement_status);
      setProcRemarks(found.procurement_remarks ?? '');
      setNewQCStatus(found.qc_status);
      setNewQualityRating(found.quality_rating ?? 0);
      setQcRemarks(found.qc_remarks ?? '');
      setSupplierPOs(MOCK_PURCHASE_ORDERS.filter((po) => po.supplier_id === id));
      setLoading(false);
      return;
    }

    supabase
      .from('approved_suppliers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        const sup = data as unknown as ApprovedSupplier;
        setSupplier(sup);
        setNewProcStatus(sup.procurement_status);
        setProcRemarks(sup.procurement_remarks ?? '');
        setNewQCStatus(sup.qc_status);
        setNewQualityRating(sup.quality_rating ?? 0);
        setQcRemarks(sup.qc_remarks ?? '');

        supabase!
          .from('purchase_orders_to_supplier')
          .select('*, project:projects(project_code, so_number, customer_name)')
          .eq('supplier_id', id)
          .then(({ data: poData }) => {
            setSupplierPOs((poData as unknown as PurchaseOrder[]) ?? []);
            setLoading(false);
          });
      });
  }, [id]);

  function handleProcStatusSave() {
    if (!supplier || !newProcStatus) return;
    setProcSaving(true);
    setProcMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setSupplier({
        ...supplier,
        procurement_status: newProcStatus as ApprovedSupplier['procurement_status'],
        procurement_remarks: procRemarks || null,
      });
      setEditingProcStatus(false);
      setProcSaving(false);
      setProcMsg('Dev mode — changes not persisted');
      return;
    }

    supabase
      .from('approved_suppliers')
      .update({ procurement_status: newProcStatus, procurement_remarks: procRemarks || null })
      .eq('id', supplier.id)
      .then(({ error }) => {
        if (error) {
          setProcMsg('Error: ' + error.message);
          setProcSaving(false);
          return;
        }
        setSupplier({
          ...supplier,
          procurement_status: newProcStatus as ApprovedSupplier['procurement_status'],
          procurement_remarks: procRemarks || null,
        });
        setEditingProcStatus(false);
        setProcSaving(false);
        setProcMsg('Procurement status updated.');
      });
  }

  function handleQCStatusSave() {
    if (!supplier || !newQCStatus) return;
    setQcSaving(true);
    setQcMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setSupplier({
        ...supplier,
        qc_status: newQCStatus as ApprovedSupplier['qc_status'],
        quality_rating: newQualityRating || null,
        qc_remarks: qcRemarks || null,
      });
      setEditingQCStatus(false);
      setQcSaving(false);
      setQcMsg('Dev mode — changes not persisted');
      return;
    }

    supabase
      .from('approved_suppliers')
      .update({ qc_status: newQCStatus, quality_rating: newQualityRating || null, qc_remarks: qcRemarks || null })
      .eq('id', supplier.id)
      .then(({ error }) => {
        if (error) {
          setQcMsg('Error: ' + error.message);
          setQcSaving(false);
          return;
        }
        setSupplier({
          ...supplier,
          qc_status: newQCStatus as ApprovedSupplier['qc_status'],
          quality_rating: newQualityRating || null,
          qc_remarks: qcRemarks || null,
        });
        setEditingQCStatus(false);
        setQcSaving(false);
        setQcMsg('QC status updated.');
      });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !supplier) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Supplier not found.</p>
        <Link to="/procurement/suppliers">
          <Button variant="secondary" icon={<ArrowLeft size={16} />}>Back to Suppliers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={supplier.supplier_name}
        subtitle={supplier.supplier_category ?? 'Supplier'}
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Approved Suppliers', href: '/procurement/suppliers' },
          { label: supplier.supplier_name },
        ]}
        actions={procurementStatusBadge(supplier.procurement_status)}
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
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Supplier Info</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-semibold">{supplier.supplier_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd>{supplier.supplier_category ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Payment Terms</dt>
                <dd>{supplier.payment_terms ?? '—'}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Quality Rating</dt>
                <dd><StarRatingDisplay rating={supplier.quality_rating} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Medical Items</dt>
                <dd>
                  <Badge variant={supplier.approved_for_medical_items ? 'success' : 'neutral'}>
                    {supplier.approved_for_medical_items ? 'Approved' : 'Not Approved'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Critical Items</dt>
                <dd>
                  <Badge variant={supplier.approved_for_critical_items ? 'success' : 'neutral'}>
                    {supplier.approved_for_critical_items ? 'Approved' : 'Not Approved'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd>{formatDate(supplier.created_at)}</dd>
              </div>
            </dl>
          </Card>

          {supplier.materials_supplied && (
            <Card className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Materials Supplied</h3>
              <p className="text-sm text-gray-700">{supplier.materials_supplied}</p>
            </Card>
          )}

          {supplier.remarks && (
            <Card className="p-5 md:col-span-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">General Remarks</h3>
              <p className="text-sm text-gray-700">{supplier.remarks}</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Procurement ── */}
      {activeTab === 'procurement' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Procurement Status</h3>
            <div className="mb-3">{procurementStatusBadge(supplier.procurement_status)}</div>
            {supplier.procurement_remarks && (
              <p className="text-sm text-gray-700 mt-2">{supplier.procurement_remarks}</p>
            )}
          </Card>

          {canUpdateProcurement && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Update Procurement Status</h3>
              {!isSupabaseConfigured && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
                  Dev mode — changes not persisted
                </div>
              )}
              {procMsg && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  {procMsg}
                </div>
              )}
              {editingProcStatus ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={newProcStatus}
                      onChange={(e) => setNewProcStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {PROCUREMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Procurement Remarks</label>
                    <textarea
                      value={procRemarks}
                      onChange={(e) => setProcRemarks(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleProcStatusSave} loading={procSaving} icon={<Check size={14} />}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProcStatus(false)} disabled={procSaving} icon={<X size={14} />}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEditingProcStatus(true)} icon={<Edit2 size={14} />}>
                  Update Status
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── QC Assessment ── */}
      {activeTab === 'qc' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">QC Status</h3>
            <div className="mb-3">{qcStatusBadge(supplier.qc_status)}</div>
            <div className="mb-3"><StarRatingDisplay rating={supplier.quality_rating} /></div>
            {supplier.qc_remarks && (
              <p className="text-sm text-gray-700 mt-2">{supplier.qc_remarks}</p>
            )}
          </Card>

          {canUpdateQC && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Update QC Assessment</h3>
              {!isSupabaseConfigured && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
                  Dev mode — changes not persisted
                </div>
              )}
              {qcMsg && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  {qcMsg}
                </div>
              )}
              {editingQCStatus ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">QC Status</label>
                    <select
                      value={newQCStatus}
                      onChange={(e) => setNewQCStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {QC_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Quality Rating</label>
                    <StarRatingSelector value={newQualityRating} onChange={setNewQualityRating} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">QC Remarks</label>
                    <textarea
                      value={qcRemarks}
                      onChange={(e) => setQcRemarks(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleQCStatusSave} loading={qcSaving} icon={<Check size={14} />}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingQCStatus(false)} disabled={qcSaving} icon={<X size={14} />}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEditingQCStatus(true)} icon={<Edit2 size={14} />}>
                  Update QC Status
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── Purchase Orders ── */}
      {activeTab === 'purchase_orders' && (
        <div>
          {supplierPOs.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">
              No purchase orders from this supplier.
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">PO Number</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Project</th>
                      {canSeeCost && <th className="text-right px-4 py-3 font-semibold text-gray-700">Value</th>}
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">ETA</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {supplierPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{po.po_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{po.project?.project_code ?? '—'}</div>
                          <div className="text-xs text-gray-500">{po.project?.customer_name ?? '—'}</div>
                        </td>
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

      {/* ── Contacts ── */}
      {activeTab === 'contacts' && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 flex items-center gap-1.5">
                <Users size={14} /> Contact Person
              </dt>
              <dd className="font-medium">{supplier.contact_person ?? '—'}</dd>
            </div>
            {supplier.email && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd>
                  <a href={`mailto:${supplier.email}`} className="text-brand-600 hover:underline">
                    {supplier.email}
                  </a>
                </dd>
              </div>
            )}
            {supplier.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500 flex items-center gap-1.5">
                  <Phone size={14} /> Phone
                </dt>
                <dd>
                  <a href={`tel:${supplier.phone}`} className="text-brand-600 hover:underline">
                    {supplier.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}
    </div>
  );
}
