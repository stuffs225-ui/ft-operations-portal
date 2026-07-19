import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Wrench, ArrowLeft, Loader2, AlertTriangle, FileText,
  Package, Clock, List, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordFactoryEvent } from '../lib/factoryAudit';
import { FactoryRecordSteps } from '../components/features/FactoryRecordSteps';
import { deriveProductionStatus, statusReason } from '../lib/factoryStatus';
import {
  getMockFactoryRecordsForProject,
  getMockRequirementsForProject,
  getMockRMRsForProject,
  MOCK_REQUIREMENT_TYPES as MOCK_REQUIREMENT_TYPES_RAW,
} from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';
const MOCK_REQUIREMENT_TYPES = mockOrEmpty(MOCK_REQUIREMENT_TYPES_RAW);
import { MOCK_PROJECTS, MOCK_VEHICLE_LINES } from '../data/mockProjects';
import { fetchProjectReferences } from '../lib/executionGate';
import type {
  Project,
  ProjectVehicleLine,
  FactoryRecord,
  FactoryItemRequirement,
  FactoryRequirementType,
  RawMaterialRequest,
  ExecutionReference,
  FactoryProductionStatus,
  FactoryReqStatus,
  UserRole,
} from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const PROD_STATUS_MAP: Record<FactoryProductionStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  not_started:              { label: 'Not Started',            variant: 'neutral' },
  details_requested:        { label: 'Details Requested',      variant: 'info' },
  boq_pending:              { label: 'BOQ Pending',            variant: 'warning' },
  boq_uploaded:             { label: 'BOQ Uploaded',           variant: 'info' },
  ga_drawing_pending:       { label: 'GA Pending',             variant: 'warning' },
  ga_drawing_uploaded:      { label: 'GA Uploaded',            variant: 'info' },
  detail_drawings_pending:  { label: 'Drawings Pending',       variant: 'warning' },
  detail_drawings_uploaded: { label: 'Drawings Uploaded',      variant: 'info' },
  manhours_pending:         { label: 'Manhours Pending',       variant: 'warning' },
  manhours_added:           { label: 'Manhours Added',         variant: 'info' },
  pending_raw_materials:    { label: 'Pending Raw Materials',  variant: 'warning' },
  in_production:            { label: 'In Production',          variant: 'default' },
  monthly_update_required:  { label: 'Update Required',        variant: 'critical' },
  production_completed:     { label: 'Completed',              variant: 'success' },
  sent_to_qc:               { label: 'Sent to QC',            variant: 'success' },
  on_hold:                  { label: 'On Hold',                variant: 'neutral' },
};

const REQ_STATUS_MAP: Record<FactoryReqStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  pending:        { label: 'Pending',     variant: 'neutral' },
  in_progress:    { label: 'In Progress', variant: 'warning' },
  uploaded:       { label: 'Uploaded',    variant: 'info' },
  approved:       { label: 'Approved',    variant: 'success' },
  rejected:       { label: 'Rejected',    variant: 'critical' },
  not_applicable: { label: 'N/A',         variant: 'neutral' },
};

type TabKey = 'overview' | 'lines' | 'requirements' | 'rmr' | 'timeline';

const FACTORY_EDIT_ROLES: UserRole[] = ['admin', 'operations_manager', 'factory_user'];

interface LineEditState {
  production_status: FactoryProductionStatus;
  progress_percentage: number;
  expected_completion_date: string;
  remarks: string;
}

function WoGateAlert() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-900">WO Required — Factory execution is blocked</p>
        <p className="text-xs text-amber-700 mt-1">
          A Work Order (WO) must be created for this project before any factory actions can proceed.
        </p>
        <Link to="/wo-pn-gate" className="text-xs font-medium text-amber-800 underline mt-1 inline-block">
          Go to WO / PN Gate →
        </Link>
      </div>
    </div>
  );
}

