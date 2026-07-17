import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { nextDocNumber } from '../lib/docNumbers';

const HIGH_VALUE_THRESHOLD_SAR = 10000;

interface ProjectOption {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
}

interface SupplierOption {
  id: string;
  supplier_name: string;
  supplier_category: string | null;
}

interface PROption {
  id: string;
  pr_number: string;
}

const CURRENCY_OPTIONS = ['SAR', 'USD', 'EUR', 'AED', 'GBP'];

// Month prefix for PO numbers, e.g. "PO-2607-".
function poPrefix(): string {
  const now = new Date();
  return `PO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}-`;
}

export function ProcurementPurchaseOrderNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();

  const linkedPrId = searchParams.get('pr_id') ?? '';

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [prs, setPrs] = useState<PROption[]>([]);

  const [poNumber, setPoNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [procurementRequestId, setProcurementRequestId] = useState(linkedPrId);
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseValue, setPurchaseValue] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [etaDate, setEtaDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericValue = parseFloat(purchaseValue) || 0;
  const requiresApproval = currency === 'SAR' && numericValue > HIGH_VALUE_THRESHOLD_SAR;

  useEffect(() => {
    // Prefill the next sequential PO number for this month (MAX+1 — the old
    // Math.random() 3-digit numbers could and did produce duplicate PO numbers,
    // since po_number has no unique constraint). Field stays editable for
    // externally-issued PO numbers.
    let cancelled = false;
    nextDocNumber({ table: 'purchase_orders_to_supplier', column: 'po_number', prefix: poPrefix() })
      .then((n) => { if (!cancelled) setPoNumber((prev) => prev || n); });

    if (!isSupabaseConfigured || !supabase) return () => { cancelled = true; };
    const sb = supabase;
    sb.from('projects').select('id, project_code, so_number, customer_name')
      .in('project_status', ['active', 'approved'])
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setProjects((data as ProjectOption[]) ?? []));

    sb.from('approved_suppliers').select('id, supplier_name, supplier_category')
      .in('procurement_status', ['approved', 'approved_with_conditions'])
      .order('supplier_name')
      .then(({ data }) => setSuppliers((data as SupplierOption[]) ?? []));

    sb.from('procurement_requests').select('id, pr_number')
      .not('status', 'in', '(cancelled,closed)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setPrs((data as PROption[]) ?? []));
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!poNumber.trim() || !supplierName.trim() || !purchaseValue) return;

    setSaving(true);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setSaving(false);
      navigate('/procurement/purchase-orders');
      return;
    }

    if (!projectId) {
      setError('Please select a linked project before creating the PO.');
      setSaving(false);
      return;
    }

    // po_number has no DB unique constraint (migration 114 adds a guarded one),
    // so duplicates would be created SILENTLY — check explicitly before insert.
    const { data: dup } = await supabase
      .from('purchase_orders_to_supplier')
      .select('id')
      .eq('po_number', poNumber.trim())
      .limit(1);
    if (dup && dup.length > 0) {
      const fresh = await nextDocNumber({ table: 'purchase_orders_to_supplier', column: 'po_number', prefix: poPrefix() });
      setPoNumber(fresh);
      setError(`PO number was already taken — updated the suggestion to ${fresh}. Submit again.`);
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('purchase_orders_to_supplier')
      .insert({
        po_number: poNumber.trim(),
        supplier_name: supplierName.trim(),
        project_id: projectId,
        procurement_request_id: procurementRequestId || null,
        po_date: poDate,
        purchase_value: numericValue,
        currency,
        eta_date: etaDate || null,
        po_status: requiresApproval ? 'pending_approval' : 'draft',
        approval_required: requiresApproval,
        approval_status: requiresApproval ? 'pending' : 'not_required',
        remarks: remarks.trim() || null,
        created_by: profile?.id ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    navigate(`/procurement/purchase-orders/${(data as { id: string }).id}`);
  }

  return (
    <div>
      <PageHeader
        title="Create PO to Supplier"
        subtitle="Create a new Purchase Order to Supplier. High-value POs (> SAR 10,000) require approval before sending."
        icon={<ShoppingCart size={18} />}
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'PO to Supplier', href: '/procurement/purchase-orders' },
          { label: 'New PO' },
        ]}
        actions={
          <Link to="/procurement/purchase-orders">
            <Button variant="ghost" icon={<ArrowLeft size={15} />}>Back</Button>
          </Link>
        }
        className="mb-6"
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
          Dev mode — form submission navigates back without persisting data
        </div>
      )}

      {requiresApproval && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-300 rounded-lg px-4 py-3 mb-4 text-xs text-orange-800">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-600" />
          <span>
            <strong>Approval required.</strong> PO value exceeds SAR 10,000.
            This PO will be created as <strong>Pending Approval</strong> and must be approved by
            Admin or Operations Manager before it can be sent to supplier.
          </span>
        </div>
      )}

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                PO Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                PO Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Supplier <span className="text-red-500">*</span>
            </label>
            {isSupabaseConfigured && suppliers.length > 0 ? (
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select approved supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.supplier_name}>
                    {s.supplier_name}{s.supplier_category ? ` — ${s.supplier_category}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                placeholder="Supplier name…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            )}
            {isSupabaseConfigured && suppliers.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">Only approved/approved-with-conditions suppliers shown.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Purchase Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchaseValue}
                onChange={(e) => setPurchaseValue(e.target.value)}
                required
                placeholder="0.00"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  requiresApproval ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                }`}
              />
              {requiresApproval && (
                <p className="text-xs text-orange-600 mt-1 font-medium">Approval required (&gt; SAR 10,000)</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              ETA Date
            </label>
            <input
              type="date"
              value={etaDate}
              onChange={(e) => setEtaDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-400 mt-1">Expected date of delivery. Can be updated later with a reason.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Linked PR
            </label>
            {isSupabaseConfigured && prs.length > 0 ? (
              <select
                value={procurementRequestId}
                onChange={(e) => setProcurementRequestId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Not linked to a PR (or link later)…</option>
                {prs.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.pr_number}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                disabled
                placeholder={isSupabaseConfigured ? 'Loading PRs…' : 'Not available in dev mode'}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">Governance: always link a PO to its PR when one exists.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Linked Project</label>
            {isSupabaseConfigured && projects.length > 0 ? (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select project (optional)…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} — {p.so_number} — {p.customer_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                disabled
                placeholder={isSupabaseConfigured ? 'Loading projects…' : 'Not available in dev mode'}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Scope, special terms, delivery instructions…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              loading={saving}
              icon={<Check size={15} />}
              className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
            >
              {requiresApproval ? 'Create PO (Pending Approval)' : 'Create PO'}
            </Button>
            <Link to="/procurement/purchase-orders">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
