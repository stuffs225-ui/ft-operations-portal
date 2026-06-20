import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Microscope, ClipboardList, AlertOctagon, AlertTriangle, Wrench, FileCheck,
  ChevronRight, CheckCircle2, XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import {
  MOCK_MATERIAL_QC_INSPECTIONS,
  MOCK_MATERIAL_NCRS,
  MOCK_PROJECT_QC_INSPECTIONS,
  MOCK_PROJECT_QC_FINDINGS,
  MOCK_RELEASE_NOTES,
} from '../data/mockQc';
import type {
  MaterialQcInspection,
  MaterialNcr,
  ProjectQcInspection,
  ProjectQcFinding,
  ReleaseNote,
} from '../types';

type SectionTab = 'material_qc' | 'project_qc' | 'ncrs' | 'findings' | 'rework' | 'release_notes';

const SECTION_TABS: { key: SectionTab; label: string; icon: React.ReactNode }[] = [
  { key: 'material_qc', label: 'Material QC', icon: <Microscope size={14} /> },
  { key: 'project_qc', label: 'Project / Vehicle QC', icon: <ClipboardList size={14} /> },
  { key: 'ncrs', label: 'NCRs', icon: <AlertOctagon size={14} /> },
  { key: 'findings', label: 'Findings', icon: <AlertTriangle size={14} /> },
  { key: 'rework', label: 'Rework', icon: <Wrench size={14} /> },
  { key: 'release_notes', label: 'Release Notes', icon: <FileCheck size={14} /> },
];

