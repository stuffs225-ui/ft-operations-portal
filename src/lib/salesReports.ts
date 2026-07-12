// ── Sales Workspace v3 — printable report builders ────────────────────────────
// Pure HTML-string builders (no dependencies, no server): each report is a
// self-contained A4 print-optimized document opened in a new tab and printed
// via window.print(). All four reports share ONE layout (renderSalesReport) so
// they read as a single family, and their data comes from the exact query
// layer the on-screen pillars use (salesWorkspaceQueries / dashboard queries) —
// screen and paper can never drift.
//
// SECURITY: every dynamic value passes through esc() — customer names and
// notes are user-entered text.

import type { HotProject, QuotationRequest } from '../types';
import type { SalesInvoicingPlanRow, SalesInvoicingPlanMonths } from '../types/salesDashboardV2';

// ── Shared bits ───────────────────────────────────────────────────────────────

export interface ReportPeriod {
  label: string;
  from: Date | null;
  to: Date | null;
}

export interface ReportContext {
  salesmanName: string;
  period: ReportPeriod;
  year: number;
}

const MONTH_KEYS: (keyof SalesInvoicingPlanMonths)[] = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sar(v: number | null | undefined): string {
  if (v == null || v === 0) return '—';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function inPeriod(iso: string | null | undefined, period: ReportPeriod): boolean {
  if (!period.from && !period.to) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (period.from && t < period.from.getTime()) return false;
  if (period.to && t > period.to.getTime()) return false;
  return true;
}

/** Month indexes (0-based) of the report year that fall inside the period. */
function monthsInPeriod(year: number, period: ReportPeriod): number[] {
  const out: number[] = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(Date.UTC(year, m, 1));
    const end = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59));
    const fromOk = !period.from || end >= period.from;
    const toOk = !period.to || start <= period.to;
    if (fromOk && toOk) out.push(m);
  }
  return out;
}

function chip(label: string, tone: 'green' | 'amber' | 'red' | 'blue' | 'gray'): string {
  const tones: Record<string, string> = {
    green: 'background:#ecfdf5;color:#047857;border-color:#a7f3d0',
    amber: 'background:#fffbeb;color:#b45309;border-color:#fde68a',
    red:   'background:#fef2f2;color:#b91c1c;border-color:#fecaca',
    blue:  'background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe',
    gray:  'background:#f9fafb;color:#4b5563;border-color:#e5e7eb',
  };
  return `<span class="chip" style="${tones[tone]}">${esc(label)}</span>`;
}

const QUOTATION_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'gray'> = {
  draft: 'gray', submitted_by_sales: 'blue', received_by_coordinator: 'blue',
  sent_to_estimation: 'blue', waiting_for_estimation: 'amber', need_clarification: 'amber',
  quotation_received: 'green', returned_to_sales: 'amber', converted_to_hot_project: 'green',
  converted_to_so: 'green', cancelled: 'gray', closed_lost: 'red',
};

const STAGE_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'gray'> = {
  lead: 'gray', qualified: 'blue', proposal_required: 'amber', quotation_requested: 'blue',
  negotiation: 'amber', won: 'green', lost: 'red', cancelled: 'gray',
};

const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ── Layout ────────────────────────────────────────────────────────────────────

