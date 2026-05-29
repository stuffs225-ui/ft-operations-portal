import { useState, useEffect } from 'react';
import {
  CheckSquare, Loader2, Check, RotateCcw, X,
  AlertCircle, Info, Calendar, User, MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordProjectEvent, recordAuditEntry } from '../lib/projectAudit';
import { MOCK_PROJECTS } from '../data/mockProjects';
import type { Project, ManufacturingLocation, MedicalItems } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

type ApprovalTab = 'pending' | 'sent_back' | 'rejected';

const TABS: { key: ApprovalTab; label: string; statuses: string[] }[] = [
  { key: 'pending',    label: 'Pending Approval', statuses: ['submitted_for_approval'] },
  { key: 'sent_back', label: 'Sent Back',         statuses: ['sent_back_for_revision'] },
  { key: 'rejected',  label: 'Rejected',          statuses: ['rejected'] },
];

function formatSAR(n: number) {
  return 'SAR ' + n.toLocaleString('en-SA', { minimumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Approve / Route modal ──────────────────────────────────────────────────────

interface ApproveModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

function ApproveModal({ project, onClose, onSuccess }: ApproveModalProps) {
  const { profile, role } = useAuth();
  const [location, setLocation] = useState<ManufacturingLocation>(
    project.manufacturing_location === 'not_set' ? 'saudi' : project.manufacturing_location,
  );
  const [medical, setMedical] = useState<MedicalItems>(
    project.medical_items === 'not_set' ? 'no' : project.medical_items,
  );
  const [routes, setRoutes] = useState({
    procurement: true,
    factory: true,
    store: true,
    material_qc: false,
    project_qc: true,
    dubai_afs: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-check based on selections
  function handleLocationChange(loc: ManufacturingLocation) {
    setLocation(loc);
    setRoutes((r) => ({ ...r, dubai_afs: loc === 'dubai' }));
  }

  function handleMedicalChange(med: MedicalItems) {
    setMedical(med);
    setRoutes((r) => ({ ...r, material_qc: med === 'yes' }));
  }

  async function handleApprove() {
    setSubmitting(true);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 500));
      setSubmitting(false);
      onSuccess();
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('projects')
        .update({
          project_status: 'approved',
          manufacturing_location: location,
          medical_items: medical,
          approved_at: now,
          approved_by: profile?.id ?? null,
        })
        .eq('id', project.id);

      if (updateErr) throw updateErr;

      await recordProjectEvent(
        project.id,
        'approved',
        'Project approved',
        `Route: ${location} | Medical: ${medical} | Departments: ${Object.entries(routes)
          .filter(([, v]) => v)
          .map(([k]) => k.replace('_', ' '))
          .join(', ')}`,
        profile?.id ?? null,
        profile?.full_name ?? null,
        { manufacturing_location: location, medical_items: medical, routing: routes },
      );

      await recordAuditEntry(
        'project_approved',
        project.id,
        `Project ${project.project_code} approved`,
        { project_status: 'submitted_for_approval' },
        { project_status: 'approved', manufacturing_location: location, medical_items: medical },
        profile?.id ?? null,
        profile?.email ?? null,
        role,
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve project');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Approve & Route Project</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{project.project_code} — {project.customer_name}</p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Dev mode — approval will not be persisted.</p>
            </div>
          )}

          {/* Manufacturing Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Manufacturing Location</label>
            <div className="grid grid-cols-2 gap-2">
              {(['saudi', 'dubai'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLocationChange(loc)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    location === loc
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {loc === 'saudi' ? 'Saudi Arabia' : 'Dubai / UAE'}
                </button>
              ))}
            </div>
            {location === 'saudi' && (
              <p className="mt-2 text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2">
                <strong>Gate:</strong> Work Order (WO) is mandatory before factory execution can begin.
              </p>
            )}
            {location === 'dubai' && (
              <p className="mt-2 text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2">
                <strong>Gate:</strong> Part Number (PN) is mandatory before Dubai follow-up can begin.
              </p>
            )}
          </div>

          {/* Medical Items */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Medical Items</label>
            <div className="grid grid-cols-2 gap-2">
              {(['yes', 'no'] as const).map((med) => (
                <button
                  key={med}
                  onClick={() => handleMedicalChange(med)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    medical === med
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {med === 'yes' ? 'Yes — Medical' : 'No — Non-Medical'}
                </button>
              ))}
            </div>
            {medical === 'yes' && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Medical items require serial number tracking per governance rules.
              </p>
            )}
          </div>

          {/* Department Routing */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Department Routing</label>
            <div className="space-y-2">
              {[
                { key: 'procurement', label: 'Procurement' },
                { key: 'factory', label: 'Factory / Production' },
                { key: 'store', label: 'Store / Warehouse' },
                { key: 'material_qc', label: 'Material QC (auto-checked for Medical items)' },
                { key: 'project_qc', label: 'Project QC' },
                { key: 'dubai_afs', label: 'Dubai / AFS (auto-checked for Dubai route)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={routes[key as keyof typeof routes]}
                    onChange={(e) => setRoutes((r) => ({ ...r, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleApprove} loading={submitting} icon={!submitting ? <Check size={16} /> : undefined}>
            Approve Project
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Send Back modal ────────────────────────────────────────────────────────────

interface SendBackModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

function SendBackModal({ project, onClose, onSuccess }: SendBackModalProps) {
  const { profile, role } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendBack(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setSubmitting(false);
      onSuccess();
      return;
    }

    try {
      const { error: updateErr } = await supabase
        .from('projects')
        .update({ project_status: 'sent_back_for_revision', revision_reason: reason.trim() })
        .eq('id', project.id);
      if (updateErr) throw updateErr;

      await recordProjectEvent(
        project.id,
        'sent_back_for_revision',
        'Sent back for revision',
        reason.trim(),
        profile?.id ?? null,
        profile?.full_name ?? null,
      );

      await recordAuditEntry(
        'project_sent_back',
        project.id,
        `Project ${project.project_code} sent back for revision`,
        { project_status: 'submitted_for_approval' },
        { project_status: 'sent_back_for_revision', revision_reason: reason.trim() },
        profile?.id ?? null,
        profile?.email ?? null,
        role,
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send back project');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Send Back for Revision</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{project.project_code} — {project.customer_name}</p>
        </div>
        <form onSubmit={handleSendBack}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700">{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Revision Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                placeholder="Describe what needs to be revised…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="secondary" loading={submitting} disabled={!reason.trim()}>
              Send Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reject modal ───────────────────────────────────────────────────────────────

interface RejectModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

function RejectModal({ project, onClose, onSuccess }: RejectModalProps) {
  const { profile, role } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setSubmitting(false);
      onSuccess();
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('projects')
        .update({
          project_status: 'rejected',
          rejection_reason: reason.trim(),
          rejected_at: now,
          rejected_by: profile?.id ?? null,
        })
        .eq('id', project.id);
      if (updateErr) throw updateErr;

      await recordProjectEvent(
        project.id,
        'rejected',
        'Project rejected',
        reason.trim(),
        profile?.id ?? null,
        profile?.full_name ?? null,
      );

      await recordAuditEntry(
        'project_rejected',
        project.id,
        `Project ${project.project_code} rejected`,
        { project_status: 'submitted_for_approval' },
        { project_status: 'rejected', rejection_reason: reason.trim() },
        profile?.id ?? null,
        profile?.email ?? null,
        role,
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject project');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 text-red-700">Reject Project</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{project.project_code} — {project.customer_name}</p>
        </div>
        <form onSubmit={handleReject}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700">{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                placeholder="Describe why this project is being rejected…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="danger" loading={submitting} disabled={!reason.trim()}>
              Reject Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Project row ────────────────────────────────────────────────────────────────

interface ProjectRowProps {
  project: Project;
  onApprove: (p: Project) => void;
  onSendBack: (p: Project) => void;
  onReject: (p: Project) => void;
}

function ProjectRow({ project, onApprove, onSendBack, onReject }: ProjectRowProps) {
  const isPending = project.project_status === 'submitted_for_approval';
  const isSentBack = project.project_status === 'sent_back_for_revision';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{project.project_code}</span>
            <span className="text-gray-400 text-sm">·</span>
            <span className="text-sm text-gray-600">{project.so_number}</span>
            {project.medical_items === 'yes' && (
              <Badge variant="warning" size="sm">Medical</Badge>
            )}
          </div>
          <p className="text-sm font-medium text-gray-800 mt-1">{project.customer_name}</p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
            {project.submitted_at && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Submitted {formatDate(project.submitted_at)}
              </span>
            )}
            {project.manufacturing_location !== 'not_set' && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {project.manufacturing_location === 'saudi' ? 'Saudi' : 'Dubai'}
              </span>
            )}
            {project.sales_owner && (
              <span className="flex items-center gap-1">
                <User size={12} />
                {project.sales_owner.full_name ?? project.sales_owner.email}
              </span>
            )}
          </div>

          {/* Total value */}
          <div className="mt-2">
            <span className="text-sm font-semibold text-gray-900">{formatSAR(project.total_sales_value)}</span>
          </div>

          {/* Revision / Rejection reason */}
          {isSentBack && project.revision_reason && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold">Revision note:</span> {project.revision_reason}
            </div>
          )}
          {project.project_status === 'rejected' && project.rejection_reason && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
              <span className="font-semibold">Rejection reason:</span> {project.rejection_reason}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link
            to={`/projects/${project.id}`}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
          >
            View detail
          </Link>
          {isPending && (
            <div className="flex flex-col gap-1.5">
              <Button size="sm" icon={<Check size={14} />} onClick={() => onApprove(project)}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" icon={<RotateCcw size={14} />} onClick={() => onSendBack(project)}>
                Send Back
              </Button>
              <Button size="sm" variant="danger" icon={<X size={14} />} onClick={() => onReject(project)}>
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdminApprovals() {
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const [approveTarget, setApproveTarget] = useState<Project | null>(null);
  const [sendBackTarget, setSendBackTarget] = useState<Project | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Project | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function loadProjects() {
    if (!isSupabaseConfigured || !supabase) {
      setProjects(MOCK_PROJECTS);
      return;
    }
    setLoading(true);
    supabase
      .from('projects')
      .select('*, sales_owner:profiles!projects_sales_owner_id_fkey(full_name, email)')
      .in('project_status', ['submitted_for_approval', 'sent_back_for_revision', 'rejected'])
      .order('submitted_at', { ascending: true })
      .then(({ data }) => {
        if (data) setProjects(data as unknown as Project[]);
        setLoading(false);
      });
  }

  useEffect(() => { loadProjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabProjects = projects.filter((p) =>
    TABS.find((t) => t.key === activeTab)?.statuses.includes(p.project_status),
  );

  function handleSuccess(msg: string) {
    setApproveTarget(null);
    setSendBackTarget(null);
    setRejectTarget(null);
    setSuccessMsg(msg);
    loadProjects();
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  return (
    <div>
      <PageHeader
        title="Admin Approvals"
        subtitle="SO approval queue, routing decisions, and rejection history"
        icon={<CheckSquare size={18} />}
      />

      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-5">
          <Check size={15} className="text-green-600 shrink-0" />
          <span className="text-sm text-green-800">{successMsg}</span>
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Dev Mode</span> — Showing mock data. Approve/Reject/Send Back actions will succeed but not be persisted.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-5">
        {TABS.map((tab) => {
          const count = projects.filter((p) => tab.statuses.includes(p.project_status)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-brand-500 animate-spin" />
        </div>
      ) : tabProjects.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          title={activeTab === 'pending' ? 'No pending approvals' : activeTab === 'sent_back' ? 'No projects sent back' : 'No rejected projects'}
          description={
            activeTab === 'pending'
              ? 'All submitted projects have been reviewed.'
              : activeTab === 'sent_back'
              ? 'No projects are currently awaiting revision.'
              : 'No projects have been rejected.'
          }
        />
      ) : (
        <div className="space-y-3">
          {tabProjects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onApprove={(p) => setApproveTarget(p)}
              onSendBack={(p) => setSendBackTarget(p)}
              onReject={(p) => setRejectTarget(p)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {approveTarget && (
        <ApproveModal
          project={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSuccess={() => handleSuccess(`Project ${approveTarget.project_code} approved successfully.`)}
        />
      )}
      {sendBackTarget && (
        <SendBackModal
          project={sendBackTarget}
          onClose={() => setSendBackTarget(null)}
          onSuccess={() => handleSuccess(`Project ${sendBackTarget.project_code} sent back for revision.`)}
        />
      )}
      {rejectTarget && (
        <RejectModal
          project={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={() => handleSuccess(`Project ${rejectTarget.project_code} rejected.`)}
        />
      )}
    </div>
  );
}
