import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Gauge, RefreshCw, Info, Search, ArrowUpDown, Target, FileText,
  Flame, AlertTriangle, Users, TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { cn, formatCurrency } from '../lib/utils';
import { getSalesAdminConsole, type SalesmanConsoleRow } from '../lib/salesAdminConsoleQueries';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];
const SELECT_CLS = 'px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white';

type SortKey = 'name' | 'soPercent' | 'soAchieved' | 'openQuotations' | 'overdueQuotations' | 'pipelineValue';

function sarK(v: number): string {
  if (v === 0) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}
function pctColor(pct: number | null): string {
  if (pct == null) return 'text-gray-400';
  return pct >= 100 ? 'text-emerald-600' : pct >= 75 ? 'text-brand-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';
}

// ─── KPI tile ───────────────────────────────────────────────────────────────────

function Kpi({ label, value, tone = 'default', icon }: { label: string; value: string; tone?: 'default' | 'rose'; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">{icon}{label}</div>
      <div className={cn('text-xl font-bold tabular-nums', tone === 'rose' ? 'text-rose-700' : 'text-gray-900')}>{value}</div>
    </div>
  );
}

export function SalesAdminConsole() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [rows, setRows] = useState<SalesmanConsoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetsUnavailable, setTargetsUnavailable] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('overdueQuotations');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getSalesAdminConsole(year).then((res) => {
      if (!alive) return;
      setRows(res.rows);
      setError(res.error);
      setTargetsUnavailable(res.targetsUnavailable);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [year, reloadKey]);

  function changeYear(y: number) { setLoading(true); setYear(y); }
  function refresh() { setLoading(true); setReloadKey((k) => k + 1); }

  const totals = useMemo(() => ({
    salesmen: rows.length,
    soTarget: rows.reduce((s, r) => s + (r.soTarget ?? 0), 0),
    soAchieved: rows.reduce((s, r) => s + r.soAchieved, 0),
    overdue: rows.reduce((s, r) => s + r.overdueQuotations, 0),
    pipeline: rows.reduce((s, r) => s + r.pipelineValue, 0),
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)) : rows;
    const sorted = [...base].sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else { av = (a[sortKey] ?? -1) as number; bv = (b[sortKey] ?? -1) as number; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  }

  // Header cell — a plain function (not a component) so it doesn't remount per render.
  const th = (label: string, k?: SortKey, right?: boolean) => (
    <th className={cn('px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide', right ? 'text-right' : 'text-left')}>
      {k ? (
        <button onClick={() => toggleSort(k)} className={cn('inline-flex items-center gap-1 hover:text-gray-700', right && 'flex-row-reverse')}>
          {label}<ArrowUpDown size={11} className={sortKey === k ? 'text-brand-600' : 'text-gray-300'} />
        </button>
      ) : label}
    </th>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Admin Console"
        subtitle="Every salesman at a glance — targets, quotation SLA, and pipeline. Admin oversight."
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Sales Admin Console' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e) => changeYear(Number(e.target.value))} className={SELECT_CLS}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {targetsUnavailable && !error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-2">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">Sales targets module pending (migration 099) — target columns show “—”.</p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Salesmen" value={loading ? '—' : String(totals.salesmen)} icon={<Users size={12} />} />
        <Kpi label={`SO Target ${year}`} value={loading ? '—' : sarK(totals.soTarget)} icon={<Target size={12} />} />
        <Kpi label="SO Achieved" value={loading ? '—' : sarK(totals.soAchieved)} icon={<TrendingUp size={12} />} />
        <Kpi label="Overdue Quotations" value={loading ? '—' : String(totals.overdue)} tone={totals.overdue > 0 ? 'rose' : 'default'} icon={<AlertTriangle size={12} />} />
        <Kpi label="Open Pipeline" value={loading ? '—' : sarK(totals.pipeline)} icon={<Flame size={12} />} />
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search salesman…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {th('Salesman', 'name')}
              {th('SO Target', undefined, true)}
              {th('Achieved', 'soAchieved', true)}
              {th('SO %', 'soPercent', true)}
              {th('Open Qts', 'openQuotations', true)}
              {th('Overdue', 'overdueQuotations', true)}
              {th('Pipeline', 'pipelineValue', true)}
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-400">No salesmen found.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.userId} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-[11px] text-gray-400">{r.email}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-600" title={r.soTarget != null ? formatCurrency(r.soTarget) : 'Not set'}>
                    {r.soTarget != null ? sarK(r.soTarget) : <span className="text-gray-300">not set</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900" title={formatCurrency(r.soAchieved)}>{sarK(r.soAchieved)}</td>
                  <td className={cn('px-3 py-2.5 text-right tabular-nums font-semibold', pctColor(r.soPercent))}>
                    {r.soPercent != null ? `${r.soPercent}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{r.openQuotations}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.overdueQuotations > 0
                      ? <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><AlertTriangle size={12} />{r.overdueQuotations}</span>
                      : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700" title={formatCurrency(r.pipelineValue)}>
                    {sarK(r.pipelineValue)}<span className="text-gray-400 text-[11px]"> · {r.pipelineOpenCount}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link to="/admin/sales-targets" title="Set / edit targets" className="p-1 rounded text-gray-400 hover:text-brand-600"><Target size={14} /></Link>
                      <Link to="/quotations" title="View quotations" className="p-1 rounded text-gray-400 hover:text-brand-600"><FileText size={14} /></Link>
                      <Link to="/hot-projects" title="View pipeline" className="p-1 rounded text-gray-400 hover:text-brand-600"><Flame size={14} /></Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <Gauge size={12} />
        Overdue = quotations past their SLA (coordinator pickup, estimation response, or clarification). SO % = approved sales-order value this year vs the salesman's target.
      </p>
    </div>
  );
}
