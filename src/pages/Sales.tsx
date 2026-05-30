import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, FolderOpen, Plus, Search, ChevronRight,
  Loader2, Calendar, Clock, AlertCircle, CheckCircle,
  TrendingUp, Flame, ReceiptText, BarChart3,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_QUOTATIONS } from '../data/mockQuotations';
import { MOCK_PROJECTS } from '../data/mockProjects';
import type {
  QuotationRequest, QuotationStatus,
  Project, ProjectStatus, UserRole,
} from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatSAR(value: number) {
  return 'SAR ' + value.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const QUOTATION_STATUS_MAP: Record<QuotationStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                    { label: 'Draft',              variant: 'neutral'  },
  submitted_by_sales:       { label: 'Submitted',          variant: 'info'     },
  received_by_coordinator:  { label: 'Received',           variant: 'info'     },
  sent_to_estimation:       { label: 'Sent to Est.',       variant: 'default'  },
  waiting_for_estimation:   { label: 'Waiting Est.',       variant: 'default'  },
  need_clarification:       { label: 'Clarification',      variant: 'warning'  },
  quotation_received:       { label: 'QTN Received',       variant: 'success'  },
  returned_to_sales:        { label: 'Returned to Sales',  variant: 'warning'  },
  converted_to_hot_project: { label: 'Hot Project',        variant: 'default'  },
  converted_to_so:          { label: 'Converted to SO',    variant: 'success'  },
  cancelled:                { label: 'Cancelled',          variant: 'neutral'  },
  closed_lost:              { label: 'Closed Lost',        variant: 'critical' },
};

const PROJECT_STATUS_MAP: Record<ProjectStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                   { label: 'Draft',      variant: 'neutral'  },
  submitted_for_approval:  { label: 'Submitted',  variant: 'info'     },
  sent_back_for_revision:  { label: 'Sent Back',  variant: 'warning'  },
  approved:                { label: 'Approved',   variant: 'success'  },
  rejected:                { label: 'Rejected',   variant: 'critical' },
  active:                  { label: 'Active',     variant: 'default'  },
  completed:               { label: 'Completed',  variant: 'success'  },
  cancelled:               { label: 'Cancelled',  variant: 'neutral'  },
};

const CAN_CREATE_SO: UserRole[] = ['admin', 'operations_manager', 'sales_user'];
const BROAD_VIEW: UserRole[] = ['admin', 'operations_manager'];

// ── KPI card ──────────────────────────────────────────────────────────────────

interface SalesKpi {
  id: string;
  label: string;
  value: number;
  sub: string;
  borderColor: string;
  icon: React.ReactNode;
}

