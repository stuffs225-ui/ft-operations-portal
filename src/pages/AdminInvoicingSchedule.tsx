import { useState, useEffect } from 'react';
import {
  CalendarClock, AlertTriangle, X, History as HistoryIcon, CalendarRange,
  Coins, Split, Info, RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '../components/ui/Button';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { describeOverdue, formatScheduleDate } from '../lib/overdueDisplay';
import {
  getProjectInvoicingScheduleAdminList,
  getProjectInvoicingScheduleAlerts,
  getProjectInvoicingScheduleHistory,
  rescheduleProjectInvoicingSchedule,
  updateProjectInvoicingScheduleAmount,
  splitProjectInvoicingSchedule,
  computeInvoicingScheduleKpis,
  type InvoicingScheduleAdminRow,
  type InvoicingScheduleAlertRow,
  type InvoicingScheduleHistoryRow,
  type InvoicingScheduleKpis,
  type PisStatus,
} from '../lib/projectInvoicingScheduleQueries';
import {
  getScheduleReconciliation,
  type ScheduleReconciliationRow,
  type ReconciliationClass,
} from '../lib/projectFinancialsQueries';
import type { DeferredAvailability } from '../lib/deferredMigrationSafety';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SELECT_CLS = 'px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white';

const STATUS_STYLES: Record<PisStatus, string> = {
  scheduled:   'bg-blue-50 text-blue-700',
  overdue:     'bg-red-50 text-red-700',
  rescheduled: 'bg-amber-50 text-amber-700',
  invoiced:    'bg-emerald-50 text-emerald-700',
  cancelled:   'bg-gray-100 text-gray-500',
};

// ─── Schedule ↔ project reconciliation (migration 103) ─────────────────────────
// Convention: schedule amounts are NET. matches_gross = the migration-100
// trigger's default line carrying total_sales_value (gross for VAT projects) —
// normalize via "Adjust amount" when relevant. mismatch = needs attention.

const RECON_STYLES: Record<ReconciliationClass, { label: string; cls: string }> = {
  matches_net:   { label: 'Matches (net)',   cls: 'bg-emerald-50 text-emerald-700' },
  matches_gross: { label: 'Gross default',   cls: 'bg-amber-50 text-amber-700' },
  mismatch:      { label: 'Mismatch',        cls: 'bg-red-50 text-red-700' },
  no_schedule:   { label: 'No schedule',     cls: 'bg-gray-100 text-gray-500' },
};

function ReconciliationStrip({ reloadKey }: { reloadKey: number }) {
  const [rows, setRows] = useState<ScheduleReconciliationRow[]>([]);
  const [reconAvailability, setReconAvailability] = useState<DeferredAvailability | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getScheduleReconciliation().then((res) => {
      if (cancelled) return;
      setRows(res.data);
      setReconAvailability(res.availability);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  if (!reconAvailability) return null;
  if (!reconAvailability.available) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Net/VAT reconciliation pending: {reconAvailability.unavailableReason}</span>
      </div>
    );
  }

  const counts = rows.reduce<Record<ReconciliationClass, number>>((acc, r) => {
    acc[r.reconciliation] = (acc[r.reconciliation] ?? 0) + 1;
    return acc;
  }, { matches_net: 0, matches_gross: 0, mismatch: 0, no_schedule: 0 });
  const attention = rows.filter((r) => r.reconciliation === 'mismatch' || r.reconciliation === 'matches_gross');

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Coins size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Schedule ↔ Project Reconciliation</span>
          <span className="text-[11px] text-gray-400">(amounts are NET — financial-truth.md)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(RECON_STYLES) as ReconciliationClass[]).map((k) => (
            <span key={k} className={cn('text-[11px] rounded-full px-2 py-0.5 font-medium', RECON_STYLES[k].cls)}>
              {counts[k]} {RECON_STYLES[k].label}
            </span>
          ))}
          {attention.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {expanded ? 'Hide' : 'Review'} {attention.length} needing attention
            </button>
          )}
        </div>
      </div>
      {expanded && attention.length > 0 && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Net</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">VAT</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Gross</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Scheduled</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attention.map((r) => (
                <tr key={r.projectId} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{r.projectCode}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[220px] truncate">{r.customerName}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(r.linesNet)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{formatCurrency(r.linesVat)}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(r.linesGross)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(r.scheduleTotal)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('text-[11px] rounded-full px-2 py-0.5 font-medium', RECON_STYLES[r.reconciliation].cls)}>
                      {RECON_STYLES[r.reconciliation].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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

// ─── KPI cards ──────────────────────────────────────────────────────────────────

function KpiCards({ kpis, available }: { kpis: InvoicingScheduleKpis | null; available: boolean }) {
  const cards: { label: string; value: string; tone: string }[] = [
    { label: 'Total Scheduled', value: kpis ? formatCurrency(kpis.totalScheduledAmount) : '—', tone: 'text-gray-900' },
    { label: 'Pending Invoicing', value: kpis ? formatCurrency(kpis.pendingInvoicingAmount) : '—', tone: 'text-blue-700' },
    { label: 'Overdue Amount', value: kpis ? formatCurrency(kpis.overdueAmount) : '—', tone: 'text-red-700' },
    { label: 'Overdue Lines', value: kpis ? String(kpis.overdueLinesCount) : '—', tone: 'text-red-700' },
    { label: 'Invoiced', value: kpis ? formatCurrency(kpis.invoicedAmount) : '—', tone: 'text-emerald-700' },
    { label: 'Rescheduled Lines', value: kpis ? String(kpis.rescheduledLinesCount) : '—', tone: 'text-amber-700' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            'bg-white rounded-lg border border-gray-200/80 shadow-sm p-3',
            !available && 'opacity-60'
          )}
        >
          <div className={cn('text-lg font-bold tabular-nums tracking-[-0.02em]', c.tone)}>{c.value}</div>
          <div className="text-[11px] uppercase tracking-[0.04em] text-gray-500 mt-0.5 leading-tight">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Reschedule modal ─────────────────────────────────────────────────────────

interface RescheduleModalProps {
  row: InvoicingScheduleAdminRow;
  onClose: () => void;
  onDone: () => void;
}

function RescheduleModal({ row, onClose, onDone }: RescheduleModalProps) {
  const [newDate, setNewDate] = useState(row.currentInvoiceDate);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const res = await rescheduleProjectInvoicingSchedule({
      scheduleId: row.id,
      newInvoiceDate: newDate,
      changeReason: reason,
      changeDetails: details,
    });
    setSaving(false);
    if (res.success) { onDone(); return; }
    if (res.unavailable) { setMsg({ kind: 'info', text: res.unavailableReason ?? 'Reschedule is unavailable.' }); return; }
    setMsg({ kind: 'error', text: res.error ?? 'Could not reschedule this line.' });
  }

  return (
    <ModalShell title="Reschedule Invoice Date" onClose={onClose}>
      <div className="space-y-4">
        <FieldRow label="Project">
          <span className="text-sm text-gray-900">{row.projectCode} — {row.customerName}</span>
        </FieldRow>
        <FieldRow label="Current invoice date">
          <span className="text-sm text-gray-900">{formatDate(row.currentInvoiceDate)}</span>
        </FieldRow>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">New invoice date <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer requested delivery slip"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Details (optional)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {msg && <ModalMessage kind={msg.kind} text={msg.text} />}
      </div>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving} disabled={saving}>Save Reschedule</Button>
      </ModalFooter>
    </ModalShell>
  );
}

// ─── Update amount modal ──────────────────────────────────────────────────────

interface AmountModalProps {
  row: InvoicingScheduleAdminRow;
  onClose: () => void;
  onDone: () => void;
}

function AmountModal({ row, onClose, onDone }: AmountModalProps) {
  const [amount, setAmount] = useState(String(row.invoiceAmount));
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const res = await updateProjectInvoicingScheduleAmount({
      scheduleId: row.id,
      newInvoiceAmount: Number(amount),
      changeReason: reason,
      changeDetails: details,
    });
    setSaving(false);
    if (res.success) { onDone(); return; }
    if (res.unavailable) { setMsg({ kind: 'info', text: res.unavailableReason ?? 'Amount update is unavailable.' }); return; }
    setMsg({ kind: 'error', text: res.error ?? 'Could not update the amount.' });
  }

  return (
    <ModalShell title="Update Invoice Amount" onClose={onClose}>
      <div className="space-y-4">
        <FieldRow label="Project">
          <span className="text-sm text-gray-900">{row.projectCode} — {row.customerName}</span>
        </FieldRow>
        <FieldRow label="Current amount">
          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(row.invoiceAmount)}</span>
        </FieldRow>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">New amount <span className="text-red-500">*</span></label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Scope change — additional unit"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Details (optional)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {msg && <ModalMessage kind={msg.kind} text={msg.text} />}
      </div>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving} disabled={saving}>Save Amount</Button>
      </ModalFooter>
    </ModalShell>
  );
}

