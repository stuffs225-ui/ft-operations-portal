import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardHeader } from '../components/ui/Card';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { PageLoader } from '../components/ui/PageLoader';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_PROJECTS as MOCK_PROJECTS_RAW } from '../data/mockProjects';
import { mockOrEmpty } from '../lib/dataMode';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveMetrics {
  totalActive: number;
  pendingApproval: number;
  approvedCount: number;
  missingWo: number;
  missingPn: number;
  releaseNotesIssued: number;
  releasePending: number;
  blockedByQc: number;
  hotProjectsOpen: number;
  openQcFindings: number;
  openNcrs: number;
}

const EMPTY: LiveMetrics = {
  totalActive: 0, pendingApproval: 0, approvedCount: 0,
  missingWo: 0, missingPn: 0,
  releaseNotesIssued: 0, releasePending: 0, blockedByQc: 0,
  hotProjectsOpen: 0, openQcFindings: 0, openNcrs: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsExecutive() {
  const [metrics, setMetrics] = useState<LiveMetrics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
    if (!isSupabaseConfigured || !supabase) {
      const mockProjects = mockOrEmpty(MOCK_PROJECTS_RAW);
      const activeStatuses = ['active', 'approved', 'submitted_for_approval'];
      setMetrics({
        totalActive: mockProjects.filter(p => activeStatuses.includes(p.project_status)).length,
        pendingApproval: mockProjects.filter(p => p.project_status === 'submitted_for_approval').length,
        approvedCount: mockProjects.filter(p => p.project_status === 'approved').length,
        missingWo: 0,
        missingPn: 0,
        releaseNotesIssued: 0,
        releasePending: 0,
        blockedByQc: 0,
        hotProjectsOpen: 0,
        openQcFindings: 0,
        openNcrs: 0,
      });
      setLoading(false);
      return;
    }
      const govStatuses = ['approved', 'active'];
      const activeStatuses = ['active', 'approved', 'submitted_for_approval'];
      const [
        activeRes, pendingRes, approvedRes,
        rnIssuedRes, rnPendingRes, rnBlockedRes,
        hotOpenRes, qcFindingsRes, ncrRes,
        saudiRes, dubaiRes, woRes, pnRes,
      ] = await Promise.all([
        supabase!.from('projects').select('*', { count: 'exact', head: true }).in('project_status', activeStatuses),
        supabase!.from('projects').select('*', { count: 'exact', head: true }).eq('project_status', 'submitted_for_approval'),
        supabase!.from('projects').select('*', { count: 'exact', head: true }).in('project_status', ['approved', 'active']),
        supabase!.from('release_notes').select('*', { count: 'exact', head: true }).eq('release_status', 'issued'),
        supabase!.from('release_notes').select('*', { count: 'exact', head: true }).in('release_status', ['draft', 'ready_to_issue']),
        supabase!.from('release_notes').select('*', { count: 'exact', head: true }).eq('release_status', 'blocked'),
        supabase!.from('hot_projects').select('*', { count: 'exact', head: true }).in('stage', ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation']),
        supabase!.from('project_qc_findings').select('*', { count: 'exact', head: true }).in('finding_status', ['open', 'assigned', 'rework_in_progress', 'pending_reinspection']),
        supabase!.from('material_ncrs').select('*', { count: 'exact', head: true }).in('ncr_status', ['open', 'assigned', 'corrective_action_in_progress', 'pending_evidence']),
        supabase!.from('projects').select('id').in('project_status', govStatuses).eq('manufacturing_location', 'saudi'),
        supabase!.from('projects').select('id').in('project_status', govStatuses).eq('manufacturing_location', 'dubai'),
        supabase!.from('project_execution_references').select('project_id').eq('reference_type', 'wo').not('status', 'in', '(cancelled,superseded)'),
        supabase!.from('project_execution_references').select('project_id').eq('reference_type', 'pn').not('status', 'in', '(cancelled,superseded)'),
      ]);

      const saudiIds = new Set((saudiRes.data ?? []).map((p: { id: string }) => p.id));
      const dubaiIds = new Set((dubaiRes.data ?? []).map((p: { id: string }) => p.id));
      const withWo = new Set((woRes.data ?? []).map((r: { project_id: string }) => r.project_id));
      const withPn = new Set((pnRes.data ?? []).map((r: { project_id: string }) => r.project_id));
      const missingWo = [...saudiIds].filter(id => !withWo.has(id)).length;
      const missingPn = [...dubaiIds].filter(id => !withPn.has(id)).length;

      setMetrics({
        totalActive: activeRes.count ?? 0,
        pendingApproval: pendingRes.count ?? 0,
        approvedCount: approvedRes.count ?? 0,
        missingWo,
        missingPn,
        releaseNotesIssued: rnIssuedRes.count ?? 0,
        releasePending: rnPendingRes.count ?? 0,
        blockedByQc: rnBlockedRes.count ?? 0,
        hotProjectsOpen: hotOpenRes.count ?? 0,
        openQcFindings: qcFindingsRes.count ?? 0,
        openNcrs: ncrRes.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  const lifecycleCards = [
    { label: 'Total Active Projects', value: metrics.totalActive, accent: 'border-brand-400' },
    { label: 'Pending Approval', value: metrics.pendingApproval, accent: metrics.pendingApproval > 0 ? 'border-amber-400' : 'border-gray-200' },
    { label: 'Approved Projects', value: metrics.approvedCount, accent: 'border-green-400' },
    { label: 'Missing WO (Saudi)', value: metrics.missingWo, accent: metrics.missingWo > 0 ? 'border-red-400' : 'border-gray-200' },
    { label: 'Missing PN (Dubai)', value: metrics.missingPn, accent: metrics.missingPn > 0 ? 'border-red-400' : 'border-gray-200' },
    { label: 'Hot Pipeline Open', value: metrics.hotProjectsOpen, accent: 'border-sky-400' },
  ];

  const deliveryCards = [
    { label: 'Release Notes Issued', value: metrics.releaseNotesIssued, accent: 'border-green-400' },
    { label: 'Release Notes Pending', value: metrics.releasePending, accent: metrics.releasePending > 0 ? 'border-amber-400' : 'border-gray-200' },
    { label: 'Blocked by QC', value: metrics.blockedByQc, accent: metrics.blockedByQc > 0 ? 'border-red-400' : 'border-gray-200' },
    { label: 'Open QC Findings', value: metrics.openQcFindings, accent: metrics.openQcFindings > 0 ? 'border-orange-400' : 'border-gray-200' },
  ];

  const hasExceptions = metrics.pendingApproval > 0 || metrics.missingWo > 0 || metrics.missingPn > 0 || metrics.blockedByQc > 0 || metrics.openNcrs > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Full operational overview across all modules"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Executive' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* Section 1: Project Lifecycle Overview */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Project Lifecycle Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {lifecycleCards.map(card => (
            <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
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
              subtitle="Actionable items requiring attention"
            />
          </div>
          {!hasExceptions ? (
            <div className="px-5 pb-5 text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              No open exceptions — all clear
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {metrics.pendingApproval > 0 && (
                <div className="flex items-start gap-3 px-5 py-3 border-l-4 border-amber-400 bg-amber-50/20">
                  <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{metrics.pendingApproval} project{metrics.pendingApproval !== 1 ? 's' : ''} pending approval</p>
                    <p className="text-xs text-gray-500">Requires operations manager review</p>
                  </div>
                </div>
              )}
              {metrics.missingWo > 0 && (
                <div className="flex items-start gap-3 px-5 py-3 border-l-4 border-red-400 bg-red-50/20">
                  <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{metrics.missingWo} Saudi project{metrics.missingWo !== 1 ? 's' : ''} missing WO</p>
                    <p className="text-xs text-gray-500">Production cannot start without WO reference</p>
                  </div>
                </div>
              )}
              {metrics.missingPn > 0 && (
                <div className="flex items-start gap-3 px-5 py-3 border-l-4 border-red-400 bg-red-50/20">
                  <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{metrics.missingPn} Dubai project{metrics.missingPn !== 1 ? 's' : ''} missing PN</p>
                    <p className="text-xs text-gray-500">Dubai PO cannot be issued without PN reference</p>
                  </div>
                </div>
              )}
              {metrics.openNcrs > 0 && (
                <div className="flex items-start gap-3 px-5 py-3 border-l-4 border-amber-400 bg-amber-50/20">
                  <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{metrics.openNcrs} open NCR{metrics.openNcrs !== 1 ? 's' : ''} require corrective action</p>
                    <p className="text-xs text-gray-500">Material NCRs blocking acceptance</p>
                  </div>
                </div>
              )}
              {metrics.blockedByQc > 0 && (
                <div className="flex items-start gap-3 px-5 py-3 border-l-4 border-red-400 bg-red-50/20">
                  <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{metrics.blockedByQc} release note{metrics.blockedByQc !== 1 ? 's' : ''} blocked by QC</p>
                    <p className="text-xs text-gray-500">Delivery held pending QC sign-off</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Section 3: Delivery Readiness */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
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

      {/* Section 4: Schema Blocker Notice */}
      <section>
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500">
          <strong className="text-gray-700">Health Scores &amp; Operational Issues</strong> — Not available. These metrics require computed tables (<code>project_health_scores</code>, <code>department_health_scores</code>, <code>operational_issues</code>, <code>sla_events</code>) that are not yet in the schema. The lifecycle and delivery sections above use live Supabase queries.
        </div>
      </section>
    </div>
  );
}
