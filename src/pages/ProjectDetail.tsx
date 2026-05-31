import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderOpen, Loader2, ArrowLeft, Calendar, User, MapPin,
  CheckSquare, AlertCircle, Info, FileText, List, Clock,
  Shield, Edit2, Check, RotateCcw, X, GitBranch,
  CheckCircle2, Plus, ShoppingCart, Wrench, Truck, Package, FileCheck,
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
import { getMockPRsForProject, getMockPOsForProject } from '../data/mockProcurement';
import { getMockFactoryRecordsForProject, getMockRMRsForProject } from '../data/mockFactory';
import { getMockReceiptsForProject, getMockVehicleReceiptsForProject, getMockCustodyForProject } from '../data/mockStore';
import { getMockMaterialQcForProject, getMockNcrsForProject, getMockProjectQcForProject, getMockFindingsForProject, getMockReleaseNotesForProject } from '../data/mockQc';
import { getMockDubaiFollowupsForProject, getMockArrivalReportsForProject, getMockPredeliveryReportsForProject, getMockMaintenanceRequestsForProject } from '../data/mockAfs';
import { getHealthScoreForProject, getSlaEventsForProject, getIssuesForProject, getOpenSlaBreaches } from '../data/mockReports';
import type {
  Project, ProjectVehicleLine, ProjectDocument,
  ProjectTimelineEvent, ManufacturingLocation, MedicalItems, UserRole,
  ExecutionReference, ProcurementRequest, PurchaseOrder,
  FactoryRecord, RawMaterialRequest,
  StoreReceipt, VehicleReceipt, MaterialCustodyRecord,
  MaterialQcInspection, MaterialNcr, ProjectQcInspection, ProjectQcFinding, ReleaseNote,
  DubaiProjectFollowup, AfsArrivalReport, AfsPredeliveryReport, AfsMaintenanceRequest,
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

type TabKey = 'overview' | 'details' | 'lines' | 'documents' | 'procurement' | 'factory' | 'store' | 'qc_release' | 'dubai_afs' | 'approval' | 'timeline' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',     label: 'Overview',           icon: <FolderOpen size={15} /> },
  { key: 'details',      label: 'SO Details',         icon: <Edit2 size={15} /> },
  { key: 'lines',        label: 'Vehicle Lines',      icon: <List size={15} /> },
  { key: 'documents',    label: 'Documents',          icon: <FileText size={15} /> },
  { key: 'procurement',  label: 'Procurement',        icon: <ShoppingCart size={15} /> },
  { key: 'factory',      label: 'Factory',            icon: <Wrench size={15} /> },
  { key: 'store',        label: 'Store',              icon: <Package size={15} /> },
  { key: 'qc_release',   label: 'QC & Release',       icon: <FileCheck size={15} /> },
  { key: 'dubai_afs',    label: 'Dubai / AFS',        icon: <Truck size={15} /> },
  { key: 'approval',     label: 'Approval & Routing', icon: <CheckSquare size={15} /> },
  { key: 'timeline',     label: 'Timeline',           icon: <Clock size={15} /> },
  { key: 'audit',        label: 'Audit',              icon: <Shield size={15} /> },
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
  const [procurementPRs, setProcurementPRs] = useState<ProcurementRequest[]>([]);
  const [procurementPOs, setProcurementPOs] = useState<PurchaseOrder[]>([]);
  const [factoryRecords, setFactoryRecords] = useState<FactoryRecord[]>([]);
  const [factoryRmrs, setFactoryRmrs] = useState<RawMaterialRequest[]>([]);
  const [storeReceipts, setStoreReceipts] = useState<StoreReceipt[]>([]);
  const [storeVehicleReceipts, setStoreVehicleReceipts] = useState<VehicleReceipt[]>([]);
  const [storeCustody, setStoreCustody] = useState<MaterialCustodyRecord[]>([]);
  const [qcInspections, setQcInspections] = useState<MaterialQcInspection[]>([]);
  const [qcNcrs, setQcNcrs] = useState<MaterialNcr[]>([]);
  const [projectQcInspections, setProjectQcInspections] = useState<ProjectQcInspection[]>([]);
  const [qcFindings, setQcFindings] = useState<ProjectQcFinding[]>([]);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [dubaiFollowups, setDubaiFollowups] = useState<DubaiProjectFollowup[]>([]);
  const [afsArrivalReports, setAfsArrivalReports] = useState<AfsArrivalReport[]>([]);
  const [afsPredeliveryReports, setAfsPredeliveryReports] = useState<AfsPredeliveryReport[]>([]);
  const [afsMaintenanceRequests, setAfsMaintenanceRequests] = useState<AfsMaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const canSeeMoney = role === 'admin' || role === 'operations_manager';
  const canApprove = role ? CAN_APPROVE.includes(role) : false;
  const canAudit = role === 'admin';
  const canAddRef = role === 'admin' || role === 'operations_manager' || role === 'factory_user';
  const canSeeCost = ['admin', 'operations_manager', 'procurement_user'].includes(role ?? '');

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
      setProcurementPRs(getMockPRsForProject(id));
      setProcurementPOs(getMockPOsForProject(id));
      setFactoryRecords(getMockFactoryRecordsForProject(id));
      setFactoryRmrs(getMockRMRsForProject(id));
      setStoreReceipts(getMockReceiptsForProject(id));
      setStoreVehicleReceipts(getMockVehicleReceiptsForProject(id));
      setStoreCustody(getMockCustodyForProject(id));
      setQcInspections(getMockMaterialQcForProject(id));
      setQcNcrs(getMockNcrsForProject(id));
      setProjectQcInspections(getMockProjectQcForProject(id));
      setQcFindings(getMockFindingsForProject(id));
      setReleaseNotes(getMockReleaseNotesForProject(id));
      setDubaiFollowups(getMockDubaiFollowupsForProject(id));
      setAfsArrivalReports(getMockArrivalReportsForProject(id));
      setAfsPredeliveryReports(getMockPredeliveryReportsForProject(id));
      setAfsMaintenanceRequests(getMockMaintenanceRequestsForProject(id));
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
      supabase.from('procurement_requests').select('*, project:projects(project_code, so_number, customer_name)').eq('project_id', id),
      supabase.from('purchase_orders_to_supplier_safe').select('*').eq('project_id', id),
      supabase.from('factory_records').select('*').eq('project_id', id),
      supabase.from('production_raw_material_requests').select('*').eq('project_id', id),
    ]).then(([{ data: proj, error: projErr }, { data: pvl }, { data: docs }, { data: events }, refs, { data: prs }, { data: pos }, { data: frs }, { data: frmrs }]) => {
      if (projErr || !proj) { setNotFound(true); setLoading(false); return; }
      setProject(proj as unknown as Project);
      setLines(pvl as unknown as ProjectVehicleLine[] ?? []);
      setDocuments(docs as unknown as ProjectDocument[] ?? []);
      setTimeline(events as unknown as ProjectTimelineEvent[] ?? []);
      setReferences(refs as ExecutionReference[]);
      setProcurementPRs((prs as unknown as ProcurementRequest[]) ?? []);
      setProcurementPOs((pos as unknown as PurchaseOrder[]) ?? []);
      setFactoryRecords((frs as unknown as FactoryRecord[]) ?? []);
      setFactoryRmrs((frmrs as unknown as RawMaterialRequest[]) ?? []);
      setStoreReceipts(getMockReceiptsForProject(id ?? ''));
      setStoreVehicleReceipts(getMockVehicleReceiptsForProject(id ?? ''));
      setStoreCustody(getMockCustodyForProject(id ?? ''));
      setQcInspections(getMockMaterialQcForProject(id ?? ''));
      setQcNcrs(getMockNcrsForProject(id ?? ''));
      setProjectQcInspections(getMockProjectQcForProject(id ?? ''));
      setQcFindings(getMockFindingsForProject(id ?? ''));
      setReleaseNotes(getMockReleaseNotesForProject(id ?? ''));
      setDubaiFollowups(getMockDubaiFollowupsForProject(id ?? ''));
      setAfsArrivalReports(getMockArrivalReportsForProject(id ?? ''));
      setAfsPredeliveryReports(getMockPredeliveryReportsForProject(id ?? ''));
      setAfsMaintenanceRequests(getMockMaintenanceRequestsForProject(id ?? ''));
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

          {/* Project Health & Reports */}
          {(() => {
            const health = getHealthScoreForProject(project.id);
            const slaBreaches = getSlaEventsForProject(project.id).filter(e => getOpenSlaBreaches().some(b => b.id === e.id));
            const issues = getIssuesForProject(project.id).filter(i => !['closed','cancelled','resolved'].includes(i.status));
            if (!health) return null;
            const bandColor: Record<string, string> = { healthy: 'text-green-700 bg-green-50 border-green-200', watch: 'text-amber-700 bg-amber-50 border-amber-200', at_risk: 'text-orange-700 bg-orange-50 border-orange-200', critical: 'text-red-700 bg-red-50 border-red-200' };
            return (
              <Card className={`p-5 md:col-span-2 border ${bandColor[health.score_band] ?? ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Health & Reports</h3>
                  <Link to="/reports/projects" className="text-xs text-sky-600 hover:underline">Full Report →</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${health.score_band === 'healthy' ? 'text-green-700' : health.score_band === 'watch' ? 'text-amber-700' : health.score_band === 'at_risk' ? 'text-orange-700' : 'text-red-700'}`}>{health.score}</div>
                    <div className="text-xs text-gray-500 capitalize">{health.score_band.replace('_', ' ')} health</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{health.blockers_count}</div>
                    <div className="text-xs text-gray-500">Blockers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{slaBreaches.length}</div>
                    <div className="text-xs text-gray-500">SLA Breaches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{issues.length}</div>
                    <div className="text-xs text-gray-500">Open Issues</div>
                  </div>
                </div>
              </Card>
            );
          })()}
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

      {/* ── Procurement ───────────────────────────────────────────────────────── */}
      {activeTab === 'procurement' && (
        <div className="space-y-5">
          {/* Purchase Requests */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={15} className="text-brand-600" /> Purchase Requests
            </h3>
            {procurementPRs.length === 0 ? (
              <Card className="p-6 text-center text-gray-500 text-sm">No procurement activity for this project</Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">PR Number</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Received Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Source Dept</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {procurementPRs.map((pr) => {
                        const prStatusMap: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
                          draft: { label: 'Draft', variant: 'neutral' },
                          pr_received: { label: 'PR Received', variant: 'info' },
                          in_progress: { label: 'In Progress', variant: 'warning' },
                          partially_ordered: { label: 'Partially Ordered', variant: 'warning' },
                          fully_ordered: { label: 'Fully Ordered', variant: 'success' },
                          cancelled: { label: 'Cancelled', variant: 'neutral' },
                          closed: { label: 'Closed', variant: 'neutral' },
                        };
                        const { label, variant } = prStatusMap[pr.status] ?? { label: pr.status, variant: 'neutral' as const };
                        return (
                          <tr key={pr.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono font-semibold text-gray-900">{pr.pr_number}</td>
                            <td className="px-4 py-3"><Badge variant={variant}>{label}</Badge></td>
                            <td className="px-4 py-3 text-gray-700">
                              {pr.received_date ? formatDate(pr.received_date) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{pr.source_department ?? '—'}</td>
                            <td className="px-4 py-3">
                              <Link to={`/procurement/requests/${pr.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* PO to Supplier */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShoppingCart size={15} className="text-brand-600" /> PO to Supplier
            </h3>
            {procurementPOs.length === 0 ? (
              <Card className="p-6 text-center text-gray-500 text-sm">No purchase orders for this project</Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">PO Number</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">PO Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                        {canSeeCost && <th className="text-right px-4 py-3 font-semibold text-gray-700">Value</th>}
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">ETA</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {procurementPOs.map((po) => {
                        const poStatusMap: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
                          draft: { label: 'Draft', variant: 'neutral' },
                          pending_approval: { label: 'Pending Approval', variant: 'warning' },
                          approved: { label: 'Approved', variant: 'success' },
                          rejected: { label: 'Rejected', variant: 'critical' },
                          sent_to_supplier: { label: 'Sent to Supplier', variant: 'info' },
                          eta_confirmed: { label: 'ETA Confirmed', variant: 'info' },
                          in_transit: { label: 'In Transit', variant: 'warning' },
                          partially_received: { label: 'Partially Received', variant: 'warning' },
                          fully_received: { label: 'Fully Received', variant: 'success' },
                          delayed: { label: 'Delayed', variant: 'critical' },
                          cancelled: { label: 'Cancelled', variant: 'neutral' },
                          closed: { label: 'Closed', variant: 'neutral' },
                        };
                        const { label, variant } = poStatusMap[po.po_status] ?? { label: po.po_status, variant: 'neutral' as const };
                        return (
                          <tr key={po.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono font-semibold text-gray-900">{po.po_number}</td>
                            <td className="px-4 py-3 text-gray-700">{po.supplier_name}</td>
                            <td className="px-4 py-3 text-gray-700">{formatDate(po.po_date)}</td>
                            <td className="px-4 py-3"><Badge variant={variant}>{label}</Badge></td>
                            {canSeeCost && (
                              <td className="px-4 py-3 text-right font-medium">
                                {po.currency} {po.purchase_value.toLocaleString()}
                              </td>
                            )}
                            <td className="px-4 py-3 text-gray-700">
                              {po.eta_date ? formatDate(po.eta_date) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Link to={`/procurement/purchase-orders/${po.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Factory ──────────────────────────────────────────────────────────── */}
      {activeTab === 'factory' && (
        <div className="space-y-5">
          {project.manufacturing_location !== 'saudi' ? (
            <Card className="p-6 text-center">
              <Wrench size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">Dubai / AFS Route</p>
              <p className="text-xs text-gray-500 mt-1">Factory module applies to Saudi manufacturing projects only. Dubai projects use the AFS workflow (Phase 9).</p>
            </Card>
          ) : (
            <>
              {/* Factory Records */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Production Records</h3>
                  <Link to={`/factory/projects/${project.id}`} className="text-xs text-brand-600 hover:underline">Open Factory Workspace →</Link>
                </div>
                {factoryRecords.length === 0 ? (
                  <p className="text-sm text-gray-500">No factory records yet. Open the Factory Workspace to set up production.</p>
                ) : (
                  <div className="space-y-2">
                    {factoryRecords.map((fr) => (
                      <div key={fr.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {fr.vehicle_line ? `${fr.vehicle_line.vehicle_type} — ${fr.vehicle_line.description}` : 'Project-level record'}
                          </p>
                          <p className="text-xs text-gray-500">Progress: {fr.progress_percentage}%</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {fr.monthly_update_required && (
                            <Badge variant="critical">Update Required</Badge>
                          )}
                          <Badge variant={
                            fr.production_status === 'production_completed' || fr.production_status === 'sent_to_qc' ? 'success' :
                            fr.production_status === 'in_production' ? 'default' :
                            fr.production_status === 'on_hold' ? 'neutral' :
                            fr.production_status === 'monthly_update_required' ? 'critical' : 'warning'
                          }>
                            {fr.production_status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Raw Material Requests */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Raw Material Requests</h3>
                  <Link to="/factory/raw-material-requests" className="text-xs text-brand-600 hover:underline">View all RMRs</Link>
                </div>
                {factoryRmrs.length === 0 ? (
                  <p className="text-sm text-gray-500">No raw material requests for this project.</p>
                ) : (
                  <div className="space-y-2">
                    {factoryRmrs.map((rmr) => (
                      <div key={rmr.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-mono font-medium text-gray-900">{rmr.request_number}</p>
                          <p className="text-xs text-gray-500">{new Date(rmr.requested_at).toLocaleDateString('en-GB')}</p>
                        </div>
                        <Badge variant={
                          rmr.status === 'fulfilled' ? 'success' :
                          rmr.status === 'sent_to_procurement' ? 'info' :
                          rmr.status === 'rejected' || rmr.status === 'cancelled' ? 'neutral' :
                          rmr.status === 'draft' ? 'neutral' : 'warning'
                        }>
                          {rmr.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4 bg-sky-50 border-sky-200">
                <p className="text-xs text-sky-800 font-medium">QC & Release</p>
                <p className="text-xs text-sky-700 mt-1">
                  When production is completed, view QC inspections, findings, and Release Note status in the{' '}
                  <button onClick={() => setActiveTab('qc_release')} className="underline font-semibold hover:text-sky-900">QC &amp; Release tab</button>.
                </p>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Store ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'store' && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Material Receipts', value: storeReceipts.length, color: 'border-l-sky-400' },
              { label: 'Vehicle Receipts', value: storeVehicleReceipts.length, color: 'border-l-indigo-400' },
              { label: 'Custody Records', value: storeCustody.length, color: 'border-l-amber-400' },
            ].map(k => (
              <div key={k.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${k.color}`}>
                <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                <div className="text-sm text-gray-600 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Material Receipts */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ShoppingCart size={15} className="text-sky-500" /> Material Receipts
              </h3>
              <Link to="/store/receipts"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {storeReceipts.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No material receipts linked to this project.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Receipt #</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Supplier</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {storeReceipts.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm font-mono text-sky-700">
                          <Link to={`/store/receipts/${r.id}`} className="hover:underline">{r.receipt_number}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{formatDate(r.received_date)}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{r.supplier_name ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                            r.status === 'received' ? 'bg-green-100 text-green-700' :
                            r.status === 'pending_material_qc' ? 'bg-amber-100 text-amber-700' :
                            r.status === 'accepted' ? 'bg-sky-100 text-sky-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{r.status.replace(/_/g, ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Vehicle Receipts */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Truck size={15} className="text-indigo-500" /> Vehicle Receipts
              </h3>
              <Link to="/store/vehicle-receiving"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {storeVehicleReceipts.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No vehicle receipts linked to this project.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Vehicle ID</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Vehicle Type</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Chassis #</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {storeVehicleReceipts.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm font-mono text-sky-700">
                          <Link to={`/store/vehicle-receiving/${v.id}`} className="hover:underline">{v.id.toUpperCase()}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{formatDate(v.received_date)}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-700">{v.vehicle_type}</td>
                        <td className="px-4 py-2.5 text-sm font-mono text-gray-600">{v.chassis_number || <span className="text-red-400 text-xs">Missing</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                            v.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            v.status === 'pending_condition_review' ? 'bg-amber-100 text-amber-700' :
                            v.status === 'damaged' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{v.status.replace(/_/g, ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Custody Records */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <List size={15} className="text-amber-500" /> Custody Records
              </h3>
              <Link to="/custody"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {storeCustody.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No custody records linked to this project.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Custody #</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Item</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Issued To</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {storeCustody.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm font-mono text-sky-700">
                          <Link to={`/custody/${c.id}`} className="hover:underline">{c.custody_number}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700">{c.item?.item_name ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                            c.issue_type === 'temporary_custody' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                          }`}>{c.issue_type === 'temporary_custody' ? 'Temporary' : 'Assign'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{c.issued_to_role ?? c.issued_to_department ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                            c.status === 'in_custody' ? 'bg-blue-100 text-blue-700' :
                            c.status === 'returned' ? 'bg-gray-100 text-gray-600' :
                            c.status === 'installed' ? 'bg-green-100 text-green-700' :
                            c.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{c.status.replace(/_/g, ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </div>
      )}

      {/* ── QC & Release ──────────────────────────────────────────────────────── */}
      {activeTab === 'qc_release' && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Material QC', value: qcInspections.length, color: 'border-l-sky-400' },
              { label: 'Open NCRs', value: qcNcrs.filter(n => n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled').length, color: 'border-l-red-400' },
              { label: 'Project QC', value: projectQcInspections.length, color: 'border-l-indigo-400' },
              { label: 'Open Findings', value: qcFindings.filter(f => f.finding_status !== 'closed' && f.finding_status !== 'cancelled').length, color: 'border-l-orange-400' },
              { label: 'Release Notes', value: releaseNotes.length, color: 'border-l-green-400' },
            ].map(k => (
              <div key={k.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${k.color}`}>
                <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                <div className="text-xs text-gray-600 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Material QC Inspections */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileCheck size={15} className="text-sky-500" /> Material QC Inspections
              </h3>
              <Link to="/material-qc/inspections"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {qcInspections.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No material QC inspections for this project.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Inspection #</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {qcInspections.map(i => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-sky-700">
                          <Link to={`/material-qc/inspections/${i.id}`} className="hover:underline">{i.inspection_number}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 capitalize">{i.inspection_status.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2.5 text-gray-600 capitalize">{i.inspection_result.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* NCRs */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertCircle size={15} className="text-red-500" /> Material NCRs
              </h3>
              <Link to="/material-qc/ncrs"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {qcNcrs.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No NCRs for this project.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">NCR #</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Severity</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {qcNcrs.map(n => (
                      <tr key={n.id} className={`hover:bg-gray-50 ${n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled' ? 'border-l-4 border-l-red-400' : ''}`}>
                        <td className="px-4 py-2.5 font-mono text-sky-700">
                          <Link to={`/material-qc/ncrs/${n.id}`} className="hover:underline">{n.ncr_number}</Link>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{n.severity}</td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{n.ncr_status.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Project QC Inspections */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileCheck size={15} className="text-indigo-500" /> Project QC Inspections
              </h3>
              <Link to="/project-qc/inspections"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {projectQcInspections.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No project QC inspections yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Inspection #</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Result</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Readiness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {projectQcInspections.map(i => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-sky-700">
                          <Link to={`/project-qc/inspections/${i.id}`} className="hover:underline">{i.inspection_number}</Link>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{i.inspection_status.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{i.inspection_result.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{i.readiness_status.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* QC Findings */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertCircle size={15} className="text-orange-500" /> QC Findings
              </h3>
              <Link to="/project-qc/findings"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {qcFindings.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No QC findings for this project.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Finding #</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Severity</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">Rework</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {qcFindings.map(f => (
                      <tr key={f.id} className={`hover:bg-gray-50 ${f.rework_required && f.finding_status !== 'closed' ? 'border-l-4 border-l-orange-400' : ''}`}>
                        <td className="px-4 py-2.5 font-mono text-sky-700">
                          <Link to={`/project-qc/findings/${f.id}`} className="hover:underline">{f.finding_number}</Link>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{f.severity}</td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{f.finding_status.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {f.rework_required
                            ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.rework_completed_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {f.rework_completed_at ? 'Done' : 'Required'}
                              </span>
                            : <span className="text-xs text-gray-400">No</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Release Notes */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileCheck size={15} className="text-green-500" /> Release Notes
              </h3>
              <Link to="/project-qc/release-notes"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {releaseNotes.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No release notes for this project.</div>
            ) : (
              <div className="space-y-3 p-4">
                {releaseNotes.map(rn => (
                  <div key={rn.id} className={`flex items-center justify-between p-3 rounded-lg border ${rn.release_status === 'issued' ? 'bg-green-50 border-green-200' : rn.release_status === 'blocked' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div>
                      <p className="text-sm font-mono font-medium text-gray-900">{rn.release_note_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{rn.release_type.replace(/_/g, ' ')} · {rn.release_status.replace(/_/g, ' ')}</p>
                      {rn.release_status === 'issued' && rn.issued_at && (
                        <p className="text-xs text-green-700 mt-0.5">Issued {new Date(rn.issued_at).toLocaleDateString('en-GB')}</p>
                      )}
                    </div>
                    <Link to={`/project-qc/release-notes/${rn.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Dubai / AFS ──────────────────────────────────────────────────────── */}
      {activeTab === 'dubai_afs' && (
        <div className="space-y-5">
          {project.manufacturing_location !== 'dubai' && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-4 text-sm text-sky-800">
              <strong>Dubai follow-up does not apply to this project</strong> — it is routed through the Saudi factory workflow.
              After-sales maintenance requests are shown below if any exist.
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Dubai Follow-ups', value: dubaiFollowups.length, color: 'border-l-sky-400' },
              { label: 'Arrival Reports', value: afsArrivalReports.length, color: 'border-l-green-400' },
              { label: 'Pre-Delivery Reports', value: afsPredeliveryReports.length, color: 'border-l-amber-400' },
              { label: 'Maintenance Requests', value: afsMaintenanceRequests.length, color: 'border-l-purple-400' },
            ].map(k => (
              <Card key={k.label} className={`p-4 border-l-4 ${k.color}`}>
                <div className="text-xl font-bold text-gray-900">{k.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
              </Card>
            ))}
          </div>

          {/* Dubai Follow-ups */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Dubai Follow-ups</h3>
              <Link to="/dubai-afs/projects"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {dubaiFollowups.length === 0 ? (
              <div className="px-5 py-5 text-sm text-gray-400 text-center">No Dubai follow-ups for this project.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dubaiFollowups.map(f => (
                  <div key={f.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-700">{f.vehicle_line?.vehicle_type ?? 'Project-wide'}</span>
                      <span className="text-gray-400 ml-2 text-xs">{f.dubai_status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.eta_date && <span className="text-xs text-gray-500">ETA {new Date(f.eta_date).toLocaleDateString('en-GB')}</span>}
                      <Badge variant={f.eta_status === 'delayed' ? 'warning' : f.eta_status === 'on_track' ? 'success' : 'neutral'}>{f.eta_status.replace(/_/g, ' ')}</Badge>
                      <Link to={`/dubai-afs/projects/${f.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Arrival Reports */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Arrival Reports</h3>
              <Link to="/dubai-afs/arrival-reports"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {afsArrivalReports.length === 0 ? (
              <div className="px-5 py-5 text-sm text-gray-400 text-center">No arrival reports for this project.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {afsArrivalReports.map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-sky-700 text-xs">{r.arrival_report_number}</span>
                      <span className="text-gray-500 ml-2">{new Date(r.arrival_date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{r.received_quantity}/{r.expected_quantity} units</span>
                      <Badge variant={r.arrival_status === 'arrived' ? 'success' : r.arrival_status === 'delayed' ? 'critical' : 'neutral'}>{r.arrival_status.replace(/_/g, ' ')}</Badge>
                      <Link to={`/dubai-afs/arrival-reports/${r.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pre-Delivery Reports */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Pre-Delivery Reports</h3>
              <Link to="/dubai-afs/predelivery-reports"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {afsPredeliveryReports.length === 0 ? (
              <div className="px-5 py-5 text-sm text-gray-400 text-center">No pre-delivery reports for this project.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {afsPredeliveryReports.map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-sky-700 text-xs">{r.predelivery_report_number}</span>
                      <span className="text-gray-500 ml-2">{new Date(r.report_date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.ready_for_delivery ? 'success' : 'warning'}>{r.ready_for_delivery ? 'Ready' : 'Not Ready'}</Badge>
                      <Link to={`/dubai-afs/predelivery-reports/${r.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Maintenance Requests */}
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Maintenance Requests</h3>
              <Link to="/after-sales/maintenance"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {afsMaintenanceRequests.length === 0 ? (
              <div className="px-5 py-5 text-sm text-gray-400 text-center">No maintenance requests for this project.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {afsMaintenanceRequests.map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-sky-700 text-xs">{r.maintenance_request_number}</span>
                      <span className="text-gray-700 ml-2">{r.title.slice(0, 50)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.priority === 'critical' ? 'critical' : r.priority === 'high' ? 'warning' : 'neutral'}>{r.priority}</Badge>
                      <Link to={`/after-sales/maintenance/${r.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
