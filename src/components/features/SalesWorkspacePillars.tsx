// ── Sales Workspace v3 — pillar sections + report dialog ─────────────────────
// The two non-invoicing pillars (Hot Projects, Quotations) and the printable-
// report dialog. Data arrives from salesWorkspaceQueries (the same layer the
// reports use). Everything here is presentation — no RLS assumptions beyond
// what the queries already ride on.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, FileText, Printer, X } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { isQuotationOverdue } from '../../lib/quotationSla';
import {
  getWorkspaceHotProjects, getWorkspaceQuotations, getSalesmanOptions,
  type SalesmanOption,
} from '../../lib/salesWorkspaceQueries';
import {
  renderSalesReport, buildInvoicingSection, buildHotProjectsSection,
  buildQuotationsSection, buildTruncationNote, openPrintWindow,
  type ReportPeriod, type ReportContext,
} from '../../lib/salesReports';
import { getSalesDashboardV2Data } from '../../lib/salesDashboardV2Queries';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { HotProject, QuotationRequest } from '../../types';
import type { SalesInvoicingPlanRow } from '../../types/salesDashboardV2';

function sarK(v: number | null | undefined): string {
  if (v == null || v === 0) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

const nice = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const STAGE_ORDER = ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation', 'won', 'lost', 'cancelled'];
const OPEN_STAGES = ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation'];
const STAGE_BADGE: Record<string, 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default'> = {
  lead: 'neutral', qualified: 'info', proposal_required: 'warning', quotation_requested: 'info',
  negotiation: 'warning', won: 'success', lost: 'critical', cancelled: 'neutral',
};
const QUOTATION_BADGE: Record<string, 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default'> = {
  draft: 'neutral', submitted_by_sales: 'info', received_by_coordinator: 'info', sent_to_estimation: 'info',
  waiting_for_estimation: 'warning', need_clarification: 'warning', quotation_received: 'success',
  returned_to_sales: 'warning', converted_to_hot_project: 'success', converted_to_so: 'success',
  cancelled: 'neutral', closed_lost: 'critical',
};
const CLOSED_QUOTATION = ['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'];

// ── Pillar 2: Hot Projects ────────────────────────────────────────────────────

export function HotProjectsPillar({ hotProjects, loading }: { hotProjects: HotProject[]; loading: boolean }) {
  const open = hotProjects.filter((h) => OPEN_STAGES.includes(h.stage));
  const pipelineValue = open.reduce((s, h) => s + (h.estimated_value ?? 0), 0);
  const byStage = STAGE_ORDER
    .map((stage) => ({ stage, items: hotProjects.filter((h) => h.stage === stage) }))
    .filter((g) => g.items.length > 0);

  return (
    <Card padding="none">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Flame size={14} className="text-orange-500" /> My Pipeline Projects
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {open.length} open · pipeline SAR {sarK(pipelineValue)}
          </p>
        </div>
        <Link to="/hot-projects" className="text-xs text-brand-600 hover:underline font-medium shrink-0">
          Open pipeline →
        </Link>
      </div>
      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : hotProjects.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">No pipeline projects yet.</div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {byStage.map(({ stage, items }) => (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant={STAGE_BADGE[stage] ?? 'neutral'} size="sm">{nice(stage)}</Badge>
                <span className="text-[11px] text-gray-400">
                  {items.length} · SAR {sarK(items.reduce((s, h) => s + (h.estimated_value ?? 0), 0))}
                </span>
              </div>
              <div className="space-y-1">
                {items.slice(0, 4).map((h) => (
                  <Link key={h.id} to={`/hot-projects/${h.id}`}
                    className="flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded hover:bg-gray-50">
                    <span className="truncate">
                      <span className="font-medium text-gray-800">{h.title}</span>
                      <span className="text-gray-400 text-xs"> — {h.customer_name}</span>
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-gray-600 shrink-0">
                      {sarK(h.estimated_value)}
                    </span>
                  </Link>
                ))}
                {items.length > 4 && (
                  <div className="text-[11px] text-gray-400 px-2">+ {items.length - 4} more…</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Pillar 3: Quotations ──────────────────────────────────────────────────────

export function QuotationsPillar({ quotations, loading }: { quotations: QuotationRequest[]; loading: boolean }) {
  const open = quotations.filter((q) => !CLOSED_QUOTATION.includes(q.quotation_status));
  const overdue = open.filter((q) => isQuotationOverdue(q));

  return (
    <Card padding="none">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={14} className="text-brand-600" /> My Quotations
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {open.length} open{overdue.length > 0 && <span className="text-red-600 font-medium"> · {overdue.length} overdue (SLA)</span>}
          </p>
        </div>
        <Link to="/quotations" className="text-xs text-brand-600 hover:underline font-medium shrink-0">
          Open quotations →
        </Link>
      </div>
      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : quotations.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">No quotations yet.</div>
      ) : (
        <div className="px-5 py-3 divide-y divide-gray-50">
          {open.slice(0, 8).map((q) => (
            <Link key={q.id} to={`/quotations/${q.id}`}
              className="flex items-center justify-between gap-2 py-2 hover:bg-gray-50 rounded px-2 -mx-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{q.customer_name}</div>
                <div className="text-[11px] text-gray-400 font-mono">{q.quotation_code}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isQuotationOverdue(q) && <Badge variant="critical" size="sm">Overdue</Badge>}
                <Badge variant={QUOTATION_BADGE[q.quotation_status] ?? 'neutral'} size="sm">
                  {nice(q.quotation_status)}
                </Badge>
              </div>
            </Link>
          ))}
          {open.length === 0 && (
            <div className="py-4 text-center text-sm text-gray-400">Nothing open — all quotations are closed or converted.</div>
          )}
          {open.length > 8 && <div className="text-[11px] text-gray-400 py-2">+ {open.length - 8} more open…</div>}
        </div>
      )}
    </Card>
  );
}

// ── Report dialog ─────────────────────────────────────────────────────────────

type ReportKind = 'invoicing' | 'hot_projects' | 'quotations' | 'combined';
type PeriodKind = 'this_month' | 'this_quarter' | 'this_year' | 'custom';

function resolvePeriod(kind: PeriodKind, from: string, to: string): ReportPeriod {
  const now = new Date();
  const y = now.getFullYear();
  if (kind === 'this_month') {
    const m = now.getMonth();
    return {
      label: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      from: new Date(Date.UTC(y, m, 1)), to: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)),
    };
  }
  if (kind === 'this_quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    return {
      label: `Q${qStart / 3 + 1} ${y}`,
      from: new Date(Date.UTC(y, qStart, 1)), to: new Date(Date.UTC(y, qStart + 3, 0, 23, 59, 59)),
    };
  }
  if (kind === 'this_year') {
    return { label: String(y), from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y, 11, 31, 23, 59, 59)) };
  }
  const f = from ? new Date(from) : null;
  const t = to ? new Date(`${to}T23:59:59`) : null;
  return { label: `${from || '…'} → ${to || '…'}`, from: f, to: t };
}

