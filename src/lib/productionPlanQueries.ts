// ── Production Plan data access ───────────────────────────────────────────────
// Per-project build plan (tasks) + production details, plus the editable default
// task template. Deferred-migration safe: missing tables degrade to empty / no-op.

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  ProductionPlanTemplateTask, ProjectProductionPlanTask, ProjectProductionDetails,
  ProductionTaskStatus,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any { return supabase; }

export const PRODUCTION_DEPARTMENTS = [
  'Engineering', 'Fabrication', 'Electrical', 'Assembly', 'Finishing', 'QC',
];

export async function fetchTemplateTasks(): Promise<ProductionPlanTemplateTask[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await db().from('production_plan_task_templates')
    .select('*').eq('is_active', true).order('sort_order');
  return error ? [] : (data as ProductionPlanTemplateTask[]) ?? [];
}

export async function fetchPlanTasks(projectId: string): Promise<ProjectProductionPlanTask[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await db().from('project_production_plan_tasks')
    .select('*').eq('project_id', projectId).order('sort_order');
  return error ? [] : (data as ProjectProductionPlanTask[]) ?? [];
}

/** Seed the project's plan from the active template (only tasks not already present by name). */
export async function generatePlanFromTemplate(projectId: string, userId: string | null): Promise<{ ok: boolean; added: number; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, added: 0, error: 'Supabase not configured.' };
  const [templates, existing] = await Promise.all([fetchTemplateTasks(), fetchPlanTasks(projectId)]);
  const have = new Set(existing.map((t) => t.name.toLowerCase()));
  const missing = templates.filter((t) => !have.has(t.name.toLowerCase()));
  if (missing.length === 0) return { ok: true, added: 0, error: null };
  const { error } = await db().from('project_production_plan_tasks').insert(
    missing.map((t) => ({
      project_id: projectId, name: t.name, department: t.department,
      sort_order: t.sort_order, duration_days: t.default_duration_days,
      status: 'pending', created_by: userId,
    })),
  );
  return error ? { ok: false, added: 0, error: error.message } : { ok: true, added: missing.length, error: null };
}

export async function addPlanTask(projectId: string, sortOrder: number, userId: string | null): Promise<{ data: ProjectProductionPlanTask | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: 'Supabase not configured.' };
  const { data, error } = await db().from('project_production_plan_tasks')
    .insert({ project_id: projectId, name: 'New task', department: 'Assembly', sort_order: sortOrder, duration_days: 1, status: 'pending', created_by: userId })
    .select('*').single();
  return { data: (data as ProjectProductionPlanTask) ?? null, error: error?.message ?? null };
}

export async function updatePlanTask(id: string, patch: Partial<ProjectProductionPlanTask>): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { error } = await db().from('project_production_plan_tasks').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deletePlanTask(id: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { error } = await db().from('project_production_plan_tasks').delete().eq('id', id);
  return error?.message ?? null;
}

/** Persist a reordered set of tasks (sort_order = array index). */
export async function reorderPlanTasks(tasks: ProjectProductionPlanTask[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await Promise.all(tasks.map((t, i) => db().from('project_production_plan_tasks').update({ sort_order: i }).eq('id', t.id)));
}

export async function fetchProductionDetails(projectId: string): Promise<ProjectProductionDetails | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await db().from('project_production_details').select('*').eq('project_id', projectId).maybeSingle();
  return (data as ProjectProductionDetails) ?? null;
}

export async function saveProductionDetails(projectId: string, patch: Partial<ProjectProductionDetails>, userId: string | null): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { error } = await db().from('project_production_details')
    .upsert({ project_id: projectId, ...patch, updated_by: userId }, { onConflict: 'project_id' });
  return error?.message ?? null;
}

export const TASK_STATUS_LABEL: Record<ProductionTaskStatus, string> = {
  pending: 'Pending', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked', skipped: 'Skipped',
};
