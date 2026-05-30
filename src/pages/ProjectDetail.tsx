import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderOpen, Loader2, ArrowLeft, Calendar, User, MapPin,
  CheckSquare, AlertCircle, Info, FileText, List, Clock,
  Shield, Edit2, Check, RotateCcw, X, GitBranch,
  CheckCircle2, Plus,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordProjectEvent, recordAuditEntry } from '../lib/projectAudit';
import { fetchProjectReferences, getExecutionGateStatus } from '../lib/executionGate';
import {
  MOCK_PROJECTS,
  MOCK_VEHICLE_LINES,
  MOCK_PROJECT_DOCUMENTS,
  MOCK_TIMELINE_EVENTS,
} from '../data/mockProjects';
import type {
  Project, ProjectVehicleLine, ProjectDocument,
  ProjectTimelineEvent, ManufacturingLocation, MedicalItems, UserRole,
  ExecutionReference,
} from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatSAR(n: number) {
  return 'SAR ' + n.toLocaleString('en-SA', { minimumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type TabKey = 'overview' | 'details' | 'lines' | 'documents' | 'approval' | 'timeline' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',  label: 'Overview',           icon: <FolderOpen size={15} /> },
  { key: 'details',  label: 'SO Details',          icon: <Edit2 size={15} /> },
  { key: 'lines',    label: 'Vehicle Lines',       icon: <List size={15} /> },
  { key: 'documents',label: 'Documents',           icon: <FileText size={15} /> },
  { key: 'approval', label: 'Approval & Routing',  icon: <CheckSquare size={15} /> },
  { key: 'timeline', label: 'Timeline',            icon: <Clock size={15} /> },
  { key: 'audit',    label: 'Audit',               icon: <Shield size={15} /> },
];

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    draft:                  { label: 'Draft',      variant: 'neutral' },
    submitted_for_approval: { label: 'Submitted',  variant: 'info' },
    sent_back_for_revision: { label: 'Sent Back',  variant: 'warning' },
    approved:               { label: 'Approved',   variant: 'success' },
    rejected:               { label: 'Rejected',   variant: 'critical' },
    active:                 { label: 'Active',     variant: 'default' },
    completed:              { label: 'Completed',  variant: 'success' },
    cancelled:              { label: 'Cancelled',  variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' };
  return <Badge variant={variant}>{label}</Badge>;
}

const CAN_APPROVE: UserRole[] = ['admin', 'operations_manager'];

// ── Inline Approve Panel ──────────────────────────────────────────────────────

interface ApprovePanelProps {
  project: Project;
  onSuccess: (updated: Partial<Project>) => void;
}

function ApprovePanel({ project, onSuccess }: ApprovePanelProps) {
  const { profile, role } = useAuth();
  const [location, setLocation] = useState<ManufacturingLocation>(
    project.manufacturing_location === 'not_set' ? 'saudi' : project.manufacturing_location,
  );
  const [medical, setMedical] = useState<MedicalItems>(
    project.medical_items === 'not_set' ? 'no' : project.medical_items,
  );
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'approve' | 'sendback' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setSubmitting(true); setError(null);
    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 500));
      setSubmitting(false);
      onSuccess({ project_status: 'approved', manufacturing_location: location, medical_items: medical });
      return;
    }
    try {
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('projects').update({
        project_status: 'approved', manufacturing_location: location, medical_items: medical,
        approved_at: now, approved_by: profile?.id ?? null,
      }).eq('id', project.id);
      if (e) throw e;
      await recordProjectEvent(project.id, 'approved', 'Project approved',
        `Route: ${location} | Medical: ${medical}`, profile?.id ?? null, profile?.full_name ?? null,
        { manufacturing_location: location, medical_items: medical });
      await recordAuditEntry('project_approved', project.id, `Project ${project.project_code} approved`,
        { project_status: 'submitted_for_approval' }, { project_status: 'approved' },
        profile?.id ?? null, profile?.email ?? null, role);
      onSuccess({ project_status: 'approved', manufacturing_location: location, medical_items: medical,
        approved_at: now, approved_by: profile?.id ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error approving project');
      setSubmitting(false);
    }
  }

  async function handleSendBack() {
    if (!reason.trim()) return;
    setSubmitting(true); setError(null);
    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setSubmitting(false);
      onSuccess({ project_status: 'sent_back_for_revision', revision_reason: reason.trim() });
      return;
    }
    try {
      const { error: e } = await supabase.from('projects').update({
        project_status: 'sent_back_for_revision', revision_reason: reason.trim(),
      }).eq('id', project.id);
      if (e) throw e;
      await recordProjectEvent(project.id, 'sent_back_for_revision', 'Sent back for revision',
        reason.trim(), profile?.id ?? null, profile?.full_name ?? null);
      onSuccess({ project_status: 'sent_back_for_revision', revision_reason: reason.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending back project');
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setSubmitting(true); setError(null);
    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setSubmitting(false);
      onSuccess({ project_status: 'rejected', rejection_reason: reason.trim() });
      return;
    }
    try {
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('projects').update({
        project_status: 'rejected', rejection_reason: reason.trim(),
        rejected_at: now, rejected_by: profile?.id ?? null,
      }).eq('id', project.id);
      if (e) throw e;
      await recordProjectEvent(project.id, 'rejected', 'Project rejected',
        reason.trim(), profile?.id ?? null, profile?.full_name ?? null);
      onSuccess({ project_status: 'rejected', rejection_reason: reason.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error rejecting project');
      setSubmitting(false);
    }
  }

  if (project.project_status !== 'submitted_for_approval') {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
        Approval actions are only available for projects with status <strong>Submitted for Approval</strong>.
        This project is currently <strong>{project.project_status.replace(/_/g, ' ')}</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span className="text-xs text-amber-800">Dev mode — actions will not be persisted.</span>
        </div>
      )}

      {/* Location */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Manufacturing Location</h4>
        <div className="grid grid-cols-2 gap-2">
          {(['saudi', 'dubai'] as const).map((loc) => (
            <button key={loc} onClick={() => setLocation(loc)}
              className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                location === loc ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {loc === 'saudi' ? 'Saudi Arabia' : 'Dubai / UAE'}
            </button>
          ))}
        </div>
        {location === 'saudi' && (
          <p className="mt-2 text-xs text-sky-700 bg-sky-50 rounded px-3 py-2">
            Gate: WO is mandatory before factory execution.
          </p>
        )}
        {location === 'dubai' && (
          <p className="mt-2 text-xs text-sky-700 bg-sky-50 rounded px-3 py-2">
            Gate: PN is mandatory before Dubai follow-up.
          </p>
        )}
      </Card>

      {/* Medical */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Medical Items</h4>
        <div className="grid grid-cols-2 gap-2">
          {(['yes', 'no'] as const).map((med) => (
            <button key={med} onClick={() => setMedical(med)}
              className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                medical === med ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {med === 'yes' ? 'Yes — Medical' : 'No — Non-Medical'}
            </button>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => { setMode('approve'); handleApprove(); }} loading={submitting && mode === 'approve'}
          disabled={submitting} icon={<Check size={16} />}>
          Approve Project
        </Button>
        <Button variant="secondary" onClick={() => setMode(mode === 'sendback' ? null : 'sendback')}
          disabled={submitting} icon={<RotateCcw size={16} />}>
          Send Back
        </Button>
        <Button variant="danger" onClick={() => setMode(mode === 'reject' ? null : 'reject')}
          disabled={submitting} icon={<X size={16} />}>
          Reject
        </Button>
      </div>

      {/* Send Back form */}
      {mode === 'sendback' && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Send Back — Revision Reason</h4>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            rows={3} placeholder="Describe what needs to be corrected…"
            className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="secondary" onClick={handleSendBack}
              loading={submitting && mode === 'sendback'} disabled={!reason.trim() || submitting}>
              Confirm Send Back
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={submitting}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Reject form */}
      {mode === 'reject' && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h4 className="text-sm font-semibold text-red-800 mb-2">Reject — Rejection Reason</h4>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            rows={3} placeholder="Describe why this project is being rejected…"
            className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-white"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="danger" onClick={handleReject}
              loading={submitting && mode === 'reject'} disabled={!reason.trim() || submitting}>
              Confirm Rejection
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={submitting}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── WO/PN Gate Card (used in Overview tab) ────────────────────────────────────

interface WoPnGateCardProps {
  project: Project;
  references: ExecutionReference[];
  canAdd: boolean;
  onReferenceAdded: (ref: ExecutionReference) => void;
  className?: string;
}

function WoPnGateCard({ project, references, canAdd, onReferenceAdded, className = '' }: WoPnGateCardProps) {
  const { profile, role } = useAuth();
  const gate = getExecutionGateStatus(project, references);

  const [addingType, setAddingType] = useState<'wo' | 'pn' | null>(null);
  const [refNumber, setRefNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!gate.isSaudi && !gate.isDubai) {
    // Location not set — only show if approved
    if (!gate.isApproved) return null;
    return (
      <Card className={`p-5 bg-gray-50 border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <GitBranch size={15} />
          <span>Manufacturing location not set — WO/PN gate will activate after routing is confirmed.</span>
        </div>
      </Card>
    );
  }

  if (!gate.isApproved) {
    return (
      <Card className={`p-5 bg-gray-50 border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <GitBranch size={15} />
          <span>WO/PN will be required after project approval and route selection.</span>
        </div>
      </Card>
    );
  }

  const type = gate.isSaudi ? 'wo' : 'pn';
  const hasRef = gate.isSaudi ? gate.hasActiveWO : gate.hasActivePN;
  const activeRef = gate.isSaudi ? gate.woReference : gate.pnReference;
  const isUnlocked = gate.isSaudi ? gate.canStartSaudiFactory : gate.canStartDubaiFollowUp;
  const gateTitle = gate.isSaudi ? 'WO Required Before Factory Execution' : 'PN Required Before Dubai Follow-up';
  const label = type === 'wo' ? 'Work Order (WO)' : 'Part Number (PN)';

  async function handleAddRef(e: React.FormEvent) {
    e.preventDefault();
    if (!refNumber.trim()) return;
    setSaving(true);
    setSaveError(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 400));
      const newRef: ExecutionReference = {
        id: `exref-${Date.now()}`,
        project_id: project.id,
        reference_type: type,
        reference_number: refNumber.trim(),
        manufacturing_location: type === 'wo' ? 'saudi' : 'dubai',
        status: 'created',
        created_by: profile?.id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        confirmed_by: null,
        confirmed_at: null,
        remarks: remarks.trim() || null,
        project: null,
        created_by_profile: { full_name: profile?.full_name ?? null, email: profile?.email ?? '' },
        confirmed_by_profile: null,
      };
      setSaving(false);
      setAddingType(null);
      setRefNumber('');
      setRemarks('');
      onReferenceAdded(newRef);
      return;
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('project_execution_references')
        .insert({
          project_id: project.id,
          reference_type: type,
          reference_number: refNumber.trim(),
          manufacturing_location: type === 'wo' ? 'saudi' : 'dubai',
          created_by: profile?.id ?? null,
          remarks: remarks.trim() || null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      await recordProjectEvent(
        project.id, `${type}_created`,
        `${type.toUpperCase()} reference created`,
        `${type.toUpperCase()}: ${refNumber.trim()}`,
        profile?.id ?? null, profile?.full_name ?? null,
        { reference_type: type, reference_number: refNumber.trim() },
      );
      await recordAuditEntry(
        `${type}_created`, project.id,
        `${type.toUpperCase()} ${refNumber.trim()} created for ${project.project_code}`,
        null, { reference_type: type, reference_number: refNumber.trim() },
        profile?.id ?? null, profile?.email ?? null, role,
      );

      setAddingType(null);
      setRefNumber('');
      setRemarks('');
      onReferenceAdded(data as unknown as ExecutionReference);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <Card className={`p-5 ${isUnlocked ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 text-gray-700">
          <GitBranch size={14} />
          Execution Gate
        </h3>
        {isUnlocked
          ? <Badge variant="success">Unlocked</Badge>
          : <Badge variant="warning">Blocked</Badge>
        }
      </div>

      <p className="text-sm font-semibold text-gray-900 mb-3">{gateTitle}</p>

      {hasRef && activeRef ? (
        <div className="flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-mono font-bold text-gray-900">{activeRef.reference_number}</span>
            <span className="ml-2">
              <Badge variant={activeRef.status === 'confirmed' ? 'success' : 'info'} size="sm">
                {activeRef.status}
              </Badge>
            </span>
            {activeRef.remarks && (
              <p className="text-xs text-gray-500 mt-0.5 italic">{activeRef.remarks}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              Added {new Date(activeRef.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {activeRef.confirmed_at && ` · Confirmed ${new Date(activeRef.confirmed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-sm text-amber-800 mb-3">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            No {label} has been entered yet.{' '}
            {gate.isSaudi
              ? 'Factory execution is blocked until a WO is added.'
              : 'Dubai follow-up is blocked until a PN is added.'}
          </span>
        </div>
      )}

      {canAdd && !hasRef && addingType !== type && (
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddingType(type)} className="mt-1">
          Add {type.toUpperCase()}
        </Button>
      )}

      {addingType === type && (
        <form onSubmit={handleAddRef} className="mt-3 space-y-3">
          {saveError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{saveError}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {label} Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder={type === 'wo' ? 'e.g. WO-2025-0042' : 'e.g. PN-2025-0019'}
              required
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any notes…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={saving} disabled={!refNumber.trim()}>
              Save {type.toUpperCase()}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingType(null); setSaveError(null); }} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!hasRef && (
        <p className="mt-3 text-xs text-gray-500">
          Go to <Link to="/wo-pn-gate" className="text-brand-600 hover:underline">WO / PN Gate</Link> to manage all execution references.
        </p>
      )}
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [lines, setLines] = useState<ProjectVehicleLine[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [timeline, setTimeline] = useState<ProjectTimelineEvent[]>([]);
  const [references, setReferences] = useState<ExecutionReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const canSeeMoney = role === 'admin' || role === 'operations_manager';
  const canApprove = role ? CAN_APPROVE.includes(role) : false;
  const canAudit = role === 'admin';
  const canAddRef = role === 'admin' || role === 'operations_manager' || role === 'factory_user';

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    if (!isSupabaseConfigured || !supabase) {
      const found = MOCK_PROJECTS.find((p) => p.id === id);
      if (!found) { setNotFound(true); setLoading(false); return; }
      setProject(found);
      setLines(MOCK_VEHICLE_LINES[id] ?? []);
      setDocuments(MOCK_PROJECT_DOCUMENTS[id] ?? []);
      setTimeline(MOCK_TIMELINE_EVENTS[id] ?? []);
      fetchProjectReferences(id).then(setReferences);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      supabase.from('projects')
        .select('*, sales_owner:profiles!projects_sales_owner_id_fkey(full_name, email), approved_by_profile:profiles!projects_approved_by_fkey(full_name)')
        .eq('id', id)
        .single(),
      supabase.from('project_vehicle_lines').select('*').eq('project_id', id).order('line_number'),
      supabase.from('project_documents').select('*').eq('project_id', id).order('uploaded_at'),
      supabase.from('project_timeline_events').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      fetchProjectReferences(id),
    ]).then(([{ data: proj, error: projErr }, { data: pvl }, { data: docs }, { data: events }, refs]) => {
      if (projErr || !proj) { setNotFound(true); setLoading(false); return; }
      setProject(proj as unknown as Project);
      setLines(pvl as unknown as ProjectVehicleLine[] ?? []);
      setDocuments(docs as unknown as ProjectDocument[] ?? []);
      setTimeline(events as unknown as ProjectTimelineEvent[] ?? []);
      setReferences(refs as ExecutionReference[]);
      setLoading(false);
    });
  }, [id]);

  function handleApprovalSuccess(updated: Partial<Project>) {
    setProject((p) => p ? { ...p, ...updated } : p);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Project not found.</p>
        <Link to="/projects"><Button variant="secondary" icon={<ArrowLeft size={16} />}>Back to Projects</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={project.project_code}
        subtitle={`${project.customer_name} — ${project.so_number}`}
        icon={<FolderOpen size={18} />}
        breadcrumb={[
          { label: 'Projects', path: '/projects' },
          { label: project.project_code },
        ]}
        action={
          <div className="flex items-center gap-2">
            {statusBadge(project.project_status)}
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.filter((t) => {
            if (t.key === 'audit' && !canAudit) return false;
            return true;
          }).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project Info</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>{statusBadge(project.project_status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Project Code</dt>
                <dd className="font-semibold">{project.project_code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">SO Number</dt>
                <dd className="font-medium">{project.so_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium text-right max-w-[200px]">{project.customer_name}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="flex items-center gap-1 text-gray-500"><MapPin size={13} /> Location</dt>
                <dd>
                  {project.manufacturing_location === 'not_set'
                    ? <Badge variant="neutral">Not Set</Badge>
                    : <Badge variant={project.manufacturing_location === 'saudi' ? 'default' : 'info'}>
                        {project.manufacturing_location === 'saudi' ? 'Saudi' : 'Dubai'}
                      </Badge>
                  }
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Medical Items</dt>
                <dd>
                  {project.medical_items === 'not_set'
                    ? <Badge variant="neutral">Not Set</Badge>
                    : <Badge variant={project.medical_items === 'yes' ? 'warning' : 'neutral'}>
                        {project.medical_items === 'yes' ? 'Medical' : 'Non-Medical'}
                      </Badge>
                  }
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dates & People</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-gray-500"><Calendar size={13} /> Delivery Date</dt>
                <dd className="font-medium">{formatDate(project.customer_delivery_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-gray-500"><User size={13} /> Sales Owner</dt>
                <dd className="font-medium">
                  {project.sales_owner?.full_name ?? project.sales_owner?.email ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-700">{formatDate(project.created_at)}</dd>
              </div>
              {project.submitted_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Submitted</dt>
                  <dd className="text-gray-700">{formatDate(project.submitted_at)}</dd>
                </div>
              )}
              {project.approved_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Approved</dt>
                  <dd className="text-green-700 font-medium">{formatDate(project.approved_at)}</dd>
                </div>
              )}
              {project.rejected_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rejected</dt>
                  <dd className="text-red-700 font-medium">{formatDate(project.rejected_at)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {canSeeMoney && (
            <Card className="p-5 md:col-span-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financial</h3>
              <div className="text-2xl font-bold text-gray-900">{formatSAR(project.total_sales_value)}</div>
              <p className="text-sm text-gray-500 mt-1">Total Sales Value</p>
            </Card>
          )}

          {project.notes && (
            <Card className="p-5 md:col-span-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{project.notes}</p>
            </Card>
          )}

          {project.revision_reason && (
            <Card className="p-5 md:col-span-2 border-amber-200 bg-amber-50">
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Revision Required</h3>
              <p className="text-sm text-amber-800">{project.revision_reason}</p>
            </Card>
          )}

          {project.rejection_reason && (
            <Card className="p-5 md:col-span-2 border-red-200 bg-red-50">
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Rejection Reason</h3>
              <p className="text-sm text-red-800">{project.rejection_reason}</p>
            </Card>
          )}

          {/* WO / PN Gate card */}
          <WoPnGateCard
            project={project}
            references={references}
            canAdd={canAddRef}
            onReferenceAdded={(ref) => setReferences((prev) => [...prev, ref])}
            className="md:col-span-2"
          />
        </div>
      )}

      {/* ── SO Details ───────────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Sales Order Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {[
              { label: 'Project Code', value: project.project_code },
              { label: 'SO Number', value: project.so_number },
              { label: 'Customer Name', value: project.customer_name },
              { label: 'Delivery Date', value: formatDate(project.customer_delivery_date) },
              { label: 'Manufacturing Location', value: project.manufacturing_location.replace(/_/g, ' ') },
              { label: 'Medical Items', value: project.medical_items.replace(/_/g, ' ') },
              ...(canSeeMoney ? [{ label: 'Total Sales Value', value: formatSAR(project.total_sales_value) }] : []),
              { label: 'Status', value: project.project_status.replace(/_/g, ' ') },
              { label: 'Created At', value: formatDateTime(project.created_at) },
              { label: 'Last Updated', value: formatDateTime(project.updated_at) },
              ...(project.submitted_at ? [{ label: 'Submitted At', value: formatDateTime(project.submitted_at) }] : []),
              ...(project.approved_at ? [{ label: 'Approved At', value: formatDateTime(project.approved_at) }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <span className="text-gray-900 capitalize">{value}</span>
              </div>
            ))}
          </div>
          {project.notes && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
              <p className="text-sm text-gray-700">{project.notes}</p>
            </div>
          )}
        </Card>
      )}

      {/* ── Vehicle Lines ─────────────────────────────────────────────────────── */}
      {activeTab === 'lines' && (
        <div>
          {lines.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">No vehicle lines registered.</Card>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Description</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty</th>
                    {canSeeMoney && (
                      <>
                        <th className="text-right px-4 py-3 font-semibold text-gray-700">Unit (SAR)</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-700">Total (SAR)</th>
                      </>
                    )}
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{line.line_number}</td>
                      <td className="px-4 py-3 font-medium">{line.vehicle_type}</td>
                      <td className="px-4 py-3 text-gray-700">{line.description}</td>
                      <td className="px-4 py-3 text-right">{line.quantity}</td>
                      {canSeeMoney && (
                        <>
                          <td className="px-4 py-3 text-right">{line.unit_sales_value.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold">{line.line_total_value.toLocaleString()}</td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{line.line_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {canSeeMoney && (
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        Total Value
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                        {lines.reduce((s, l) => s + l.line_total_value, 0).toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Documents ─────────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          {!isSupabaseConfigured && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">File download requires Supabase Storage to be configured.</p>
            </div>
          )}
          {documents.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">No documents attached.</Card>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{doc.file_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {doc.document_type.replace(/_/g, ' ')} · v{doc.version} · {formatDate(doc.uploaded_at)}
                    </div>
                    {doc.remarks && <div className="text-xs text-gray-400 mt-0.5">{doc.remarks}</div>}
                  </div>
                </div>
                <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'critical' : 'neutral'}>
                  {doc.status.replace(/_/g, ' ')}
                </Badge>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Approval & Routing ────────────────────────────────────────────────── */}
      {activeTab === 'approval' && (
        <div className="space-y-5">
          {/* Current approval state */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Status</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {statusBadge(project.project_status)}
              {project.approved_at && (
                <span className="text-sm text-gray-600">
                  Approved {formatDateTime(project.approved_at)}
                  {project.approved_by_profile?.full_name && ` by ${project.approved_by_profile.full_name}`}
                </span>
              )}
              {project.rejected_at && (
                <span className="text-sm text-gray-600">
                  Rejected {formatDateTime(project.rejected_at)}
                </span>
              )}
            </div>
            {project.revision_reason && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <strong>Revision note:</strong> {project.revision_reason}
              </div>
            )}
            {project.rejection_reason && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
                <strong>Rejection reason:</strong> {project.rejection_reason}
              </div>
            )}
          </Card>

          {canApprove && (
            <ApprovePanel project={project} onSuccess={handleApprovalSuccess} />
          )}

          {!canApprove && (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
              Approval actions are restricted to Admin and Operations Manager roles.
            </div>
          )}
        </div>
      )}

      {/* ── Timeline ──────────────────────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {timeline.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">No timeline events yet.</Card>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 relative">
                    <div className="w-10 h-10 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center shrink-0 z-10">
                      <Clock size={16} className="text-brand-600" />
                    </div>
                    <Card className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                          {event.actor_name && (
                            <p className="text-xs text-gray-500 mt-0.5">by {event.actor_name}</p>
                          )}
                          {event.body && (
                            <p className="text-sm text-gray-700 mt-2">{event.body}</p>
                          )}
                        </div>
                        <time className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                          {formatDateTime(event.created_at)}
                        </time>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && canAudit && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Audit log entries for project <strong>{project.project_code}</strong>.{' '}
            {!isSupabaseConfigured && 'Dev mode — no live data.'}
          </p>
          <Card className="p-8 text-center text-gray-500 text-sm">
            Full audit log is available in the{' '}
            <Link to="/audit-log" className="text-brand-600 hover:underline">Audit Log</Link>{' '}
            page filtered by this project ID: <code className="bg-gray-100 px-1 rounded text-xs">{project.id}</code>
          </Card>
        </div>
      )}
    </div>
  );
}
