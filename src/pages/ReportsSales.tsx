import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Flame, TrendingUp } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_QUOTATIONS as MOCK_QUOTATIONS_RAW } from '../data/mockQuotations';
import { MOCK_PROJECTS as MOCK_PROJECTS_RAW } from '../data/mockProjects';
import { mockOrEmpty } from '../lib/dataMode';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { exportRowsToCsv } from '../lib/reportExport';
import type { ReportColumn } from '../lib/reportExport';
import type { QuotationRequest, Project, QuotationStatus, HotProject, HotProjectStage } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveTab = 'Quotations' | 'Hot Projects' | 'Active Projects' | 'Aging';
const TABS: ActiveTab[] = ['Quotations', 'Hot Projects', 'Active Projects', 'Aging'];

// ── Constants ─────────────────────────────────────────────────────────────────

const QUOTATION_STATUS_BADGE: Record<QuotationStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                    { label: 'Draft',              variant: 'neutral' },
  submitted_by_sales:       { label: 'Submitted',          variant: 'warning' },
  received_by_coordinator:  { label: 'Received',           variant: 'info' },
  sent_to_estimation:       { label: 'Sent to Estimation', variant: 'warning' },
  waiting_for_estimation:   { label: 'Waiting Estimation', variant: 'warning' },
  need_clarification:       { label: 'Need Clarification', variant: 'critical' },
  quotation_received:       { label: 'Quotation Ready',    variant: 'success' },
  returned_to_sales:        { label: 'Returned to Sales',  variant: 'warning' },
  converted_to_hot_project: { label: 'Hot Project',        variant: 'info' },
  converted_to_so:          { label: 'Converted to SO',    variant: 'success' },
  cancelled:                { label: 'Cancelled',          variant: 'neutral' },
  closed_lost:              { label: 'Closed Lost',        variant: 'neutral' },
};