export function FactoryProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { role, profile } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [vehicleLines, setVehicleLines] = useState<ProjectVehicleLine[]>([]);
  const [factoryRecords, setFactoryRecords] = useState<FactoryRecord[]>([]);
  const [requirements, setRequirements] = useState<FactoryItemRequirement[]>([]);
  const [reqTypes, setReqTypes] = useState<FactoryRequirementType[]>([]);
  const [rmrs, setRmrs] = useState<RawMaterialRequest[]>([]);
  const [references, setReferences] = useState<ExecutionReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [generatingReqs, setGeneratingReqs] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Line edit states
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineEditState, setLineEditState] = useState<LineEditState>({
    production_status: 'not_started',
    progress_percentage: 0,
    expected_completion_date: '',
    remarks: '',
  });
  const [lineSaving, setLineSaving] = useState(false);
  const [lineDevSuccess, setLineDevSuccess] = useState('');
  const [creatingLineId, setCreatingLineId] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);
  const [stepsRecordId, setStepsRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) { Promise.resolve().then(() => { setNotFound(true); setLoading(false); }); return; }

    if (!isSupabaseConfigured) {
      Promise.resolve().then(() => {
        const found = MOCK_PROJECTS.find((p) => p.id === projectId);
        if (!found || found.manufacturing_location !== 'saudi') {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProject(found);
        setVehicleLines(MOCK_VEHICLE_LINES[projectId] ?? []);
        setFactoryRecords(getMockFactoryRecordsForProject(projectId));
        setRequirements(getMockRequirementsForProject(projectId));
        setReqTypes(MOCK_REQUIREMENT_TYPES as FactoryRequirementType[]);
        setRmrs(getMockRMRsForProject(projectId));
        fetchProjectReferences(projectId).then((refs) => { setReferences(refs ?? []); });
        setLoading(false);
      });
      return;
    }

    // Supabase mode
    Promise.all([
      supabase!.from('projects').select('*').eq('id', projectId).single(),
      supabase!.from('project_vehicle_lines').select('*').eq('project_id', projectId).order('line_number'),
      supabase!.from('factory_records').select('*').eq('project_id', projectId),
      supabase!.from('factory_item_requirements').select('*, requirement_type:factory_requirement_types(*)').eq('project_id', projectId),
      supabase!.from('production_raw_material_requests').select('*').eq('project_id', projectId),
      supabase!.from('factory_requirement_types').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([projRes, linesRes, recordsRes, reqsRes, rmrsRes, typesRes]) => {
      if (projRes.error || !projRes.data) { setNotFound(true); setLoading(false); return; }
      const p = projRes.data as unknown as Project;
      if (p.manufacturing_location !== 'saudi') { setNotFound(true); setLoading(false); return; }
      setProject(p);
      setVehicleLines((linesRes.data as unknown as ProjectVehicleLine[]) ?? []);
      setFactoryRecords((recordsRes.data as unknown as FactoryRecord[]) ?? []);
      setRequirements((reqsRes.data as unknown as FactoryItemRequirement[]) ?? []);
      setRmrs((rmrsRes.data as unknown as RawMaterialRequest[]) ?? []);
      setReqTypes((typesRes.data as unknown as FactoryRequirementType[]) ?? []);
      fetchProjectReferences(projectId).then((refs) => { setReferences(refs ?? []); });
      setLoading(false);
    });
  }, [projectId, reloadKey]);

  // A WO unblocks the factory as soon as it exists and is not cancelled/superseded
  // — i.e. status 'created' OR 'confirmed'. This matches the DB rule that actually
  // enforces R-005 (project_has_wo, migration 014, accepts 'created','confirmed')
  // and the project Execution Gate (executionGate.ts). Requiring 'confirmed' here
  // made the factory stricter than the enforced rule, so a valid 'created' WO
  // showed as "No WO — blocked".
  const activeWO = references.find(
    (r) => r.reference_type === 'wo' && r.status !== 'cancelled' && r.status !== 'superseded',
  );
  const hasWO = !!activeWO;
  const canEdit = !!role && FACTORY_EDIT_ROLES.includes(role) && hasWO;

  function startEditLine(record: FactoryRecord) {
    setEditingLineId(record.id);
    setLineEditState({
      production_status: record.production_status,
      progress_percentage: record.progress_percentage,
      expected_completion_date: record.expected_completion_date ?? '',
      remarks: record.remarks ?? '',
    });
    setLineDevSuccess('');
  }

  function cancelEditLine() {
    setEditingLineId(null);
    setLineDevSuccess('');
  }

  function saveLineEdit(record: FactoryRecord) {
    setLineSaving(true);
    if (!isSupabaseConfigured || !supabase) {
      // Dev mode — update local state
      setFactoryRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? {
                ...r,
                expected_completion_date: lineEditState.expected_completion_date || null,
                remarks: lineEditState.remarks || null,
              }
            : r,
        ),
      );
      setLineSaving(false);
      setLineDevSuccess('Dev mode — changes not persisted');
      setEditingLineId(null);
      return;
    }
    // Status and progress are derived automatically (requirements + steps); this
    // manual save only carries the planning fields.
    const updates = {
      expected_completion_date: lineEditState.expected_completion_date || null,
      remarks: lineEditState.remarks || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from('factory_records').update(updates as any).eq('id', record.id).then(() => {
      setFactoryRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, ...updates } : r)),
      );
      recordFactoryEvent('factory_record', record.id, record.project_id, 'factory_record_updated', 'Factory record updated', null, updates);
      setLineSaving(false);
      setEditingLineId(null);
    });
  }

  // Create a production record for a vehicle line so the factory can start
  // tracking it. The DB gate (R-005, migration 089) requires an active WO, which
  // `canEdit` already guarantees (canEdit ⇒ hasWO). The record starts at
  // 'not_started' / 0% and the line moves from "Not set up" to editable.
  async function handleCreateRecord(line: ProjectVehicleLine) {
    if (!activeWO || !projectId) return;
    setCreatingLineId(line.id);
    setLineError(null);
    setLineDevSuccess('');

    if (!isSupabaseConfigured || !supabase) {
      const local = {
        id: `dev-${line.id}`,
        project_id: projectId,
        project_vehicle_line_id: line.id,
        wo_reference_id: activeWO.id,
        production_status: 'not_started',
        progress_percentage: 0,
        expected_completion_date: null,
        actual_completion_date: null,
        monthly_update_required: false,
        remarks: null,
      } as unknown as FactoryRecord;
      setFactoryRecords((prev) => [...prev, local]);
      setCreatingLineId(null);
      setLineDevSuccess('Dev mode — changes not persisted');
      return;
    }

    const { data, error } = await supabase
      .from('factory_records')
      .insert({
        project_id: projectId,
        project_vehicle_line_id: line.id,
        wo_reference_id: activeWO.id,
        production_status: 'not_started',
      })
      .select('*')
      .single();

    if (error) {
      setLineError(error.message);
      setCreatingLineId(null);
      return;
    }
    const created = data as unknown as FactoryRecord;
    setFactoryRecords((prev) => [...prev, created]);
    recordFactoryEvent(
      'factory_record', created.id, projectId,
      'factory_record_created',
      `Production record created for ${line.vehicle_type}`,
      null,
      { project_vehicle_line_id: line.id, wo_reference_id: activeWO.id },
    );
    setCreatingLineId(null);
  }

  // Seed the project's requirements checklist (BOQ / BOM / GA / Detail / Manhours…)
  // from the active requirement types. These rows are read across the Factory module
  // but were never created anywhere — the list stayed permanently empty. Idempotent:
  // only the requirement types not already present (project-level) are inserted, so
  // the button is safe to press again to pick up newly added types. `canEdit`
  // already guarantees a factory role + an active WO (the R-005 governance).
  async function handleGenerateRequirements() {
    if (!projectId) return;
    setGeneratingReqs(true);
    setReqError(null);

    const existingTypeIds = new Set(
      requirements.filter((r) => !r.project_vehicle_line_id).map((r) => r.requirement_type_id),
    );
    const missing = reqTypes.filter((t) => !existingTypeIds.has(t.id));
    if (missing.length === 0) { setGeneratingReqs(false); return; }

    if (!isSupabaseConfigured || !supabase) {
      const local = missing.map((t) => ({
        id: `dev-req-${t.id}`,
        project_id: projectId,
        project_vehicle_line_id: null,
        requirement_type_id: t.id,
        status: 'pending',
        requirement_type: t,
      })) as unknown as FactoryItemRequirement[];
      setRequirements((prev) => [...prev, ...local]);
      setGeneratingReqs(false);
      return;
    }

    const { error } = await supabase.from('factory_item_requirements').insert(
      missing.map((t) => ({
        project_id: projectId,
        requirement_type_id: t.id,
        status: 'pending' as FactoryReqStatus,
      })),
    );
    if (error) { setReqError(error.message); setGeneratingReqs(false); return; }
    recordFactoryEvent(
      'factory_item_requirement', projectId, projectId,
      'requirements_checklist_generated',
      `Generated ${missing.length} requirement${missing.length !== 1 ? 's' : ''} for the project checklist`,
      null,
      { requirement_type_ids: missing.map((t) => t.id) },
    );
    setGeneratingReqs(false);
    setReloadKey((k) => k + 1);
  }

  // Requirements that gate a given record: project-level ones + any for its own line.
  function requirementsForRecord(record: FactoryRecord): FactoryItemRequirement[] {
    return requirements.filter(
      (r) => !r.project_vehicle_line_id || r.project_vehicle_line_id === record.project_vehicle_line_id,
    );
  }

  // Recompute the record's production_status from real facts (requirements + progress)
  // and persist it if it changed. This is what makes the status automatic — there is
  // no manual status control any more.
  async function persistDerivedStatus(record: FactoryRecord, progressOverride?: number) {
    const progress = progressOverride ?? record.progress_percentage;
    const next = deriveProductionStatus(progress, requirementsForRecord(record), record.production_status);
    if (next === record.production_status && progressOverride === undefined) return;
    setFactoryRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, production_status: next, progress_percentage: progress } : r)));
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('factory_records')
      .update({ production_status: next, progress_percentage: progress })
      .eq('id', record.id);
  }

  // Factory user records a requirement's state/value; the record's status re-derives.
  async function handleSetRequirement(req: FactoryItemRequirement, patch: Partial<FactoryItemRequirement>) {
    const updated = { ...req, ...patch };
    setRequirements((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
    if (isSupabaseConfigured && supabase) {
      const payload = {
        ...patch,
        uploaded_at: patch.status === 'uploaded' || patch.status === 'approved' ? new Date().toISOString() : req.uploaded_at,
        uploaded_by: profile?.id ?? null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('factory_item_requirements').update(payload as any).eq('id', req.id);
    }
    // Re-derive status for records this requirement gates.
    const affected = factoryRecords.filter(
      (rec) => !req.project_vehicle_line_id || rec.project_vehicle_line_id === req.project_vehicle_line_id,
    );
    for (const rec of affected) {
      const nextReqs = requirementsForRecord(rec).map((r) => (r.id === req.id ? updated : r));
      const next = deriveProductionStatus(rec.progress_percentage, nextReqs, rec.production_status);
      if (next !== rec.production_status) {
        setFactoryRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, production_status: next } : r)));
        if (isSupabaseConfigured && supabase) {
          await supabase.from('factory_records').update({ production_status: next }).eq('id', rec.id);
        }
      }
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <List size={14} /> },
    { key: 'lines', label: 'Vehicle Lines', icon: <Wrench size={14} /> },
    { key: 'requirements', label: 'Requirements', icon: <FileText size={14} /> },
    { key: 'rmr', label: 'Raw Material Requests', icon: <Package size={14} /> },
    { key: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="p-6">
        <Link to="/factory/projects" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Back to Factory Projects
        </Link>
        <Card className="p-8 text-center">
          <AlertTriangle size={24} className="text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">Project not found or not a Saudi factory project.</p>
        </Card>
      </div>
    );
  }

  const avgProgress =
    factoryRecords.length > 0
      ? Math.round(factoryRecords.reduce((s, r) => s + r.progress_percentage, 0) / factoryRecords.length)
      : 0;

  const monthlyUpdateCount = factoryRecords.filter((r) => r.monthly_update_required).length;

  // Group requirements by vehicle line
  const reqsByLine: Record<string, FactoryItemRequirement[]> = {};
  requirements.forEach((req) => {
    const key = req.project_vehicle_line_id ?? '__project__';
    if (!reqsByLine[key]) reqsByLine[key] = [];
    reqsByLine[key].push(req);
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Link to="/factory/projects" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Factory Projects
        </Link>
      </div>

      <PageHeader
        title={`${project.project_code} — Factory Workspace`}
        subtitle={`${project.customer_name} | ${project.so_number}`}
        icon={<Wrench size={18} />}
        breadcrumb={[
          { label: 'Factory', path: '/factory' },
          { label: 'Projects', path: '/factory/projects' },
          { label: project.project_code },
        ]}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          Dev mode — using mock factory data. Changes will not be persisted.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Project Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-gray-500">Project Code</p>
                <p className="font-mono font-semibold text-gray-900 mt-0.5">{project.project_code}</p>
              </div>
              <div>
                <p className="text-gray-500">SO Number</p>
                <p className="font-mono text-gray-700 mt-0.5">{project.so_number}</p>
              </div>
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="text-gray-700 mt-0.5">{project.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Delivery Date</p>
                <p className="text-gray-700 mt-0.5">{formatDate(project.customer_delivery_date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Manufacturing</p>
                <Badge variant="info" className="mt-0.5">{project.manufacturing_location.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-gray-500">WO Status</p>
                <div className="mt-0.5">
                  {hasWO ? (
                    <Badge variant="success">WO: {activeWO?.reference_number}</Badge>
                  ) : (
                    <Badge variant="critical">No WO — blocked</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Factory Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{factoryRecords.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Overall Progress</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-brand-600 rounded-full" style={{ width: `${avgProgress}%` }} />
                  </div>
                  <span className="font-semibold text-gray-800">{avgProgress}%</span>
                </div>
              </div>
              <div>
                <p className="text-gray-500">Monthly Updates Required</p>
                <p className={`text-2xl font-bold mt-0.5 ${monthlyUpdateCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {monthlyUpdateCount}
                </p>
              </div>
            </div>
          </Card>

          {!hasWO && <WoGateAlert />}
        </div>
      )}

      {/* Vehicle Lines Tab */}
      {activeTab === 'lines' && (
        <div className="space-y-4">
          {!hasWO && <WoGateAlert />}

          {lineDevSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
              <CheckCircle2 size={14} className="text-green-600" />
              {lineDevSuccess}
            </div>
          )}
          {lineError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              {lineError}
            </div>
          )}

          {vehicleLines.length === 0 ? (
            <Card className="p-6 text-center text-sm text-gray-500">
              No vehicle lines found for this project.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Line #', 'Vehicle Type', 'Description', 'Qty', 'Status', 'Progress', 'Expected Completion', 'Monthly Update', 'Remarks', ...(canEdit ? ['Action'] : [])].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vehicleLines.map((line) => {
                      const record = factoryRecords.find((r) => r.project_vehicle_line_id === line.id);
                      const isEditing = editingLineId === (record?.id ?? null);

                      if (!record) {
                        return (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs text-gray-700">{line.line_number}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{line.vehicle_type}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{line.description}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{line.quantity}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 italic" colSpan={5}>
                              Not set up
                            </td>
                            {canEdit && (
                              <td className="px-4 py-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={creatingLineId === line.id}
                                  onClick={() => void handleCreateRecord(line)}
                                >
                                  Create Record
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      }

                      const statusInfo = PROD_STATUS_MAP[record.production_status];

                      return (
                        <>
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs text-gray-700">{line.line_number}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{line.vehicle_type}</td>
                            <td className="px-4 py-3 text-xs text-gray-700 max-w-[160px] truncate">{line.description}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{line.quantity}</td>
                            <td className="px-4 py-3">
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                                  <div className="h-1.5 bg-brand-600 rounded-full" style={{ width: `${record.progress_percentage}%` }} />
                                </div>
                                <span className="text-xs text-gray-600">{record.progress_percentage}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {record.expected_completion_date ? formatDate(record.expected_completion_date) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {record.monthly_update_required ? (
                                <Badge variant="critical">Required</Badge>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">
                              {record.remarks ?? '—'}
                            </td>
                            {canEdit && (
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  {isEditing ? (
                                    <Button variant="ghost" size="sm" onClick={cancelEditLine}>Cancel</Button>
                                  ) : (
                                    <Button variant="outline" size="sm" onClick={() => startEditLine(record)}>Edit</Button>
                                  )}
                                  <Button variant="ghost" size="sm"
                                    onClick={() => setStepsRecordId((id) => (id === record.id ? null : record.id))}>
                                    {stepsRecordId === record.id ? 'Hide Steps' : 'Steps'}
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                          {stepsRecordId === record.id && (
                            <tr key={`${line.id}-steps`}>
                              <td colSpan={canEdit ? 10 : 9} className="px-4 py-4 bg-brand-50/30 border-t border-gray-100">
                                <FactoryRecordSteps
                                  recordId={record.id}
                                  projectId={record.project_id}
                                  canEdit={canEdit}
                                  onProgress={(pct) => { void persistDerivedStatus(record, pct); }}
                                />
                              </td>
                            </tr>
                          )}
                          {isEditing && (
                            <tr key={`${line.id}-edit`}>
                              <td colSpan={canEdit ? 10 : 9} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                                <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 mb-3 text-xs text-sky-900">
                                  <span className="font-semibold">Status &amp; progress are automatic.</span>{' '}
                                  Status: <Badge variant={PROD_STATUS_MAP[record.production_status].variant}>{PROD_STATUS_MAP[record.production_status].label}</Badge>
                                  {' '}· {record.progress_percentage}% · {statusReason(record.production_status)}
                                  <div className="mt-1 text-sky-700">Update the <strong>Requirements</strong> and <strong>Steps</strong> tabs — the status and progress follow them.</div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1 block">Expected Completion</label>
                                    <input
                                      type="date"
                                      value={lineEditState.expected_completion_date}
                                      onChange={(e) => setLineEditState((s) => ({ ...s, expected_completion_date: e.target.value }))}
                                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1 block">Remarks</label>
                                    <textarea
                                      rows={2}
                                      value={lineEditState.remarks}
                                      onChange={(e) => setLineEditState((s) => ({ ...s, remarks: e.target.value }))}
                                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                                    />
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  loading={lineSaving}
                                  onClick={() => saveLineEdit(record)}
                                >
                                  Save
                                </Button>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Requirements Tab */}
      {activeTab === 'requirements' && (
        <div className="space-y-4">
          {!hasWO && <WoGateAlert />}

          {canEdit && (() => {
            const existingProjectTypes = new Set(
              requirements.filter((r) => !r.project_vehicle_line_id).map((r) => r.requirement_type_id),
            );
            const missingCount = reqTypes.filter((t) => !existingProjectTypes.has(t.id)).length;
            return (
              <Card className="p-4 flex items-center justify-between gap-4">
                <div className="text-xs text-gray-600">
                  {requirements.length === 0
                    ? 'No requirements checklist yet. Generate the standard checklist to start tracking readiness.'
                    : missingCount > 0
                      ? `${missingCount} requirement type${missingCount !== 1 ? 's are' : ' is'} not on this project's checklist yet.`
                      : 'All standard requirement types are on the checklist.'}
                </div>
                <Button
                  size="sm"
                  icon={<List size={14} />}
                  loading={generatingReqs}
                  disabled={missingCount === 0}
                  onClick={() => void handleGenerateRequirements()}
                >
                  {requirements.length === 0 ? 'Generate Checklist' : 'Add Missing'}
                </Button>
              </Card>
            );
          })()}

          {reqError && (
            <Card className="p-3 bg-red-50 border border-red-200">
              <p className="text-xs text-red-800">{reqError}</p>
            </Card>
          )}

          {canEdit && (
            <Card className="p-3 bg-sky-50 border border-sky-200">
              <p className="text-xs text-sky-800">
                Set each requirement to <strong>Approved</strong> once its document/value is ready. Production status advances
                automatically as requirements are approved and process steps progress.
              </p>
            </Card>
          )}

          {Object.entries(reqsByLine).map(([lineKey, reqs]) => {
            const lineLabel =
              lineKey === '__project__'
                ? 'Project-level'
                : `Line: ${lineKey}`;
            const vl = vehicleLines.find((v) => v.id === lineKey);

            return (
              <Card key={lineKey} className="overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">
                    {vl ? `Line ${vl.line_number} — ${vl.vehicle_type}: ${vl.description}` : lineLabel}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Requirement Type', 'Status', 'Value', 'Uploaded At', 'Remarks'].map((h) => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reqs.map((req) => {
                        const reqTypeName = req.requirement_type?.name ?? 'Unknown';
                        const statusInfo = REQ_STATUS_MAP[req.status];
                        const value = req.value_text ?? (req.value_number != null ? String(req.value_number) : '—');
                        return (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs font-medium text-gray-800">{reqTypeName}</td>
                            <td className="px-4 py-3">
                              {canEdit ? (
                                <select
                                  value={req.status}
                                  onChange={(e) => void handleSetRequirement(req, { status: e.target.value as FactoryReqStatus })}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                  {(['pending', 'in_progress', 'uploaded', 'approved', 'rejected', 'not_applicable'] as FactoryReqStatus[]).map((st) => (
                                    <option key={st} value={st}>{REQ_STATUS_MAP[st].label}</option>
                                  ))}
                                </select>
                              ) : (
                                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700">
                              {canEdit ? (
                                <input
                                  defaultValue={req.value_text ?? ''}
                                  placeholder="value / ref"
                                  onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (req.value_text ?? null)) void handleSetRequirement(req, { value_text: v }); }}
                                  className="w-28 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                              ) : value}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {req.uploaded_at ? formatDateTime(req.uploaded_at) : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{req.remarks ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}

          {requirements.length === 0 && (
            <Card className="p-6 text-center text-sm text-gray-500">
              No requirements recorded for this project yet.
            </Card>
          )}

          {/* Requirement types reference */}
          <Card className="p-4">
            <p className="text-xs text-gray-500 font-semibold mb-2">Requirement Types Reference</p>
            <div className="flex flex-wrap gap-2">
              {(reqTypes.length > 0 ? reqTypes : MOCK_REQUIREMENT_TYPES).map((rt) => (
                <Badge key={rt.id} variant="neutral">{rt.name}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* RMR Tab */}
      {activeTab === 'rmr' && (
        <div className="space-y-4">
          {!hasWO && <WoGateAlert />}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{rmrs.length} raw material request(s) for this project</p>
            {canEdit && (
              <Link to="/factory/raw-material-requests/new">
                <Button size="sm" icon={<Package size={14} />}>
                  New RMR
                </Button>
              </Link>
            )}
          </div>

          {rmrs.length === 0 ? (
            <Card className="p-6 text-center text-sm text-gray-500">
              No raw material requests for this project.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['RMR Number', 'Type', 'Status', 'Requested At', 'Sent to Procurement', 'Remarks'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rmrs.map((rmr) => (
                      <tr key={rmr.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">{rmr.request_number}</td>
                        <td className="px-4 py-3">
                          <Badge variant={rmr.request_type === 'project_related' ? 'info' : 'neutral'}>
                            {rmr.request_type === 'project_related' ? 'Project-Related' : 'Stock'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="neutral">{rmr.status.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(rmr.requested_at)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {rmr.sent_to_procurement_at ? formatDateTime(rmr.sent_to_procurement_at) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{rmr.remarks ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="text-right">
            <Link to="/factory/raw-material-requests" className="text-xs text-brand-600 hover:underline">
              View all Raw Material Requests →
            </Link>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card className="p-6 text-center text-gray-500 text-sm">
          Factory timeline events will appear here as production progresses.
        </Card>
      )}
    </div>
  );
}
