import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ClipboardCheck, AlertTriangle, FileCheck, Wrench,
  Microscope, AlertOctagon, CheckCircle2, XCircle, Clock, ChevronRight, Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import {
  MOCK_MATERIAL_QC_INSPECTIONS,
  MOCK_MATERIAL_NCRS,
  MOCK_PROJECT_QC_INSPECTIONS,
  MOCK_PROJECT_QC_FINDINGS,
  MOCK_RELEASE_NOTES,
} from '../data/mockQc';
import { mockOrEmpty } from '../lib/dataMode';

interface QcKpis {
  pendingMaterialQc: number;
  inProgressMaterial: number;
  pendingProjectQc: number;
  openNcrs: number;
  openFindings: number;
  reworkRequired: number;
  readyForRelease: number;
  blockedRelease: number;
}

type QueueVariant = 'critical' | 'warning' | 'clear';

interface WorkQueue {
  label: string;
  count: number;
  desc: string;
  href: string;
  variant: QueueVariant;
  action: string;
}

const EMPTY_KPIS: QcKpis = {
  pendingMaterialQc: 0, inProgressMaterial: 0, pendingProjectQc: 0,
  openNcrs: 0, openFindings: 0, reworkRequired: 0,
  readyForRelease: 0, blockedRelease: 0,
};

function queueVariantClass(v: QueueVariant) {
  if (v === 'critical') return 'border-red-200 bg-red-50';
  if (v === 'warning') return 'border-amber-200 bg-amber-50';
  return 'border-gray-200 bg-white';
}
function queueCountClass(v: QueueVariant) {
  if (v === 'critical') return 'text-red-600';
  if (v === 'warning') return 'text-amber-600';
  return 'text-violet-700';
}