// ─── History drawer ────────────────────────────────────────────────────────────

function HistoryDrawer({ row, onClose }: { row: InvoicingScheduleAdminRow; onClose: () => void }) {
  const [history, setHistory] = useState<InvoicingScheduleHistoryRow[]>([]);
  const [availability, setAvailability] = useState<DeferredAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getProjectInvoicingScheduleHistory(row.id);
      if (cancelled) return;
      setHistory(res.data);
      setAvailability(res.availability);
      setError(res.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [row.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
      <div className="bg-white shadow-2xl w-full max-w-md h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Change History</h2>
            <p className="text-xs text-gray-400">{row.projectCode} · Line {row.sequenceNo}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4">
          {loading && <p className="text-sm text-gray-400">Loading history…</p>}
          {!loading && availability && !availability.available && <MigrationPendingNotice availability={availability} />}
          {!loading && error && <ModalMessage kind="error" text={error} />}
          {!loading && availability?.available && history.length === 0 && (
            <p className="text-sm text-gray-400">No changes recorded for this line yet.</p>
          )}
          {!loading && history.length > 0 && (
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="border border-gray-200/80 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-900">{formatDate(h.changedAt)}</span>
                    {h.oldStatus !== h.newStatus && (
                      <span className="text-[11px] text-gray-500">{h.oldStatus} → {h.newStatus}</span>
                    )}
                  </div>
                  {(h.oldInvoiceDate !== h.newInvoiceDate) && (
                    <p className="text-xs text-gray-600">
                      Date: {h.oldInvoiceDate ? formatDate(h.oldInvoiceDate) : '—'} → {h.newInvoiceDate ? formatDate(h.newInvoiceDate) : '—'}
                    </p>
                  )}
                  {(h.oldInvoiceAmount !== h.newInvoiceAmount) && (
                    <p className="text-xs text-gray-600 tabular-nums">
                      Amount: {h.oldInvoiceAmount != null ? formatCurrency(h.oldInvoiceAmount) : '—'} → {h.newInvoiceAmount != null ? formatCurrency(h.newInvoiceAmount) : '—'}
                    </p>
                  )}
                  <p className="text-xs text-gray-800 mt-1.5"><span className="font-medium">Reason:</span> {h.changeReason}</p>
                  {h.changeDetails && <p className="text-xs text-gray-500 mt-0.5">{h.changeDetails}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Split modal ──────────────────────────────────────────────────────────────
// Splits one line into N installments. The RPC (migration 111) cancels the source
// line and inserts N 'admin_split' lines atomically, with full history, and rejects
// any split whose installments don't sum to the original amount.

interface SplitRow { date: string; amount: string; label: string }

function SplitModal({ row, onClose, onDone }: { row: InvoicingScheduleAdminRow; onClose: () => void; onDone: () => void }) {
  const half = Math.round((row.invoiceAmount / 2) * 100) / 100;
  const [rows, setRows] = useState<SplitRow[]>([
    { date: row.currentInvoiceDate, amount: String(half), label: '' },
    { date: row.currentInvoiceDate, amount: String(Math.round((row.invoiceAmount - half) * 100) / 100), label: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const balanced = Math.round(total * 100) === Math.round(row.invoiceAmount * 100);

  function update(i: number, patch: Partial<SplitRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() { setRows((prev) => [...prev, { date: row.currentInvoiceDate, amount: '0', label: '' }]); }
  function removeRow(i: number) { setRows((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i))); }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const res = await splitProjectInvoicingSchedule({
      scheduleId: row.id,
      originalAmount: row.invoiceAmount,
      installments: rows.map((r) => ({ invoiceDate: r.date, amount: Number(r.amount) || 0, label: r.label })),
    });
    setSaving(false);
    if (res.success) { onDone(); return; }
    if (res.unavailable) { setMsg({ kind: 'info', text: res.unavailableReason ?? 'Split is unavailable — apply migration 111.' }); return; }
    setMsg({ kind: 'error', text: res.error ?? 'Could not split the line.' });
  }

  return (
    <ModalShell title="Split into Installments" onClose={onClose}>
      <div className="space-y-4">
        <FieldRow label="Project">
          <span className="text-sm text-gray-900">{row.projectCode} — {row.customerName}</span>
        </FieldRow>
        <FieldRow label="Original amount">
          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(row.invoiceAmount)}</span>
        </FieldRow>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 text-[11px] uppercase tracking-[0.04em] text-gray-400">
            <span>Date</span><span>Amount</span><span>Label (optional)</span><span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 items-center">
              <input type="date" value={r.date} onChange={(e) => update(i, { date: e.target.value })}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input type="number" min="0" step="0.01" value={r.amount} onChange={(e) => update(i, { amount: e.target.value })}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input type="text" value={r.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. Milestone 1"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <button onClick={() => removeRow(i)} disabled={rows.length <= 2}
                className="p-1 rounded text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Remove installment">
                <X size={14} />
              </button>
            </div>
          ))}
          <button onClick={addRow} className="text-xs text-brand-600 hover:underline font-medium">+ Add installment</button>
        </div>

        <div className={cn('flex items-center justify-between text-sm rounded-lg px-3 py-2 border',
          balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700')}>
          <span>Installments total</span>
          <span className="tabular-nums font-semibold">
            {formatCurrency(total)}{!balanced && ` / ${formatCurrency(row.invoiceAmount)}`}
          </span>
        </div>
        {!balanced && (
          <p className="text-[11px] text-amber-600">Installments must sum exactly to the original amount before you can save.</p>
        )}
        {msg && <ModalMessage kind={msg.kind} text={msg.text} />}
      </div>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving} disabled={saving || !balanced}>Save Split</Button>
      </ModalFooter>
    </ModalShell>
  );
}

// ─── Shared modal primitives ────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 -mx-5 -mb-4 mt-4 sticky bottom-0 bg-white">{children}</div>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
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

// ─── Main page ───────────────────────────────────────────────────────────────

type ActiveModal =
  | { kind: 'reschedule'; row: InvoicingScheduleAdminRow }
  | { kind: 'amount'; row: InvoicingScheduleAdminRow }
  | { kind: 'history'; row: InvoicingScheduleAdminRow }
  | { kind: 'split'; row: InvoicingScheduleAdminRow }
  | null;

export function AdminInvoicingSchedule() {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [month, setMonth] = useState<number | 'all'>('all');
  const [status, setStatus] = useState<PisStatus | 'all'>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<InvoicingScheduleAdminRow[]>([]);
  const [alerts, setAlerts] = useState<InvoicingScheduleAlertRow[]>([]);
  const [availability, setAvailability] = useState<DeferredAvailability | null>(null);
  const [alertsAvailability, setAlertsAvailability] = useState<DeferredAvailability | null>(null);
  const [kpis, setKpis] = useState<InvoicingScheduleKpis | null>(null);
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
      const [listRes, alertsRes] = await Promise.all([
        getProjectInvoicingScheduleAdminList({
          selectedYear: year,
          selectedMonth: month === 'all' ? undefined : month,
          status,
          overdueOnly,
          search,
        }),
        getProjectInvoicingScheduleAlerts(),
      ]);
      if (cancelled) return;
      setRows(listRes.data);
      setAvailability(listRes.availability);
      setKpis(listRes.availability.available ? computeInvoicingScheduleKpis(listRes.data) : null);
      setError(listRes.error);
      setAlerts(alertsRes.data);
      setAlertsAvailability(alertsRes.availability);
      setLoading(false);
    }
    void run();
    return () => { cancelled = true; };
  }, [year, month, status, overdueOnly, search, reloadKey]);

  const available = availability?.available ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Invoicing Schedule"
        subtitle="Manage expected invoicing dates, installment lines, overdue schedules, and reschedule reasons."
        icon={<CalendarClock size={18} />}
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Invoicing Schedule' }]}
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {availability && !available && <MigrationPendingNotice availability={availability} />}
      {error && <ModalMessage kind="error" text={error} />}

      {/* KPI cards */}
      <KpiCards kpis={kpis} available={available} />

      {/* Net/VAT reconciliation (migration 103) */}
      <ReconciliationStrip reloadKey={reloadKey} />

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Filter label="Year">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={SELECT_CLS}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Filter>
          <Filter label="Month">
            <select value={month} onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} className={SELECT_CLS}>
              <option value="all">All</option>
              {MONTH_LABELS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Filter>
          <Filter label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as PisStatus | 'all')} className={SELECT_CLS}>
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="overdue">Overdue</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Filter>
          <Filter label="Search">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Project code or customer"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-56"
            />
          </Filter>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-1.5 cursor-pointer">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-gray-300" />
            Overdue only
          </label>
        </div>
      </div>

      {/* Overdue alerts */}
      <div>
        <SectionHeader title="Overdue Alerts" accent="bg-red-600" />
        {alertsAvailability && !alertsAvailability.available ? (
          <MigrationPendingNotice availability={alertsAvailability} />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No overdue invoicing schedule lines.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-gray-500">
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Invoice Date</th>
                  <th className="px-3 py-2 font-medium text-right">Days Overdue</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium text-right">Delays</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.scheduleId} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-3 py-2 font-medium text-gray-900">{a.projectCode}</td>
                    <td className="px-3 py-2 text-gray-700">{a.customerName}</td>
                    <td className="px-3 py-2 text-gray-700">{formatScheduleDate(a.currentInvoiceDate)}</td>
                    <td className="px-3 py-2 text-right"><OverdueCell invoiceDate={a.currentInvoiceDate} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{formatCurrency(a.invoiceAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{a.delayCount}</td>
                    <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule table */}
      <div>
        <SectionHeader title="Schedule Lines" accent="bg-brand-600" />
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            Loading…
          </div>
        ) : !available ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            Schedule lines are unavailable until migration {availability?.migrationNumber ?? 100} is applied.
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-8 text-center text-sm text-gray-400">
            No schedule lines match the current filters.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-gray-500 whitespace-nowrap">
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Sales Owner</th>
                  <th className="px-3 py-2 font-medium text-right">Line</th>
                  <th className="px-3 py-2 font-medium">Label</th>
                  <th className="px-3 py-2 font-medium">Invoice Date</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium text-right">%</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Delays</th>
                  <th className="px-3 py-2 font-medium">Last Reason</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const locked = r.status === 'invoiced' || r.status === 'cancelled';
                  return (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60 align-top">
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.projectCode}</td>
                      <td className="px-3 py-2 text-gray-700">{r.customerName}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.salesUserName ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.sequenceNo}</td>
                      <td className="px-3 py-2 text-gray-700">{r.scheduleLabel ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatScheduleDate(r.currentInvoiceDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900">{formatCurrency(r.invoiceAmount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.invoicePercentage != null ? `${r.invoicePercentage}%` : '—'}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.delayCount}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[180px] truncate" title={r.lastChangeReason ?? ''}>{r.lastChangeReason ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(r.updatedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <IconAction title="View history" onClick={() => setModal({ kind: 'history', row: r })}><HistoryIcon size={14} /></IconAction>
                          <IconAction title={locked ? 'Cannot reschedule an invoiced/cancelled line' : 'Reschedule'} onClick={() => setModal({ kind: 'reschedule', row: r })} disabled={locked}><CalendarRange size={14} /></IconAction>
                          <IconAction title={locked ? 'Cannot adjust an invoiced/cancelled line' : 'Update amount'} onClick={() => setModal({ kind: 'amount', row: r })} disabled={locked}><Coins size={14} /></IconAction>
                          <IconAction title={locked ? 'Cannot split an invoiced/cancelled line' : 'Split into installments'} onClick={() => setModal({ kind: 'split', row: r })} disabled={locked}><Split size={14} /></IconAction>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footnote */}
      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <AlertTriangle size={12} />
        All reschedules and amount changes require a reason and are recorded in change history. Invoiced and cancelled lines are locked.
      </p>

      {/* Modals */}
      {modal?.kind === 'reschedule' && <RescheduleModal row={modal.row} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal?.kind === 'amount' && <AmountModal row={modal.row} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal?.kind === 'history' && <HistoryDrawer row={modal.row} onClose={() => setModal(null)} />}
      {modal?.kind === 'split' && <SplitModal row={modal.row} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-[0.04em] text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: PisStatus }) {
  return (
    <span className={cn('inline-block text-[11px] font-medium px-2 py-0.5 rounded-md capitalize', STATUS_STYLES[status])}>
      {status}
    </span>
  );
}

// Renders a controlled overdue state instead of trusting the raw view figure,
// which can be impossible (e.g. "730317 days") when the source invoice date is a
// placeholder/implausible value. See src/lib/overdueDisplay.ts.
function OverdueCell({ invoiceDate }: { invoiceDate: string | null | undefined }) {
  const d = describeOverdue(invoiceDate);
  if (d.kind === 'overdue') {
    return <span className="tabular-nums text-red-700 font-medium" title={d.label}>{d.days}</span>;
  }
  const tone =
    d.kind === 'invalid' || d.kind === 'no-date' ? 'text-gray-400 italic' : 'text-gray-600';
  return <span className={cn('text-xs', tone)} title={d.label}>{d.label}</span>;
}

function IconAction({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50'
      )}
    >
      {children}
    </button>
  );
}
