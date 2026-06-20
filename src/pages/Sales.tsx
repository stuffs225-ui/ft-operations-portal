import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, FolderOpen, Plus, ChevronRight,
  Loader2, Clock, AlertCircle, CheckCircle2,
  Flame, ReceiptText, BarChart3, ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Drawer } from '../components/ui/Drawer';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_QUOTATIONS } from '../data/mockQuotations';
import { MOCK_PROJECTS } from '../data/mockProjects';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import type { QuotationRequest, QuotationStatus, Project, ProjectStatus, UserRole } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatSAR(value: number) {
  return 'SAR ' + value.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null | undefined) {
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

interface KpiItem {
  id: string;
  label: string;
  value: number;
  sub: string;
  borderColor: string;
  icon: React.ReactNode;
  urgent?: boolean;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function Sales() {
  const { role, profile } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);

  const isBroadView = role ? BROAD_VIEW.includes(role) : false;
  const isSalesUser = role === 'sales_user';
  const canCreateSO = role ? CAN_CREATE_SO.includes(role) : false;
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
      const uid = profile?.id ?? 'dev-usr-001';
      const qs = isBroadView ? MOCK_QUOTATIONS : MOCK_QUOTATIONS.filter(q => q.requested_by === uid || q.created_by === uid);
      const ps = isBroadView ? MOCK_PROJECTS : MOCK_PROJECTS.filter(p => p.sales_owner_id === uid || p.created_by === uid);
      setQuotations(qs);
      setProjects(ps);
      setLoading(false);
    }
  }, [isBroadView, profile?.id]);

  // ── KPI derivation ──────────────────────────────────────────────────────────

  const kpis: KpiItem[] = useMemo(() => {
    const openQuotations = quotations.filter(q =>
      ['draft', 'submitted_by_sales', 'received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation', 'quotation_received'].includes(q.quotation_status)
    ).length;
    const returnedToSales = quotations.filter(q => q.quotation_status === 'returned_to_sales').length;
    const needClarification = quotations.filter(q => q.quotation_status === 'need_clarification').length;
    const openHotProjects = 0; // hot_projects not loaded here — link out to /hot-projects
    const approvedSOs = projects.filter(p => ['approved', 'active'].includes(p.project_status)).length;
    const atRisk = projects.filter(p => p.project_status === 'sent_back_for_revision').length;
    const pendingApproval = projects.filter(p => p.project_status === 'submitted_for_approval').length;
    const soDrafts = projects.filter(p => p.project_status === 'draft').length;

    return [
      { id: 'open-quotations',   label: 'Open Quotations',     value: openQuotations,   sub: 'In pipeline',             borderColor: 'border-l-emerald-400', icon: <FileText size={18} /> },
      { id: 'returned',          label: 'Returned to Sales',   value: returnedToSales,  sub: 'Awaiting your action',    borderColor: returnedToSales > 0 ? 'border-l-orange-500' : 'border-l-gray-200', icon: <AlertCircle size={18} />, urgent: returnedToSales > 0 },
      { id: 'clarification',     label: 'Need Clarification',  value: needClarification,sub: 'Info requested',          borderColor: needClarification > 0 ? 'border-l-amber-500' : 'border-l-gray-200', icon: <AlertCircle size={18} />, urgent: needClarification > 0 },
      { id: 'hot-projects-kpi',  label: 'Hot Projects',        value: openHotProjects,  sub: 'View pipeline',           borderColor: 'border-l-orange-400', icon: <Flame size={18} /> },
      { id: 'approved-sos',      label: 'Approved SOs',        value: approvedSOs,      sub: 'Approved & active',       borderColor: 'border-l-emerald-500', icon: <CheckCircle2 size={18} /> },
      { id: 'at-risk',           label: 'Projects At Risk',    value: atRisk,           sub: 'Sent back for revision',  borderColor: atRisk > 0 ? 'border-l-red-500' : 'border-l-gray-200', icon: <AlertCircle size={18} />, urgent: atRisk > 0 },
      { id: 'pending-approval',  label: 'Pending Approval',    value: pendingApproval,  sub: 'Awaiting admin review',   borderColor: 'border-l-indigo-400', icon: <Clock size={18} /> },
      { id: 'so-drafts',         label: 'SO Drafts',           value: soDrafts,         sub: 'Not yet submitted',       borderColor: 'border-l-gray-400', icon: <FolderOpen size={18} /> },
    ];
  }, [quotations, projects]);

  // ── KPI drawer ───────────────────────────────────────────────────────────────

  const kpiDetail = useMemo(() => {
    if (!activeKpi) return null;
    type Detail =
      | { title: string; subtitle: string; kind: 'quotation'; items: QuotationRequest[] }
      | { title: string; subtitle: string; kind: 'project'; items: Project[] };
    const open = ['draft', 'submitted_by_sales', 'received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation', 'quotation_received'];
    const map: Record<string, Detail> = {
      'open-quotations':  { title: 'Open Quotations',        subtitle: 'In pipeline',                   kind: 'quotation', items: quotations.filter(q => open.includes(q.quotation_status)) },
      'returned':         { title: 'Returned to Sales',      subtitle: 'Review and take action',        kind: 'quotation', items: quotations.filter(q => q.quotation_status === 'returned_to_sales') },
      'clarification':    { title: 'Need Clarification',     subtitle: 'Coordinator requested info',    kind: 'quotation', items: quotations.filter(q => q.quotation_status === 'need_clarification') },
      'approved-sos':     { title: 'Approved SOs',           subtitle: 'Approved / active projects',    kind: 'project',   items: projects.filter(p => ['approved', 'active'].includes(p.project_status)) },
      'at-risk':          { title: 'Projects At Risk',       subtitle: 'Sent back for revision',        kind: 'project',   items: projects.filter(p => p.project_status === 'sent_back_for_revision') },
      'pending-approval': { title: 'Pending Approval',       subtitle: 'Awaiting admin review',         kind: 'project',   items: projects.filter(p => p.project_status === 'submitted_for_approval') },
      'so-drafts':        { title: 'SO Drafts',              subtitle: 'Not yet submitted',             kind: 'project',   items: projects.filter(p => p.project_status === 'draft') },
    };
    return map[activeKpi] ?? null;
  }, [activeKpi, quotations, projects]);

  // ── Action-required work queue ───────────────────────────────────────────────

  const actionRequired = quotations.filter(q =>
    ['returned_to_sales', 'need_clarification'].includes(q.quotation_status)
  );
  const pendingApprovalProjects = projects.filter(p => p.project_status === 'submitted_for_approval');
  const atRiskProjects = projects.filter(p => p.project_status === 'sent_back_for_revision');
  const draftProjects = projects.filter(p => p.project_status === 'draft');
  const salesRules = ROLE_MATRIX.sales_user.rules;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sales Dashboard"
        subtitle="Track quotation requests, hot projects, SOs, receivables, and commercial follow-up actions."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {role && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_MATRIX.sales_user.badgeClass}`}>
                Sales User
              </span>
            )}
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {/* Top Actions */}
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
      </div>

      {/* Critical alerts */}
      {!loading && actionRequired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertCircle size={15} className="shrink-0 text-amber-500" />
            <span>
              <strong>{actionRequired.length}</strong> quotation{actionRequired.length !== 1 ? 's' : ''} require your action —{' '}
              {quotations.filter(q => q.quotation_status === 'returned_to_sales').length > 0 && (
                <span>{quotations.filter(q => q.quotation_status === 'returned_to_sales').length} returned, </span>
              )}
              {quotations.filter(q => q.quotation_status === 'need_clarification').length > 0 && (
                <span>{quotations.filter(q => q.quotation_status === 'need_clarification').length} need clarification</span>
              )}
            </span>
          </div>
          <Link to="/quotations">
            <Button variant="secondary" size="sm">View Quotations</Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> Loading dashboard data…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => (
            k.id === 'hot-projects-kpi' ? (
              <Link key={k.id} to="/hot-projects">
                <div className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 hover:shadow-md transition-shadow ${k.borderColor}`}>
                  <div className="text-gray-400 mb-2">{k.icon}</div>
                  <div className="text-2xl font-bold text-gray-900">—</div>
                  <div className="text-sm font-semibold text-gray-700 mt-0.5">{k.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{k.sub}</div>
                </div>
              </Link>
            ) : (
              <button
                key={k.id}
                type="button"
                onClick={() => setActiveKpi(k.id)}
                className={`text-left bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 hover:shadow-md transition-all ${k.borderColor} ${k.urgent ? 'ring-1 ring-orange-200' : ''}`}
              >
                <div className={`mb-2 ${k.urgent ? 'text-orange-500' : 'text-gray-400'}`}>{k.icon}</div>
                <div className={`text-2xl font-bold ${k.urgent && k.value > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{k.value}</div>
                <div className="text-sm font-semibold text-gray-700 mt-0.5">{k.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{k.sub}</div>
              </button>
            )
          ))}
        </div>
      )}

      {/* Work Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Action Required */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle size={14} className="text-orange-500" /> Action Required
              {actionRequired.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{actionRequired.length}</span>
              )}
            </h3>
            <Link to="/quotations"><Button variant="ghost" size="sm">View All <ChevronRight size={13} /></Button></Link>
          </div>
          {actionRequired.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <CheckCircle2 size={22} className="mx-auto text-emerald-400 mb-1" />
              <p className="text-sm text-gray-500">No quotations require your action.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {actionRequired.slice(0, 5).map(q => {
                const sm = QUOTATION_STATUS_MAP[q.quotation_status];
                return (
                  <div key={q.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-medium text-emerald-700">{q.quotation_code}</span>
                        <Badge variant={sm.variant}>{sm.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{q.customer_name}</p>
                    </div>
                    <Link to={`/quotations/${q.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pending Approval */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock size={14} className="text-indigo-500" /> Pending Approval
              {pendingApprovalProjects.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{pendingApprovalProjects.length}</span>
              )}
            </h3>
            <Link to="/projects"><Button variant="ghost" size="sm">View All <ChevronRight size={13} /></Button></Link>
          </div>
          {pendingApprovalProjects.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <CheckCircle2 size={22} className="mx-auto text-emerald-400 mb-1" />
              <p className="text-sm text-gray-500">No projects awaiting approval.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pendingApprovalProjects.slice(0, 5).map(p => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-emerald-700">{p.project_code}</span>
                      <Badge variant="info">Pending</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.customer_name} · {p.so_number}</p>
                  </div>
                  <Link to={`/projects/${p.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* At Risk / Sent Back */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" /> Projects At Risk
              {atRiskProjects.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{atRiskProjects.length}</span>
              )}
            </h3>
            <Link to="/projects"><Button variant="ghost" size="sm">View All <ChevronRight size={13} /></Button></Link>
          </div>
          {atRiskProjects.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <CheckCircle2 size={22} className="mx-auto text-emerald-400 mb-1" />
              <p className="text-sm text-gray-500">No projects sent back for revision.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {atRiskProjects.slice(0, 5).map(p => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-emerald-700">{p.project_code}</span>
                      <Badge variant="warning">Sent Back</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.customer_name} · Delivery: {formatDate(p.customer_delivery_date)}</p>
                  </div>
                  <Link to={`/projects/${p.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Draft SOs */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FolderOpen size={14} className="text-gray-400" /> Draft SOs / Projects
              {draftProjects.length > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">{draftProjects.length}</span>
              )}
            </h3>
            {canCreateSO && <Link to="/projects/new"><Button variant="ghost" size="sm">New SO <ChevronRight size={13} /></Button></Link>}
          </div>
          {draftProjects.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-gray-500">No draft SOs.</p>
              {canCreateSO && (
                <div className="mt-2">
                  <Link to="/projects/new"><Button size="sm" variant="secondary"><Plus size={13} className="mr-1" /> Create SO</Button></Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {draftProjects.slice(0, 5).map(p => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-gray-700">{p.project_code || p.so_number}</span>
                      <Badge variant="neutral">Draft</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.customer_name}</p>
                  </div>
                  <Link to={`/projects/${p.id}`}><Button variant="ghost" size="sm">Continue</Button></Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Commercial Pipeline Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Hot Projects Pipeline', icon: <Flame size={14} className="mr-1.5 text-orange-500" />, to: '/hot-projects', description: 'Track leads, negotiations, and won opportunities' },
          { label: 'Invoicing Plan', icon: <ReceiptText size={14} className="mr-1.5 text-indigo-500" />, to: '/sales', description: `${projects.length} project${projects.length !== 1 ? 's' : ''} — total SAR ${projects.reduce((s, p) => s + p.total_sales_value, 0).toLocaleString('en-SA')}` },
          { label: 'Receivables & Aging', icon: <BarChart3 size={14} className="mr-1.5 text-rose-500" />, to: '/receivables', description: 'Outstanding invoice milestones by aging bucket' },
        ].map(t => (
          <Link key={t.label} to={t.to}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="flex items-center text-sm font-semibold text-gray-700 mb-1">{t.icon}{t.label}</div>
              <p className="text-xs text-gray-500">{t.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Sales Governance Rules */}
      <Card>
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

      {/* KPI detail drawer */}
      <Drawer
        open={kpiDetail !== null}
        onClose={() => setActiveKpi(null)}
        title={kpiDetail?.title ?? ''}
        subtitle={kpiDetail?.subtitle}
      >
        {kpiDetail && kpiDetail.items.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={24} className="text-emerald-400" />}
            title="Nothing here"
            description="There are no records in this category right now."
          />
        ) : kpiDetail?.kind === 'quotation' ? (
          <ul className="divide-y divide-gray-100">
            {kpiDetail.items.map(q => {
              const sm = QUOTATION_STATUS_MAP[q.quotation_status] ?? { label: q.quotation_status, variant: 'neutral' as const };
              return (
                <li key={q.id}>
                  <Link
                    to={`/quotations/${q.id}`}
                    onClick={() => setActiveKpi(null)}
                    className="flex items-center justify-between gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium text-emerald-700">{q.quotation_code}</p>
                      <p className="text-sm text-gray-800 truncate">{q.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={sm.variant}>{sm.label}</Badge>
                      <ChevronRight size={15} className="text-gray-400" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : kpiDetail?.kind === 'project' ? (
          <ul className="divide-y divide-gray-100">
            {kpiDetail.items.map(p => {
              const sm = PROJECT_STATUS_MAP[p.project_status] ?? { label: p.project_status, variant: 'neutral' as const };
              return (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    onClick={() => setActiveKpi(null)}
                    className="flex items-center justify-between gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium text-emerald-700">{p.project_code}</p>
                      <p className="text-sm text-gray-800 truncate">{p.customer_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.so_number}</p>
                      {showValue && p.total_sales_value > 0 && (
                        <p className="text-xs text-emerald-700 font-medium">{formatSAR(p.total_sales_value)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={sm.variant}>{sm.label}</Badge>
                      <ChevronRight size={15} className="text-gray-400" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Drawer>

      {/* Invoicing Plan (visible to all roles) */}
      {!isSalesUser && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ReceiptText size={15} className="text-indigo-500" /> Invoicing Plan
            </h2>
            <Link to="/projects" className="text-xs text-emerald-600 hover:underline font-medium">
              Open Projects →
            </Link>
          </div>
          <div className="px-5 py-4">
            {projects.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No projects found.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Customer</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Project / SO</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Value (SAR)</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 hidden md:table-cell">Delivery</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 hidden md:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {projects.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900 font-medium text-sm">{p.customer_name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-emerald-700">{p.project_code} <span className="text-gray-400">/ {p.so_number}</span></td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 tabular-nums">{formatSAR(p.total_sales_value)}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs hidden md:table-cell">{formatDate(p.customer_delivery_date)}</td>
                        <td className="px-3 py-2 hidden md:table-cell"><Badge variant={PROJECT_STATUS_MAP[p.project_status]?.variant ?? 'neutral'}>{PROJECT_STATUS_MAP[p.project_status]?.label ?? p.project_status}</Badge></td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="px-3 py-2 text-xs text-gray-700" colSpan={2}>Total ({projects.length})</td>
                      <td className="px-3 py-2 text-right text-gray-900 tabular-nums">{formatSAR(projects.reduce((s, p) => s + p.total_sales_value, 0))}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
