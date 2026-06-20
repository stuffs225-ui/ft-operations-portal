import { useState, useEffect } from 'react';
import { ShieldCheck, AlertOctagon, Search, Wrench, FileCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { exportRowsToCsv } from '../lib/reportExport';
import type { ReportColumn } from '../lib/reportExport';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_MATERIAL_QC_INSPECTIONS as MOCK_MATERIAL_QC_INSPECTIONS_RAW,
  MOCK_MATERIAL_NCRS as MOCK_MATERIAL_NCRS_RAW,
  MOCK_PROJECT_QC_INSPECTIONS as MOCK_PROJECT_QC_INSPECTIONS_RAW,
  MOCK_PROJECT_QC_FINDINGS as MOCK_PROJECT_QC_FINDINGS_RAW,
  MOCK_RELEASE_NOTES as MOCK_RELEASE_NOTES_RAW,
} from '../data/mockQc';
import { mockOrEmpty } from '../lib/dataMode';
import type {
  MaterialQcInspection, MaterialNcr,
  ProjectQcInspection, ProjectQcFinding, ReleaseNote,
} from '../types';

const MOCK_MATERIAL_QC_INSPECTIONS = mockOrEmpty(MOCK_MATERIAL_QC_INSPECTIONS_RAW);
const MOCK_MATERIAL_NCRS = mockOrEmpty(MOCK_MATERIAL_NCRS_RAW);
const MOCK_PROJECT_QC_INSPECTIONS = mockOrEmpty(MOCK_PROJECT_QC_INSPECTIONS_RAW);
const MOCK_PROJECT_QC_FINDINGS = mockOrEmpty(MOCK_PROJECT_QC_FINDINGS_RAW);
const MOCK_RELEASE_NOTES = mockOrEmpty(MOCK_RELEASE_NOTES_RAW);

interface QCSummary { openNcrs: number; openFindings: number; rnPending: number; rnIssued: number; }
const EMPTY_SUMMARY: QCSummary = { openNcrs: 0, openFindings: 0, rnPending: 0, rnIssued: 0 };

interface LiveData {
  materialInspections: MaterialQcInspection[];
  materialNcrs: MaterialNcr[];
  projectInspections: ProjectQcInspection[];
  findings: ProjectQcFinding[];
  releaseNotes: ReleaseNote[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inspectionStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function inspectionResultVariant(
  result: string,
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (result === 'accepted' || result === 'passed') return 'success';
  if (result === 'rejected' || result === 'failed') return 'critical';
  if (result === 'rework_required') return 'warning';
  return 'neutral';
}

function ncrStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (status === 'closed') return 'success';
  if (status === 'open') return 'critical';
  if (status === 'in_review') return 'warning';
  return 'neutral';
}

function severityVariant(
  severity: string,
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (severity === 'critical' || severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'neutral';
}

function findingStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'closed') return 'success';
  if (status === 'rework_in_progress') return 'info';
  if (status === 'assigned') return 'warning';
  if (status === 'open') return 'critical';
  return 'neutral';
}

function releaseStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (status === 'issued') return 'success';
  if (status === 'blocked') return 'critical';
  if (status === 'draft') return 'neutral';
  if (status === 'pending_approval') return 'warning';
  return 'neutral';
}

const TABS = [
  'Material QC',
  'Open NCRs',
  'Project QC',
  'Findings & Rework',
  'Release Notes',
] as const;