/**
 * The plan year the invoicing section must use — derived from the REPORT period,
 * not the dashboard's year selector, so all three sections speak for one year.
 * Falls back to the dashboard year only for an open-ended (no-bounds) period.
 */
function reportYearForPeriod(period: ReportPeriod, fallback: number): number {
  if (period.from) return period.from.getUTCFullYear();
  if (period.to) return period.to.getUTCFullYear();
  return fallback;
}

/** Report generation reads far more rows than the on-screen list, and flags any
 *  truncation rather than silently dropping financial rows. */
const REPORT_ROW_CAP = 5000;

/** Custom range is valid only when both ends are set and from ≤ to. */
function isCustomRangeInvalid(kind: PeriodKind, from: string, to: string): boolean {
  return kind === 'custom' && (!from || !to || from > to);
}

interface SalesReportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Current viewer's profile id (report subject when "self" is chosen). */
  selfId: string | null;
  selfName: string;
  /** Viewer is admin/ops — their "self" view spans all salesmen. */
  selfIsBroad: boolean;
  /** Admin may pick any salesman. */
  canPickSalesman: boolean;
  selectedYear: number;
}

export function SalesReportDialog({ open, onClose, selfId, selfName, selfIsBroad, canPickSalesman, selectedYear }: SalesReportDialogProps) {
  const [kind, setKind] = useState<ReportKind>('combined');
  const [periodKind, setPeriodKind] = useState<PeriodKind>('this_month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [salesmen, setSalesmen] = useState<SalesmanOption[]>([]);
  const [subjectId, setSubjectId] = useState<string>('self');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !canPickSalesman) return;
    let cancelled = false;
    void getSalesmanOptions().then((opts) => { if (!cancelled) setSalesmen(opts); });
    return () => { cancelled = true; };
  }, [open, canPickSalesman]);

  // Esc-to-close + initial focus (keyboard users are not stranded).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !generating) onClose();
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, generating, onClose]);

  // Keep Tab focus inside the dialog while it is open.
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select, input, [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  if (!open) return null;

  const customInvalid = isCustomRangeInvalid(periodKind, from, to);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const isSelf = subjectId === 'self';
      const subjectUserId = isSelf ? selfId : subjectId;
      const broad = isSelf && selfIsBroad;
      const subjectName = isSelf ? selfName : (salesmen.find((s) => s.id === subjectId)?.name ?? 'Salesman');
      if (!subjectUserId || !isSupabaseConfigured || !supabase) {
        setError('Not signed in or Supabase is not configured.');
        setGenerating(false);
        return;
      }
      if (isCustomRangeInvalid(periodKind, from, to)) {
        setError('Enter a valid custom range — both dates are required and "from" must be on or before "to".');
        setGenerating(false);
        return;
      }
      const period = resolvePeriod(periodKind, from, to);
      // Invoicing follows the REPORT period's year (not the dashboard selector),
      // so invoicing, pipeline and quotations all describe the same year.
      const reportYear = reportYearForPeriod(period, selectedYear);
      const ctx: ReportContext = { salesmanName: subjectName, period, year: reportYear };
      // Pillar scope: broad view sees all records; otherwise only the subject's.
      const scope = broad ? null : subjectUserId;

      // Same query layer as the on-screen pillars — zero drift by construction.
      const wantInvoicing = kind === 'invoicing' || kind === 'combined';
      const wantHot = kind === 'hot_projects' || kind === 'combined';
      const wantQuotes = kind === 'quotations' || kind === 'combined';

      const [dash, hot, quotes] = await Promise.all([
        wantInvoicing
          ? getSalesDashboardV2Data({ supabase, salesUserId: subjectUserId, selectedYear: reportYear, isBroadView: broad })
          : Promise.resolve(null),
        wantHot
          ? getWorkspaceHotProjects(scope, { limit: REPORT_ROW_CAP })
          : Promise.resolve({ data: [] as HotProject[], error: null, truncated: false }),
        wantQuotes
          ? getWorkspaceQuotations(scope, { limit: REPORT_ROW_CAP })
          : Promise.resolve({ data: [] as QuotationRequest[], error: null, truncated: false }),
      ]);

      const sections: string[] = [];
      // Never omit financial rows silently — flag any capped section at the top.
      const truncated: string[] = [];
      if (wantHot && hot.truncated) truncated.push('Hot Projects');
      if (wantQuotes && quotes.truncated) truncated.push('Quotations');
      const truncNote = buildTruncationNote(REPORT_ROW_CAP, truncated);
      if (truncNote) sections.push(truncNote);

      if (wantInvoicing) {
        const rows: SalesInvoicingPlanRow[] = dash?.data?.invoicingPlanRows ?? [];
        sections.push(buildInvoicingSection(rows, ctx));
      }
      if (wantHot) sections.push(buildHotProjectsSection(hot.data, ctx));
      if (wantQuotes) sections.push(buildQuotationsSection(quotes.data, ctx, isQuotationOverdue));

      const titles: Record<ReportKind, string> = {
        invoicing: 'Invoicing Plan Report',
        hot_projects: 'Hot Projects Pipeline Report',
        quotations: 'Quotations Report',
        combined: 'Sales Performance Report',
      };
      const html = renderSalesReport(titles[kind], sections.join('\n'), ctx);
      if (!openPrintWindow(html)) {
        setError('The browser blocked the report tab — allow pop-ups for this site and try again.');
        setGenerating(false);
        return;
      }
      setGenerating(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate the report.');
      setGenerating(false);
    }
  }

  const selCls = 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !generating && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-report-title"
        tabIndex={-1}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        <div className="flex items-center justify-between">
          <h3 id="sales-report-title" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Printer size={15} className="text-brand-600" /> Generate Report
          </h3>
          <button onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600" disabled={generating}><X size={16} /></button>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Report</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className={selCls}>
            <option value="combined">Combined — all three pillars</option>
            <option value="invoicing">Invoicing Plan</option>
            <option value="hot_projects">Hot Projects Pipeline</option>
            <option value="quotations">Quotations</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Period</label>
          <select value={periodKind} onChange={(e) => setPeriodKind(e.target.value as PeriodKind)} className={selCls}>
            <option value="this_month">This month</option>
            <option value="this_quarter">This quarter</option>
            <option value="this_year">This year</option>
            <option value="custom">Custom range…</option>
          </select>
          {periodKind === 'custom' && (
            <>
              <div className="flex gap-2 mt-2">
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={selCls} aria-label="From date" />
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={selCls} aria-label="To date" />
              </div>
              {customInvalid && (
                <p className="text-[11px] text-amber-600 mt-1.5">
                  {!from || !to ? 'Pick both a start and an end date.' : '“From” must be on or before “To”.'}
                </p>
              )}
            </>
          )}
        </div>

        {canPickSalesman && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Salesman</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selCls}>
              <option value="self">All / my view</option>
              {salesmen.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button size="sm" loading={generating} disabled={customInvalid} icon={<Printer size={13} />} onClick={() => void generate()}>
            Generate & Print
          </Button>
        </div>
      </div>
    </div>
  );
}
