import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, XCircle, ArrowRight,
  Loader2, ShieldCheck, Wrench, ShoppingCart, Microscope,
  Calendar, AlertCircle, GitBranch, Activity,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { exportRowsToCsv } from '../lib/reportExport';
import type { ReportColumn } from '../lib/reportExport';
import { MOCK_PROJECTS } from '../data/mockProjects';
import { MOCK_PROCUREMENT_REQUESTS } from '../data/mockProcurement';
import { MOCK_AFS_MAINTENANCE_REQUESTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { ROLE_MATRIX } from '../lib/roleMatrix';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function severityVariant(severity: string): 'critical' | 'warning' | 'neutral' {
  if (severity === 'critical') return 'critical';
  if (severity === 'high' || severity === 'medium') return 'warning';
  return 'neutral';
}

// ── Live Data Types ───────────────────────────────────────────────────────────

interface OverdueProject {
  id: string;
  project_code: string;
  customer_name: string;
  customer_delivery_date: string;
  project_status: string;
  manufacturing_location: string;
}

interface OpenException {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  entity: string;
  path: string;
  module: string;
}

interface LiveMetrics {
  totalActive: number;
  pendingApproval: number;
  approvedCount: number;
  overdueProjects: OverdueProject[];
  missingWo: number;
  missingPn: number;
  openQcFindings: number;
  openMaintenanceCritical: number;
  openProcurement: number;
  openMaterialNcrs: number;
  releaseNotesIssued: number;
  releasePending: number;
  blockedByQcCount: number;
  hotProjectsOpen: number;
  quotationsOpen: number;
}

const EMPTY_METRICS: LiveMetrics = {
  totalActive: 0, pendingApproval: 0, approvedCount: 0,
  overdueProjects: [], missingWo: 0, missingPn: 0,
  openQcFindings: 0, openMaintenanceCritical: 0, openProcurement: 0, openMaterialNcrs: 0,
  releaseNotesIssued: 0, releasePending: 0, blockedByQcCount: 0,
  hotProjectsOpen: 0, quotationsOpen: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ControlTower() {
  const [metrics, setMetrics] = useState<LiveMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        const projects = mockOrEmpty(MOCK_PROJECTS);
        const procReqs = mockOrEmpty(MOCK_PROCUREMENT_REQUESTS);
        const maint = mockOrEmpty(MOCK_AFS_MAINTENANCE_REQUESTS);
        const today = new Date().toISOString().split('T')[0];
        const activeStatuses = ['active', 'approved', 'submitted_for_approval'];
        const overdueProjects = projects.filter(
          p => activeStatuses.includes(p.project_status) &&
            p.customer_delivery_date && p.customer_delivery_date < today,
        ) as OverdueProject[];
        if (!cancelled) {
          setMetrics({
            totalActive: projects.filter(p => activeStatuses.includes(p.project_status)).length,
            pendingApproval: projects.filter(p => p.project_status === 'submitted_for_approval').length,
            approvedCount: projects.filter(p => p.project_status === 'approved' || p.project_status === 'active').length,
            overdueProjects,
            missingWo: 0,
            missingPn: 0,
            openQcFindings: 0,
            openMaintenanceCritical: maint.filter(r => r.priority === 'critical' && !['completed', 'closed', 'cancelled'].includes(r.maintenance_status)).length,
            openProcurement: procReqs.filter(r => ['draft', 'pr_received', 'in_progress', 'partially_ordered'].includes(r.status)).length,
            openMaterialNcrs: 0,
            releaseNotesIssued: 0,
            releasePending: 0,
            blockedByQcCount: 0,
            hotProjectsOpen: 0,
            quotationsOpen: 0,
          });
          setLoading(false);
        }
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const activeStatuses = ['active', 'approved', 'submitted_for_approval'];
      const govStatuses = ['approved', 'active'];

      const [
        activeRes, pendingRes, approvedRes, overdueRes,
        qcFindingsRes, maintCriticalRes, procRes, ncrRes,
        rnIssuedRes, rnPendingRes, rnBlockedRes,
        hotOpenRes, quotOpenRes,
        saudiProjectsRes, dubaiProjectsRes,
        woRefsRes, pnRefsRes,
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .in('project_status', activeStatuses),
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .eq('project_status', 'submitted_for_approval'),
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .in('project_status', ['approved', 'active']),
        supabase.from('projects')
          .select('id, project_code, customer_name, customer_delivery_date, project_status, manufacturing_location')
          .in('project_status', activeStatuses)
          .lt('customer_delivery_date', today),
        supabase.from('project_qc_findings').select('*', { count: 'exact', head: true })
          .in('finding_status', ['open', 'assigned', 'rework_in_progress', 'pending_reinspection']),
        supabase.from('afs_maintenance_requests').select('*', { count: 'exact', head: true })
          .eq('priority', 'critical')
          .not('maintenance_status', 'in', '(completed,closed,cancelled)'),
        supabase.from('procurement_requests').select('*', { count: 'exact', head: true })
          .in('status', ['open', 'pending', 'pending_approval']),
        supabase.from('material_ncrs').select('*', { count: 'exact', head: true })
          .in('ncr_status', ['open', 'assigned', 'corrective_action_in_progress', 'pending_evidence']),
        supabase.from('release_notes').select('*', { count: 'exact', head: true })
          .eq('release_status', 'issued'),
        supabase.from('release_notes').select('*', { count: 'exact', head: true })
          .eq('release_status', 'draft'),
        supabase.from('release_notes').select('*', { count: 'exact', head: true })
          .eq('release_status', 'blocked'),
        supabase.from('hot_projects').select('*', { count: 'exact', head: true })
          .in('stage', ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation']),
        supabase.from('quotation_requests').select('*', { count: 'exact', head: true })
          .in('quotation_status', ['submitted_by_sales', 'received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation', 'need_clarification', 'quotation_received']),
        supabase.from('projects').select('id')
          .in('project_status', govStatuses)
          .eq('manufacturing_location', 'saudi'),
        supabase.from('projects').select('id')
          .in('project_status', govStatuses)
          .eq('manufacturing_location', 'dubai'),
        supabase.from('project_execution_references').select('project_id')
          .eq('reference_type', 'wo')
          .not('status', 'in', '(cancelled,superseded)'),
        supabase.from('project_execution_references').select('project_id')
          .eq('reference_type', 'pn')
          .not('status', 'in', '(cancelled,superseded)'),
      ]);

      const saudiIds = new Set((saudiProjectsRes.data ?? []).map(p => p.id));
      const dubaiIds = new Set((dubaiProjectsRes.data ?? []).map(p => p.id));
      const projectsWithWo = new Set((woRefsRes.data ?? []).map(r => r.project_id));
      const projectsWithPn = new Set((pnRefsRes.data ?? []).map(r => r.project_id));
      const missingWo = [...saudiIds].filter(id => !projectsWithWo.has(id)).length;
      const missingPn = [...dubaiIds].filter(id => !projectsWithPn.has(id)).length;

      if (!cancelled) {
        setMetrics({
          totalActive: activeRes.count ?? 0,
          pendingApproval: pendingRes.count ?? 0,
          approvedCount: approvedRes.count ?? 0,
          overdueProjects: (overdueRes.data ?? []) as OverdueProject[],
          missingWo,
          missingPn,
          openQcFindings: qcFindingsRes.count ?? 0,
          openMaintenanceCritical: maintCriticalRes.count ?? 0,
          openProcurement: procRes.count ?? 0,
          openMaterialNcrs: ncrRes.count ?? 0,
          releaseNotesIssued: rnIssuedRes.count ?? 0,
          releasePending: rnPendingRes.count ?? 0,
          blockedByQcCount: rnBlockedRes.count ?? 0,
          hotProjectsOpen: hotOpenRes.count ?? 0,
          quotationsOpen: quotOpenRes.count ?? 0,
        });
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // ── Derived exceptions ─────────────────────────────────────────────────────
  const exceptions: OpenException[] = [];
  const m = metrics;

  if (m.overdueProjects.length > 0) {
    m.overdueProjects.slice(0, 3).forEach(p => {
      exceptions.push({
        id: `overdue-${p.id}`,
        severity: 'critical',
        description: `Project overdue: ${p.project_code} — ${p.customer_name}`,
        entity: `Delivery was ${formatDate(p.customer_delivery_date)} · ${p.project_status}`,
        path: `/projects/${p.id}`,
        module: 'projects',
      });
    });
  }
  if (m.pendingApproval > 0) {
    exceptions.push({
      id: 'pending-approval',
      severity: 'high',
      description: `${m.pendingApproval} project${m.pendingApproval !== 1 ? 's' : ''} pending approval`,
      entity: 'Approvals Center',
      path: '/admin-approvals',
      module: 'projects',
    });
  }
  if (m.missingWo > 0) {
    exceptions.push({
      id: 'missing-wo',
      severity: 'high',
      description: `${m.missingWo} Saudi project${m.missingWo !== 1 ? 's' : ''} missing Work Order`,
      entity: 'WO / PN Gate — Saudi route',
      path: '/wo-pn-gate',
      module: 'projects',
    });
  }
  if (m.missingPn > 0) {
    exceptions.push({
      id: 'missing-pn',
      severity: 'high',
      description: `${m.missingPn} Dubai project${m.missingPn !== 1 ? 's' : ''} missing Part Number`,
      entity: 'WO / PN Gate — Dubai route',
      path: '/wo-pn-gate',
      module: 'projects',
    });
  }
  if (m.openQcFindings > 0) {
    exceptions.push({
      id: 'qc-findings',
      severity: m.openQcFindings > 3 ? 'critical' : 'medium',
      description: `${m.openQcFindings} open QC finding${m.openQcFindings !== 1 ? 's' : ''}`,
      entity: 'Project QC — blocking release notes',
      path: '/project-qc',
      module: 'qc',
    });
  }
  if (m.openMaterialNcrs > 0) {
    exceptions.push({
      id: 'material-ncrs',
      severity: 'medium',
      description: `${m.openMaterialNcrs} open Material NCR${m.openMaterialNcrs !== 1 ? 's' : ''}`,
      entity: 'Material QC',
      path: '/material-qc',
      module: 'qc',
    });
  }
  if (m.openMaintenanceCritical > 0) {
    exceptions.push({
      id: 'critical-maint',
      severity: 'critical',
      description: `${m.openMaintenanceCritical} critical maintenance request${m.openMaintenanceCritical !== 1 ? 's' : ''} open`,
      entity: 'After Sales Maintenance',
      path: '/after-sales/maintenance',
      module: 'afs',
    });
  }

  const visibleExceptions = exceptions.slice(0, 8);

  // ── Export ─────────────────────────────────────────────────────────────────
  function handleExportOverdue() {
    const columns: ReportColumn<OverdueProject>[] = [
      { key: 'project_code', header: 'Project Code', value: p => p.project_code },
      { key: 'customer_name', header: 'Customer', value: p => p.customer_name },
      { key: 'customer_delivery_date', header: 'Delivery Date', value: p => p.customer_delivery_date },
      { key: 'project_status', header: 'Status', value: p => p.project_status },
      { key: 'manufacturing_location', header: 'Location', value: p => p.manufacturing_location },
    ];
    exportRowsToCsv(`overdue-projects-${new Date().toISOString().split('T')[0]}.csv`, m.overdueProjects, columns);
  }

  if (loading) return <PageLoader />;

  const overdueCount = m.overdueProjects.length;
  const gateIssues = m.missingWo + m.missingPn;
  const totalExceptions = exceptions.length;
  const govRules = ROLE_MATRIX.operations_manager.rules;

  const lifecycleCards = [
    { label: 'Total Active Projects', value: m.totalActive, accent: 'border-indigo-400', icon: <AlertCircle size={14} className="text-indigo-500" /> },
    { label: 'Pending Approval', value: m.pendingApproval, accent: m.pendingApproval > 0 ? 'border-amber-400' : 'border-gray-200', icon: <ShieldCheck size={14} className={m.pendingApproval > 0 ? 'text-amber-500' : 'text-gray-400'} /> },
    { label: 'Approved / Active', value: m.approvedCount, accent: 'border-green-400', icon: <CheckCircle2 size={14} className="text-green-500" /> },
    { label: 'Overdue Delivery', value: overdueCount, accent: overdueCount > 0 ? 'border-red-400' : 'border-gray-200', icon: <Calendar size={14} className={overdueCount > 0 ? 'text-red-500' : 'text-gray-400'} /> },
    { label: 'Missing WO (Saudi)', value: m.missingWo, accent: m.missingWo > 0 ? 'border-red-400' : 'border-gray-200', icon: <AlertTriangle size={14} className={m.missingWo > 0 ? 'text-red-500' : 'text-gray-400'} /> },
    { label: 'Missing PN (Dubai)', value: m.missingPn, accent: m.missingPn > 0 ? 'border-red-400' : 'border-gray-200', icon: <AlertTriangle size={14} className={m.missingPn > 0 ? 'text-red-500' : 'text-gray-400'} /> },
  ];

  const deliveryCards = [
    { label: 'Release Notes Issued', value: m.releaseNotesIssued, accent: 'border-green-400' },
    { label: 'Release Pending', value: m.releasePending, accent: m.releasePending > 0 ? 'border-amber-400' : 'border-gray-200' },
    { label: 'Blocked by QC', value: m.blockedByQcCount, accent: m.blockedByQcCount > 0 ? 'border-red-400' : 'border-gray-200' },
    { label: 'Open QC Findings', value: m.openQcFindings, accent: m.openQcFindings > 0 ? 'border-orange-400' : 'border-gray-200' },
  ];

  const moduleCards = [
    { label: 'Open Quotations', value: m.quotationsOpen, icon: <AlertCircle size={15} className="text-sky-500" />, path: '/quotations' },
    { label: 'Hot Pipeline', value: m.hotProjectsOpen, icon: <AlertCircle size={15} className="text-orange-500" />, path: '/hot-projects' },
    { label: 'Open Procurement', value: m.openProcurement, icon: <ShoppingCart size={15} className="text-amber-600" />, path: '/procurement' },
    { label: 'Material NCRs', value: m.openMaterialNcrs, icon: <Microscope size={15} className="text-purple-600" />, path: '/material-qc' },
    { label: 'Critical Maintenance', value: m.openMaintenanceCritical, icon: <Wrench size={15} className="text-red-600" />, path: '/after-sales/maintenance' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Control Tower"
        subtitle="Monitor approvals, blockers, delays, delivery readiness, and cross-module execution health."
        breadcrumb={[{ label: 'Operations Control Tower' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <ReportExportBar
        reportKey="control_tower_overdue"
        reportTitle="Overdue Projects Report"
        department="Operations"
        onExportCsv={handleExportOverdue}
        summary={`${overdueCount} overdue project${overdueCount !== 1 ? 's' : ''} · ${totalExceptions} exception${totalExceptions !== 1 ? 's' : ''} requiring attention`}
      />

      {/* Status signals */}
      <div className="flex flex-wrap gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          overdueCount > 0 ? 'bg-red-100 text-red-700 ring-1 ring-red-200' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${overdueCount > 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
          {overdueCount} Overdue Project{overdueCount !== 1 ? 's' : ''}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          m.pendingApproval > 0 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${m.pendingApproval > 0 ? 'bg-amber-500' : 'bg-gray-400'}`} />
          {m.pendingApproval} Pending Approval{m.pendingApproval !== 1 ? 's' : ''}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          gateIssues > 0 ? 'bg-red-100 text-red-700 ring-1 ring-red-200' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${gateIssues > 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
          {gateIssues} Gate Issue{gateIssues !== 1 ? 's' : ''} (WO/PN)
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          m.openQcFindings > 0 ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${m.openQcFindings > 0 ? 'bg-orange-500' : 'bg-gray-400'}`} />
          {m.openQcFindings} Open QC Finding{m.openQcFindings !== 1 ? 's' : ''}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          m.openMaintenanceCritical > 0 ? 'bg-red-100 text-red-700 ring-1 ring-red-200' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${m.openMaintenanceCritical > 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
          {m.openMaintenanceCritical} Critical Maintenance
        </span>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link to="/admin-approvals">
          <Button variant="outline" size="sm" icon={<ShieldCheck size={13} />}>
            Approvals Center
            {m.pendingApproval > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                {m.pendingApproval}
              </span>
            )}
          </Button>
        </Link>
        <Link to="/wo-pn-gate">
          <Button variant="outline" size="sm" icon={<GitBranch size={13} />}>
            WO / PN Gate
            {gateIssues > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                {gateIssues}
              </span>
            )}
          </Button>
        </Link>
        <Link to="/project-qc">
          <Button variant="outline" size="sm" icon={<AlertTriangle size={13} />}>
            QC Findings
            {m.openQcFindings > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                {m.openQcFindings}
              </span>
            )}
          </Button>
        </Link>
        <Button variant="outline" size="sm" icon={<ArrowRight size={13} />} onClick={handleExportOverdue}>
          Export Overdue
        </Button>
      </div>

      {/* Section 1: Project Lifecycle */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
          Project Lifecycle Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {lifecycleCards.map(card => (
            <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
              <div className="flex items-center gap-1 mb-1">{card.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 2: Critical Exceptions */}
      <section>
        <Card padding="none">
          <div className="p-5">
            <CardHeader
              title="Critical Exceptions"
              subtitle="Actionable items requiring attention — auto-computed from live data"
            />
          </div>
          {visibleExceptions.length === 0 ? (
            <div className="px-5 pb-5 text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              No open exceptions — all clear
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleExceptions.map(item => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-5 py-3 border-l-4 ${
                    item.severity === 'critical' ? 'border-red-400 bg-red-50/30' :
                    item.severity === 'high' || item.severity === 'medium' ? 'border-amber-400 bg-amber-50/20' :
                    'border-gray-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.severity === 'critical' ? (
                      <XCircle size={15} className="text-red-500" />
                    ) : (
                      <AlertTriangle size={15} className="text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                      <span className="text-sm font-medium text-gray-900 truncate">{item.description}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.entity}</p>
                  </div>
                  <Link to={item.path} className="shrink-0">
                    <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>View</Button>
                  </Link>
                </div>
              ))}
              {exceptions.length > 8 && (
                <div className="px-5 py-2 text-xs text-gray-500">
                  +{exceptions.length - 8} more exceptions — see Reports for full detail
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Section 3: Delivery Readiness */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
          Delivery Readiness
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {deliveryCards.map(card => (
            <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 4: Overdue Projects */}
      {overdueCount > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
            Overdue Projects
          </h2>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {m.overdueProjects.map(p => (
                    <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">{p.project_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{p.customer_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-medium text-xs">{formatDate(p.customer_delivery_date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.manufacturing_location === 'saudi' ? 'default' : 'info'}>
                          {p.manufacturing_location === 'saudi' ? 'Saudi' : p.manufacturing_location === 'dubai' ? 'Dubai' : p.manufacturing_location}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/projects/${p.id}`}>
                          <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Section 5: Module Activity */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
          Module Activity
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {moduleCards.map(card => (
            <Link key={card.label} to={card.path}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  {card.icon}
                </div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="text-xs text-gray-500 mt-1">{card.label}</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 6: Governance Rules */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
          Governance Rules
        </h2>
        <Card className="border-indigo-100 bg-indigo-50/40">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={15} className="text-indigo-600 shrink-0" />
              <span className="text-sm font-semibold text-indigo-800">Operations Manager — Governance Rules</span>
            </div>
            <ul className="space-y-2">
              {govRules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-indigo-900">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* SLA / Health scores: schema blocker notice */}
      <section>
        <Card className="border-dashed border-gray-200">
          <div className="flex items-start gap-3 p-5">
            <Loader2 size={16} className="text-gray-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">SLA Breach Tracking & Health Scores — Schema Blocker</div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Per-event SLA breach tracking requires a <code className="bg-gray-100 px-1 rounded">sla_events</code> table (currently only <code className="bg-gray-100 px-1 rounded">sla_rule_templates</code> exists — rule definitions only).
                Project and department health scores require a computed scores table (<code className="bg-gray-100 px-1 rounded">project_health_scores</code>, <code className="bg-gray-100 px-1 rounded">department_health_scores</code>).
                These metrics are documented as non-implementable without schema additions.
                Use the <Link to="/reports/sla" className="text-indigo-600 hover:underline">SLA Reports</Link> and{' '}
                <Link to="/reports/health-scores" className="text-indigo-600 hover:underline">Health Scores</Link> pages for the framework.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
