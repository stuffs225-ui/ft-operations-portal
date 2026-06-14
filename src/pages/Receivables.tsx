import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Search, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Drawer } from '../components/ui/Drawer';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ReceivablesAgingRow, AgingBucket, MilestoneStatus } from '../types';

function formatSAR(v: number | null | undefined) {
  if (v == null) return '—';
  return 'SAR ' + v.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const BUCKET_CONFIG: Record<AgingBucket, { label: string; color: string; bgColor: string; borderColor: string }> = {
  not_due:    { label: 'Not Yet Due',  color: 'text-gray-700',   bgColor: 'bg-gray-50',   borderColor: 'border-gray-200'  },
  due_0_30:   { label: '0–30 Days',   color: 'text-amber-700',  bgColor: 'bg-amber-50',  borderColor: 'border-amber-200' },
  due_31_60:  { label: '31–60 Days',  color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200'},
  due_61_90:  { label: '61–90 Days',  color: 'text-red-600',    bgColor: 'bg-red-50',    borderColor: 'border-red-200'   },
  due_90_plus:{ label: '90+ Days',    color: 'text-red-800',    bgColor: 'bg-red-100',   borderColor: 'border-red-300'   },
};

const MILESTONE_STATUS_CONFIG: Partial<Record<MilestoneStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }>> = {
  planned:          { label: 'Planned',          variant: 'neutral'  },
  ready_to_invoice: { label: 'Ready to Invoice', variant: 'info'     },
  submitted:        { label: 'Invoice Sent',     variant: 'default'  },
  approved:         { label: 'Approved',         variant: 'success'  },
  overdue:          { label: 'Overdue',          variant: 'critical' },
};

const BUCKET_ORDER: AgingBucket[] = ['not_due', 'due_0_30', 'due_31_60', 'due_61_90', 'due_90_plus'];

export function Receivables() {
  const [rows, setRows] = useState<ReceivablesAgingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<AgingBucket | 'all'>('all');
  const [selected, setSelected] = useState<ReceivablesAgingRow | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase!
      .from('receivables_aging_view')
      .select('*')
      .order('days_overdue', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data ?? []) as unknown as ReceivablesAgingRow[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        r.customer_name.toLowerCase().includes(q) ||
        r.project_code.toLowerCase().includes(q) ||
        r.so_number.toLowerCase().includes(q) ||
        r.milestone_name.toLowerCase().includes(q) ||
        (r.invoice_number ?? '').toLowerCase().includes(q);
      const matchBucket = bucketFilter === 'all' || r.aging_bucket === bucketFilter;
      return matchSearch && matchBucket;
    });
  }, [rows, search, bucketFilter]);

  const kpis = useMemo(() => {
    const totalOutstanding = rows.reduce((s, r) => s + r.outstanding_amount, 0);
    const overdueRows = rows.filter((r) => r.aging_bucket !== 'not_due');
    const totalOverdue = overdueRows.reduce((s, r) => s + r.outstanding_amount, 0);
    const bucketTotals = Object.fromEntries(
      BUCKET_ORDER.map((b) => [b, rows.filter((r) => r.aging_bucket === b).reduce((s, r) => s + r.outstanding_amount, 0)])
    ) as Record<AgingBucket, number>;
    return { totalOutstanding, totalOverdue, bucketTotals };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receivables & Aging"
        subtitle="Outstanding invoice milestones — live from invoicing plans"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Total Outstanding</div>
          <div className="text-xl font-bold text-gray-900 truncate">{formatSAR(kpis.totalOutstanding)}</div>
          <div className="text-xs text-gray-400 mt-1">{rows.length} open milestones</div>
        </Card>
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="text-xs text-red-600 mb-1">Overdue</div>
          <div className="text-xl font-bold text-red-700 truncate">{formatSAR(kpis.totalOverdue)}</div>
          <div className="text-xs text-red-400 mt-1">{rows.filter((r) => r.aging_bucket !== 'not_due').length} milestones</div>
        </Card>
        <div className="col-span-2 lg:col-span-1 grid grid-cols-2 gap-3">
          {(['due_31_60', 'due_90_plus'] as AgingBucket[]).map((b) => {
            const cfg = BUCKET_CONFIG[b];
            return (
              <div key={b} className={`rounded-xl border p-3 ${cfg.bgColor} ${cfg.borderColor}`}>
                <div className={`text-xs mb-1 ${cfg.color}`}>{cfg.label}</div>
                <div className={`text-base font-bold truncate ${cfg.color}`}>{formatSAR(kpis.bucketTotals[b])}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aging bucket filter strip */}
      <div className="grid grid-cols-5 gap-2">
        {BUCKET_ORDER.map((b) => {
          const cfg = BUCKET_CONFIG[b];
          const count = rows.filter((r) => r.aging_bucket === b).length;
          const active = bucketFilter === b;
          return (
            <button
              key={b}
              onClick={() => setBucketFilter(active ? 'all' : b)}
              className={`rounded-xl border p-3 text-left transition-all ${active ? `${cfg.bgColor} ${cfg.borderColor} ring-2 ring-offset-1 ring-brand-600/30` : `${cfg.bgColor} ${cfg.borderColor} hover:opacity-80`}`}
            >
              <div className={`text-[10px] font-medium mb-1 ${cfg.color}`}>{cfg.label}</div>
              <div className={`text-lg font-bold ${cfg.color}`}>{formatSAR(kpis.bucketTotals[b])}</div>
              <div className={`text-xs opacity-60 ${cfg.color}`}>{count} items</div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, project, invoice…"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        />
      </div>

      {/* Table */}
      {!isSupabaseConfigured ? (
        <EmptyState
          icon={<AlertCircle size={32} className="text-amber-400" />}
          title="No live data source"
          description="Connect Supabase to view receivables."
        />
      ) : loading ? (
        <div className="flex justify-center py-16 text-gray-400"><Loader2 size={24} className="animate-spin" /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={32} className="text-gray-300" />}
          title="No outstanding milestones"
          description={search || bucketFilter !== 'all' ? 'Try adjusting your search or filters.' : 'All milestones are paid, or no invoicing plans exist yet.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Milestone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Outstanding</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Aging</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((row) => {
                const bCfg = BUCKET_CONFIG[row.aging_bucket];
                const sCfg = MILESTONE_STATUS_CONFIG[row.milestone_status as MilestoneStatus];
                return (
                  <tr key={row.milestone_id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelected(row)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{row.project_code}</div>
                      <div className="text-xs text-gray-400">{row.so_number}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{row.customer_name}</td>
                    <td className="px-4 py-3 text-gray-700">{row.milestone_name}</td>
                    <td className="px-4 py-3">
                      {sCfg ? <Badge variant={sCfg.variant} size="sm">{sCfg.label}</Badge> : <span className="text-xs text-gray-400">{row.milestone_status}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(row.due_date)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{formatSAR(row.outstanding_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${bCfg.bgColor} ${bCfg.color} ${bCfg.borderColor}`}>
                        {row.days_overdue > 0 ? `${row.days_overdue}d overdue` : bCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Row detail drawer */}
      <Drawer open={selected != null} onClose={() => setSelected(null)} title={selected?.milestone_name ?? ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Project">{selected.project_code}</DrawerField>
              <DrawerField label="SO Number">{selected.so_number}</DrawerField>
              <DrawerField label="Customer">{selected.customer_name}</DrawerField>
              <DrawerField label="Invoice #">{selected.invoice_number ?? '—'}</DrawerField>
              <DrawerField label="Amount">{formatSAR(selected.amount)}</DrawerField>
              <DrawerField label="Outstanding">{formatSAR(selected.outstanding_amount)}</DrawerField>
              <DrawerField label="Due Date">{formatDate(selected.due_date)}</DrawerField>
              <DrawerField label="Days Overdue">{selected.days_overdue > 0 ? `${selected.days_overdue} days` : '—'}</DrawerField>
              <DrawerField label="Submitted">{formatDate(selected.submitted_at)}</DrawerField>
              <DrawerField label="Approved">{formatDate(selected.approved_at)}</DrawerField>
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Link to={`/projects/${selected.project_id}`} className="flex items-center gap-1.5 text-brand-600 hover:underline" onClick={() => setSelected(null)}>
                <ExternalLink size={13} /> Open Project
              </Link>
              <Link to={`/projects/${selected.project_id}/invoicing`} className="flex items-center gap-1.5 text-brand-600 hover:underline" onClick={() => setSelected(null)}>
                <ExternalLink size={13} /> Open Invoicing Plan
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="font-medium text-gray-800">{children}</div>
    </div>
  );
}
