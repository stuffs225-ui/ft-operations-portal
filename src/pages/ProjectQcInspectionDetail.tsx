import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, CheckCircle, XCircle, Wrench, AlertTriangle, Plus, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { MOCK_PROJECT_QC_INSPECTIONS, MOCK_PROJECT_QC_FINDINGS } from '../data/mockQc';
import type {
  ProjectQcInspection, InspectionStatus, ProjectQcResult,
  ProjectQcFinding, FindingType, NcrSeverity, UserRole,
} from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordQcEvent, recordQcAudit } from '../lib/qcAudit';

const CAN_ACT: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

function resultVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'passed') return 'success';
  if (r === 'passed_with_comments') return 'warning';
  if (r === 'failed') return 'critical';
  if (r === 'rework_required') return 'warning';
  return 'neutral';
}

function readinessVariant(r: string): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (r === 'pending_rework') return 'warning';
  if (r === 'ready_for_release') return 'success';
  if (r === 'released') return 'info';
  return 'neutral';
}

function findingStatusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open' || s === 'assigned') return 'critical';
  if (s === 'rework_in_progress' || s === 'pending_reinspection') return 'warning';
  if (s === 'closed') return 'success';
  return 'neutral';
}

export function ProjectQcInspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canAct = role ? CAN_ACT.includes(role) : false;

  const base = MOCK_PROJECT_QC_INSPECTIONS.find(i => i.id === id);
  const [inspection, setInspection] = useState<ProjectQcInspection | undefined>(base);
  const [findings, setFindings] = useState<ProjectQcFinding[]>(
    MOCK_PROJECT_QC_FINDINGS.filter(f => f.project_qc_inspection_id === id)
  );
  const [devMessage, setDevMessage] = useState('');
  const [remarks, setRemarks] = useState(base?.remarks ?? '');

  // New finding form
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [newFindingType, setNewFindingType] = useState<FindingType>('other');
  const [newSeverity, setNewSeverity] = useState<NcrSeverity>('medium');
  const [newDesc, setNewDesc] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newRework, setNewRework] = useState(false);

  if (!inspection) {
    return (
      <div className="text-center py-16 text-gray-500">
        Inspection not found.{' '}
        <Link to="/project-qc/inspections" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  function devUpdate(patch: Partial<ProjectQcInspection>, message: string) {
    setInspection(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(message);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleResult(status: InspectionStatus, result: ProjectQcResult, eventType: string, title: string) {
    if (!inspection) return;
    if (!isSupabaseConfigured) {
      devUpdate({ inspection_status: status, inspection_result: result, inspected_at: new Date().toISOString() }, `Dev: ${title}`);
      return;
    }
    await recordQcEvent(inspection.project_id, eventType, title, remarks || null, profile?.id ?? null, profile?.full_name ?? null, null);
    await recordQcAudit(eventType, id!, title, profile?.id ?? null);
  }

  function addFinding() {
    if (!inspection) return;
    if (!newDesc.trim() || !newAction.trim()) return;
    const finding: ProjectQcFinding = {
      id: `fnd-new-${Date.now()}`,
      project_qc_inspection_id: id!,
      project_id: inspection.project_id,
      project_vehicle_line_id: inspection.project_vehicle_line_id,
      finding_number: `FND-2025-${String(findings.length + 10).padStart(4, '0')}`,
      finding_type: newFindingType,
      severity: newSeverity,
      description: newDesc,
      required_action: newAction,
      owner_role: null, owner_id: null, due_date: null,
      finding_status: 'open',
      rework_required: newRework,
      rework_completed_by: null, rework_completed_at: null,
      closure_notes: null, closed_by: null, closed_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setFindings(prev => [...prev, finding]);
    setNewDesc(''); setNewAction(''); setNewRework(false); setShowFindingForm(false);
    setDevMessage('Dev: Finding added (not persisted)');
    setTimeout(() => setDevMessage(''), 2000);
  }

  const openFindings = findings.filter(f => f.finding_status !== 'closed' && f.finding_status !== 'cancelled');
  const allFindingsClosed = openFindings.length === 0;
  const isCompleted = inspection.inspection_status === 'completed';
  const isPending = inspection.inspection_status === 'pending';
  const isInProgress = inspection.inspection_status === 'in_progress';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/project-qc/inspections" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title={inspection.inspection_number}
          subtitle={`Project QC — ${inspection.project?.project_code ?? 'Unknown project'}`}
        />
      </div>

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700">
          Dev Mode — actions update local state only.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Inspection Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{inspection.project?.project_code ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{inspection.project?.customer_name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicle Line</span><span>{inspection.vehicle_line?.vehicle_type ?? 'Project-wide'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Manufacturing</span><span className="capitalize">{inspection.project?.manufacturing_location ?? '—'}</span></div>
            {inspection.inspected_at && (
              <div className="flex justify-between"><span className="text-gray-500">Inspected</span><span>{new Date(inspection.inspected_at).toLocaleDateString('en-GB')}</span></div>
            )}
            {inspection.inspected_by_profile?.full_name && (
              <div className="flex justify-between"><span className="text-gray-500">Inspector</span><span>{inspection.inspected_by_profile.full_name}</span></div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={resultVariant(inspection.inspection_result)}>{inspection.inspection_result.replace(/_/g, ' ')}</Badge>
              <Badge variant={readinessVariant(inspection.readiness_status)}>{inspection.readiness_status.replace(/_/g, ' ')}</Badge>
            </div>
            {inspection.remarks && (
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{inspection.remarks}</div>
            )}
            {!allFindingsClosed && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                {openFindings.length} open finding(s) — release blocked until all findings are closed.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* QC Actions */}
      {canAct && !isCompleted && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">QC Actions</h3>
          <div className="space-y-4">
            {isPending && (
              <Button variant="secondary" size="sm" onClick={() => handleResult('in_progress', 'pending', 'project_qc_started', `QC started for ${inspection.inspection_number}`)}>
                <ClipboardCheck size={14} className="mr-1" /> Start Inspection
              </Button>
            )}

            {isInProgress && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Inspection Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleResult('completed', 'passed', 'project_qc_passed', `${inspection.inspection_number} passed`)}>
                    <CheckCircle size={14} className="mr-1" /> Pass
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleResult('completed', 'passed_with_comments', 'project_qc_passed', `${inspection.inspection_number} passed with comments`)}>
                    Pass with Comments
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setShowFindingForm(true); handleResult('in_progress', 'rework_required', 'rework_required', `Rework required for ${inspection.inspection_number}`); }}>
                    <Wrench size={14} className="mr-1" /> Rework Required
                  </Button>
                  <Button variant="secondary" size="sm" className="border-red-200 text-red-700" onClick={() => { setShowFindingForm(true); handleResult('in_progress', 'failed', 'project_qc_failed', `${inspection.inspection_number} failed`); }}>
                    <XCircle size={14} className="mr-1" /> Fail
                  </Button>
                </div>

                {allFindingsClosed && (
                  <Button variant="primary" size="sm" onClick={() => devUpdate({ readiness_status: 'ready_for_release' }, 'Dev: Marked ready for release')}>
                    <CheckCircle size={14} className="mr-1" /> Mark Ready for Release
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Findings */}
      <Card>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-500" /> Findings ({findings.length})
          </h3>
          {canAct && !isCompleted && (
            <Button variant="secondary" size="sm" onClick={() => setShowFindingForm(!showFindingForm)}>
              <Plus size={14} className="mr-1" /> Add Finding
            </Button>
          )}
        </div>

        {showFindingForm && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Finding Type</label>
                <select value={newFindingType} onChange={e => setNewFindingType(e.target.value as FindingType)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  {['dimensional', 'surface_finish', 'functional', 'documentation', 'safety', 'other'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                <select value={newSeverity} onChange={e => setNewSeverity(e.target.value as NcrSeverity)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Required Action <span className="text-red-500">*</span></label>
                <textarea value={newAction} onChange={e => setNewAction(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="rework_req" checked={newRework} onChange={e => setNewRework(e.target.checked)} />
                <label htmlFor="rework_req" className="text-xs text-gray-600">Rework Required</label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={addFinding}>Add Finding</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFindingForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {findings.length === 0 ? (
          <div className="px-5 py-6 text-sm text-gray-400 text-center">No findings for this inspection.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {findings.map(f => (
              <div key={f.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono text-sky-700">{f.finding_number}</span>
                    <Badge variant={f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'warning' : 'info'}>{f.severity}</Badge>
                    {f.rework_required && <Badge variant="warning">Rework</Badge>}
                    <Badge variant={findingStatusVariant(f.finding_status)}>{f.finding_status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{f.description.slice(0, 80)}</p>
                </div>
                <Link to={`/project-qc/findings/${f.id}`}><Button variant="ghost" size="sm">View</Button></Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText size={15} className="text-gray-400" /> Inspection Documents
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
          Vehicle inspection report upload requires Supabase storage configuration.
        </div>
      </Card>
    </div>
  );
}
