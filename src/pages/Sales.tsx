// ── Sales Dashboard v2 ─────────────────────────────────────────────────────────
// Commercial / Invoicing Control Dashboard.
// Aggregates projects, pipeline, milestones, and targets via useSalesDashboardV2Data.
//
// Old task-focused panels (Action Required, Pending Approval, At Risk, Draft SOs)
// are intentionally removed from this view. Their underlying routes and workflows
// remain unchanged — they are accessible via top action buttons and /projects.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Flame, ReceiptText, BarChart3, ShieldCheck,
  AlertCircle, Info, FolderOpen, TrendingUp, Wallet, Printer,
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import { useSalesDashboardV2Data } from '../hooks/useSalesDashboardV2Data';
import type { UserRole } from '../types';
import type { SalesInvoicingPlanMonths } from '../types/salesDashboardV2';
import {
  HotProjectsPillar, QuotationsPillar, SalesReportDialog,
} from '../components/features/SalesWorkspacePillars';
import { getWorkspaceHotProjects, getWorkspaceQuotations } from '../lib/salesWorkspaceQueries';
import type { HotProject, QuotationRequest } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────────

const CAN_CREATE_SO: UserRole[] = ['admin', 'operations_manager', 'sales_user'];
const BROAD_VIEW_ROLES: UserRole[] = ['admin', 'operations_manager'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const MONTH_KEYS: (keyof SalesInvoicingPlanMonths)[] = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];
const MONTH_LABELS: Record<keyof SalesInvoicingPlanMonths, string> = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
  jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
};

// ── Format helpers ─────────────────────────────────────────────────────────────

function sar(v: number | null | undefined): string {
  if (v == null) return '—';
  return 'SAR ' + v.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function sarK(v: number | null | undefined): string {
  if (v == null || v === 0) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000)     return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toFixed(1) + '%';
}

function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('en-SA');
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Small, light inline affordance — replaces the previous grey "note bar" boxes.
function InlineTag({ label, tone = 'neutral', title }: { label: string; tone?: 'neutral' | 'amber'; title?: string }) {
  const cls = tone === 'amber'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-500 border-gray-200';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.04em] border rounded px-1.5 py-0.5 ${cls} ${title ? 'cursor-help' : ''}`}
    >
      <Info size={9} className="shrink-0" />
      {label}
    </span>
  );
}

// Labelled grouping wrapper for the KPI cards (Portfolio / Pipeline / Risk & Cash).
function KpiGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-400 mb-2 px-0.5">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-3">{children}</div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  /** Render the value calmly (used for zero / unavailable values). */
  muted?: boolean;
  /** Critical emphasis — restrained NAFFCO red. Used only for real status meaning. */
  urgent?: boolean;
  /** Optional trailing affordance (e.g. an "Interim" tag). */
  tag?: React.ReactNode;
}