export function renderSalesReport(title: string, sectionsHtml: string, ctx: ReportContext): string {
  const generated = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)} — ${esc(ctx.salesmanName)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 11px/1.45 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; background: #fff; }
  .sheet { max-width: 186mm; margin: 0 auto; padding: 16px; }
  @media print { .sheet { padding: 0; max-width: none; } .no-print { display: none !important; } }

  .rpt-head { border-bottom: 2.5px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
  .rpt-brand { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #6b7280; }
  .rpt-title { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; color: #111827; margin-top: 2px; }
  .rpt-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 8px; }
  .rpt-meta div { font-size: 10px; color: #6b7280; }
  .rpt-meta b { display: block; font-size: 11.5px; color: #111827; font-weight: 600; }

  h2.sec { font-size: 13px; font-weight: 700; color: #111827; margin: 18px 0 6px;
           padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; break-after: avoid; }
  .sum { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 10px; }
  .sum .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 12px; min-width: 96px; }
  .sum .box .k { font-size: 8.5px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; }
  .sum .box .v { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; color: #111827; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead { display: table-header-group; }
  th { font-size: 8.5px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280;
       text-align: left; padding: 5px 6px; border-bottom: 1.5px solid #d1d5db; background: #f9fafb; }
  td { padding: 5px 6px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr { break-inside: avoid; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tfoot td { border-top: 2px solid #d1d5db; font-weight: 700; background: #f9fafb; }
  .muted { color: #9ca3af; }
  .chip { display: inline-block; font-size: 8.5px; font-weight: 600; border: 1px solid; border-radius: 999px; padding: 1px 7px; white-space: nowrap; }

  .rpt-foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e5e7eb;
              display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  .print-bar { position: sticky; top: 0; background: #111827; color: #fff; padding: 10px 16px;
               display: flex; justify-content: space-between; align-items: center; border-radius: 8px; margin-bottom: 14px; }
  .print-bar button { background: #fff; color: #111827; border: 0; border-radius: 6px;
                      padding: 7px 18px; font-weight: 700; font-size: 12px; cursor: pointer; }
</style>
</head>
<body>
<div class="sheet">
  <div class="print-bar no-print">
    <span style="font-size:12px">Report ready — use Print to save as PDF or print.</span>
    <button onclick="window.print()">Print</button>
  </div>
  <header class="rpt-head">
    <div class="rpt-brand">FT Operations Portal — Sales</div>
    <div class="rpt-title">${esc(title)}</div>
    <div class="rpt-meta">
      <div><b>${esc(ctx.salesmanName)}</b>Salesman</div>
      <div><b>${esc(ctx.period.label)}</b>Period</div>
      <div><b>${esc(String(ctx.year))}</b>Plan year</div>
      <div><b>${esc(generated)}</b>Generated</div>
    </div>
  </header>
  ${sectionsHtml}
  <footer class="rpt-foot">
    <span>FT Operations Portal — generated from live system data</span>
    <span>${esc(generated)}</span>
  </footer>
</div>
<script>setTimeout(function(){ try { window.print(); } catch (e) {} }, 500);</script>
</body>
</html>`;
}

/**
 * A visible banner printed at the top of a report when any section hit its row
 * cap — so a broad report can never silently omit financial rows. `sources`
 * names the capped sections (e.g. "Hot Projects", "Quotations").
 */
export function buildTruncationNote(cap: number, sources: string[]): string {
  if (sources.length === 0) return '';
  return `<div style="border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:6px;padding:8px 12px;margin:10px 0;font-size:10px;font-weight:600;">
    ⚠ This report reached the ${cap.toLocaleString('en-US')}-row limit for ${esc(sources.join(' and '))}. Some rows may be omitted — narrow the period or pick a single salesman for a complete list.
  </div>`;
}

// ── Section builders ──────────────────────────────────────────────────────────

export function buildInvoicingSection(
  rows: SalesInvoicingPlanRow[],
  ctx: ReportContext,
): string {
  const months = monthsInPeriod(ctx.year, ctx.period);
  const visible = rows.filter((r) =>
    months.some((m) => (r.months[MONTH_KEYS[m]] ?? 0) > 0) || r.pendingInvoicing > 0,
  );
  const totalValue = visible.reduce((s, r) => s + r.totalValue, 0);
  const pending = visible.reduce((s, r) => s + r.pendingInvoicing, 0);
  const monthTotals = months.map((m) => visible.reduce((s, r) => s + (r.months[MONTH_KEYS[m]] ?? 0), 0));
  const periodPlan = monthTotals.reduce((s, v) => s + v, 0);

  const head = months.map((m) => `<th class="num">${MONTH_LABELS[m]}</th>`).join('');
  const body = visible.map((r) => `
    <tr>
      <td><b>${esc(r.customerName)}</b><br /><span class="muted" style="font-size:9px">${esc(r.projectCode)}</span></td>
      <td>${esc(r.orderOrPo || '—')}</td>
      <td class="num">${r.quantity ?? '—'}</td>
      <td class="num">${sar(r.totalValue)}</td>
      <td class="num">${sar(r.pendingInvoicing)}</td>
      ${months.map((m) => {
        const v = r.months[MONTH_KEYS[m]] ?? 0;
        return `<td class="num${v > 0 ? '' : ' muted'}">${sar(v)}</td>`;
      }).join('')}
    </tr>`).join('');

  return `
  <h2 class="sec">Invoicing Plan</h2>
  <div class="sum">
    <div class="box"><div class="k">Projects</div><div class="v">${visible.length}</div></div>
    <div class="box"><div class="k">Plan in period (SAR)</div><div class="v">${sar(periodPlan)}</div></div>
    <div class="box"><div class="k">Pending invoicing (SAR)</div><div class="v">${sar(pending)}</div></div>
    <div class="box"><div class="k">Portfolio value (SAR)</div><div class="v">${sar(totalValue)}</div></div>
  </div>
  ${visible.length === 0 ? '<p class="muted">No invoicing plan lines in this period.</p>' : `
  <table>
    <thead><tr><th>Customer / Project</th><th>SO #</th><th class="num">Qty</th><th class="num">Value</th><th class="num">Pending</th>${head}</tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr>
      <td>Total (${visible.length})</td><td></td><td></td>
      <td class="num">${sar(totalValue)}</td>
      <td class="num">${sar(pending)}</td>
      ${monthTotals.map((v) => `<td class="num">${sar(v)}</td>`).join('')}
    </tr></tfoot>
  </table>`}`;
}

export function buildHotProjectsSection(all: HotProject[], ctx: ReportContext): string {
  const rows = all.filter((h) => inPeriod(h.created_at ?? null, ctx.period) || inPeriod(h.expected_close_date, ctx.period));
  const open = rows.filter((h) => !['won', 'lost', 'cancelled'].includes(h.stage));
  const pipeline = open.reduce((s, h) => s + (h.estimated_value ?? 0), 0);
  const won = rows.filter((h) => h.stage === 'won');

  const byStage = new Map<string, { count: number; value: number }>();
  for (const h of rows) {
    const b = byStage.get(h.stage) ?? { count: 0, value: 0 };
    b.count += 1; b.value += h.estimated_value ?? 0;
    byStage.set(h.stage, b);
  }

  return `
  <h2 class="sec">Hot Projects Pipeline</h2>
  <div class="sum">
    <div class="box"><div class="k">In period</div><div class="v">${rows.length}</div></div>
    <div class="box"><div class="k">Open pipeline (SAR)</div><div class="v">${sar(pipeline)}</div></div>
    <div class="box"><div class="k">Won</div><div class="v">${won.length}</div></div>
    <div class="box"><div class="k">Won value (SAR)</div><div class="v">${sar(won.reduce((s, h) => s + (h.estimated_value ?? 0), 0))}</div></div>
  </div>
  <div class="sum">
    ${[...byStage.entries()].map(([stage, b]) =>
      `<div class="box"><div class="k">${esc(label(stage))}</div><div class="v">${b.count} · ${sar(b.value)}</div></div>`).join('')}
  </div>
  ${rows.length === 0 ? '<p class="muted">No hot projects in this period.</p>' : `
  <table>
    <thead><tr><th>Code</th><th>Title / Customer</th><th>Stage</th><th class="num">Probability</th><th class="num">Est. value (SAR)</th><th>Expected close</th></tr></thead>
    <tbody>
      ${rows.map((h) => `
      <tr>
        <td>${esc(h.hot_project_code)}</td>
        <td><b>${esc(h.title)}</b><br /><span class="muted" style="font-size:9px">${esc(h.customer_name)}</span></td>
        <td>${chip(label(h.stage), STAGE_TONE[h.stage] ?? 'gray')}</td>
        <td class="num">${h.probability != null ? `${h.probability}%` : '—'}</td>
        <td class="num">${sar(h.estimated_value)}</td>
        <td>${fmtDate(h.expected_close_date)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`}`;
}

export function buildQuotationsSection(
  all: QuotationRequest[],
  ctx: ReportContext,
  isOverdue: (q: QuotationRequest) => boolean,
): string {
  const rows = all.filter((q) => inPeriod(q.created_at, ctx.period));
  const open = rows.filter((q) => !['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'].includes(q.quotation_status));
  const overdue = open.filter((q) => isOverdue(q));
  const converted = rows.filter((q) => q.quotation_status === 'converted_to_so');

  return `
  <h2 class="sec">Quotations</h2>
  <div class="sum">
    <div class="box"><div class="k">In period</div><div class="v">${rows.length}</div></div>
    <div class="box"><div class="k">Open</div><div class="v">${open.length}</div></div>
    <div class="box"><div class="k">Overdue (SLA)</div><div class="v">${overdue.length}</div></div>
    <div class="box"><div class="k">Converted to SO</div><div class="v">${converted.length}</div></div>
  </div>
  ${rows.length === 0 ? '<p class="muted">No quotations in this period.</p>' : `
  <table>
    <thead><tr><th>Code</th><th>Customer</th><th>Status</th><th>SLA</th><th>Created</th></tr></thead>
    <tbody>
      ${rows.map((q) => `
      <tr>
        <td>${esc(q.quotation_code)}</td>
        <td>${esc(q.customer_name)}</td>
        <td>${chip(label(q.quotation_status), QUOTATION_TONE[q.quotation_status] ?? 'gray')}</td>
        <td>${isOverdue(q) && !['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'].includes(q.quotation_status) ? chip('Overdue', 'red') : '<span class="muted">On track</span>'}</td>
        <td>${fmtDate(q.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`}`;
}

// ── Open in a new tab ─────────────────────────────────────────────────────────

export function openPrintWindow(html: string): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}