function KpiStrip({ kpis }: { kpis: SalesKpi[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {kpis.map(k => (
        <div
          key={k.id}
          className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${k.borderColor}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400">{k.icon}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{k.value}</div>
          <div className="text-sm font-semibold text-gray-700 mt-0.5">{k.label}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Quotation row ──────────────────────────────────────────────────────────────

function QuotationRow({ q }: { q: QuotationRequest }) {
  const sm = QUOTATION_STATUS_MAP[q.quotation_status] ?? { label: q.quotation_status, variant: 'neutral' as const };
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">
        <Link to="/quotations" className="hover:underline">{q.quotation_code}</Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-800">{q.customer_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
        {q.scope_summary
          ? q.scope_summary.slice(0, 60) + (q.scope_summary.length > 60 ? '…' : '')
          : '—'}
      </td>
      <td className="px-4 py-3">
        <Badge variant={sm.variant}>{sm.label}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
        {formatDate(q.required_delivery_expectation)}
      </td>
      <td className="px-4 py-3">
        <Link to="/quotations">
          <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
        </Link>
      </td>
    </tr>
  );
}

// ── Project row ───────────────────────────────────────────────────────────────

function ProjectRow({ p, showValue }: { p: Project; showValue: boolean }) {
  const sm = PROJECT_STATUS_MAP[p.project_status] ?? { label: p.project_status, variant: 'neutral' as const };
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">
        <Link to={`/projects/${p.id}`} className="hover:underline">{p.project_code}</Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.so_number}</td>
      <td className="px-4 py-3 text-sm text-gray-800">{p.customer_name}</td>
      <td className="px-4 py-3">
        <Badge variant={sm.variant}>{sm.label}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
        {formatDate(p.customer_delivery_date)}
      </td>
      {showValue && (
        <td className="px-4 py-3 text-sm text-gray-700 text-right tabular-nums hidden xl:table-cell">
          {formatSAR(p.total_sales_value)}
        </td>
      )}
      <td className="px-4 py-3">
        <Link to={`/projects/${p.id}`}>
          <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
        </Link>
      </td>
    </tr>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function Sales() {
  const { role, profile } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [qSearch, setQSearch] = useState('');
  const [pSearch, setPSearch] = useState('');

  const isBroadView = role ? BROAD_VIEW.includes(role) : false;
  const canCreateSO = role ? CAN_CREATE_SO.includes(role) : false;
  // Sales users see total_sales_value on their own projects; admin/ops_manager see all
  const showValue = role === 'admin' || role === 'operations_manager' || role === 'sales_user';

  // ── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      const uid = profile?.id;
      const qBase = supabase
        .from('quotation_requests')
        .select('*, requested_by_profile:profiles!requested_by(full_name,email), assigned_coordinator:profiles!assigned_coordinator_id(full_name,email)')
        .order('created_at', { ascending: false });

      const pBase = supabase
        .from('projects')
        .select('*, sales_owner:profiles!sales_owner_id(full_name,email)')
        .order('created_at', { ascending: false });

      const qQuery = (!isBroadView && uid) ? qBase.eq('requested_by', uid) : qBase;
      const pQuery = (!isBroadView && uid) ? pBase.eq('sales_owner_id', uid) : pBase;

      Promise.all([qQuery, pQuery]).then(([qRes, pRes]) => {
        if (!qRes.error) setQuotations((qRes.data ?? []) as unknown as QuotationRequest[]);
        if (!pRes.error) setProjects((pRes.data ?? []) as unknown as Project[]);
        setLoading(false);
      });
    } else {
      // Dev mode — use mock data
      const uid = profile?.id ?? 'dev-usr-001';
      const qs = isBroadView
        ? MOCK_QUOTATIONS
        : MOCK_QUOTATIONS.filter(q => q.requested_by === uid || q.created_by === uid);
      const ps = isBroadView
        ? MOCK_PROJECTS
        : MOCK_PROJECTS.filter(p => p.sales_owner_id === uid || p.created_by === uid);
      setQuotations(qs);
      setProjects(ps);
      setLoading(false);
    }
  }, [isBroadView, profile?.id]);

  // ── KPI derivation ──────────────────────────────────────────────────────────

  const kpis: SalesKpi[] = useMemo(() => {
    const activeProjects = projects.filter(p =>
      ['approved', 'active'].includes(p.project_status)
    ).length;

    const openQuotations = quotations.filter(q =>
      ['draft', 'submitted_by_sales', 'received_by_coordinator',
       'sent_to_estimation', 'waiting_for_estimation',
       'need_clarification', 'quotation_received'].includes(q.quotation_status)
    ).length;

    const returnedQuotations = quotations.filter(q => q.quotation_status === 'returned_to_sales').length;
    const soDrafts = projects.filter(p => p.project_status === 'draft').length;
    const pendingApproval = projects.filter(p => p.project_status === 'submitted_for_approval').length;
    const approvedProjects = projects.filter(p =>
      ['approved', 'active', 'completed'].includes(p.project_status)
    ).length;
    const sentBack = projects.filter(p => p.project_status === 'sent_back_for_revision').length;
    const needClarification = quotations.filter(q => q.quotation_status === 'need_clarification').length;

    return [
      {
        id: 'active-projects', label: 'Active Projects', value: activeProjects,
        sub: 'Approved & in progress', borderColor: 'border-l-sky-400',
        icon: <FolderOpen size={18} />,
      },
      {
        id: 'open-quotations', label: 'Open Quotations', value: openQuotations,
        sub: 'In pipeline', borderColor: 'border-l-amber-400',
        icon: <FileText size={18} />,
      },
      {
        id: 'returned-quotations', label: 'Returned to Sales', value: returnedQuotations,
        sub: 'Awaiting your action', borderColor: 'border-l-orange-400',
        icon: <AlertCircle size={18} />,
      },
      {
        id: 'so-drafts', label: 'SO Drafts', value: soDrafts,
        sub: 'Not yet submitted', borderColor: 'border-l-gray-400',
        icon: <FileText size={18} />,
      },
      {
        id: 'pending-approval', label: 'Pending Approval', value: pendingApproval,
        sub: 'Awaiting admin review', borderColor: 'border-l-indigo-400',
        icon: <Clock size={18} />,
      },
      {
        id: 'approved-projects', label: 'Approved Projects', value: approvedProjects,
        sub: 'Approved / active / done', borderColor: 'border-l-green-400',
        icon: <CheckCircle size={18} />,
      },
      {
        id: 'sent-back', label: 'Sent Back', value: sentBack,
        sub: 'Needs revision', borderColor: 'border-l-red-400',
        icon: <TrendingUp size={18} />,
      },
      {
        id: 'clarification', label: 'Need Clarification', value: needClarification,
        sub: 'Coordinator requested info', borderColor: 'border-l-yellow-400',
        icon: <AlertCircle size={18} />,
      },
    ];
  }, [quotations, projects]);

  // ── Filtered lists ──────────────────────────────────────────────────────────

  const filteredQuotations = useMemo(() => {
    const q = qSearch.toLowerCase();
    if (!q) return quotations;
    return quotations.filter(x =>
      x.quotation_code.toLowerCase().includes(q) ||
      x.customer_name.toLowerCase().includes(q)
    );
  }, [quotations, qSearch]);

  const filteredProjects = useMemo(() => {
    const q = pSearch.toLowerCase();
    if (!q) return projects;
    return projects.filter(x =>
      x.project_code.toLowerCase().includes(q) ||
      x.so_number.toLowerCase().includes(q) ||
      x.customer_name.toLowerCase().includes(q)
    );
  }, [projects, pSearch]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Workspace"
        subtitle={isBroadView ? 'All quotations and projects' : 'Your quotations and projects'}
        action={
          <div className="flex items-center gap-2">
            <Link to="/quotations">
              <Button variant="secondary" size="sm">
                <FileText size={14} className="mr-1" /> New Quotation
              </Button>
            </Link>
            {canCreateSO && (
              <Link to="/projects/new">
                <Button variant="primary" size="sm">
                  <Plus size={14} className="mr-1" /> New SO / Project
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* KPI Strip */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> Loading workspace data…
        </div>
      ) : (
        <KpiStrip kpis={kpis} />
      )}

      {/* Quick Actions */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Quick Actions</h2>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-3">
          <Link to="/quotations">
            <Button variant="secondary" size="sm">
              <FileText size={14} className="mr-1" /> My Quotations
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="secondary" size="sm">
              <FolderOpen size={14} className="mr-1" /> My Projects
            </Button>
          </Link>
          {canCreateSO && (
            <Link to="/projects/new">
              <Button variant="secondary" size="sm">
                <Plus size={14} className="mr-1" /> Register New SO
              </Button>
            </Link>
          )}
          <Link to="/admin-approvals">
            <Button variant="secondary" size="sm">
              <Clock size={14} className="mr-1" /> Approval Queue
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="secondary" size="sm">
              <AlertCircle size={14} className="mr-1" /> Sent-Back SOs
            </Button>
          </Link>
        </div>
      </Card>

      {/* My Quotation Requests */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText size={15} className="text-gray-400" />
            {isBroadView ? 'All Quotation Requests' : 'My Quotation Requests'}
            <span className="ml-1 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {filteredQuotations.length}
            </span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={qSearch}
              onChange={e => setQSearch(e.target.value)}
              placeholder="Search quotations…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 w-52"
            />
          </div>
        </div>
        {filteredQuotations.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState
              icon={<FileText size={24} className="text-gray-400" />}
              title="No quotations found"
              description="Submit a new quotation request to get started."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Scope</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Expected Delivery</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQuotations.slice(0, 10).map(q => (
                  <QuotationRow key={q.id} q={q} />
                ))}
              </tbody>
            </table>
            {filteredQuotations.length > 10 && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <Link to="/quotations" className="text-sm text-sky-600 hover:underline font-medium">
                  View all {filteredQuotations.length} quotations →
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* My Projects */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FolderOpen size={15} className="text-gray-400" />
            {isBroadView ? 'All Projects' : 'My Projects'}
            <span className="ml-1 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {filteredProjects.length}
            </span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={pSearch}
              onChange={e => setPSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 w-52"
            />
          </div>
        </div>
        {filteredProjects.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState
              icon={<FolderOpen size={24} className="text-gray-400" />}
              title="No projects found"
              description={
                canCreateSO
                  ? 'Register a new Sales Order to create your first project.'
                  : 'No projects assigned to you yet.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">SO Number</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Delivery Date</th>
                  {showValue && (
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-right hidden xl:table-cell">Sales Value</th>
                  )}
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProjects.slice(0, 10).map(p => (
                  <ProjectRow key={p.id} p={p} showValue={showValue} />
                ))}
              </tbody>
            </table>
            {filteredProjects.length > 10 && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <Link to="/projects" className="text-sm text-sky-600 hover:underline font-medium">
                  View all {filteredProjects.length} projects →
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Hot Projects — Placeholder */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Flame size={15} className="text-orange-400" /> Hot Projects
          </h2>
        </div>
        <div className="px-5 py-8 text-center">
          <Flame size={32} className="text-orange-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Hot Projects workflow</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Pre-SO opportunities tracked by Sales. Hot Projects will be introduced in a future module — allowing you to track leads, pipeline probability, and estimated contract values before an SO is registered.
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 border border-orange-100 px-3 py-1.5 rounded-full font-medium">
              <Calendar size={11} /> Coming in a future phase
            </span>
          </div>
        </div>
      </Card>

      {/* Invoicing Plan — Placeholder */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ReceiptText size={15} className="text-indigo-400" /> Invoicing Plan
          </h2>
        </div>
        <div className="px-5 py-8 text-center">
          <ReceiptText size={32} className="text-indigo-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Invoicing Plan & Milestones</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Define milestone-based invoicing schedules per project. Track invoice submission, approval, and receipt status per SO. This module will be built in a future phase.
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-full font-medium">
              <Calendar size={11} /> Coming in a future phase
            </span>
          </div>
        </div>
      </Card>

      {/* Aging / Receivables — Placeholder */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BarChart3 size={15} className="text-rose-400" /> Aging / Receivables
          </h2>
        </div>
        <div className="px-5 py-8 text-center">
          <BarChart3 size={32} className="text-rose-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Aging & Receivables Dashboard</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Track outstanding invoices by aging bucket (30 / 60 / 90 / 90+ days). Monitor overdue receivables per customer and escalate to Finance. This module will be built in a future phase.
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-full font-medium">
              <Calendar size={11} /> Coming in a future phase
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