interface WorkQueueData {
  pendingMaterialQc: MaterialQcInspection[];
  activeNcrs: MaterialNcr[];
  pendingProjectQc: ProjectQcInspection[];
  openFindings: ProjectQcFinding[];
  reworkRequired: ProjectQcFinding[];
  releaseNotes: ReleaseNote[];
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysWaiting(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function releaseVariant(s: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' {
  if (s === 'blocked') return 'critical';
  if (s === 'ready_to_issue') return 'success';
  if (s === 'draft') return 'neutral';
  return 'neutral';
}

export function QCWorkQueue() {
  const [data, setData] = useState<WorkQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SectionTab>('material_qc');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const matInsp = mockOrEmpty(MOCK_MATERIAL_QC_INSPECTIONS);
        const ncrs = mockOrEmpty(MOCK_MATERIAL_NCRS);
        const projInsp = mockOrEmpty(MOCK_PROJECT_QC_INSPECTIONS);
        const findings = mockOrEmpty(MOCK_PROJECT_QC_FINDINGS);
        const rn = mockOrEmpty(MOCK_RELEASE_NOTES);
        setData({
          pendingMaterialQc: matInsp.filter(i => i.inspection_status === 'pending' || i.inspection_status === 'in_progress'),
          activeNcrs: ncrs.filter(n => n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled'),
          pendingProjectQc: projInsp.filter(i => i.inspection_status === 'pending' || i.inspection_status === 'in_progress'),
          openFindings: findings.filter(f => f.finding_status !== 'closed' && f.finding_status !== 'cancelled' && !f.rework_required),
          reworkRequired: findings.filter(f => f.rework_required && !f.rework_completed_at && f.finding_status !== 'closed' && f.finding_status !== 'cancelled'),
          releaseNotes: rn.filter(r => r.release_status !== 'issued' && r.release_status !== 'cancelled'),
        });
        setLoading(false);
        return;
      }

      const [matInspRes, ncrsRes, projInspRes, findingsRes, reworkRes, rnRes] = await Promise.all([
        supabase.from('material_qc_inspections')
          .select('*, project:projects(project_code, customer_name), item:store_receipt_items(item_name, material_category)')
          .in('inspection_status', ['pending', 'in_progress'])
          .order('created_at', { ascending: true }),
        supabase.from('material_ncrs')
          .select('*, project:projects(project_code), item:store_receipt_items(item_name)')
          .not('ncr_status', 'in', '(closed,cancelled)')
          .order('created_at', { ascending: true }),
        supabase.from('project_qc_inspections')
          .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
          .in('inspection_status', ['pending', 'in_progress'])
          .order('created_at', { ascending: true }),
        supabase.from('project_qc_findings')
          .select('*, project:projects(project_code), vehicle_line:project_vehicle_lines(vehicle_type)')
          .not('finding_status', 'in', '(closed,cancelled)')
          .eq('rework_required', false)
          .order('created_at', { ascending: true }),
        supabase.from('project_qc_findings')
          .select('*, project:projects(project_code), vehicle_line:project_vehicle_lines(vehicle_type)')
          .eq('rework_required', true)
          .is('rework_completed_at', null)
          .not('finding_status', 'in', '(closed,cancelled)')
          .order('created_at', { ascending: true }),
        supabase.from('release_notes')
          .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
          .not('release_status', 'in', '(issued,cancelled)')
          .order('created_at', { ascending: false }),
      ]);

      setData({
        pendingMaterialQc: (matInspRes.data as unknown as MaterialQcInspection[]) ?? [],
        activeNcrs: (ncrsRes.data as unknown as MaterialNcr[]) ?? [],
        pendingProjectQc: (projInspRes.data as unknown as ProjectQcInspection[]) ?? [],
        openFindings: (findingsRes.data as unknown as ProjectQcFinding[]) ?? [],
        reworkRequired: (reworkRes.data as unknown as ProjectQcFinding[]) ?? [],
        releaseNotes: (rnRes.data as unknown as ReleaseNote[]) ?? [],
      });
      setLoading(false);
    })();
  }, []);

  const counts = data
    ? {
        material_qc: data.pendingMaterialQc.length,
        project_qc: data.pendingProjectQc.length,
        ncrs: data.activeNcrs.length,
        findings: data.openFindings.length,
        rework: data.reworkRequired.length,
        release_notes: data.releaseNotes.length,
      }
    : { material_qc: 0, project_qc: 0, ncrs: 0, findings: 0, rework: 0, release_notes: 0 };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="QC Work Queue" subtitle="All pending QC work in one view" />
        <PageLoader />
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-5">
      <PageHeader
        title="QC Work Queue"
        subtitle="Consolidated daily QC work — material, project, NCRs, findings, rework, and release notes"
        breadcrumb={[{ label: 'QC Dashboard', href: '/qc' }, { label: 'Work Queue' }]}
      />

      <DataSourceBadge variant="auto" />

      {/* Summary strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {SECTION_TABS.map(s => {
          const count = counts[s.key];
          const isAlert = (s.key === 'ncrs' || s.key === 'release_notes') && count > 0;
          return (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={`rounded-xl border p-3 text-left transition-colors shadow-sm ${
                tab === s.key
                  ? 'bg-violet-600 border-violet-700 text-white'
                  : 'bg-white border-gray-200 hover:border-violet-300'
              }`}
            >
              <div className={`text-xl font-bold ${tab === s.key ? 'text-white' : isAlert ? 'text-red-600' : 'text-gray-900'}`}>
                {count}
              </div>
              <div className={`text-xs font-medium mt-0.5 ${tab === s.key ? 'text-violet-100' : 'text-gray-500'}`}>
                {s.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {SECTION_TABS.map(s => (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                tab === s.key
                  ? 'text-violet-700 border-b-2 border-violet-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.icon}
              {s.label}
              {counts[s.key] > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold ${
                  tab === s.key ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {counts[s.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Material QC tab */}
        {tab === 'material_qc' && (
          d.pendingMaterialQc.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<CheckCircle2 size={24} className="text-green-500" />}
                title="No pending material inspections"
                description="All material QC inspections are up to date."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Inspection #</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Days Waiting</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.pendingMaterialQc.map(i => {
                    const days = daysWaiting(i.created_at);
                    return (
                      <tr key={i.id} className={`hover:bg-gray-50 transition-colors ${days >= 3 ? 'border-l-4 border-l-amber-400' : ''}`}>
                        <td className="px-4 py-3 text-sm font-mono font-medium text-violet-700">{i.inspection_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{i.item?.item_name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{i.project?.project_code ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${days >= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {days}d
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={i.inspection_status === 'in_progress' ? 'info' : 'neutral'}>
                            {i.inspection_status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/material-qc/inspections/${i.id}`}>
                            <Button variant="ghost" size="sm">Inspect <ChevronRight size={14} /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Project/Vehicle QC tab */}
        {tab === 'project_qc' && (
          d.pendingProjectQc.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<CheckCircle2 size={24} className="text-green-500" />}
                title="No pending project QC"
                description="No project or vehicle inspections waiting."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Inspection #</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Vehicle Line</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Days Waiting</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.pendingProjectQc.map(i => {
                    const days = daysWaiting(i.created_at);
                    return (
                      <tr key={i.id} className={`hover:bg-gray-50 transition-colors ${days >= 2 ? 'border-l-4 border-l-orange-400' : ''}`}>
                        <td className="px-4 py-3 text-sm font-mono font-medium text-violet-700">{i.inspection_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell font-mono text-xs">{i.project?.project_code ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">{i.vehicle_line?.vehicle_type ?? 'Project-wide'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${days >= 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                            {days}d
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={i.inspection_status === 'in_progress' ? 'info' : 'neutral'}>
                            {i.inspection_status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/project-qc/inspections/${i.id}`}>
                            <Button variant="ghost" size="sm">Inspect <ChevronRight size={14} /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* NCRs tab */}
        {tab === 'ncrs' && (
          d.activeNcrs.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<CheckCircle2 size={24} className="text-green-500" />}
                title="No active NCRs"
                description="All NCRs are closed or cancelled."
              />
            </div>
          ) : (
            <>
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2 text-sm text-red-700">
                <AlertOctagon size={14} className="shrink-0" />
                <span><strong>{d.activeNcrs.length}</strong> open NCR{d.activeNcrs.length !== 1 ? 's' : ''} — open NCRs block release note issuance.</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">NCR #</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {d.activeNcrs.map(n => (
                      <tr key={n.id} className={`hover:bg-gray-50 transition-colors ${n.severity === 'critical' ? 'border-l-4 border-l-red-500' : ''}`}>
                        <td className="px-4 py-3 text-sm font-mono font-medium text-violet-700">{n.ncr_number}</td>
                        <td className="px-4 py-3"><Badge variant={severityVariant(n.severity)}>{n.severity}</Badge></td>
                        <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{n.item?.item_name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{n.project?.project_code ?? '—'}</td>
                        <td className="px-4 py-3"><Badge variant="warning">{n.ncr_status.replace(/_/g, ' ')}</Badge></td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{formatDate(n.due_date)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/material-qc/ncrs/${n.id}`}>
                            <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}

        {/* Findings tab */}
        {tab === 'findings' && (
          d.openFindings.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<CheckCircle2 size={24} className="text-green-500" />}
                title="No open findings"
                description="All non-rework findings are closed."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Finding #</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.openFindings.map(f => (
                    <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${f.severity === 'critical' ? 'border-l-4 border-l-red-500' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono font-medium text-violet-700">{f.finding_number}</td>
                      <td className="px-4 py-3"><Badge variant={severityVariant(f.severity)}>{f.severity}</Badge></td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell max-w-[200px] truncate">{f.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{f.project?.project_code ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={f.finding_status === 'open' || f.finding_status === 'assigned' ? 'critical' : 'warning'}>
                          {f.finding_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{formatDate(f.due_date)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/project-qc/findings/${f.id}`}>
                          <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Rework tab */}
        {tab === 'rework' && (
          d.reworkRequired.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<CheckCircle2 size={24} className="text-green-500" />}
                title="No rework required"
                description="All rework items are completed or no rework was flagged."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Finding #</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Rework Status</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.reworkRequired.map(f => {
                    const overdue = f.due_date && new Date(f.due_date) < new Date() && !f.rework_completed_at;
                    return (
                      <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${overdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-orange-400'}`}>
                        <td className="px-4 py-3 text-sm font-mono font-medium text-violet-700">{f.finding_number}</td>
                        <td className="px-4 py-3"><Badge variant={severityVariant(f.severity)}>{f.severity}</Badge></td>
                        <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell max-w-[200px] truncate">{f.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{f.project?.project_code ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={overdue ? 'critical' : 'warning'}>
                            {overdue ? 'Overdue' : f.finding_status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm hidden xl:table-cell">
                          <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {formatDate(f.due_date)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/project-qc/findings/${f.id}`}>
                            <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Release Notes tab */}
        {tab === 'release_notes' && (
          d.releaseNotes.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<XCircle size={24} className="text-gray-400" />}
                title="No active release notes"
                description="No release notes pending or blocked."
              />
            </div>
          ) : (
            <>
              {d.releaseNotes.some(r => r.release_status === 'blocked') && (
                <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2 text-sm text-red-700">
                  <AlertOctagon size={14} className="shrink-0" />
                  <span>
                    <strong>{d.releaseNotes.filter(r => r.release_status === 'blocked').length}</strong> release note{d.releaseNotes.filter(r => r.release_status === 'blocked').length !== 1 ? 's' : ''} blocked — resolve open NCRs and findings first.
                  </span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Release Note #</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Vehicle Line</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {d.releaseNotes.map(r => (
                      <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.release_status === 'blocked' ? 'border-l-4 border-l-red-400' : r.release_status === 'ready_to_issue' ? 'border-l-4 border-l-green-400' : ''}`}>
                        <td className="px-4 py-3 text-sm font-mono font-medium text-violet-700">{r.release_note_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell font-mono text-xs">{r.project?.project_code ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">{r.vehicle_line?.vehicle_type ?? 'Whole Project'}</td>
                        <td className="px-4 py-3"><Badge variant={releaseVariant(r.release_status)}>{r.release_status.replace(/_/g, ' ')}</Badge></td>
                        <td className="px-4 py-3">
                          <Link to={`/project-qc/release-notes/${r.id}`}>
                            <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link to="/material-qc"><Button variant="secondary" size="sm"><Microscope size={13} className="mr-1" /> Material QC</Button></Link>
        <Link to="/material-qc/ncrs"><Button variant="secondary" size="sm"><AlertOctagon size={13} className="mr-1" /> NCRs</Button></Link>
        <Link to="/project-qc"><Button variant="secondary" size="sm"><ClipboardList size={13} className="mr-1" /> Project QC</Button></Link>
        <Link to="/project-qc/findings"><Button variant="secondary" size="sm"><AlertTriangle size={13} className="mr-1" /> Findings</Button></Link>
        <Link to="/qc/rework"><Button variant="secondary" size="sm"><Wrench size={13} className="mr-1" /> Rework</Button></Link>
        <Link to="/project-qc/release-notes"><Button variant="secondary" size="sm"><FileCheck size={13} className="mr-1" /> Release Notes</Button></Link>
      </div>
    </div>
  );
}
