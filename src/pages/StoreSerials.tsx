import { useState, useEffect } from 'react';
import { Hash, Search, ShieldCheck, AlertCircle, Plus, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_MEDICAL_SERIALS as MOCK_MEDICAL_SERIALS_RAW } from '../data/mockStore';
import type { MedicalSerialNumber, SerialQcStatus, SerialCurrentStatus, UserRole } from '../types';

const MOCK_MEDICAL_SERIALS = mockOrEmpty(MOCK_MEDICAL_SERIALS_RAW);

// store_user / admin / operations_manager may register serials (qc_user is
// SELECT+UPDATE only — mirrors the RLS from migration 082).
const CAN_REGISTER: UserRole[] = ['store_user', 'admin', 'operations_manager'];

interface SerialItemOption {
  id: string;
  item_name: string;
  item_code: string | null;
  project_id: string | null;
  store_receipt_id: string;
  receipt_number?: string | null;
  project_code?: string | null;
}

// ── Register Serial modal ──────────────────────────────────────────────────────
function RegisterSerialModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<SerialItemOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(isSupabaseConfigured);
  const [itemId, setItemId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    (async () => {
      const { data } = await supabase
        .from('store_receipt_items')
        .select('id, item_name, item_code, project_id, store_receipt_id, store_receipt:store_receipts(receipt_number), project:projects(project_code)')
        .eq('serial_required', true)
        .order('created_at', { ascending: false })
        .limit(300);
      const rows = ((data ?? []) as unknown as (SerialItemOption & {
        store_receipt?: { receipt_number: string | null } | null;
        project?: { project_code: string | null } | null;
      })[]).map((r) => ({ ...r, receipt_number: r.store_receipt?.receipt_number ?? null, project_code: r.project?.project_code ?? null }));
      setItems(rows);
      setLoadingItems(false);
    })();
  }, []);

  const selected = items.find((i) => i.id === itemId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!serialNumber.trim()) { setError('Serial number is required.'); return; }

    if (!isSupabaseConfigured || !supabase) {
      onSuccess();
      onClose();
      return;
    }
    if (!itemId || !selected) { setError('Select the received item this serial belongs to.'); return; }

    setSaving(true);
    const { error: insErr } = await supabase.from('medical_serial_numbers').insert({
      store_receipt_item_id: selected.id,
      project_id: selected.project_id,
      serial_number: serialNumber.trim(),
      batch_number: batchNumber.trim() || null,
      expiry_date: expiryDate || null,
      manufacturer: manufacturer.trim() || null,
      supplier_name: supplierName.trim() || null,
      created_by: profile?.id ?? null,
    });

    if (insErr) {
      // Unique serial number → friendly message instead of a raw constraint error.
      setError(insErr.code === '23505' ? `Serial "${serialNumber.trim()}" is already registered.` : insErr.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Register Serial Number</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              Dev mode — registration is not persisted.
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Serialized / Medical Item <span className="text-red-500">*</span></label>
            {loadingItems ? (
              <input disabled placeholder="Loading items…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
            ) : items.length === 0 && isSupabaseConfigured ? (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2">No serial-required items received yet.</p>
            ) : (
              <select value={itemId} onChange={(e) => setItemId(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.item_code ? `${i.item_code} — ` : ''}{i.item_name}{i.project_code ? ` · ${i.project_code}` : ''}{i.receipt_number ? ` · ${i.receipt_number}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Serial Number <span className="text-red-500">*</span></label>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Batch Number</label>
              <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Manufacturer</label>
              <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Supplier</label>
              <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">{error}</div>}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving} icon={<Check size={14} />}>Register Serial</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const QC_VARIANT: Record<SerialQcStatus, 'neutral' | 'warning' | 'success' | 'critical'> = {
  not_checked: 'neutral',
  pending_qc: 'warning',
  passed: 'success',
  failed: 'critical',
};

const STATUS_VARIANT: Record<SerialCurrentStatus, 'neutral' | 'info' | 'success' | 'default'> = {
  in_store: 'success',
  in_custody: 'info',
  installed: 'success',
  returned: 'neutral',
  consumed: 'neutral',
  lost_or_damaged: 'neutral',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface LiveSerial extends MedicalSerialNumber {
  item?: { item_name: string; store_receipt_id: string } | null;
  project?: { project_code: string } | null;
}

interface SerialCounts { needsQc: number; failed: number; passed: number; total: number; }

export function StoreSerials() {
  const { role } = useAuth();
  const canRegister = role ? CAN_REGISTER.includes(role as UserRole) : false;
  const [serials, setSerials] = useState<LiveSerial[]>([]);
  const [counts, setCounts] = useState<SerialCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qcFilter, setQcFilter] = useState<'all' | SerialQcStatus>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SerialCurrentStatus>('all');
  const [showRegister, setShowRegister] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const sb = supabase;
        const { data } = await sb
          .from('medical_serial_numbers')
          .select('*, item:store_receipt_items(item_name, store_receipt_id), project:projects(project_code)')
          .order('created_at', { ascending: false })
          .limit(500);
        if (data) setSerials(data as unknown as LiveSerial[]);
        // KPI cards use exact server-side counts (not the 500-row list).
        const cnt = (res: { count: number | null }) => res.count ?? 0;
        const [needsRes, failedRes, passedRes, totalRes] = await Promise.all([
          sb.from('medical_serial_numbers').select('id', { count: 'exact', head: true }).in('qc_status', ['not_checked', 'pending_qc']),
          sb.from('medical_serial_numbers').select('id', { count: 'exact', head: true }).eq('qc_status', 'failed'),
          sb.from('medical_serial_numbers').select('id', { count: 'exact', head: true }).eq('qc_status', 'passed'),
          sb.from('medical_serial_numbers').select('id', { count: 'exact', head: true }),
        ]);
        setCounts({ needsQc: cnt(needsRes), failed: cnt(failedRes), passed: cnt(passedRes), total: cnt(totalRes) });
      } else {
        setSerials(MOCK_MEDICAL_SERIALS as LiveSerial[]);
      }
      setLoading(false);
    })();
  }, [reloadKey]);

  const filtered = serials.filter(s => {
    if (qcFilter !== 'all' && s.qc_status !== qcFilter) return false;
    if (statusFilter !== 'all' && s.current_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !s.serial_number.toLowerCase().includes(q) &&
        !(s.item as any)?.item_name?.toLowerCase().includes(q) &&
        !(s.batch_number ?? '').toLowerCase().includes(q) &&
        !(s.manufacturer ?? '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Live mode: exact server counts; mock mode: derive from the loaded set.
  const needsQc = counts ? counts.needsQc : serials.filter(s => s.qc_status === 'not_checked' || s.qc_status === 'pending_qc').length;
  const failed = counts ? counts.failed : serials.filter(s => s.qc_status === 'failed').length;
  const passed = counts ? counts.passed : serials.filter(s => s.qc_status === 'passed').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Serial Register"
        subtitle="Serialized and medical items tracked by serial number"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'Serial Register' }]}
        actions={
          <div className="flex items-center gap-2">
            {canRegister && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowRegister(true)}>Register Serial</Button>
            )}
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {showRegister && (
        <RegisterSerialModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => setReloadKey((k) => k + 1)}
        />
      )}

      {needsQc > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{needsQc}</strong> serial number{needsQc !== 1 ? 's' : ''} awaiting QC inspection.
            Materials requiring QC must not be issued before QC acceptance.
          </p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Serials', value: counts ? counts.total : serials.length, color: 'border-l-gray-300' },
          { label: 'Awaiting QC', value: needsQc, color: needsQc > 0 ? 'border-l-amber-400' : 'border-l-gray-200' },
          { label: 'QC Failed', value: failed, color: failed > 0 ? 'border-l-red-500' : 'border-l-gray-200' },
          { label: 'QC Passed', value: passed, color: 'border-l-emerald-400' },
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
              placeholder="Serial #, item name, batch…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-52"
            />
          </div>
          <select
            value={qcFilter}
            onChange={e => setQcFilter(e.target.value as 'all' | SerialQcStatus)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All QC Statuses</option>
            <option value="not_checked">Not Checked</option>
            <option value="pending_qc">Pending QC</option>
            <option value="passed">QC Passed</option>
            <option value="failed">QC Failed</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | SerialCurrentStatus)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="in_store">In Store</option>
            <option value="in_custody">In Custody</option>
            <option value="installed">Installed</option>
            <option value="returned">Returned</option>
            <option value="consumed">Consumed</option>
            <option value="lost_or_damaged">Lost / Damaged</option>
          </select>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} serial${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading serial register…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Hash size={24} className="text-gray-400" />}
              title={serials.length === 0 ? 'No serials registered' : 'No serials match filters'}
              description={
                serials.length === 0
                  ? 'Register serial numbers when receiving medical or serialized items.'
                  : 'Adjust filters to see more results.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Serial #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Manufacturer</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">QC Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Current Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Expiry</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono font-medium text-gray-900">{s.serial_number}</p>
                      {s.batch_number && (
                        <p className="text-[10px] text-gray-400">Batch: {s.batch_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {(s.item as any)?.item_name ? (
                        <Link
                          to={`/store/receipts/${(s.item as any).store_receipt_id}`}
                          className="text-sm text-brand-600 hover:underline"
                        >
                          {(s.item as any).item_name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {s.manufacturer ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={QC_VARIANT[s.qc_status] ?? 'neutral'}>
                        {s.qc_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={STATUS_VARIANT[s.current_status] ?? 'neutral'}>
                        {s.current_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm hidden xl:table-cell">
                      {s.expiry_date ? (
                        <span className={new Date(s.expiry_date) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {formatDate(s.expiry_date)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">
                      {(s.project as any)?.project_code ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck size={16} className="text-gray-400 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-600">
          Medical and serialized items must be tracked by serial number before issuance.
          Use <span className="font-medium text-gray-700">Register Serial</span> above to record a serial against a received
          serial-tracked item{canRegister ? '' : ' (Store, Admin, or Operations)'}.
        </p>
      </div>
    </div>
  );
}