const STAGE_CONFIG: Partial<Record<HotProjectStage, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }>> = {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSAR(v: number | null) {
  if (v == null) return '—';
  return 'SAR ' + v.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function locationBadge(loc: string) {
  if (loc === 'not_set') return <Badge variant="neutral">Not Set</Badge>;
  if (loc === 'saudi') return <Badge variant="default">Saudi</Badge>;
  return <Badge variant="info">Dubai</Badge>;
}

// ── Tab Components ────────────────────────────────────────────────────────────

function QuotationsTab({ quotations }: { quotations: QuotationRequest[] }) {
  const pendingCoordinator = quotations.filter(q => q.quotation_status === 'submitted_by_sales').length;
  const actionRequired = quotations.filter(q => ['returned_to_sales', 'need_clarification', 'quotation_received'].includes(q.quotation_status)).length;
  const converted = quotations.filter(q => q.quotation_status === 'converted_to_so').length;
  const draft = quotations.filter(q => q.quotation_status === 'draft').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-emerald-400 p-4">
          <div className="text-2xl font-bold text-gray-900">{quotations.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Quotations</div>
        </Card>
        <Card className={`border-l-4 p-4 ${actionRequired > 0 ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200'}`}>
          <div className={`text-2xl font-bold ${actionRequired > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{actionRequired}</div>
          <div className="text-xs text-gray-500 mt-1">Action Required</div>
        </Card>
        <Card className="border-l-4 border-sky-300 p-4">
          <div className="text-2xl font-bold text-gray-900">{pendingCoordinator}</div>
          <div className="text-xs text-gray-500 mt-1">With Coordinator</div>
        </Card>
        <Card className="border-l-4 border-emerald-500 p-4">
          <div className="text-2xl font-bold text-emerald-700">{converted}</div>
          <div className="text-xs text-gray-500 mt-1">Converted to SO</div>
        </Card>
      </div>
      {draft > 0 && (
        <div className="text-xs text-gray-500 flex items-center gap-1.5 px-1">
          <Clock size={12} /> {draft} draft{draft !== 1 ? 's' : ''} not yet submitted — complete and submit to coordinator.
        </div>
      )}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quotation #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotations.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No quotation requests found.</td></tr>
              ) : quotations.map(q => {
                const cfg = QUOTATION_STATUS_BADGE[q.quotation_status];
                return (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-emerald-700 font-semibold">{q.quotation_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{q.customer_name}</td>
                    <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap hidden md:table-cell">
                      {q.submitted_at ? formatDate(q.submitted_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/quotations/${q.id}`}>
                        <Button variant="ghost" size="sm">View <ArrowRight size={13} /></Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HotProjectsTab({ hotProjects }: { hotProjects: HotProject[] }) {
  const open = hotProjects.filter(r => OPEN_STAGES.includes(r.stage));
  const won = hotProjects.filter(r => r.stage === 'won');
  const weightedPipeline = open.reduce((s, r) => s + ((r.estimated_value ?? 0) * r.probability) / 100, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-emerald-400 p-4">
          <div className="text-2xl font-bold text-gray-900">{open.length}</div>
          <div className="text-xs text-gray-500 mt-1">Open Opportunities</div>
        </Card>
        <Card className="border-l-4 border-emerald-600 p-4">
          <div className="text-2xl font-bold text-emerald-700">{won.length}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><TrendingUp size={10} />Won</div>
        </Card>
        <Card className="border-l-4 border-emerald-300 p-4 sm:col-span-2">
          <div className="text-xl font-bold text-emerald-700 truncate">{formatSAR(weightedPipeline)}</div>
          <div className="text-xs text-gray-500 mt-1">Weighted Pipeline</div>
        </Card>
      </div>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Opportunity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Est. Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Close Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hotProjects.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No hot projects found.</td></tr>
              ) : hotProjects.map(hp => {
                const cfg = STAGE_CONFIG[hp.stage];
                return (
                  <tr key={hp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-400">{hp.hot_project_code}</div>
                      <div className="font-medium text-gray-900 text-sm">{hp.title}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{hp.customer_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg?.variant ?? 'neutral'}>{cfg?.label ?? hp.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 hidden md:table-cell">
                      {formatSAR(hp.estimated_value)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                      {hp.expected_close_date ? formatDate(hp.expected_close_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/hot-projects/${hp.id}`}>
                        <Button variant="ghost" size="sm">View <ArrowRight size={13} /></Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ActiveProjectsTab({ projects }: { projects: Project[] }) {
  const activeProjects = projects.filter(
    p => p.project_status === 'approved' || p.project_status === 'active',
  );

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project / SO</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Delivery Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {activeProjects.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No active or approved projects.</td></tr>
            ) : activeProjects.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-emerald-700 font-semibold">{p.project_code}</div>
                  <div className="text-xs text-gray-400">{p.so_number}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{p.customer_name}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{locationBadge(p.manufacturing_location)}</td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap hidden md:table-cell">
                  {p.customer_delivery_date ? formatDate(p.customer_delivery_date) : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={p.project_status === 'active' ? 'success' : 'info'}>
                    {p.project_status === 'active' ? 'Active' : 'Approved'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/projects/${p.id}`}>
                    <Button variant="ghost" size="sm">View <ArrowRight size={13} /></Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsSales() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Quotations');
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hotProjects, setHotProjects] = useState<HotProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setQuotations(mockOrEmpty(MOCK_QUOTATIONS_RAW) as unknown as QuotationRequest[]);
        setProjects(mockOrEmpty(MOCK_PROJECTS_RAW) as unknown as Project[]);
        setHotProjects([]);
        setLoading(false);
        return;
      }
      const [qRes, pRes, hpRes] = await Promise.all([
        supabase.from('quotation_requests')
          .select('id, quotation_code, customer_name, quotation_status, submitted_at, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('projects')
          .select('id, project_code, customer_name, project_status, manufacturing_location, customer_delivery_date, so_number, total_sales_value')
          .in('project_status', ['approved', 'active'])
          .order('created_at', { ascending: false }),
        supabase.from('hot_projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      if (!qRes.error) setQuotations((qRes.data ?? []) as unknown as QuotationRequest[]);
      if (!pRes.error) setProjects((pRes.data ?? []) as unknown as Project[]);
      if (!hpRes.error) setHotProjects((hpRes.data ?? []) as unknown as HotProject[]);
      setLoading(false);
    })();
  }, []);

  function handleExportCsv() {
    if (activeTab === 'Quotations') {
      const columns: ReportColumn<QuotationRequest>[] = [
        { key: 'quotation_code', header: 'Quotation #', value: q => q.quotation_code },
        { key: 'customer_name', header: 'Customer', value: q => q.customer_name },
        { key: 'quotation_status', header: 'Status', value: q => q.quotation_status },
        { key: 'submitted_at', header: 'Submitted', value: q => q.submitted_at ?? '' },
      ];
      exportRowsToCsv(`sales-quotations-${new Date().toISOString().split('T')[0]}.csv`, quotations, columns);
    } else if (activeTab === 'Hot Projects') {
      const columns: ReportColumn<HotProject>[] = [
        { key: 'hot_project_code', header: 'Code', value: hp => hp.hot_project_code },
        { key: 'title', header: 'Title', value: hp => hp.title },
        { key: 'customer_name', header: 'Customer', value: hp => hp.customer_name },
        { key: 'stage', header: 'Stage', value: hp => hp.stage },
        { key: 'probability', header: 'Probability (%)', value: hp => hp.probability },
        { key: 'estimated_value', header: 'Est. Value (SAR)', value: hp => hp.estimated_value },
        { key: 'expected_close_date', header: 'Close Date', value: hp => hp.expected_close_date },
      ];
      exportRowsToCsv(`hot-projects-${new Date().toISOString().split('T')[0]}.csv`, hotProjects, columns);
    } else {
      const columns: ReportColumn<Project>[] = [
        { key: 'project_code', header: 'Project Code', value: p => p.project_code },
        { key: 'so_number', header: 'SO Number', value: p => p.so_number },
        { key: 'customer_name', header: 'Customer', value: p => p.customer_name },
        { key: 'project_status', header: 'Status', value: p => p.project_status },
        { key: 'manufacturing_location', header: 'Location', value: p => p.manufacturing_location },
        { key: 'customer_delivery_date', header: 'Delivery Date', value: p => p.customer_delivery_date },
      ];
      exportRowsToCsv(`active-projects-${new Date().toISOString().split('T')[0]}.csv`, projects, columns);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Reports"
        subtitle="Quotation pipeline, hot projects, conversion, and active project overview"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Sales' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <ReportExportBar
        reportKey="sales_report"
        reportTitle="Sales Report"
        department="Sales"
        onExportCsv={handleExportCsv}
        summary={`${quotations.length} quotation${quotations.length !== 1 ? 's' : ''} · ${hotProjects.filter(hp => OPEN_STAGES.includes(hp.stage)).length} open opportunities · ${projects.length} active project${projects.length !== 1 ? 's' : ''}`}
      />

      <div className="report-print-root space-y-6">
        <div className="flex gap-1 border-b border-gray-100 no-print overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 'Quotations' && <QuotationsTab quotations={quotations} />}
        {activeTab === 'Hot Projects' && <HotProjectsTab hotProjects={hotProjects} />}
        {activeTab === 'Active Projects' && <ActiveProjectsTab projects={projects} />}
        {activeTab === 'Aging' && (
          <div className="space-y-4">
            <EmptyState
              icon={<Clock size={28} className="text-gray-400" />}
              title="Aging report"
              description="Receivables aging data is managed in the Receivables module. Go there for current aging buckets and outstanding milestones."
              action={
                <Link to="/receivables">
                  <Button variant="secondary" size="sm" icon={<Flame size={14} />}>
                    Open Receivables & Aging
                  </Button>
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