export function QC() {
  const { role } = useAuth();
  const canCreate = role && ['admin', 'operations_manager', 'qc_user'].includes(role);
  const [kpis, setKpis] = useState<QcKpis>(EMPTY_KPIS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        const matInsp = mockOrEmpty(MOCK_MATERIAL_QC_INSPECTIONS);
        const ncrs = mockOrEmpty(MOCK_MATERIAL_NCRS);
        const projInsp = mockOrEmpty(MOCK_PROJECT_QC_INSPECTIONS);
        const findings = mockOrEmpty(MOCK_PROJECT_QC_FINDINGS);
        const notes = mockOrEmpty(MOCK_RELEASE_NOTES);
        setKpis({
          pendingMaterialQc: matInsp.filter(i => i.inspection_status === 'pending').length,
          inProgressMaterial: matInsp.filter(i => i.inspection_status === 'in_progress').length,
          pendingProjectQc: projInsp.filter(i => i.inspection_status === 'pending').length,
          openNcrs: ncrs.filter(n => !['closed', 'cancelled'].includes(n.ncr_status)).length,
          openFindings: findings.filter(f => !['closed', 'cancelled'].includes(f.finding_status)).length,
          reworkRequired: findings.filter(f => f.rework_required && !f.rework_completed_at && !['closed', 'cancelled'].includes(f.finding_status)).length,
          readyForRelease: projInsp.filter(i => i.readiness_status === 'ready_for_release').length,
          blockedRelease: notes.filter(n => n.release_status === 'blocked').length,
        });
        setLoading(false);
        return;
      }

      const [
        { count: pendingMat },
        { count: inProgressMat },
        { count: pendingProj },
        { count: openNcrs },
        { count: openFindings },
        { count: reworkRequired },
        { count: readyForRelease },
        { count: blockedRelease },
      ] = await Promise.all([
        supabase.from('material_qc_inspections').select('*', { count: 'exact', head: true }).eq('inspection_status', 'pending'),
        supabase.from('material_qc_inspections').select('*', { count: 'exact', head: true }).eq('inspection_status', 'in_progress'),
        supabase.from('project_qc_inspections').select('*', { count: 'exact', head: true }).eq('inspection_status', 'pending'),
        supabase.from('material_ncrs').select('*', { count: 'exact', head: true }).not('ncr_status', 'in', '(closed,cancelled)'),
        supabase.from('project_qc_findings').select('*', { count: 'exact', head: true }).not('finding_status', 'in', '(closed,cancelled)'),
        supabase.from('project_qc_findings').select('*', { count: 'exact', head: true }).eq('rework_required', true).is('rework_completed_at', null).not('finding_status', 'in', '(closed,cancelled)'),
        supabase.from('project_qc_inspections').select('*', { count: 'exact', head: true }).eq('readiness_status', 'ready_for_release'),
        supabase.from('release_notes').select('*', { count: 'exact', head: true }).eq('release_status', 'blocked'),
      ]);

      setKpis({
        pendingMaterialQc: pendingMat ?? 0,
        inProgressMaterial: inProgressMat ?? 0,
        pendingProjectQc: pendingProj ?? 0,
        openNcrs: openNcrs ?? 0,
        openFindings: openFindings ?? 0,
        reworkRequired: reworkRequired ?? 0,
        readyForRelease: readyForRelease ?? 0,
        blockedRelease: blockedRelease ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const kpiCards = [
    { label: 'Pending Material QC', value: kpis.pendingMaterialQc, icon: <Microscope size={18} />, color: kpis.pendingMaterialQc > 0 ? 'border-l-amber-400' : 'border-l-gray-200', href: '/material-qc/inspections' },
    { label: 'In Progress Inspections', value: kpis.inProgressMaterial, icon: <ClipboardCheck size={18} />, color: 'border-l-sky-400', href: '/material-qc/inspections' },
    { label: 'Pending Project / Vehicle QC', value: kpis.pendingProjectQc, icon: <ShieldCheck size={18} />, color: kpis.pendingProjectQc > 0 ? 'border-l-amber-400' : 'border-l-gray-200', href: '/project-qc/inspections' },
    { label: 'Open Material NCRs', value: kpis.openNcrs, icon: <AlertOctagon size={18} />, color: kpis.openNcrs > 0 ? 'border-l-red-500' : 'border-l-green-400', href: '/material-qc/ncrs' },
    { label: 'Open Findings', value: kpis.openFindings, icon: <AlertTriangle size={18} />, color: kpis.openFindings > 0 ? 'border-l-red-500' : 'border-l-green-400', href: '/project-qc/findings' },
    { label: 'Rework Required', value: kpis.reworkRequired, icon: <Wrench size={18} />, color: kpis.reworkRequired > 0 ? 'border-l-orange-400' : 'border-l-green-400', href: '/qc/rework' },
    { label: 'Ready for Release Note', value: kpis.readyForRelease, icon: <CheckCircle2 size={18} />, color: 'border-l-green-400', href: '/project-qc/release-notes' },
    { label: 'Blocked Release Notes', value: kpis.blockedRelease, icon: <XCircle size={18} />, color: kpis.blockedRelease > 0 ? 'border-l-red-600' : 'border-l-green-400', href: '/project-qc/release-notes' },
  ];

  const workQueues: WorkQueue[] = [
    { label: 'Materials Waiting QC', count: kpis.pendingMaterialQc, desc: 'Materials received from Store pending QC inspection', href: '/material-qc/inspections', variant: kpis.pendingMaterialQc > 0 ? 'warning' : 'clear', action: 'Start Inspection' },
    { label: 'Material Inspections In Progress', count: kpis.inProgressMaterial, desc: 'Active material inspections not yet completed', href: '/material-qc/inspections', variant: 'clear', action: 'Continue' },
    { label: 'Open Material NCRs', count: kpis.openNcrs, desc: 'Non-conformance reports requiring action or closure', href: '/material-qc/ncrs', variant: kpis.openNcrs > 0 ? 'critical' : 'clear', action: 'Review NCRs' },
    { label: 'Projects Pending QC', count: kpis.pendingProjectQc, desc: 'Factory-completed projects waiting QC inspection', href: '/project-qc/inspections', variant: kpis.pendingProjectQc > 0 ? 'warning' : 'clear', action: 'Start Inspection' },
    { label: 'Open QC Findings', count: kpis.openFindings, desc: 'Unresolved findings from project/vehicle inspections', href: '/project-qc/findings', variant: kpis.openFindings > 0 ? 'critical' : 'clear', action: 'Review Findings' },
    { label: 'Rework Pending QC Confirmation', count: kpis.reworkRequired, desc: 'Rework in progress or pending QC re-inspection', href: '/qc/rework', variant: kpis.reworkRequired > 0 ? 'warning' : 'clear', action: 'Review Rework' },
    { label: 'Blocked Release Notes', count: kpis.blockedRelease, desc: 'Release notes blocked by open NCRs, findings, or rework', href: '/project-qc/release-notes', variant: kpis.blockedRelease > 0 ? 'critical' : 'clear', action: 'View Blockers' },
    { label: 'Ready to Issue Release Note', count: kpis.readyForRelease, desc: 'QC complete — all checks passed, ready for release', href: '/project-qc/release-notes', variant: 'clear', action: 'Issue Release Note' },
  ];

  const qcRules = ROLE_MATRIX.qc_user.rules;

  return (
    <div className="space-y-5">
      <PageHeader
        title="QC Dashboard"
        subtitle="Manage material inspections, NCRs, project quality checks, findings, rework, and release readiness."
        breadcrumb={[{ label: 'QC Dashboard' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* Role badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200">
          <ShieldCheck size={12} /> QC Work Center
        </span>
        {kpis.blockedRelease > 0 && !loading && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
            <XCircle size={12} /> {kpis.blockedRelease} Release Note{kpis.blockedRelease !== 1 ? 's' : ''} Blocked
          </span>
        )}
        {kpis.openNcrs > 0 && !loading && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
            <AlertOctagon size={12} /> {kpis.openNcrs} Open NCR{kpis.openNcrs !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Top Actions */}
      <div className="flex flex-wrap gap-2">
        {canCreate && (
          <Link to="/material-qc/inspections">
            <Button size="sm" variant="secondary" className="border-violet-300 text-violet-700 hover:bg-violet-50">
              <Microscope size={13} className="mr-1" /> Start Material Inspection
            </Button>
          </Link>
        )}
        {canCreate && (
          <Link to="/project-qc/inspections">
            <Button size="sm" variant="secondary" className="border-violet-300 text-violet-700 hover:bg-violet-50">
              <ClipboardCheck size={13} className="mr-1" /> Start Project QC
            </Button>
          </Link>
        )}
        <Link to="/material-qc/ncrs">
          <Button size="sm" variant="ghost">
            <AlertOctagon size={13} className="mr-1" /> NCRs
          </Button>
        </Link>
        <Link to="/project-qc/findings">
          <Button size="sm" variant="ghost">
            <AlertTriangle size={13} className="mr-1" /> Findings
          </Button>
        </Link>
        <Link to="/qc/rework">
          <Button size="sm" variant="ghost">
            <Wrench size={13} className="mr-1" /> Rework
          </Button>
        </Link>
        <Link to="/project-qc/release-notes">
          <Button size="sm" variant="ghost">
            <FileCheck size={13} className="mr-1" /> Release Notes
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-gray-200 shadow-sm p-4 animate-pulse">
              <div className="h-4 w-4 rounded bg-gray-200 mb-2" />
              <div className="h-7 w-10 rounded bg-gray-200 mb-1" />
              <div className="h-3 w-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCards.map(k => (
            <Link key={k.label} to={k.href}>
              <div className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer ${k.color}`}>
                <div className="text-violet-500 mb-2">{k.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5 leading-tight">{k.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Work Queues */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={15} className="text-violet-500" /> Work Queues
          </h2>
          <Link to="/qc/work-queue">
            <Button variant="ghost" size="sm">Full Queue <ChevronRight size={13} /></Button>
          </Link>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workQueues.map(q => (
            <Link key={q.label} to={q.href}>
              <div className={`rounded-lg border p-4 hover:shadow-sm transition-shadow ${queueVariantClass(q.variant)}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{q.label}</span>
                  <span className={`text-xl font-bold shrink-0 ${queueCountClass(q.variant)}`}>{q.count}</span>
                </div>
                <p className="text-xs text-gray-500 leading-snug mb-2">{q.desc}</p>
                {q.count > 0
                  ? <span className="text-xs font-medium text-violet-700">→ {q.action}</span>
                  : <span className="text-xs text-green-600 font-medium">✓ All clear</span>
                }
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Module Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Material QC', href: '/material-qc', icon: <Microscope size={20} className="text-violet-500" />, desc: 'Inspect received materials, NCRs, serial tracking' },
          { label: 'Material Inspections', href: '/material-qc/inspections', icon: <ClipboardCheck size={20} className="text-violet-500" />, desc: 'Manage and record inspection results' },
          { label: 'Material NCRs', href: '/material-qc/ncrs', icon: <AlertOctagon size={20} className="text-red-500" />, desc: 'Non-conformance reports and corrective actions' },
          { label: 'Project / Vehicle QC', href: '/project-qc', icon: <ShieldCheck size={20} className="text-violet-500" />, desc: 'Inspect projects and vehicle lines after factory' },
          { label: 'QC Findings', href: '/project-qc/findings', icon: <AlertTriangle size={20} className="text-amber-500" />, desc: 'Findings from project and vehicle inspections' },
          { label: 'Rework', href: '/qc/rework', icon: <Wrench size={20} className="text-orange-500" />, desc: 'Rework requested, in progress, and pending QC confirmation' },
          { label: 'Release Notes', href: '/project-qc/release-notes', icon: <FileCheck size={20} className="text-green-500" />, desc: 'Issue release notes when all checks pass' },
          { label: 'QC Work Queue', href: '/qc/work-queue', icon: <Plus size={20} className="text-violet-500" />, desc: 'Consolidated daily quality work queue' },
        ].map(tile => (
          <Link key={tile.label} to={tile.href}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-violet-300 hover:shadow-md transition-all">
              <div className="mb-2">{tile.icon}</div>
              <div className="text-sm font-semibold text-gray-800">{tile.label}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-snug">{tile.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* QC Rules */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-violet-800 flex items-center gap-2">
            <ShieldCheck size={14} className="text-violet-500" /> QC Governance Rules
          </h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          {qcRules.length === 0 ? (
            <EmptyState icon={<ShieldCheck size={20} className="text-gray-400" />} title="No rules defined" description="QC governance rules not configured." />
          ) : (
            qcRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <ShieldCheck size={13} className="text-violet-400 mt-0.5 shrink-0" />
                <span>{rule}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
