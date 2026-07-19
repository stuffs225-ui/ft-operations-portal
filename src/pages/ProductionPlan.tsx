import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Printer, FileSpreadsheet, ListChecks, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  fetchPlanTasks, generatePlanFromTemplate, addPlanTask, updatePlanTask, deletePlanTask,
  reorderPlanTasks, fetchProductionDetails, saveProductionDetails,
  PRODUCTION_DEPARTMENTS, TASK_STATUS_LABEL,
} from '../lib/productionPlanQueries';
import type {
  ProjectProductionPlanTask, ProjectProductionDetails, ProductionTaskStatus, Project, UserRole,
} from '../types';

const CAN_EDIT: UserRole[] = ['admin', 'operations_manager', 'factory_user'];
const STATUSES: ProductionTaskStatus[] = ['pending', 'in_progress', 'done', 'blocked', 'skipped'];

const EMPTY_DETAILS: ProjectProductionDetails = {
  project_id: '', chassis_status: '', chassis_received: 0, chassis_total: 0,
  manhours_needed: 0, offline_notes: '', online_notes: '', delivery_schedule: '',
};

function fmt(d: string | null | undefined) { return d ? new Date(d).toLocaleDateString('en-GB') : '—'; }

export function ProductionPlan() {
  const { projectId } = useParams<{ projectId: string }>();
  const { role, profile } = useAuth();
  const canEdit = role ? CAN_EDIT.includes(role as UserRole) : false;
  const uid = profile?.id ?? null;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectProductionPlanTask[]>([]);
  const [details, setDetails] = useState<ProjectProductionDetails>({ ...EMPTY_DETAILS, project_id: projectId ?? '' });
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!projectId || !isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [projRes, t, d] = await Promise.all([
        sb.from('projects').select('*').eq('id', projectId).maybeSingle(),
        fetchPlanTasks(projectId),
        fetchProductionDetails(projectId),
      ]);
      if (cancelled) return;
      setProject((projRes.data as unknown as Project) ?? null);
      setTasks(t);
      if (d) setDetails(d);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId, reloadKey]);

  async function handleGenerate() {
    if (!projectId) return;
    setBusy(true);
    await generatePlanFromTemplate(projectId, uid);
    setBusy(false);
    reload();
  }
  async function handleAdd() {
    if (!projectId) return;
    const res = await addPlanTask(projectId, tasks.length, uid);
    if (res.data) setTasks((prev) => [...prev, res.data!]);
  }
  async function patchTask(id: string, patch: Partial<ProjectProductionPlanTask>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await updatePlanTask(id, patch);
  }
  async function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deletePlanTask(id);
  }
  async function move(idx: number, dir: -1 | 1) {
    const next = [...tasks];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setTasks(next);
    await reorderPlanTasks(next);
  }
  async function patchDetails(patch: Partial<ProjectProductionDetails>) {
    setDetails((prev) => ({ ...prev, ...patch }));
    if (projectId) await saveProductionDetails(projectId, patch, uid);
  }

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Production Plan');
    ws.addRow(['NAFFCO — Production Plan']);
    ws.addRow(['Project', project?.project_code ?? '', 'Client', project?.customer_name ?? '']);
    ws.addRow(['SO#', project?.so_number ?? '', 'Status', project?.project_status ?? '']);
    ws.addRow(['Chassis', `${details.chassis_received}/${details.chassis_total} — ${details.chassis_status ?? ''}`, 'Manhours', details.manhours_needed]);
    ws.addRow(['Delivery', details.delivery_schedule ?? '']);
    ws.addRow(['Offline (Dubai)', details.offline_notes ?? '']);
    ws.addRow(['Online (KSA)', details.online_notes ?? '']);
    ws.addRow([]);
    const header = ws.addRow(['#', 'Task', 'Department', 'Duration (days)', 'Planned Start', 'Status', 'Assignee', 'Remarks']);
    header.font = { bold: true };
    tasks.forEach((t, i) => ws.addRow([
      i + 1, t.name, t.department, t.duration_days, t.planned_start_date ?? '',
      TASK_STATUS_LABEL[t.status], t.assignee ?? '', t.remarks ?? '',
    ]));
    ws.columns.forEach((c) => { c.width = 20; });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Production_Plan_${project?.project_code ?? projectId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="space-y-5 report-print-root">
      <PageHeader
        title="Production Plan"
        subtitle={project ? `${project.project_code} — ${project.customer_name}` : undefined}
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Production Plan' }]}
        actions={
          <div className="flex items-center gap-2 no-print">
            {projectId && (
              <Link to={`/factory/projects/${projectId}`}><Button variant="ghost" size="sm"><ArrowLeft size={14} className="mr-1" /> Workspace</Button></Link>
            )}
            <Button variant="secondary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => void exportExcel()}>Excel</Button>
            <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>PDF</Button>
          </div>
        }
      />

      {/* Production details */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Production Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Chassis received</label>
            <input type="number" min={0} disabled={!canEdit} value={details.chassis_received}
              onChange={(e) => void patchDetails({ chassis_received: Number(e.target.value) || 0 })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Chassis total</label>
            <input type="number" min={0} disabled={!canEdit} value={details.chassis_total}
              onChange={(e) => void patchDetails({ chassis_total: Number(e.target.value) || 0 })} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Chassis status</label>
            <input disabled={!canEdit} value={details.chassis_status ?? ''} placeholder="e.g. 15 received / awaiting Ford"
              onChange={(e) => void patchDetails({ chassis_status: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Manhours needed</label>
            <input type="number" min={0} disabled={!canEdit} value={details.manhours_needed}
              onChange={(e) => void patchDetails({ manhours_needed: Number(e.target.value) || 0 })} className={inputCls} />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-gray-500 block mb-1">Delivery schedule (phased)</label>
            <input disabled={!canEdit} value={details.delivery_schedule ?? ''} placeholder="e.g. Jul: 15 · Aug: 15 · Sep: 20"
              onChange={(e) => void patchDetails({ delivery_schedule: e.target.value })} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Offline production (Dubai)</label>
            <textarea rows={2} disabled={!canEdit} value={details.offline_notes ?? ''}
              onChange={(e) => void patchDetails({ offline_notes: e.target.value })} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Online production (KSA)</label>
            <textarea rows={2} disabled={!canEdit} value={details.online_notes ?? ''}
              onChange={(e) => void patchDetails({ online_notes: e.target.value })} className={inputCls} />
          </div>
        </div>
      </Card>

      {/* Tasks */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Build Tasks ({tasks.length})</h3>
          {canEdit && (
            <div className="flex items-center gap-2 no-print">
              {tasks.length === 0 && (
                <Button size="sm" icon={<ListChecks size={14} />} loading={busy} onClick={() => void handleGenerate()}>Generate from Template</Button>
              )}
              <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => void handleAdd()}>Add Task</Button>
            </div>
          )}
        </div>
        {tasks.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            No tasks yet. {canEdit ? 'Generate the default plan or add tasks.' : ''}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#', 'Task', 'Dept', 'Days', 'Planned Start', 'Status', 'Assignee', 'Remarks', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((t, i) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 min-w-[180px]">
                      {canEdit ? <input value={t.name} onChange={(e) => void patchTask(t.id, { name: e.target.value })} className={inputCls} /> : t.name}
                    </td>
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <select value={t.department} onChange={(e) => void patchTask(t.id, { department: e.target.value })} className={inputCls}>
                          {PRODUCTION_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : t.department}
                    </td>
                    <td className="px-3 py-2 w-16">
                      {canEdit ? <input type="number" min={0} value={t.duration_days} onChange={(e) => void patchTask(t.id, { duration_days: Number(e.target.value) || 0 })} className={inputCls} /> : t.duration_days}
                    </td>
                    <td className="px-3 py-2 w-36">
                      {canEdit ? <input type="date" value={t.planned_start_date ?? ''} onChange={(e) => void patchTask(t.id, { planned_start_date: e.target.value || null })} className={inputCls} /> : fmt(t.planned_start_date)}
                    </td>
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <select value={t.status} onChange={(e) => void patchTask(t.id, { status: e.target.value as ProductionTaskStatus })} className={inputCls}>
                          {STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
                        </select>
                      ) : TASK_STATUS_LABEL[t.status]}
                    </td>
                    <td className="px-3 py-2 w-28">
                      {canEdit ? <input value={t.assignee ?? ''} onChange={(e) => void patchTask(t.id, { assignee: e.target.value || null })} className={inputCls} /> : (t.assignee ?? '—')}
                    </td>
                    <td className="px-3 py-2 min-w-[140px]">
                      {canEdit ? <input value={t.remarks ?? ''} onChange={(e) => void patchTask(t.id, { remarks: e.target.value || null })} className={inputCls} /> : (t.remarks ?? '—')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap no-print">
                      {canEdit && (
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => void move(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={13} /></button>
                          <button onClick={() => void move(i, 1)} disabled={i === tasks.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={13} /></button>
                          <button onClick={() => void removeTask(t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
