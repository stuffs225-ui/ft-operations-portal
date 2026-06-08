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

const ALL_PROD_STATUSES: FactoryProductionStatus[] = [
  'not_started', 'details_requested', 'boq_pending', 'boq_uploaded',
  'ga_drawing_pending', 'ga_drawing_uploaded', 'detail_drawings_pending',
  'detail_drawings_uploaded', 'manhours_pending', 'manhours_added',
  'pending_raw_materials', 'in_production', 'monthly_update_required',
  'production_completed', 'sent_to_qc', 'on_hold',
];

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
          A confirmed Work Order (WO) must be created before any factory actions can proceed.
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
  const { role } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [vehicleLines, setVehicleLines] = useState<ProjectVehicleLine[]>([]);
  const [factoryRecords, setFactoryRecords] = useState<FactoryRecord[]>([]);
  const [requirements, setRequirements] = useState<FactoryItemRequirement[]>([]);
  const [rmrs, setRmrs] = useState<RawMaterialRequest[]>([]);
  const [references, setReferences] = useState<ExecutionReference[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!projectId) { setNotFound(true); setLoading(false); return; }

    if (!isSupabaseConfigured) {
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
      setRmrs(getMockRMRsForProject(projectId));
      fetchProjectReferences(projectId).then((refs) => { setReferences(refs ?? []); });
      setLoading(false);
      return;
    }

    // Supabase mode
    Promise.all([
      supabase!.from('projects').select('*').eq('id', projectId).single(),
      supabase!.from('project_vehicle_lines').select('*').eq('project_id', projectId).order('line_number'),
      supabase!.from('factory_records').select('*').eq('project_id', projectId),
      supabase!.from('factory_item_requirements').select('*, requirement_type:factory_requirement_types(*)').eq('project_id', projectId),
      supabase!.from('production_raw_material_requests').select('*').eq('project_id', projectId),
    ]).then(([projRes, linesRes, recordsRes, reqsRes, rmrsRes]) => {
      if (projRes.error || !projRes.data) { setNotFound(true); setLoading(false); return; }
      const p = projRes.data as unknown as Project;
      if (p.manufacturing_location !== 'saudi') { setNotFound(true); setLoading(false); return; }
      setProject(p);
      setVehicleLines((linesRes.data as unknown as ProjectVehicleLine[]) ?? []);
      setFactoryRecords((recordsRes.data as unknown as FactoryRecord[]) ?? []);
      setRequirements((reqsRes.data as unknown as FactoryItemRequirement[]) ?? []);
      setRmrs((rmrsRes.data as unknown as RawMaterialRequest[]) ?? []);
      fetchProjectReferences(projectId).then((refs) => { setReferences(refs ?? []); });
      setLoading(false);
    });
  }, [projectId]);

  const confirmedWO = references.find(
    (r) => r.reference_type === 'wo' && r.status === 'confirmed',
  );
  const hasWO = !!confirmedWO;
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
                production_status: lineEditState.production_status,
                progress_percentage: lineEditState.progress_percentage,
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
    const updates = {
      production_status: lineEditState.production_status,
      progress_percentage: lineEditState.progress_percentage,
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
                    <Badge variant="success">WO: {confirmedWO?.reference_number}</Badge>
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
                                <Button variant="outline" size="sm" disabled>Create Record</Button>
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
                                {isEditing ? (
                                  <Button variant="ghost" size="sm" onClick={cancelEditLine}>Cancel</Button>
                                ) : (
                                  <Button variant="outline" size="sm" onClick={() => startEditLine(record)}>Edit</Button>
                                )}
                              </td>
                            )}
                          </tr>
                          {isEditing && (
                            <tr key={`${line.id}-edit`}>
                              <td colSpan={canEdit ? 10 : 9} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1 block">Production Status</label>
                                    <select
                                      value={lineEditState.production_status}
                                      onChange={(e) => setLineEditState((s) => ({ ...s, production_status: e.target.value as FactoryProductionStatus }))}
                                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                      {ALL_PROD_STATUSES.map((st) => (
                                        <option key={st} value={st}>{PROD_STATUS_MAP[st].label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1 block">Progress %</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={lineEditState.progress_percentage}
                                      onChange={(e) => setLineEditState((s) => ({ ...s, progress_percentage: Number(e.target.value) }))}
                                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                  </div>
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

          <Card className="p-4 bg-sky-50 border border-sky-200">
            <p className="text-xs text-sky-800">
              Document upload requires Supabase Storage.{' '}
              <Button variant="outline" size="sm" disabled className="ml-2 text-xs">
                Upload
              </Button>
            </p>
          </Card>

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
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700">{value}</td>
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
              {MOCK_REQUIREMENT_TYPES.map((rt) => (
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
