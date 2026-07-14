import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Plus, Search, AlertCircle, ChevronRight, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { useAuth } from '../hooks/useAuth';
import { sectorLabel } from '@/lib/commercialFields';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { exportRowsToCsv } from '../lib/reportExport';
import { formatSAR } from '../lib/currency';
import type { ReportColumn } from '../lib/reportExport';
import type { HotProject, HotProjectStage, UserRole } from '../types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STAGE_CONFIG: Record<HotProjectStage, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  lead:                { label: 'Lead',                variant: 'neutral'  },
  qualified:           { label: 'Qualified',           variant: 'info'     },
  proposal_required:   { label: 'Proposal Required',   variant: 'warning'  },
  quotation_requested: { label: 'QTN Requested',       variant: 'default'  },
  negotiation:         { label: 'Negotiation',         variant: 'warning'  },
  won:                 { label: 'Won',                 variant: 'success'  },
  lost:                { label: 'Lost',                variant: 'critical' },
  cancelled:           { label: 'Cancelled',           variant: 'neutral'  },
};

const OPEN_STAGES: HotProjectStage[] = ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation'];
const CLOSED_STAGES: HotProjectStage[] = ['won', 'lost', 'cancelled'];

function nextAction(r: HotProject): string {
  switch (r.stage) {
    case 'lead':                return 'Qualify and assess customer need';
    case 'qualified':           return r.linked_quotation_id ? 'Follow up on quotation' : 'Request quotation or proposal';
    case 'proposal_required':   return 'Prepare or request proposal';
    case 'quotation_requested': return 'Follow up with coordinator';
    case 'negotiation':         return 'Close or escalate negotiation';
    case 'won':                 return r.linked_project_id ? 'Monitor project execution' : 'Create SO / Project';
    case 'lost':                return r.lost_reason ? 'Document learnings' : 'Record lost reason';
    case 'cancelled':           return 'Archive record';
  }
}

function isClosingThisMonth(r: HotProject): boolean {
  if (!r.expected_close_date) return false;
  const d = new Date(r.expected_close_date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function hasNoNextAction(r: HotProject): boolean {
  return OPEN_STAGES.includes(r.stage) && !r.linked_quotation_id && !r.notes;
}

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'sales_user'];

type TabKey = 'all' | 'mine' | 'closing' | 'no_action' | 'closed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'All Open'       },
  { key: 'mine',      label: 'My Pipeline'    },
  { key: 'closing',   label: 'Closing This Month' },
  { key: 'no_action', label: 'No Next Action' },
  { key: 'closed',    label: 'Won / Lost'     },
];

