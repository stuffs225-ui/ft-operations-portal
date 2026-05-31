import { Link } from 'react-router-dom';
import { ClipboardCheck, AlertTriangle, CheckCircle, FileCheck, Wrench, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import {
  MOCK_PROJECT_QC_INSPECTIONS,
  MOCK_PROJECT_QC_FINDINGS,
  MOCK_RELEASE_NOTES,
} from '../data/mockQc';
import type { UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

function readinessVariant(r: string): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (r === 'not_ready') return 'neutral';
  if (r === 'pending_rework') return 'warning';
  if (r === 'ready_for_release') return 'success';
  if (r === 'released') return 'info';
  return 'neutral';
}

function resultVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'passed') return 'success';
  if (r === 'passed_with_comments') return 'warning';
  if (r === 'failed') return 'critical';
  if (r === 'rework_required') return 'warning';
  return 'neutral';
}

function releaseVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'issued') return 'success';
  if (r === 'ready_to_issue') return 'info';
  if (r === 'blocked') return 'critical';
  if (r === 'draft') return 'neutral';
  return 'neutral';
}

export function ProjectQC() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const inspections = MOCK_PROJECT_QC_INSPECTIONS;
  const findings = MOCK_PROJECT_QC_FINDINGS;
  const releaseNotes = MOCK_RELEASE_NOTES;

  const pendingQc = inspections.filter(i => i.inspection_status === 'pending').length;
  const inProgress = inspections.filter(i => i.inspection_status === 'in_progress').length;
  const reworkRequired = inspections.filter(i => i.inspection_result === 'rework_required').length;
  const openFindings = findings.filter(f => f.finding_status !== 'closed' && f.finding_status !== 'cancelled').length;
  const readyForRelease = inspections.filter(i => i.readiness_status === 'ready_for_release').length;
  const issued = releaseNotes.filter(r => r.release_status === 'issued').length;
  const blocked = releaseNotes.filter(r => r.release_status === 'blocked').length;

  const kpis = [
    { label: 'Pending QC', value: pendingQc, color: 'border-l-amber-400', icon: <ClipboardCheck size={16} className="text-amber-500" /> },
    { label: 'In Progress', value: inProgress, color: 'border-l-sky-400', icon: <ClipboardCheck size={16} className="text-sky-500" /> },
    { label: 'Rework Required', value: reworkRequired, color: reworkRequired > 0 ? 'border-l-orange-500' : 'border-l-green-400', icon: <Wrench size={16} className="text-orange-500" /> },
    { label: 'Open Findings', value: openFindings, color: openFindings > 0 ? 'border-l-red-500' : 'border-l-green-400', icon: <AlertTriangle size={16} className="text-red-500" /> },
    { label: 'Ready for Release', value: readyForRelease, color: 'border-l-green-400', icon: <CheckCircle size={16} className="text-green-500" /> },
    { label: 'Release Notes Issued', value: issued, color: 'border-l-indigo-400', icon: <FileCheck size={16} className="text-indigo-500" /> },
    { label: 'Blocked Release Notes', value: blocked, color: blocked > 0 ? 'border-l-red-500' : 'border-l-green-400', icon: <AlertTriangle size={16} className="text-red-500" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project / Vehicle QC"
        subtitle="Final vehicle and project quality inspection, findings, rework, and release notes"
        action={
          canCreate ? (
            <Link to="/project-qc/inspections">
              <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Inspection</Button>
            </Link>
          ) : undefined
        }
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
          Dev Mode — showing mock data. Release Note cannot be issued with open NCRs or findings.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${k.color}`}>
            <div className="text-gray-400 mb-2">{k.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-sm font-medium text-gray-700 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/project-qc/inspections"><Button variant="secondary" size="sm"><ClipboardCheck size={14} className="mr-1" /> Inspections</Button></Link>
        <Link to="/project-qc/findings"><Button variant="secondary" size="sm"><AlertTriangle size={14} className="mr-1" /> Findings</Button></Link>
        <Link to="/project-qc/release-notes"><Button variant="secondary" size="sm"><FileCheck size={14} className="mr-1" /> Release Notes</Button></Link>
      </div>

      {/* Recent inspections */}
      <Card>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Recent Project QC Inspections</h3>
          <Link to="/project-qc/inspections"><Button variant="ghost" size="sm">View All <ChevronRight size={14} /></Button></Link>
        </div>
        {inspections.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState icon={<ClipboardCheck size={22} className="text-gray-400" />} title="No inspections" description="No project QC inspections yet." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Inspection #</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Project</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden lg:table-cell">Vehicle Line</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Result</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Readiness</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inspections.slice(0, 5).map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-mono text-sky-700">{i.inspection_number}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 hidden md:table-cell font-mono text-xs">{i.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 hidden lg:table-cell">{i.vehicle_line?.vehicle_type ?? 'Project-wide'}</td>
                    <td className="px-4 py-2.5"><Badge variant={resultVariant(i.inspection_result)}>{i.inspection_result.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-2.5"><Badge variant={readinessVariant(i.readiness_status)}>{i.readiness_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-2.5">
                      <Link to={`/project-qc/inspections/${i.id}`}><Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Open findings */}
      <Card>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-500" /> Open Findings
          </h3>
          <Link to="/project-qc/findings"><Button variant="ghost" size="sm">View All <ChevronRight size={14} /></Button></Link>
        </div>
        {findings.filter(f => f.finding_status !== 'closed' && f.finding_status !== 'cancelled').length === 0 ? (
          <div className="px-5 py-6 text-sm text-gray-400 text-center">No open findings.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {findings.filter(f => f.finding_status !== 'closed' && f.finding_status !== 'cancelled').map(f => (
              <div key={f.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono text-sky-700">{f.finding_number}</span>
                    <Badge variant={f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'warning' : 'info'}>{f.severity}</Badge>
                    {f.rework_required && <Badge variant="warning">Rework</Badge>}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{f.description.slice(0, 80)}…</p>
                </div>
                <Link to={`/project-qc/findings/${f.id}`}><Button variant="ghost" size="sm">View</Button></Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Blocked release notes */}
      {releaseNotes.filter(r => r.release_status === 'blocked').length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" /> Blocked Release Notes
            </h3>
            <Link to="/project-qc/release-notes"><Button variant="ghost" size="sm">View All <ChevronRight size={14} /></Button></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {releaseNotes.filter(r => r.release_status === 'blocked').map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-mono text-sky-700">{r.release_note_number}</span>
                  <Badge variant={releaseVariant(r.release_status)} className="ml-2">{r.release_status.replace(/_/g, ' ')}</Badge>
                  <p className="text-xs text-gray-500 mt-0.5">{r.project?.project_code} — {r.remarks?.slice(0, 60)}…</p>
                </div>
                <Link to={`/project-qc/release-notes/${r.id}`}><Button variant="ghost" size="sm">View</Button></Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Governance Rules</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          {[
            'Vehicle / Project QC starts after Factory marks production completed / sent to QC.',
            'QC must inspect each vehicle/item line independently.',
            'QC can request Rework. Rework findings must be closed by Factory and confirmed by QC.',
            'Release Note cannot be issued if any QC finding or Rework remains open.',
            'Release Note cannot be issued if any Material NCR for the project is open.',
            'Release Note marks the project/line as ready for delivery.',
            'QC users must not see purchase cost values.',
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <ChevronRight size={14} className="text-sky-400 mt-0.5 shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