// Executive KPI card: neutral surface, strong value hierarchy, money/figures in
// tabular numerals, calm muted zeros, and a single restrained red accent reserved
// for genuine critical status (not decoration).
function SalesKpiCard({ label, value, subtitle, icon, muted = false, urgent = false, tag }: KpiCardProps) {
  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-4 ${
        urgent ? 'border-gray-200 border-l-4 border-l-red-500' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={urgent ? 'text-red-500' : 'text-gray-300'}>{icon}</span>
        {tag}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-1">{label}</div>
      <div
        className={`text-2xl font-bold tabular-nums leading-tight tracking-[-0.01em] ${
          urgent ? 'text-red-700' : muted ? 'text-gray-300' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-1 leading-snug">{subtitle}</div>
    </div>
  );
}

function MetricRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 pr-2">{label}</span>
      <span className={`text-sm font-semibold tabular-nums text-right ${muted ? 'text-gray-400' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function TargetBar({ pct, label }: { pct: number | null; label: string }) {
  if (pct == null) return null;
  const clamped = Math.min(100, Math.max(0, pct));
  const barColor =
    pct >= 100 ? 'bg-emerald-500'
    : pct >= 75 ? 'bg-brand-600'
    : pct >= 40 ? 'bg-amber-400'
    : 'bg-gray-300';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-700">{fmtPct(pct)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-gray-100 shadow-sm p-4 space-y-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-2 w-full mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Sales() {
  const { role, profile, loading: authLoading } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);

  const isBroadView  = role ? BROAD_VIEW_ROLES.includes(role) : false;
  const canCreateSO  = role ? CAN_CREATE_SO.includes(role)    : false;

  // Pillars 2 & 3 — same query layer the printable reports use (no drift).
  const [hotProjects, setHotProjects] = useState<HotProject[]>([]);
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [pillarsLoading, setPillarsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const scope = isBroadView ? null : (profile?.id ?? null);
    void Promise.all([getWorkspaceHotProjects(scope), getWorkspaceQuotations(scope)]).then(([hp, q]) => {
      if (cancelled) return;
      setHotProjects(hp.data);
      setQuotations(q.data);
      setPillarsLoading(false);
    });
    return () => { cancelled = true; };
  }, [authLoading, isBroadView, profile?.id]);

  const { data, loading, error } = useSalesDashboardV2Data({
    salesUserId: profile?.id ?? null,
    selectedYear,
    isBroadView,
    enabled: !authLoading,
  });

  const summary  = data?.summary;
  const targets  = data?.targets;
  const planRows = data?.invoicingPlanRows ?? [];
  const warnings = data?.warnings;
  const salesRules = ROLE_MATRIX.sales_user.rules;

  // When project_invoicing_schedule (migration 100) is unavailable, schedule-derived
  // values are shown as unavailable (—) rather than a silent zero, with a banner.
  const scheduleUnavailable = warnings?.invoicingScheduleUnavailable ?? false;

  // Invoicing Plan table footer totals
  const footerTotalValue = planRows.reduce((s, r) => s + r.totalValue, 0);
  const footerPending    = planRows.reduce((s, r) => s + r.pendingInvoicing, 0);
  const footerTtl        = planRows.reduce((s, r) => s + r.ttl, 0);
  const monthTotals      = MONTH_KEYS.reduce<Record<keyof SalesInvoicingPlanMonths, number>>(
    (acc, k) => ({ ...acc, [k]: planRows.reduce((s, r) => s + (r.months[k] ?? 0), 0) }),
    {} as Record<keyof SalesInvoicingPlanMonths, number>,
  );

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Sales Dashboard"
        subtitle="Commercial performance — projects, pipeline, invoicing plan, and annual targets."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label htmlFor="sd-year" className="text-xs text-gray-500 font-medium whitespace-nowrap">
                Year
              </label>
              <select
                id="sd-year"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {role && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_MATRIX.sales_user.badgeClass}`}>
                Sales User
              </span>
            )}
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {/* ── Top actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link to="/quotations/new">
          <Button variant="primary" size="sm"><FileText size={13} className="mr-1" /> New Quotation Request</Button>
        </Link>
        {canCreateSO && (
          <Link to="/projects/new">
            <Button variant="secondary" size="sm"><Plus size={13} className="mr-1" /> Create SO / Project</Button>
          </Link>
        )}
        <Link to="/hot-projects/new">
          <Button variant="secondary" size="sm"><Flame size={13} className="mr-1" /> Add Hot Project</Button>
        </Link>
        <Link to="/receivables">
          <Button variant="secondary" size="sm"><ReceiptText size={13} className="mr-1" /> View Receivables</Button>
        </Link>
        <Link to="/reports/sales">
          <Button variant="secondary" size="sm"><BarChart3 size={13} className="mr-1" /> Sales Reports</Button>
        </Link>
        <Button variant="secondary" size="sm" onClick={() => setReportOpen(true)}>
          <Printer size={13} className="mr-1" /> Generate Report
        </Button>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {(loading || authLoading) && <DashboardSkeleton />}

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {!loading && !authLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to load dashboard data</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Dashboard body ────────────────────────────────────────────────────── */}
      {!loading && !authLoading && !error && (
        <>

          {/* ── Migration-pending notice: invoicing schedule unavailable ───────── */}
          {scheduleUnavailable && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3.5 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Project Invoicing Schedule migration is not active yet
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Invoicing schedule data is temporarily unavailable. Projects, pipeline, sales-order
                  and collection figures below are still live; invoicing-plan and invoicing-target
                  values are shown as “—” until the migration is applied.
                </p>
              </div>
            </div>
          )}

          {/* ── KPI cards — grouped Portfolio / Pipeline / Risk & Cash ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiGroup title="Portfolio">
              <SalesKpiCard
                label="Projects"
                value={fmtInt(summary?.projectsCount)}
                subtitle="Approved, active & completed"
                icon={<FolderOpen size={16} />}
                muted={(summary?.projectsCount ?? 0) === 0}
              />
              <SalesKpiCard
                label="Total Project Value"
                value={sar(summary?.totalProjectValue)}
                subtitle="Approved / active portfolio"
                icon={<Wallet size={16} />}
                muted={!summary?.totalProjectValue}
              />
            </KpiGroup>

            <KpiGroup title="Pipeline">
              <SalesKpiCard
                label="Pipeline Projects"
                value={fmtInt(summary?.pipelineProjectsCount)}
                subtitle="Open hot projects"
                icon={<Flame size={16} />}
                muted={(summary?.pipelineProjectsCount ?? 0) === 0}
              />
              <SalesKpiCard
                label="Pipeline Value"
                value={sar(summary?.totalPipelineValue)}
                subtitle="Estimated — unweighted"
                icon={<TrendingUp size={16} />}
                muted={!summary?.totalPipelineValue}
              />
            </KpiGroup>

            <KpiGroup title="Risk & Cash">
              <SalesKpiCard
                label="Projects At Risk"
                value={fmtInt(summary?.projectsAtRiskCount)}
                subtitle="Sent back for revision"
                icon={<AlertCircle size={16} />}
                muted={(summary?.projectsAtRiskCount ?? 0) === 0}
                urgent={(summary?.projectsAtRiskCount ?? 0) > 0}
                tag={
                  warnings?.projectsAtRiskDefinitionPending ? (
                    <InlineTag
                      label="Interim"
                      title="Interim definition: counts projects sent back for revision, not commercial delivery risk. A refined definition is pending."
                    />
                  ) : undefined
                }
              />
              <SalesKpiCard
                label="Pending Invoicing"
                value={scheduleUnavailable ? '—' : sar(summary?.pendingInvoicingValue)}
                subtitle={scheduleUnavailable ? 'Unavailable — migration pending' : 'Scheduled, not yet invoiced'}
                icon={<ReceiptText size={16} />}
                muted={scheduleUnavailable || !summary?.pendingInvoicingValue}
              />
            </KpiGroup>
          </div>

          {/* ── Invoicing Plan table ───────────────────────────────────────────── */}
          <Card padding="none">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <ReceiptText size={14} className="text-indigo-500" />
                  My Invoicing Plan — {selectedYear}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Per-project monthly milestone schedule</p>
              </div>
              <Link to="/projects" className="text-xs text-emerald-600 hover:underline font-medium shrink-0">
                Open Projects →
              </Link>
            </div>

            {scheduleUnavailable ? (
              <div className="px-5 py-10 text-center">
                <AlertCircle size={28} className="mx-auto text-amber-300 mb-2" />
                <p className="text-sm text-gray-600">Invoicing plan is temporarily unavailable.</p>
                <p className="text-xs text-gray-400 mt-1">
                  The Project Invoicing Schedule migration is not active yet. This section will populate
                  once it is applied — no data is fabricated in the meantime.
                </p>
              </div>
            ) : planRows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ReceiptText size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No invoicing plan data for {selectedYear}.</p>
                <p className="text-xs text-gray-400 mt-1">Projects with milestone schedules will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '1280px' }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-[0.05em] whitespace-nowrap border-r border-gray-100">
                        Customer
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-[0.05em] whitespace-nowrap">
                        Order / PO
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-[0.05em] whitespace-nowrap">
                        Qty
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-[0.05em] whitespace-nowrap">
                        Total Value
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-[0.05em] whitespace-nowrap">
                        Pending
                      </th>
                      {MONTH_KEYS.map(m => (
                        <th key={m} className="px-2 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-[0.05em] whitespace-nowrap w-16">
                          {MONTH_LABELS[m]}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-700 uppercase tracking-[0.05em] whitespace-nowrap bg-indigo-50/60">
                        TTL
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-700 uppercase tracking-[0.05em] whitespace-nowrap bg-indigo-50/60">
                        {selectedYear}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {planRows.map(row => (
                      <tr key={row.projectId} className="hover:bg-gray-50/60 group">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 px-4 py-2.5 border-r border-gray-100">
                          <div className="font-medium text-gray-900 whitespace-nowrap">{row.customerName}</div>
                          <div className="text-gray-400 font-mono text-[11px] mt-0.5">{row.projectCode}</div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 font-mono whitespace-nowrap">{row.orderOrPo || '—'}</td>
                        <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">
                          {row.quantity ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-900 font-medium tabular-nums whitespace-nowrap">
                          {sarK(row.totalValue)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-indigo-700 font-medium">
                          {row.pendingInvoicing > 0 ? sarK(row.pendingInvoicing) : <span className="text-gray-300">—</span>}
                        </td>
                        {MONTH_KEYS.map(m => {
                          const v = row.months[m];
                          const hasValue = v != null && v > 0;
                          return (
                            <td
                              key={m}
                              className={`px-2 py-2.5 text-right tabular-nums whitespace-nowrap w-16 ${
                                hasValue ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-gray-300'
                              }`}
                            >
                              {hasValue ? sarK(v) : '—'}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-right text-gray-900 font-semibold tabular-nums whitespace-nowrap bg-indigo-50/40">
                          {row.ttl > 0 ? sarK(row.ttl) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-900 font-semibold tabular-nums whitespace-nowrap bg-indigo-50/40">
                          {row.selectedYearValue > 0 ? sarK(row.selectedYearValue) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 border-r border-gray-100 text-xs text-gray-700 uppercase tracking-[0.05em]">
                        Total ({planRows.length})
                      </td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                      <td className="px-3 py-2.5 text-right text-gray-900 tabular-nums">{sarK(footerTotalValue)}</td>
                      <td className="px-3 py-2.5 text-right text-indigo-700 tabular-nums">
                        {footerPending > 0 ? sarK(footerPending) : <span className="text-gray-300">—</span>}
                      </td>
                      {MONTH_KEYS.map(m => {
                        const v = monthTotals[m];
                        return (
                          <td key={m} className={`px-2 py-2.5 text-right tabular-nums w-16 ${v > 0 ? 'text-emerald-800 font-semibold' : 'text-gray-300'}`}>
                            {v > 0 ? sarK(v) : '—'}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right text-gray-900 tabular-nums bg-indigo-50/40">
                        {footerTtl > 0 ? sarK(footerTtl) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900 tabular-nums bg-indigo-50/40">
                        {footerTtl > 0 ? sarK(footerTtl) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* ── Pillars 2 & 3: Hot Projects + Quotations ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HotProjectsPillar hotProjects={hotProjects} loading={pillarsLoading} />
            <QuotationsPillar quotations={quotations} loading={pillarsLoading} />
          </div>

          {/* ── Annual Targets ─────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BarChart3 size={14} className="text-gray-500" />
                Annual Targets — {selectedYear}
              </h2>
              {warnings?.noTargetsRecord && (
                <InlineTag
                  tone="amber"
                  label={`Set ${selectedYear} targets`}
                  title={`No annual targets configured for ${selectedYear}. Annual targets are configured by an administrator.`}
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Invoicing */}
              <Card padding="none">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-[0.06em] flex items-center gap-1.5">
                    <ReceiptText size={12} className="text-indigo-500" /> Invoicing
                  </h3>
                </div>
                <div className="px-4 pt-3 pb-0">
                  <MetricRow
                    label="Target"
                    value={targets?.invoicingTarget != null ? sar(targets.invoicingTarget) : '—'}
                    muted={targets?.invoicingTarget == null}
                  />
                  <MetricRow label="Invoiced up to date"     value={scheduleUnavailable ? '—' : sar(targets?.invoicingUpToDate)}              muted={scheduleUnavailable} />
                  <MetricRow label="Year plan (remaining)"   value={scheduleUnavailable ? '—' : sar(targets?.invoicingYearPlan)}              muted={scheduleUnavailable} />
                  <MetricRow label="Expected total"          value={scheduleUnavailable ? '—' : sar(targets?.invoicingExpectedTotal)}         muted={scheduleUnavailable} />
                  <MetricRow label="Actual % up to now"      value={scheduleUnavailable ? '—' : fmtPct(targets?.invoicingActualPercentUpToNow)} muted={scheduleUnavailable} />
                </div>
                <div className="px-4 pb-3 mt-2">
                  <TargetBar pct={scheduleUnavailable ? null : (targets?.invoicingPercent ?? null)} label="Expected vs target" />
                  {scheduleUnavailable && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-2">
                      <AlertCircle size={10} className="shrink-0" />
                      Invoicing schedule migration not active — values unavailable.
                    </p>
                  )}
                  {warnings?.invoicingTargetNotSet && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-2">
                      <Info size={10} className="shrink-0" />
                      Invoicing target not configured for {selectedYear}.
                    </p>
                  )}
                </div>
              </Card>

              {/* Sales Orders */}
              <Card padding="none">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-[0.06em] flex items-center gap-1.5">
                    <FolderOpen size={12} className="text-emerald-500" /> Sales Orders
                  </h3>
                </div>
                <div className="px-4 pt-3 pb-0">
                  <MetricRow
                    label="Target (SO)"
                    value={targets?.salesOrderTarget != null ? sar(targets.salesOrderTarget) : '—'}
                    muted={targets?.salesOrderTarget == null}
                  />
                  <MetricRow label="Achieved (approved in year)" value={sar(targets?.salesOrderAchieved)}    />
                  <MetricRow label="Year plan (portfolio)"       value={sar(targets?.salesOrderYearPlan)}    />
                  <MetricRow label="Total expected SO"           value={sar(targets?.salesOrderExpectedTotal)} />
                </div>
                <div className="px-4 pb-3 mt-2">
                  <TargetBar pct={targets?.salesOrderPercent ?? null} label="Achieved vs target" />
                  {warnings?.salesOrderTargetNotSet && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-2">
                      <Info size={10} className="shrink-0" />
                      Sales order target not configured for {selectedYear}.
                    </p>
                  )}
                </div>
              </Card>

              {/* Collection */}
              <Card padding="none">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-[0.06em] flex items-center gap-1.5">
                    <Wallet size={12} className="text-orange-500" /> Collection
                  </h3>
                </div>
                <div className="px-4 pt-3 pb-0">
                  <MetricRow
                    label="Collection target"
                    value={targets?.collectionTarget != null ? sar(targets.collectionTarget) : '—'}
                    muted={targets?.collectionTarget == null}
                  />
                  <MetricRow label="Collected to date"        value={sar(targets?.collectedToDate)}              />
                  <MetricRow label="Outstanding receivables"  value={sar(summary?.outstandingReceivablesValue)}  />
                  <MetricRow label="Collection %"             value={fmtPct(targets?.collectionPercent)}         />
                </div>
                <div className="px-4 pb-3 mt-2">
                  {targets?.collectionTarget != null
                    ? <TargetBar pct={targets.collectionPercent ?? null} label="Collected vs target" />
                    : null
                  }
                  {warnings?.collectionTargetNotSet && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-2">
                      <Info size={10} className="shrink-0" />
                      Collection target not configured for {selectedYear}.
                    </p>
                  )}
                </div>
              </Card>

            </div>
          </div>

          {/* ── Sales Governance Rules ────────────────────────────────────────── */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Sales Governance Rules
              </h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              {salesRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-emerald-500 mt-0.5 shrink-0">▸</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </Card>

        </>
      )}

      <SalesReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        selfId={profile?.id ?? null}
        selfName={isBroadView ? 'All Salesmen' : (profile?.full_name ?? profile?.email ?? 'Salesman')}
        selfIsBroad={isBroadView}
        canPickSalesman={role === 'admin'}
        selectedYear={selectedYear}
      />
    </div>
  );
}
