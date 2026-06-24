import { useState, useEffect } from 'react';
import { Target, X, Plus, Info, RefreshCw, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import {
  getSalesUsers,
  getSalesTargetsAdminList,
  upsertSalesTarget,
  computeMissingTargetUsers,
  validateTargetInput,
  type SalesUserOption,
  type SalesTargetAdminRow,
} from '../lib/salesTargetsQueries';
import type { DeferredAvailability } from '../lib/deferredMigrationSafety';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];
const SELECT_CLS = 'px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white';

// ─── Migration-pending notice ──────────────────────────────────────────────────

function MigrationPendingNotice({ availability }: { availability: DeferredAvailability }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
      <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800">Migration {availability.migrationNumber} pending</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          {availability.unavailableReason ??
            'The required database objects have not been applied to this Supabase database yet.'}
        </p>
      </div>
    </div>
  );
}

function ModalMessage({ kind, text }: { kind: 'error' | 'info'; text: string }) {
  return (
    <p className={cn(
      'text-xs rounded px-3 py-2 border',
      kind === 'error' ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'
    )}>
      {text}
    </p>
  );
}

// ─── Add / edit modal ──────────────────────────────────────────────────────────

interface TargetModalProps {
  year: number;
  salesUsers: SalesUserOption[];
  existing: SalesTargetAdminRow | null;
  presetUserId?: string;
  actorId: string | null;
  onClose: () => void;
  onDone: () => void;
}

function nullableNumber(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
}

function TargetModal({ year, salesUsers, existing, presetUserId, actorId, onClose, onDone }: TargetModalProps) {
  const [userId, setUserId] = useState(existing?.sales_user_id ?? presetUserId ?? '');
  const [salesOrder, setSalesOrder] = useState(existing?.sales_order_target != null ? String(existing.sales_order_target) : '');
  const [invoicing, setInvoicing] = useState(existing?.invoicing_target != null ? String(existing.invoicing_target) : '');
  const [collection, setCollection] = useState(existing?.collection_target != null ? String(existing.collection_target) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? 'SAR');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  const isEdit = existing != null;

  async function handleSave() {
    setMsg(null);
    const params = {
      salesUserId: userId,
      targetYear: year,
      salesOrderTarget: nullableNumber(salesOrder),
      invoicingTarget: nullableNumber(invoicing),
      collectionTarget: nullableNumber(collection),
    };
    const validation = validateTargetInput(params);
    if (!validation.valid) { setMsg({ kind: 'error', text: validation.error ?? 'Invalid input.' }); return; }

    setSaving(true);
    const res = await upsertSalesTarget({ ...params, currency, notes: notes.trim() || null, actorId });
    setSaving(false);
    if (res.success) { onDone(); return; }
    if (res.unavailable) { setMsg({ kind: 'info', text: res.unavailableReason ?? 'Targets are unavailable.' }); return; }
    setMsg({ kind: 'error', text: res.error ?? 'Could not save the target.' });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Edit Target' : 'Add Target'} · {year}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Sales User <span className="text-red-500">*</span></label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isEdit}
              className={cn(SELECT_CLS, 'w-full', isEdit && 'bg-gray-50 text-gray-500')}
            >
              <option value="">Select a sales user…</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName ?? u.email}</option>
              ))}
            </select>
          </div>

          <NumberField label="Sales Order Target" value={salesOrder} onChange={setSalesOrder} placeholder="Leave blank for not set" />
          <NumberField label="Invoicing Target" value={invoicing} onChange={setInvoicing} placeholder="Leave blank for not set" />
          <NumberField label="Collection Target" value={collection} onChange={setCollection} placeholder="Leave blank for not set" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Blank = target not set (NULL). 0 = an explicit zero target. The collection target is never
            substituted from any other field.
          </p>

          {msg && <ModalMessage kind={msg.kind} text={msg.text} />}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={saving}>Save Target</Button>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
      />
    </div>
  );
}

// ─── KPI cards ──────────────────────────────────────────────────────────────────

function targetCell(value: number | null): string {
  return value == null ? '—' : formatCurrency(value);
}

// ─── Main page ───────────────────────────────────────────────────────────────

type ActiveModal =
  | { kind: 'add'; presetUserId?: string }
  | { kind: 'edit'; row: SalesTargetAdminRow }
  | null;

