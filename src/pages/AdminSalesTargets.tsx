import { useState, useEffect } from 'react';
import { Target, X, Info, RefreshCw, Pencil, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import {
  getSalesUsers,
  getSalesTargetsAdminList,
  upsertSalesTarget,
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

// ─── Add / edit modal — always scoped to one already-chosen employee ──────────

interface TargetModalProps {
  year: number;
  user: SalesUserOption;
  existing: SalesTargetAdminRow | null;
  actorId: string | null;
  onClose: () => void;
  onDone: () => void;
}

function nullableNumber(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
}

function TargetModal({ year, user, existing, actorId, onClose, onDone }: TargetModalProps) {
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
      salesUserId: user.id,
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
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Update Target' : 'Set Target'} · {year}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.fullName ?? user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
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
          <Button size="sm" onClick={handleSave} loading={saving} disabled={saving}>
            {isEdit ? 'Update Target' : 'Save Target'}
          </Button>
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
// One list: every sales employee, whether or not they have a target yet for the
// selected year. Pick a name → set (first time) or update (already has one) —
// no separate "add" vs "missing" flows to reconcile.

interface EmployeeRow {
  user: SalesUserOption;
  target: SalesTargetAdminRow | null;
}

export function AdminSalesTargets() {
  const { profile } = useAuth();
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [search, setSearch] = useState('');

  const [salesUsers, setSalesUsers] = useState<SalesUserOption[]>([]);
  const [targets, setTargets] = useState<SalesTargetAdminRow[]>([]);
  const [availability, setAvailability] = useState<DeferredAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEmployee, setActiveEmployee] = useState<EmployeeRow | null>(null);
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

  // Every sales employee, one row each, joined to their target for this year (if any).
  const employeeRows: EmployeeRow[] = salesUsers.map((user) => ({
    user,
    target: targets.find((t) => t.sales_user_id === user.id) ?? null,
  }));

  const filteredRows = employeeRows.filter((r) => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return (
      (r.user.fullName ?? '').toLowerCase().includes(needle) ||
      r.user.email.toLowerCase().includes(needle)
    );
  });

  const missingCount = employeeRows.filter((r) => r.target == null).length;

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
        subtitle="Every sales employee, one list — pick a name to set or update their annual targets."
        icon={<Target size={18} />}
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Sales Targets' }]}
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {availability && !available && <MigrationPendingNotice availability={availability} />}
      {error && <ModalMessage kind="error" text={error} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Sales Employees" value={available ? String(salesUsers.length) : '—'} tone="text-gray-900" dim={!available} />
        <KpiCard label="With Targets" value={available ? String(targets.length) : '—'} tone="text-emerald-700" dim={!available} />
        <KpiCard label="Missing Targets" value={available ? String(missingCount) : '—'} tone="text-amber-700" dim={!available} />
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
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sales employee name or email"
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-72"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Employee list */}
      <div>
        <SectionHeader title={`Sales Employees — ${year}`} accent="bg-brand-600" />
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : !available ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            Targets are unavailable until migration {availability?.migrationNumber ?? 99} is applied.
          </div>
        ) : salesUsers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            No sales_user accounts found.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            No employees match “{search}”.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-gray-500 whitespace-nowrap">
                  <th className="px-3 py-2 font-medium">Sales Employee</th>
                  <th className="px-3 py-2 font-medium text-right">Sales Order</th>
                  <th className="px-3 py-2 font-medium text-right">Invoicing</th>
                  <th className="px-3 py-2 font-medium text-right">Collection</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr
                    key={r.user.id}
                    onClick={() => setActiveEmployee(r)}
                    className="border-t border-gray-100 hover:bg-brand-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{r.user.fullName ?? r.user.email}</div>
                      <div className="text-[11px] text-gray-400">{r.user.email}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{targetCell(r.target?.sales_order_target ?? null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{targetCell(r.target?.invoicing_target ?? null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{targetCell(r.target?.collection_target ?? null)}</td>
                    <td className="px-3 py-2">
                      {r.target
                        ? <Badge variant="success" size="sm">Set</Badge>
                        : <Badge variant="warning" size="sm">Not set</Badge>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.target ? formatDate(r.target.updated_at) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant={r.target ? 'ghost' : 'outline'}
                        size="sm"
                        icon={r.target ? <Pencil size={13} /> : <Plus size={13} />}
                        onClick={(e) => { e.stopPropagation(); setActiveEmployee(r); }}
                      >
                        {r.target ? 'Update' : 'Set Target'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal — always bound to the employee row that was clicked */}
      {activeEmployee && (
        <TargetModal
          year={year}
          user={activeEmployee.user}
          existing={activeEmployee.target}
          actorId={profile?.id ?? null}
          onClose={() => setActiveEmployee(null)}
          onDone={() => { setActiveEmployee(null); reload(); }}
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