export function HotProjects() {
  const { role, profile } = useAuth();
  const [records, setRecords] = useState<HotProject[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [stageFilter, setStageFilter] = useState<HotProjectStage | 'all'>('all');
  // Probability band split (operations request): High ≥80% vs Low <80%.
  const [probBand, setProbBand] = useState<'all' | 'high' | 'low'>('all');
  // Broad-view salesman filter — only owners that actually have pipeline records.
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const isBroadView = role === 'admin' || role === 'operations_manager';
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const uid = profile?.id;
    const query = supabase!.from('hot_projects').select('*').order('created_at', { ascending: false });
    const scoped = (!isBroadView && uid) ? query.eq('sales_owner_id', uid) : query;
    scoped.then(async ({ data, error: err }) => {
      if (cancelled) return;
      if (err) { setError(err.message); setLoading(false); return; }
      const rows = (data ?? []) as HotProject[];
      setRecords(rows);
      setLoading(false);
      // Broad view: resolve owner names for the salesman filter (owners present only).
      if (isBroadView) {
        const ids = Array.from(new Set(rows.map(r => r.sales_owner_id).filter((v): v is string => !!v)));
        if (ids.length > 0) {
          const { data: profs } = await supabase!.from('profiles').select('id, full_name, email').in('id', ids);
          if (cancelled) return;
          const map: Record<string, string> = {};
          for (const p of (profs ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
            map[p.id] = p.full_name || p.email || 'Unknown';
          }
          setOwnerNames(map);
        }
      }
    });
    return () => { cancelled = true; };
  }, [isBroadView, profile?.id]);

  function handleExportCsv() {
    const columns: ReportColumn<HotProject>[] = [
      { key: 'hot_project_code', header: 'Code', value: r => r.hot_project_code },
      { key: 'title', header: 'Title', value: r => r.title },
      { key: 'customer_name', header: 'Customer', value: r => r.customer_name },
      { key: 'stage', header: 'Stage', value: r => STAGE_CONFIG[r.stage]?.label ?? r.stage },
      { key: 'probability', header: 'Probability (%)', value: r => r.probability },
      { key: 'estimated_value', header: 'Estimated Value (SAR)', value: r => r.estimated_value },
      { key: 'expected_close_date', header: 'Expected Close Date', value: r => r.expected_close_date },
      { key: 'next_action', header: 'Next Action', value: r => nextAction(r) },
    ];
    exportRowsToCsv(`hot-projects-${new Date().toISOString().split('T')[0]}.csv`, records, columns);
  }

  const tabFiltered = records.filter(r => {
    switch (tab) {
      case 'all':       return OPEN_STAGES.includes(r.stage);
      case 'mine':      return OPEN_STAGES.includes(r.stage) && r.sales_owner_id === profile?.id;
      case 'closing':   return OPEN_STAGES.includes(r.stage) && isClosingThisMonth(r);
      case 'no_action': return hasNoNextAction(r);
      case 'closed':    return CLOSED_STAGES.includes(r.stage);
    }
  });

  const filtered = tabFiltered.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.customer_name.toLowerCase().includes(q) ||
      r.hot_project_code.toLowerCase().includes(q);
    const matchStage = stageFilter === 'all' || r.stage === stageFilter;
    const matchBand =
      probBand === 'all' ||
      (probBand === 'high' ? (r.probability ?? 0) >= 80 : (r.probability ?? 0) < 80);
    const matchOwner = ownerFilter === 'all' || r.sales_owner_id === ownerFilter;
    return matchSearch && matchStage && matchBand && matchOwner;
  }).sort((a, b) => {
    // Closed opportunities (won/lost/cancelled) always sink below open ones;
    // within each group the largest estimated value ranks first.
    const aClosed = CLOSED_STAGES.includes(a.stage) ? 1 : 0;
    const bClosed = CLOSED_STAGES.includes(b.stage) ? 1 : 0;
    if (aClosed !== bClosed) return aClosed - bClosed;
    return (b.estimated_value ?? 0) - (a.estimated_value ?? 0);
  });

  // Salesmen present in the pipeline (broad view) — for the owner filter dropdown.
  const ownerOptions = isBroadView
    ? Array.from(new Set(records.map(r => r.sales_owner_id).filter((v): v is string => !!v)))
        .map(id => ({ id, name: ownerNames[id] ?? 'Unknown' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const openRecords = records.filter((r) => OPEN_STAGES.includes(r.stage));
  const totalEstimated = openRecords.reduce((s, r) => s + (r.estimated_value ?? 0), 0);
  const weightedPipeline = openRecords.reduce((s, r) => s + ((r.estimated_value ?? 0) * r.probability) / 100, 0);
  // "Won this year" — won opportunities whose last transition landed in the
  // current calendar year (updated_at approximates the won date). Previously this
  // counted all-time wins while the label claimed a period.
  const currentYear = new Date().getFullYear();
  const wonCount = records.filter(
    (r) => r.stage === 'won' && new Date(r.updated_at).getFullYear() === currentYear,
  ).length;

  const tabCounts: Record<TabKey, number> = {
    all:       records.filter(r => OPEN_STAGES.includes(r.stage)).length,
    mine:      records.filter(r => OPEN_STAGES.includes(r.stage) && r.sales_owner_id === profile?.id).length,
    closing:   records.filter(r => OPEN_STAGES.includes(r.stage) && isClosingThisMonth(r)).length,
    no_action: records.filter(r => hasNoNextAction(r)).length,
    closed:    records.filter(r => CLOSED_STAGES.includes(r.stage)).length,
  };

  const noActionCount = tabCounts.no_action;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline Projects"
        subtitle="Opportunity pipeline — active leads, negotiations, and commercial wins"
        actions={
          canCreate ? (
            <Link to="/hot-projects/new">
              <Button icon={<Plus size={15} />} size="sm">New Opportunity</Button>
            </Link>
          ) : undefined
        }
      />

      <ReportExportBar
        reportKey="hot_projects_report"
        reportTitle="Pipeline Projects Report"
        department="Sales"
        onExportCsv={handleExportCsv}
        summary={`${openRecords.length} open · weighted pipeline ${formatSAR(weightedPipeline)}`}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase tracking-[0.04em] mb-1">Open Opportunities</div>
          <div className="text-2xl font-bold tabular-nums text-gray-900">{openRecords.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase tracking-[0.04em] mb-1">Estimated Pipeline</div>
          <div className="text-xl font-bold tabular-nums text-gray-900 truncate">{formatSAR(totalEstimated)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase tracking-[0.04em] mb-1">Weighted Pipeline</div>
          <div className="text-xl font-bold tabular-nums text-emerald-700 truncate">{formatSAR(weightedPipeline)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-emerald-500" />
            <div className="text-xs text-gray-500 uppercase tracking-[0.04em]">Won This Year</div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-600">{wonCount}</div>
        </Card>
      </div>

      {noActionCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertCircle size={14} className="text-amber-500 shrink-0" />
          <span>
            <strong>{noActionCount}</strong> open opportunit{noActionCount !== 1 ? 'ies' : 'y'} with no documented next action — update notes or request a quotation.
          </span>
        </div>
      )}

      {/* Tab filters */}
      <div className="flex gap-1 border-b border-gray-100 no-print">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center no-print">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, customer, code…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as HotProjectStage | 'all')}
          className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
        >
          <option value="all">All Stages</option>
          {(Object.keys(STAGE_CONFIG) as HotProjectStage[]).map((s) => (
            <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
          ))}
        </select>
        {/* Salesman filter — broad view only; lists salesmen who own pipeline records. */}
        {isBroadView && ownerOptions.length > 0 && (
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          >
            <option value="all">All Salesmen</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
        {/* Probability band — High ≥80% vs Low <80% (operations request). */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
          {([
            { key: 'all', label: 'All' },
            { key: 'high', label: 'High ≥80%' },
            { key: 'low', label: 'Low <80%' },
          ] as const).map((b) => (
            <button
              key={b.key}
              onClick={() => setProbBand(b.key)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                probBand === b.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table / states */}
      <div className="report-print-root">
        {/* Print-only header */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Projects Report — {new Date().getFullYear()}</h1>
          <p className="text-sm text-gray-700 mt-1">Salesperson: {profile?.full_name ?? '—'}</p>
          <p className="text-sm text-gray-700">Generated: {reportDate}</p>
          <p className="text-sm text-gray-700 mt-1">
            Open: {openRecords.length} · Weighted Pipeline: {formatSAR(weightedPipeline)}
          </p>
        </div>
        {!isSupabaseConfigured ? (
          <EmptyState
            icon={<AlertCircle size={32} className="text-amber-400" />}
            title="No live data source"
            description="Connect Supabase to view hot projects."
          />
        ) : loading ? (
          <div className="rounded-lg border border-gray-200/80 overflow-hidden bg-white">
            <div className="h-10 bg-gray-50/80 border-b border-gray-100" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="ml-auto h-7 w-12 rounded-md" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Flame size={32} className="text-gray-300" />}
            title="No opportunities found"
            description={search || stageFilter !== 'all' || probBand !== 'all' ? 'Try adjusting your filters.' : 'Create your first pipeline project to track the pipeline.'}
            action={
              canCreate ? (
                <Link to="/hot-projects/new">
                  <Button icon={<Plus size={14} />} size="sm">New Opportunity</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200/80 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Opportunity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                  {isBroadView && <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Salesman</th>}
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Stage</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Prob.</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Est. Value</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Close Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Next Action</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((hp) => {
                  const stageCfg = STAGE_CONFIG[hp.stage] ?? { label: hp.stage, variant: 'neutral' as const };
                  const action = nextAction(hp);
                  const noAction = hasNoNextAction(hp);
                  return (
                    <tr key={hp.id} className={`hover:bg-gray-50 transition-colors ${noAction ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-400">{hp.hot_project_code}</div>
                        <Link to={`/hot-projects/${hp.id}`} className="font-medium text-gray-900 hover:text-emerald-700 no-print">
                          {hp.title}
                        </Link>
                        <span className="hidden print:inline font-medium text-gray-900">{hp.title}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {hp.customer_name}
                        {hp.sector && (
                          <span className="ml-2 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                            {sectorLabel(hp.sector)}
                          </span>
                        )}
                      </td>
                      {isBroadView && (
                        <td className="px-4 py-3 text-gray-600 text-sm hidden md:table-cell">
                          {hp.sales_owner_id ? (ownerNames[hp.sales_owner_id] ?? '—') : <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Badge variant={stageCfg.variant} size="sm">{stageCfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 hidden sm:table-cell">{hp.probability}%</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800 hidden md:table-cell">{formatSAR(hp.estimated_value)}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm hidden md:table-cell">{formatDate(hp.expected_close_date)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs ${noAction ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>{action}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/hot-projects/${hp.id}`}>
                          <Button variant="ghost" size="sm">View <ChevronRight size={12} /></Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
