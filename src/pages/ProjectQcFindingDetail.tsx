import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_PROJECT_QC_FINDINGS } from '../data/mockQc';
import type { ProjectQcFinding, UserRole } from '../types';
import { recordQcAudit, recordQcEvent } from '../lib/qcAudit';

const CAN_CLOSE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];
const CAN_MARK_REWORK: UserRole[] = ['admin', 'operations_manager', 'qc_user', 'factory_user'];

function statusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open' || s === 'assigned') return 'critical';
  if (s === 'rework_in_progress' || s === 'pending_reinspection') return 'warning';
  if (s === 'closed') return 'success';
  return 'neutral';
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ProjectQcFindingDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canClose = role ? CAN_CLOSE.includes(role) : false;
  const canMarkRework = role ? CAN_MARK_REWORK.includes(role) : false;

  const [finding, setFinding] = useState<ProjectQcFinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [closureNotes, setClosureNotes] = useState('');
  const [ownerRole, setOwnerRole] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [devMessage, setDevMessage] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const found = MOCK_PROJECT_QC_FINDINGS.find(f => f.id === id);
        if (found) {
          setFinding({ ...found });
          setOwnerRole(found.owner_role ?? '');
          setDueDate(found.due_date ?? '');
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('project_qc_findings')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .eq('id', id!)
        .single();
      if (!data) { setNotFound(true); }
      else {
        const f = data as unknown as ProjectQcFinding;
        setFinding(f);
        setOwnerRole(f.owner_role ?? '');
        setDueDate(f.due_date ?? '');
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageLoader />;
  if (notFound || !finding) {
    return (
      <div className="text-center py-16 text-gray-500">
        Finding not found.{' '}
        <Link to="/project-qc/findings" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const isClosed = finding.finding_status === 'closed' || finding.finding_status === 'cancelled';
  const canCloseNow = canClose && !isClosed && (!finding.rework_required || !!finding.rework_completed_at);

  function devUpdate(patch: Partial<ProjectQcFinding>, message: string) {
    setFinding(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(message);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleUpdateAssignment() {
    const currentFinding = finding;
    if (!currentFinding) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ owner_role: ownerRole, due_date: dueDate || null, finding_status: 'assigned' }, 'Dev: Assignment updated');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('project_qc_findings').update({
      owner_role: ownerRole || null,
      due_date: dueDate || null,
      finding_status: 'assigned',
    }).eq('id', id!);
    if (!error) {
      setFinding(prev => prev ? { ...prev, owner_role: ownerRole || null, due_date: dueDate || null, finding_status: 'assigned' } : prev);
      void recordQcAudit('finding_assigned', id!, `Finding ${currentFinding.finding_number} assigned`, profile?.id ?? null);
    }
    setSaving(false);
  }

  async function handleMarkReworkCompleted() {
    const currentFinding = finding;
    if (!currentFinding) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ finding_status: 'pending_reinspection', rework_completed_by: profile?.id ?? 'user', rework_completed_at: new Date().toISOString() }, 'Dev: Rework marked completed');
      return;
    }
    setSaving(true);
    const reworkAt = new Date().toISOString();
    const { error } = await supabase.from('project_qc_findings').update({
      finding_status: 'pending_reinspection',
      rework_completed_by: profile?.id ?? null,
      rework_completed_at: reworkAt,
    }).eq('id', id!);
    if (!error) {
      setFinding(prev => prev ? { ...prev, finding_status: 'pending_reinspection', rework_completed_by: profile?.id ?? null, rework_completed_at: reworkAt } : prev);
      void recordQcEvent(currentFinding.project_id, 'rework_completed', `Rework completed for ${currentFinding.finding_number}`, null, profile?.id ?? null, profile?.full_name ?? null, null);
      void recordQcAudit('rework_completed', id!, `Rework completed for ${currentFinding.finding_number}`, profile?.id ?? null);
    }
    setSaving(false);
  }

  async function handleClose() {
    const currentFinding = finding;
    if (!currentFinding) return;
    if (!closureNotes.trim()) { setFormError('Closure notes are required.'); return; }
    if (currentFinding.rework_required && !currentFinding.rework_completed_at) { setFormError('Rework must be completed before closing this finding.'); return; }
    setFormError(null);
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ finding_status: 'closed', closure_notes: closureNotes, closed_at: new Date().toISOString(), closed_by: profile?.id ?? 'user' }, 'Dev: Finding closed');
      return;
    }
    setSaving(true);
    const closedAt = new Date().toISOString();
    const { error } = await supabase.from('project_qc_findings').update({
      finding_status: 'closed',
      closure_notes: closureNotes,
      closed_at: closedAt,
      closed_by: profile?.id ?? null,
    }).eq('id', id!);
    if (!error) {
      setFinding(prev => prev ? { ...prev, finding_status: 'closed', closure_notes: closureNotes, closed_at: closedAt, closed_by: profile?.id ?? null } : prev);
      void recordQcEvent(currentFinding.project_id, 'finding_closed', `Finding ${currentFinding.finding_number} closed`, closureNotes, profile?.id ?? null, profile?.full_name ?? null, null);
      void recordQcAudit('finding_closed', id!, `Finding ${currentFinding.finding_number} closed`, profile?.id ?? null);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title={finding.finding_number}
        subtitle="QC Finding"
        breadcrumb={[{ label: 'Project QC', href: '/project-qc' }, { label: 'Findings', href: '/project-qc/findings' }, { label: finding.finding_number }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
            <Badge variant={statusVariant(finding.finding_status)}>{finding.finding_status.replace(/_/g, ' ')}</Badge>
          </div>
        }
      />

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {!isClosed && finding.rework_required && !finding.rework_completed_at && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl px-5 py-3 text-sm text-orange-800 flex items-center gap-2">
          <Wrench size={16} /> Rework required — Factory must complete rework before QC can close this finding.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Finding Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{finding.finding_type.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{finding.project?.project_code ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicle Line</span><span>{finding.vehicle_line?.vehicle_type ?? 'Project-wide'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Rework</span><span>{finding.rework_required ? 'Required' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Owner Role</span><span>{finding.owner_role ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span>{finding.due_date ? new Date(finding.due_date).toLocaleDateString('en-GB') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Raised</span><span>{formatDateTime(finding.created_at)}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Description &amp; Action</h3>
          <p className="text-sm text-gray-700 mb-3"><strong>Finding:</strong> {finding.description}</p>
          <p className="text-sm text-gray-700"><strong>Required Action:</strong> {finding.required_action}</p>
        </Card>
      </div>

      {/* Assignment */}
      {!isClosed && canClose && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Assignment</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Owner Role</label>
              <select value={ownerRole} onChange={e => setOwnerRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="">Unassigned</option>
                <option value="factory_user">Factory</option>
                <option value="qc_user">QC</option>
                <option value="store_user">Store</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          </div>
          <Button variant="secondary" size="sm" disabled={saving} className="mt-3" onClick={handleUpdateAssignment}>
            Save Assignment
          </Button>
        </Card>
      )}

      {/* Factory: Mark Rework Completed */}
      {!isClosed && finding.rework_required && !finding.rework_completed_at && canMarkRework && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Wrench size={15} className="text-orange-500" /> Rework Completion
          </h3>
          <p className="text-xs text-gray-500 mb-3">After completing the required rework, mark it as done here. QC will then verify and close the finding.</p>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleMarkReworkCompleted}>
            Mark Rework Completed
          </Button>
        </Card>
      )}

      {finding.rework_completed_at && !isClosed && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-3 text-sm text-sky-800">
          <strong>Rework completed</strong> {formatDateTime(finding.rework_completed_at)} — QC can now close this finding.
        </div>
      )}

      {/* Close finding */}
      {!isClosed && (canCloseNow || (canClose && !finding.rework_required)) && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle size={15} className="text-green-500" /> Close Finding
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Closure Notes <span className="text-red-500">*</span></label>
              <textarea value={closureNotes} onChange={e => setClosureNotes(e.target.value)} rows={3}
                placeholder="Describe how the finding was resolved."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            {formError && <p className="mb-2 text-xs text-red-600">{formError}</p>}
            <Button variant="primary" size="sm" disabled={saving} onClick={handleClose}>
              <CheckCircle size={14} className="mr-1" /> Close Finding
            </Button>
          </div>
        </Card>
      )}

      {/* Closed state */}
      {finding.finding_status === 'closed' && (
        <Card className="p-5 bg-green-50 border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle size={15} /> Finding Closed
          </h3>
          {finding.closure_notes && <p className="text-sm text-green-700"><strong>Closure notes:</strong> {finding.closure_notes}</p>}
          {finding.closed_at && <p className="text-xs text-green-600 mt-1">Closed {formatDateTime(finding.closed_at)}</p>}
        </Card>
      )}

      {/* Release Note warning */}
      {!isClosed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-xs text-amber-700 flex items-center gap-2">
          <AlertTriangle size={14} /> This open finding is blocking Release Note issuance for the project.
        </div>
      )}
    </div>
  );
}
