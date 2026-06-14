import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Plus, Search, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/PageLoader';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { HotProject, HotProjectStage } from '../types';

function formatSAR(v: number | null) {
  if (v == null) return '—';
  return 'SAR ' + v.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

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

export function HotProjects() {
  const [records, setRecords] = useState<HotProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<HotProjectStage | 'all'>('all');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase!
      .from('hot_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRecords((data ?? []) as HotProject[]);
        setLoading(false);
      });
  }, []);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.customer_name.toLowerCase().includes(q) ||
      r.hot_project_code.toLowerCase().includes(q);
    const matchStage = stageFilter === 'all' || r.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const openRecords = records.filter((r) => OPEN_STAGES.includes(r.stage));
  const totalEstimated = openRecords.reduce((s, r) => s + (r.estimated_value ?? 0), 0);
  const weightedPipeline = openRecords.reduce((s, r) => s + ((r.estimated_value ?? 0) * r.probability) / 100, 0);
  const wonCount = records.filter((r) => r.stage === 'won').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hot Projects"
        subtitle="Opportunity pipeline — active leads and negotiations"
        actions={
          <Link to="/hot-projects/new">
            <Button icon={<Plus size={15} />} size="sm">New Opportunity</Button>
          </Link>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Open Opportunities</div>
          <div className="text-2xl font-bold text-gray-900">{openRecords.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Estimated Pipeline</div>
          <div className="text-xl font-bold text-gray-900 truncate">{formatSAR(totalEstimated)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Weighted Pipeline</div>
          <div className="text-xl font-bold text-brand-600 truncate">{formatSAR(weightedPipeline)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Won This Period</div>
          <div className="text-2xl font-bold text-emerald-600">{wonCount}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, customer, code…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/30"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as HotProjectStage | 'all')}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        >
          <option value="all">All Stages</option>
          {(Object.keys(STAGE_CONFIG) as HotProjectStage[]).map((s) => (
            <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table / states */}
      {!isSupabaseConfigured ? (
        <EmptyState
          icon={<AlertCircle size={32} className="text-amber-400" />}
          title="No live data source"
          description="Connect Supabase to view hot projects."
        />
      ) : loading ? (
        <PageLoader />
      ) : error ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Flame size={32} className="text-gray-300" />}
          title="No opportunities found"
          description={search || stageFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first hot project to track the pipeline.'}
          action={
            <Link to="/hot-projects/new">
              <Button icon={<Plus size={14} />} size="sm">New Opportunity</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Stage</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs">Probability</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs">Est. Value</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Close Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((hp) => {
                const stageCfg = STAGE_CONFIG[hp.stage] ?? { label: hp.stage, variant: 'neutral' as const };
                return (
                  <tr key={hp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{hp.hot_project_code}</td>
                    <td className="px-4 py-3">
                      <Link to={`/hot-projects/${hp.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {hp.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{hp.customer_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={stageCfg.variant} size="sm">{stageCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{hp.probability}%</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{formatSAR(hp.estimated_value)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(hp.expected_close_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