type Tab = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsQC() {
  const [activeTab, setActiveTab] = useState<Tab>('Material QC');
  const [summary, setSummary] = useState<QCSummary>(EMPTY_SUMMARY);
  const [live, setLive] = useState<LiveData | null>(null);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setSummary({
          openNcrs: MOCK_MATERIAL_NCRS.filter(n => n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled').length,
          openFindings: MOCK_PROJECT_QC_FINDINGS.filter(f => f.finding_status !== 'closed' && f.finding_status !== 'cancelled').length,
          rnPending: MOCK_RELEASE_NOTES.filter(r => r.release_status === 'draft' || r.release_status === 'blocked' || r.release_status === 'ready_to_issue').length,
          rnIssued: MOCK_RELEASE_NOTES.filter(r => r.release_status === 'issued').length,
        });
        setLive({
          materialInspections: MOCK_MATERIAL_QC_INSPECTIONS as unknown as MaterialQcInspection[],
          materialNcrs: MOCK_MATERIAL_NCRS as unknown as MaterialNcr[],
          projectInspections: MOCK_PROJECT_QC_INSPECTIONS as unknown as ProjectQcInspection[],
          findings: MOCK_PROJECT_QC_FINDINGS as unknown as ProjectQcFinding[],
          releaseNotes: MOCK_RELEASE_NOTES as unknown as ReleaseNote[],
        });
        return;
      }
      const [ncrRes, findingsRes, rnPendingRes, rnIssuedRes,
        matInspData, matNcrData, projInspData, findData, rnData] = await Promise.all([
        supabase!.from('material_ncrs').select('*', { count: 'exact', head: true }).not('ncr_status', 'in', '(closed,cancelled)'),
        supabase!.from('project_qc_findings').select('*', { count: 'exact', head: true }).not('finding_status', 'in', '(closed,cancelled)'),
        supabase!.from('release_notes').select('*', { count: 'exact', head: true }).in('release_status', ['draft', 'blocked', 'ready_to_issue']),
        supabase!.from('release_notes').select('*', { count: 'exact', head: true }).eq('release_status', 'issued'),
        supabase!.from('material_qc_inspections').select('*, project:projects(project_code), item:store_receipt_items(item_name, quantity_received, unit)').order('created_at', { ascending: false }).limit(200),
        supabase!.from('material_ncrs').select('*, project:projects(project_code), item:store_receipt_items(item_name)').order('created_at', { ascending: false }).limit(200),
        supabase!.from('project_qc_inspections').select('*, project:projects(project_code), vehicle_line:project_vehicle_lines(vehicle_type)').order('created_at', { ascending: false }).limit(200),
        supabase!.from('project_qc_findings').select('*, project:projects(project_code), vehicle_line:project_vehicle_lines(vehicle_type)').order('created_at', { ascending: false }).limit(200),
        supabase!.from('release_notes').select('*, project:projects(project_code), vehicle_line:project_vehicle_lines(vehicle_type)').order('created_at', { ascending: false }).limit(200),
      ]);
      setSummary({
        openNcrs: ncrRes.count ?? 0,
        openFindings: findingsRes.count ?? 0,
        rnPending: rnPendingRes.count ?? 0,
        rnIssued: rnIssuedRes.count ?? 0,
      });
      setLive({
        materialInspections: (matInspData.data as unknown as MaterialQcInspection[]) ?? [],
        materialNcrs: (matNcrData.data as unknown as MaterialNcr[]) ?? [],
        projectInspections: (projInspData.data as unknown as ProjectQcInspection[]) ?? [],
        findings: (findData.data as unknown as ProjectQcFinding[]) ?? [],
        releaseNotes: (rnData.data as unknown as ReleaseNote[]) ?? [],
      });
    })();
  }, []);

  const matInsp = live?.materialInspections ?? (MOCK_MATERIAL_QC_INSPECTIONS as unknown as MaterialQcInspection[]);
  const matNcrs = live?.materialNcrs ?? (MOCK_MATERIAL_NCRS as unknown as MaterialNcr[]);
  const projInsp = live?.projectInspections ?? (MOCK_PROJECT_QC_INSPECTIONS as unknown as ProjectQcInspection[]);
  const findings = live?.findings ?? (MOCK_PROJECT_QC_FINDINGS as unknown as ProjectQcFinding[]);
  const releaseNotes = live?.releaseNotes ?? (MOCK_RELEASE_NOTES as unknown as ReleaseNote[]);

  const openNcrs = matNcrs.filter((n) => n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled');
  const openFindings = findings.filter((f) => f.finding_status !== 'closed' && f.finding_status !== 'cancelled');

  function handleExportCsv() {
    const columns: ReportColumn<MaterialNcr>[] = [
      { key: 'ncr_number', header: 'NCR #', value: n => n.ncr_number },
      { key: 'severity', header: 'Severity', value: n => n.severity },
      { key: 'ncr_status', header: 'Status', value: n => n.ncr_status },
      { key: 'root_cause_category', header: 'Root Cause', value: n => n.root_cause_category ?? '' },
      { key: 'due_date', header: 'Due Date', value: n => n.due_date ?? '' },
    ];
    exportRowsToCsv(`qc-ncrs-${new Date().toISOString().split('T')[0]}.csv`, matNcrs, columns);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="QC Reports"
        subtitle="Material inspections, NCRs, project QC findings, and release note readiness"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'QC' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <ReportExportBar
        reportKey="qc_ncrs"
        reportTitle="QC NCR Report"
        department="QC"
        onExportCsv={handleExportCsv}
        summary={`${summary.openNcrs} open NCR${summary.openNcrs !== 1 ? 's' : ''} · ${summary.openFindings} open finding${summary.openFindings !== 1 ? 's' : ''} · ${summary.rnIssued} release note${summary.rnIssued !== 1 ? 's' : ''} issued`}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open NCRs', value: summary.openNcrs, accent: summary.openNcrs > 0 ? 'border-red-400' : 'border-gray-200' },
          { label: 'Open Findings', value: summary.openFindings, accent: summary.openFindings > 0 ? 'border-amber-400' : 'border-gray-200' },
          { label: 'Release Notes Pending', value: summary.rnPending, accent: summary.rnPending > 0 ? 'border-amber-400' : 'border-gray-200' },
          { label: 'Release Notes Issued', value: summary.rnIssued, accent: 'border-green-400' },
        ].map(card => (
          <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </Card>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1 — Material QC */}
      {activeTab === 'Material QC' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Material QC Inspections ({matInsp.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Inspection #</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">Inspected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matInsp.map((insp) => (
                  <tr key={insp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {insp.inspection_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {insp.project?.project_code ?? insp.project_id}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {insp.item?.item_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {insp.item?.quantity_received ?? '—'}{' '}
                      {insp.item?.unit ?? ''}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inspectionStatusVariant(insp.inspection_status)}>
                        {insp.inspection_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inspectionResultVariant(insp.inspection_result)}>
                        {insp.inspection_result.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(insp.inspected_at)}
                    </td>
                  </tr>
                ))}
                {matInsp.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No material QC inspections found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2 — Open NCRs */}
      {activeTab === 'Open NCRs' && (
        <div className="space-y-4">
          {openNcrs.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>
                <strong>{openNcrs.length}</strong> open NCR{openNcrs.length !== 1 ? 's' : ''} require corrective action before project release.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-sm text-gray-700">
                All NCRs ({matNcrs.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">NCR #</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Root Cause</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matNcrs.map((ncr) => (
                    <tr key={ncr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{ncr.ncr_number}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {ncr.project?.project_code ?? ncr.project_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ncr.item?.item_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(ncr.severity)}>
                          {ncr.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ncrStatusVariant(ncr.ncr_status)}>
                          {ncr.ncr_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {ncr.root_cause_category ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(ncr.due_date)}</td>
                    </tr>
                  ))}
                  {matNcrs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        No NCRs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3 — Project QC */}
      {activeTab === 'Project QC' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Project QC Inspections ({projInsp.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Inspection #</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Vehicle Line</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">Readiness</th>
                  <th className="px-4 py-3 text-left">Inspected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projInsp.map((insp) => (
                  <tr key={insp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {insp.inspection_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {insp.project?.project_code ?? insp.project_id}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {insp.vehicle_line?.vehicle_type ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inspectionStatusVariant(insp.inspection_status)}>
                        {insp.inspection_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inspectionResultVariant(insp.inspection_result)}>
                        {insp.inspection_result.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {insp.readiness_status?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(insp.inspected_at)}
                    </td>
                  </tr>
                ))}
                {projInsp.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No project QC inspections found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4 — Findings & Rework */}
      {activeTab === 'Findings & Rework' && (
        <div className="space-y-4">
          {openFindings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <Wrench className="w-4 h-4 shrink-0" />
              <span>
                <strong>{openFindings.length}</strong> finding{openFindings.length !== 1 ? 's' : ''} open or pending rework — release note may be blocked.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm text-gray-700">
                All Findings ({findings.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Finding #</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Vehicle Line</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {findings.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{f.finding_number}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.project?.project_code ?? f.project_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.vehicle_line?.vehicle_type ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {f.finding_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={findingStatusVariant(f.finding_status)}>
                          {f.finding_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(f.due_date)}</td>
                    </tr>
                  ))}
                  {findings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        No findings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5 — Release Notes */}
      {activeTab === 'Release Notes' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Release Notes ({releaseNotes.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Release Note #</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Issued By</th>
                  <th className="px-4 py-3 text-left">Issued At</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {releaseNotes.map((rn) => (
                  <tr
                    key={rn.id}
                    className={
                      rn.release_status === 'blocked'
                        ? 'bg-red-50 hover:bg-red-100'
                        : rn.release_status === 'ready_to_issue'
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : 'hover:bg-gray-50'
                    }
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {rn.release_note_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {rn.project?.project_code ?? rn.project_id}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {rn.release_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={releaseStatusVariant(rn.release_status)}>
                        {rn.release_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {rn.issued_by_profile?.full_name ?? rn.issued_by ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(rn.issued_at)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {rn.remarks ?? '—'}
                    </td>
                  </tr>
                ))}
                {releaseNotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No release notes found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
