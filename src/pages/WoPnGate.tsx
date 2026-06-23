import { useState, useEffect, useMemo } from 'react';
import {
  GitBranch, Search, Plus, Check, Edit3, AlertTriangle,
  AlertCircle, Loader2, Info, X, Calendar, User,
  CheckCircle2, Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  fetchAllReferences,
  fetchProjectsMissingReference,
} from '../lib/executionGate';
import { recordProjectEvent, recordAuditEntry } from '../lib/projectAudit';
import type { Project, ExecutionReference, UserRole } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────────

type GateFilter = 'all' | 'missing' | 'created' | 'confirmed';
type RouteFilter = 'all' | 'saudi' | 'dubai';

const CAN_CREATE_WO: UserRole[] = ['admin', 'operations_manager', 'factory_user'];
const CAN_CREATE_PN: UserRole[] = ['admin', 'operations_manager'];
const CAN_CONFIRM: UserRole[] = ['admin', 'operations_manager'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Add Reference Modal ────────────────────────────────────────────────────────

interface AddReferenceModalProps {
  project: Project;
  type: 'wo' | 'pn';
  onClose: () => void;
  onSuccess: (ref: ExecutionReference) => void;
}

function AddReferenceModal({ project, type, onClose, onSuccess }: AddReferenceModalProps) {
  const { profile, role } = useAuth();
  const [refNumber, setRefNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = type === 'wo' ? 'Work Order (WO)' : 'Part Number (PN)';
  const placeholder = type === 'wo' ? 'e.g. WO-2025-0042' : 'e.g. PN-2025-0019';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!refNumber.trim()) return;
    setSubmitting(true);
    setError(null);

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
        project: {
          project_code: project.project_code,
          so_number: project.so_number,
          customer_name: project.customer_name,
          project_status: project.project_status,
        },
        created_by_profile: { full_name: profile?.full_name ?? null, email: profile?.email ?? '' },
        confirmed_by_profile: null,
      };
      setSubmitting(false);
      onSuccess(newRef);
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

      if (insertErr) {
        if (insertErr.message?.includes('exec_ref_number_type_unique')) {
          throw new Error(`${type.toUpperCase()} number "${refNumber.trim()}" already exists. Use a unique reference number.`);
        }
        if (insertErr.message?.includes('exec_ref_one_active_per_project')) {
          throw new Error(`This project already has an active ${type.toUpperCase()}. Cancel the existing one before adding a new one.`);
        }
        throw insertErr;
      }

      await recordProjectEvent(
        project.id,
        `${type}_created`,
        `${type.toUpperCase()} reference created`,
        `${type.toUpperCase()} number: ${refNumber.trim()}`,
        profile?.id ?? null,
        profile?.full_name ?? null,
        { reference_type: type, reference_number: refNumber.trim() },
      );

      await recordAuditEntry(
        `${type}_created`,
        project.id,
        `${type.toUpperCase()} ${refNumber.trim()} created for project ${project.project_code}`,
        null,
        { reference_type: type, reference_number: refNumber.trim() },
        profile?.id ?? null,
        profile?.email ?? null,
        role,
      );

      onSuccess(data as unknown as ExecutionReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reference');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add {label}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {project.project_code} — {project.customer_name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700">{error}</span>
              </div>
            )}
            {!isSupabaseConfigured && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">Dev mode — reference will not be persisted.</p>
              </div>
            )}
            <div className={`rounded-lg px-3 py-2 text-xs ${type === 'wo' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'}`}>
              {type === 'wo'
                ? 'WO is mandatory before BOQ, BOM, drawings, raw material requests, and production progress.'
                : 'PN is mandatory before Dubai ETA, Dubai PO, AFS readiness, and vehicle arrival tracking.'}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label} Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder={placeholder}
                required
                autoFocus
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Any notes about this reference…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!refNumber.trim()}
              icon={!submitting ? <Plus size={16} /> : undefined}
            >
              Add {type.toUpperCase()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit / Confirm Reference Modal ─────────────────────────────────────────────

interface EditReferenceModalProps {
  reference: ExecutionReference;
  canConfirm: boolean;
  onClose: () => void;
  onSuccess: (updated: ExecutionReference) => void;
}

function EditReferenceModal({ reference, canConfirm, onClose, onSuccess }: EditReferenceModalProps) {
  const { profile, role } = useAuth();
  const [remarks, setRemarks] = useState(reference.remarks ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [superseding, setSuperseding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 300));
      onSuccess({ ...reference, remarks: remarks.trim() || null });
      return;
    }
    try {
      const { data, error: e } = await supabase
        .from('project_execution_references')
        .update({ remarks: remarks.trim() || null })
        .eq('id', reference.id)
        .select()
        .single();
      if (e) throw e;
      await recordProjectEvent(
        reference.project_id,
        `${reference.reference_type}_updated`,
        `${reference.reference_type.toUpperCase()} remarks updated`,
        `${reference.reference_type.toUpperCase()} number: ${reference.reference_number}`,
        profile?.id ?? null, profile?.full_name ?? null,
        { reference_type: reference.reference_type, reference_number: reference.reference_number },
      );
      await recordAuditEntry(
        'execution_reference_updated',
        reference.project_id,
        `${reference.reference_type.toUpperCase()} ${reference.reference_number} remarks updated`,
        { remarks: reference.remarks },
        { remarks: remarks.trim() || null },
        profile?.id ?? null, profile?.email ?? null, role,
      );
      onSuccess(data as unknown as ExecutionReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 400));
      const now = new Date().toISOString();
      onSuccess({
        ...reference,
        status: 'confirmed',
        confirmed_by: profile?.id ?? null,
        confirmed_at: now,
        confirmed_by_profile: { full_name: profile?.full_name ?? null },
      });
      return;
    }
    try {
      const now = new Date().toISOString();
      const { data, error: e } = await supabase
        .from('project_execution_references')
        .update({ status: 'confirmed', confirmed_by: profile?.id ?? null, confirmed_at: now })
        .eq('id', reference.id)
        .select()
        .single();
      if (e) throw e;
      await recordProjectEvent(
        reference.project_id,
        `${reference.reference_type}_confirmed`,
        `${reference.reference_type.toUpperCase()} confirmed`,
        `${reference.reference_type.toUpperCase()} number: ${reference.reference_number}`,
        profile?.id ?? null, profile?.full_name ?? null,
        { reference_type: reference.reference_type, reference_number: reference.reference_number },
      );
      await recordAuditEntry(
        `${reference.reference_type}_confirmed`,
        reference.project_id,
        `${reference.reference_type.toUpperCase()} ${reference.reference_number} confirmed`,
        { status: 'created' }, { status: 'confirmed', confirmed_at: now },
        profile?.id ?? null, profile?.email ?? null, role,
      );
      onSuccess(data as unknown as ExecutionReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
      setConfirming(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 300));
      onSuccess({ ...reference, status: 'cancelled' });
      return;
    }
    try {
      const { data, error: e } = await supabase
        .from('project_execution_references')
        .update({ status: 'cancelled' })
        .eq('id', reference.id)
        .select()
        .single();
      if (e) throw e;
      await recordProjectEvent(
        reference.project_id,
        `${reference.reference_type}_cancelled`,
        `${reference.reference_type.toUpperCase()} cancelled`,
        `${reference.reference_type.toUpperCase()} number: ${reference.reference_number}`,
        profile?.id ?? null, profile?.full_name ?? null,
        { reference_type: reference.reference_type, reference_number: reference.reference_number, previous_status: reference.status },
      );
      await recordAuditEntry(
        `${reference.reference_type}_cancelled`,
        reference.project_id,
        `${reference.reference_type.toUpperCase()} ${reference.reference_number} cancelled`,
        { status: reference.status }, { status: 'cancelled' },
        profile?.id ?? null, profile?.email ?? null, role,
      );
      onSuccess(data as unknown as ExecutionReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
      setCancelling(false);
    }
  }

  async function handleSupersede() {
    setSuperseding(true);
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 300));
      onSuccess({ ...reference, status: 'superseded' });
      return;
    }
    try {
      const { data, error: e } = await supabase
        .from('project_execution_references')
        .update({ status: 'superseded' })
        .eq('id', reference.id)
        .select()
        .single();
      if (e) throw e;
      await recordProjectEvent(
        reference.project_id,
        `${reference.reference_type}_superseded`,
        `${reference.reference_type.toUpperCase()} superseded`,
        `${reference.reference_type.toUpperCase()} number: ${reference.reference_number} — replaced by a new reference`,
        profile?.id ?? null, profile?.full_name ?? null,
        { reference_type: reference.reference_type, reference_number: reference.reference_number, previous_status: reference.status },
      );
      await recordAuditEntry(
        `${reference.reference_type}_superseded`,
        reference.project_id,
        `${reference.reference_type.toUpperCase()} ${reference.reference_number} superseded`,
        { status: reference.status }, { status: 'superseded' },
        profile?.id ?? null, profile?.email ?? null, role,
      );
      onSuccess(data as unknown as ExecutionReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Supersede failed');
      setSuperseding(false);
    }
  }

  const typeLabel = reference.reference_type.toUpperCase();
  const isConfirmed = reference.status === 'confirmed';
  const isActive = reference.status === 'created' || reference.status === 'confirmed';
  const anyBusy = submitting || confirming || cancelling || superseding;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {typeLabel} — {reference.reference_number}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {reference.project?.project_code} — {reference.project?.customer_name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-semibold">{typeLabel}</span>
            <span className="text-gray-500">Number</span>
            <span className="font-mono font-semibold">{reference.reference_number}</span>
            <span className="text-gray-500">Status</span>
            <Badge variant={isConfirmed ? 'success' : 'info'}>{reference.status}</Badge>
            <span className="text-gray-500">Created</span>
            <span className="text-gray-700">{formatDate(reference.created_at)}</span>
            {reference.confirmed_at && (
              <>
                <span className="text-gray-500">Confirmed</span>
                <span className="text-green-700">{formatDate(reference.confirmed_at)}</span>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {canConfirm && isActive && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-red-800">Corrective Actions</p>
              <p className="text-xs text-red-600">
                These actions deactivate this reference. A new reference can then be added for the project.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="danger" onClick={handleCancel}
                  loading={cancelling} disabled={anyBusy && !cancelling}>
                  Cancel Reference
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSupersede}
                  loading={superseding} disabled={anyBusy && !superseding}>
                  Supersede Reference
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={anyBusy}>Close</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSave} loading={submitting}
              disabled={anyBusy && !submitting}>
              Save Remarks
            </Button>
            {canConfirm && !isConfirmed && isActive && (
              <Button onClick={handleConfirm} loading={confirming}
                disabled={anyBusy && !confirming}
                icon={!confirming ? <Check size={16} /> : undefined}>
                Confirm {typeLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Missing project row ────────────────────────────────────────────────────────

interface MissingRowProps {
  project: Project;
  type: 'wo' | 'pn';
  canAdd: boolean;
  onAdd: (project: Project, type: 'wo' | 'pn') => void;
}

function MissingRow({ project, type, canAdd, onAdd }: MissingRowProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle size={16} className="text-red-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{project.project_code}</span>
            <span className="text-sm text-gray-500">{project.so_number}</span>
            <Badge variant={type === 'wo' ? 'default' : 'info'} size="sm">
              {type === 'wo' ? 'Saudi' : 'Dubai'}
            </Badge>
          </div>
          <p className="text-sm text-gray-700 mt-0.5">{project.customer_name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(project.customer_delivery_date)}
            </span>
            {project.sales_owner && (
              <span className="flex items-center gap-1">
                <User size={11} />
                {project.sales_owner.full_name ?? project.sales_owner.email}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <Badge variant="critical" size="sm">{type.toUpperCase()} Missing</Badge>
        <Link to={`/projects/${project.id}`} className="text-xs text-brand-600 hover:underline">View</Link>
        {canAdd && (
          <Button size="sm" icon={<Plus size={14} />} onClick={() => onAdd(project, type)}>
            Add {type.toUpperCase()}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Reference row ──────────────────────────────────────────────────────────────

interface ReferenceRowProps {
  reference: ExecutionReference;
  canEdit: boolean;
  canConfirm: boolean;
  onEdit: (ref: ExecutionReference) => void;
}

function ReferenceRow({ reference, canEdit, canConfirm, onEdit }: ReferenceRowProps) {
  const isConfirmed = reference.status === 'confirmed';
  const type = reference.reference_type;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isConfirmed ? 'bg-green-50' : 'bg-sky-50'
        }`}>
          {isConfirmed
            ? <CheckCircle2 size={16} className="text-green-600" />
            : <Clock size={16} className="text-sky-600" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold font-mono text-gray-900">{reference.reference_number}</span>
            <Badge variant={type === 'wo' ? 'default' : 'info'} size="sm">{type.toUpperCase()}</Badge>
            <Badge variant={isConfirmed ? 'success' : 'neutral'} size="sm">{reference.status}</Badge>
          </div>
          {reference.project && (
            <p className="text-sm text-gray-700 mt-0.5">
              {reference.project.project_code} — {reference.project.customer_name}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            <span>Created {formatDate(reference.created_at)}</span>
            {reference.confirmed_at && (
              <span className="text-green-600">Confirmed {formatDate(reference.confirmed_at)}</span>
            )}
            {reference.created_by_profile && (
              <span className="flex items-center gap-1">
                <User size={11} />
                {reference.created_by_profile.full_name ?? reference.created_by_profile.email}
              </span>
            )}
          </div>
          {reference.remarks && (
            <p className="text-xs text-gray-500 mt-1 italic">{reference.remarks}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {reference.project && (
          <Link to={`/projects/${reference.project_id}`} className="text-xs text-brand-600 hover:underline">
            View
          </Link>
        )}
        {(canEdit || (canConfirm && !isConfirmed)) && (
          <Button size="sm" variant="secondary" icon={<Edit3 size={14} />} onClick={() => onEdit(reference)}>
            {canConfirm && !isConfirmed ? 'Confirm / Edit' : 'Edit'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function WoPnGate() {
  const { role } = useAuth();

  const [missingWO, setMissingWO] = useState<Project[]>([]);
  const [missingPN, setMissingPN] = useState<Project[]>([]);
  const [references, setReferences] = useState<ExecutionReference[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all');
  const [gateFilter, setGateFilter] = useState<GateFilter>('all');

  const [addTarget, setAddTarget] = useState<{ project: Project; type: 'wo' | 'pn' } | null>(null);
  const [editTarget, setEditTarget] = useState<ExecutionReference | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canAddWO = role ? CAN_CREATE_WO.includes(role) : false;
  const canAddPN = role ? CAN_CREATE_PN.includes(role) : false;
  const canConfirm = role ? CAN_CONFIRM.includes(role) : false;

  async function loadData() {
    setLoading(true);
    const [wo, pn, refs] = await Promise.all([
      fetchProjectsMissingReference('wo'),
      fetchProjectsMissingReference('pn'),
      fetchAllReferences(),
    ]);
    setMissingWO(wo);
    setMissingPN(pn);
    setReferences(refs);
    setLoading(false);
  }

  useEffect(() => { Promise.resolve().then(() => { loadData(); }); }, []);

  const filteredRefs = useMemo(() => {
    let list = references;
    if (routeFilter !== 'all') list = list.filter((r) => r.manufacturing_location === routeFilter);
    if (gateFilter === 'created') list = list.filter((r) => r.status === 'created');
    else if (gateFilter === 'confirmed') list = list.filter((r) => r.status === 'confirmed');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.reference_number.toLowerCase().includes(q) ||
        r.project?.project_code?.toLowerCase().includes(q) ||
        r.project?.so_number?.toLowerCase().includes(q) ||
        r.project?.customer_name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [references, routeFilter, gateFilter, search]);

  const filteredMissingWO = useMemo(() => {
    if (gateFilter === 'created' || gateFilter === 'confirmed') return [];
    if (routeFilter === 'dubai') return [];
    if (!search.trim()) return missingWO;
    const q = search.toLowerCase();
    return missingWO.filter((p) =>
      p.project_code.toLowerCase().includes(q) ||
      p.so_number.toLowerCase().includes(q) ||
      p.customer_name.toLowerCase().includes(q),
    );
  }, [missingWO, gateFilter, routeFilter, search]);

  const filteredMissingPN = useMemo(() => {
    if (gateFilter === 'created' || gateFilter === 'confirmed') return [];
    if (routeFilter === 'saudi') return [];
    if (!search.trim()) return missingPN;
    const q = search.toLowerCase();
    return missingPN.filter((p) =>
      p.project_code.toLowerCase().includes(q) ||
      p.so_number.toLowerCase().includes(q) ||
      p.customer_name.toLowerCase().includes(q),
    );
  }, [missingPN, gateFilter, routeFilter, search]);

  function handleAddSuccess(ref: ExecutionReference) {
    setAddTarget(null);
    setReferences((prev) => [ref, ...prev]);
    if (ref.reference_type === 'wo') {
      setMissingWO((prev) => prev.filter((p) => p.id !== ref.project_id));
    } else {
      setMissingPN((prev) => prev.filter((p) => p.id !== ref.project_id));
    }
    showSuccess(`${ref.reference_type.toUpperCase()} ${ref.reference_number} added.${!isSupabaseConfigured ? ' (dev mode — not persisted)' : ''}`);
  }

  function handleEditSuccess(updated: ExecutionReference) {
    setEditTarget(null);
    if (updated.status === 'cancelled' || updated.status === 'superseded') {
      loadData();
      showSuccess(
        `${updated.reference_type.toUpperCase()} ${updated.reference_number} ${updated.status}. `
        + `A new reference can now be added for the project.`
        + (!isSupabaseConfigured ? ' (dev mode — not persisted)' : ''),
      );
    } else if (updated.status === 'confirmed') {
      setReferences((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showSuccess(`${updated.reference_type.toUpperCase()} ${updated.reference_number} confirmed.${!isSupabaseConfigured ? ' (dev mode)' : ''}`);
    } else {
      setReferences((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showSuccess('Remarks updated.');
    }
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  const totalMissing = missingWO.length + missingPN.length;
  const nothingVisible =
    filteredMissingWO.length === 0 &&
    filteredMissingPN.length === 0 &&
    filteredRefs.length === 0;

  return (
    <div>
      <PageHeader
        title="WO / PN Gate"
        subtitle="Execution reference gate — unlock factory and Dubai follow-up workflows"
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: 'Missing WO', value: missingWO.length,
            color: missingWO.length > 0 ? 'text-red-600' : 'text-green-600',
            bg: missingWO.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200',
          },
          {
            label: 'Missing PN', value: missingPN.length,
            color: missingPN.length > 0 ? 'text-red-600' : 'text-green-600',
            bg: missingPN.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200',
          },
          {
            label: 'WO Created', value: references.filter((r) => r.reference_type === 'wo').length,
            color: 'text-brand-700', bg: 'bg-brand-50 border-brand-200',
          },
          {
            label: 'PN Created', value: references.filter((r) => r.reference_type === 'pn').length,
            color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200',
          },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border p-3 text-center ${item.bg}`}>
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <Check size={15} className="text-green-600 shrink-0" />
          <span className="text-sm text-green-800">{successMsg}</span>
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Dev Mode</strong> — Showing mock data. Add / Confirm actions succeed but are not persisted.
          </p>
        </div>
      )}

      {/* Governance banner */}
      <Card className="p-4 mb-5 bg-brand-950 border-brand-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-brand-200">
          <div className="flex items-start gap-2">
            <span className="text-brand-400 shrink-0">▸</span>
            <span><strong className="text-brand-100">Saudi route:</strong> WO mandatory before BOQ, BOM, drawings, raw material requests, production progress, and Send to QC.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-brand-400 shrink-0">▸</span>
            <span><strong className="text-brand-100">Dubai route:</strong> PN mandatory before Dubai ETA, Dubai PO, AFS readiness, vehicle arrival, and Dubai follow-up.</span>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search project, SO, WO/PN number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value as RouteFilter)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Routes</option>
          <option value="saudi">Saudi</option>
          <option value="dubai">Dubai</option>
        </select>
        <select
          value={gateFilter}
          onChange={(e) => setGateFilter(e.target.value as GateFilter)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="missing">Missing</option>
          <option value="created">Created</option>
          <option value="confirmed">Confirmed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-brand-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredMissingWO.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={15} />
                Saudi Projects Missing WO ({filteredMissingWO.length})
              </h3>
              <div className="space-y-2">
                {filteredMissingWO.map((p) => (
                  <MissingRow key={p.id} project={p} type="wo" canAdd={canAddWO}
                    onAdd={(proj, t) => setAddTarget({ project: proj, type: t })} />
                ))}
              </div>
            </section>
          )}

          {filteredMissingPN.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={15} />
                Dubai Projects Missing PN ({filteredMissingPN.length})
              </h3>
              <div className="space-y-2">
                {filteredMissingPN.map((p) => (
                  <MissingRow key={p.id} project={p} type="pn" canAdd={canAddPN}
                    onAdd={(proj, t) => setAddTarget({ project: proj, type: t })} />
                ))}
              </div>
            </section>
          )}

          {filteredRefs.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <GitBranch size={15} />
                Execution References ({filteredRefs.length})
              </h3>
              <div className="space-y-2">
                {filteredRefs.map((ref) => (
                  <ReferenceRow key={ref.id} reference={ref}
                    canEdit={canAddWO || canAddPN} canConfirm={canConfirm}
                    onEdit={(r) => setEditTarget(r)} />
                ))}
              </div>
            </section>
          )}

          {nothingVisible && (
            <EmptyState
              icon={<GitBranch size={32} />}
              title={totalMissing === 0 ? 'All execution references are in order' : 'No results match the current filters'}
              description={totalMissing === 0
                ? 'No approved projects are missing WO or PN references.'
                : 'Try adjusting the route or status filters.'}
            />
          )}
        </div>
      )}

      {addTarget && (
        <AddReferenceModal project={addTarget.project} type={addTarget.type}
          onClose={() => setAddTarget(null)} onSuccess={handleAddSuccess} />
      )}
      {editTarget && (
        <EditReferenceModal reference={editTarget} canConfirm={canConfirm}
          onClose={() => setEditTarget(null)} onSuccess={handleEditSuccess} />
      )}
    </div>
  );
}