export function AdminSalesTargets() {
  const { profile } = useAuth();
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [search, setSearch] = useState('');

  const [salesUsers, setSalesUsers] = useState<SalesUserOption[]>([]);
  const [targets, setTargets] = useState<SalesTargetAdminRow[]>([]);
  const [availability, setAvailability] = useState<DeferredAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      const usersRes = await getSalesUsers();
      const users = usersRes.data;
      const listRes = await getSalesTargetsAdminList(year, users);
      if (cancelled) return;
      setSalesUsers(users);
      setTargets(listRes.data);
      setAvailability(listRes.availability);
      setError(usersRes.error ?? listRes.error);
      setLoading(false);
    }
    void run();
    return () => { cancelled = true; };
  }, [year, reloadKey]);

  const available = availability?.available ?? false;
  const missingUsers = computeMissingTargetUsers(salesUsers, targets);

  const filteredTargets = targets.filter((t) => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return (
      (t.salesUserName ?? '').toLowerCase().includes(needle) ||
      (t.salesUserEmail ?? '').toLowerCase().includes(needle)
    );
  });

  const totals = targets.reduce(
    (acc, t) => ({
      so: acc.so + (t.sales_order_target ?? 0),
      inv: acc.inv + (t.invoicing_target ?? 0),
      col: acc.col + (t.collection_target ?? 0),
    }),
    { so: 0, inv: 0, col: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Annual Targets"
        subtitle="Set annual commercial targets for each Sales User."
        icon={<Target size={18} />}
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Sales Targets' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={reload} disabled={loading}>
              Refresh
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'add' })} disabled={!available}>
              Add Target
            </Button>
          </div>
        }
      />

      {availability && !available && <MigrationPendingNotice availability={availability} />}
      {error && <ModalMessage kind="error" text={error} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="With Targets" value={available ? String(targets.length) : '—'} tone="text-emerald-700" dim={!available} />
        <KpiCard label="Missing Targets" value={available ? String(missingUsers.length) : '—'} tone="text-amber-700" dim={!available} />
        <KpiCard label="Total SO Target" value={available ? formatCurrency(totals.so) : '—'} tone="text-gray-900" dim={!available} />
        <KpiCard label="Total Invoicing" value={available ? formatCurrency(totals.inv) : '—'} tone="text-blue-700" dim={!available} />
        <KpiCard label="Total Collection" value={available ? formatCurrency(totals.col) : '—'} tone="text-violet-700" dim={!available} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-[0.04em] text-gray-500">Target Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={SELECT_CLS}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-[0.04em] text-gray-500">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sales user name or email"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-64"
            />
          </div>
        </div>
      </div>

      {/* Targets table */}
      <div>
        <SectionHeader title="Targets" accent="bg-brand-600" />
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : !available ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            Targets are unavailable until migration {availability?.migrationNumber ?? 99} is applied.
          </div>
        ) : filteredTargets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            No targets set for {year}. Use “Add Target” or the missing-user list below.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-gray-500 whitespace-nowrap">
                  <th className="px-3 py-2 font-medium">Sales User</th>
                  <th className="px-3 py-2 font-medium text-right">Year</th>
                  <th className="px-3 py-2 font-medium text-right">Sales Order</th>
                  <th className="px-3 py-2 font-medium text-right">Invoicing</th>
                  <th className="px-3 py-2 font-medium text-right">Collection</th>
                  <th className="px-3 py-2 font-medium">Currency</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{t.salesUserName ?? '—'}</div>
                      <div className="text-[11px] text-gray-400">{t.salesUserEmail ?? ''}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{t.target_year}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{targetCell(t.sales_order_target)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{targetCell(t.invoicing_target)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{targetCell(t.collection_target)}</td>
                    <td className="px-3 py-2 text-gray-600">{t.currency}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate" title={t.notes ?? ''}>{t.notes ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(t.updated_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        title="Edit target"
                        onClick={() => setModal({ kind: 'edit', row: t })}
                        className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Missing targets */}
      {available && missingUsers.length > 0 && (
        <div>
          <SectionHeader title={`Sales Users Without a ${year} Target`} accent="bg-amber-500" />
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm divide-y divide-gray-100">
            {missingUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{u.fullName ?? u.email}</div>
                  <div className="text-[11px] text-gray-400">{u.email}</div>
                </div>
                <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'add', presetUserId: u.id })}>
                  Create Target
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal?.kind === 'add' && (
        <TargetModal
          year={year}
          salesUsers={salesUsers}
          existing={null}
          presetUserId={modal.presetUserId}
          actorId={profile?.id ?? null}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); reload(); }}
        />
      )}
      {modal?.kind === 'edit' && (
        <TargetModal
          year={year}
          salesUsers={salesUsers}
          existing={modal.row}
          actorId={profile?.id ?? null}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); reload(); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, tone, dim }: { label: string; value: string; tone: string; dim: boolean }) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200/80 shadow-sm p-3', dim && 'opacity-60')}>
      <div className={cn('text-lg font-bold tabular-nums tracking-[-0.02em]', tone)}>{value}</div>
      <div className="text-[11px] uppercase tracking-[0.04em] text-gray-500 mt-0.5 leading-tight">{label}</div>
    </div>
  );
}
