import type { Project, ExecutionReference, ExecutionGateStatus } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getMockReference } from '../data/mockExecutionReferences';

// ── Client-side gate helpers ───────────────────────────────────────────────────

/**
 * Computes the full WO/PN gate status for a project given its active references.
 * Pure function — no DB calls.
 */
export function getExecutionGateStatus(
  project: Project,
  references: ExecutionReference[],
): ExecutionGateStatus {
  const isApproved = project.project_status === 'approved';
  const isSaudi = project.manufacturing_location === 'saudi';
  const isDubai = project.manufacturing_location === 'dubai';

  const activeWO = references.find(
    (r) => r.reference_type === 'wo' && r.status !== 'cancelled' && r.status !== 'superseded',
  ) ?? null;
  const activePN = references.find(
    (r) => r.reference_type === 'pn' && r.status !== 'cancelled' && r.status !== 'superseded',
  ) ?? null;

  const hasActiveWO = activeWO !== null;
  const hasActivePN = activePN !== null;

  return {
    isApproved,
    isSaudi,
    isDubai,
    requiresWO: isApproved && isSaudi,
    requiresPN: isApproved && isDubai,
    hasActiveWO,
    hasActivePN,
    woReference: activeWO,
    pnReference: activePN,
    canStartSaudiFactory: isApproved && isSaudi && hasActiveWO,
    canStartDubaiFollowUp: isApproved && isDubai && hasActivePN,
  };
}

/**
 * Returns true if Saudi factory execution is permitted for this project.
 * Project must be approved, Saudi route, and have an active WO.
 */
export function canStartSaudiFactory(
  project: Project,
  references: ExecutionReference[],
): boolean {
  return getExecutionGateStatus(project, references).canStartSaudiFactory;
}

/**
 * Returns true if Dubai follow-up is permitted for this project.
 * Project must be approved, Dubai route, and have an active PN.
 */
export function canStartDubaiFollowUp(
  project: Project,
  references: ExecutionReference[],
): boolean {
  return getExecutionGateStatus(project, references).canStartDubaiFollowUp;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

/**
 * Fetches the active (non-cancelled, non-superseded) execution references for a project.
 * Falls back to mock data when Supabase is not configured.
 */
export async function fetchProjectReferences(projectId: string): Promise<ExecutionReference[]> {
  if (!isSupabaseConfigured || !supabase) {
    const refs: ExecutionReference[] = [];
    const wo = getMockReference(projectId, 'wo');
    const pn = getMockReference(projectId, 'pn');
    if (wo) refs.push(wo);
    if (pn) refs.push(pn);
    return refs;
  }

  const { data } = await supabase
    .from('project_execution_references')
    .select('*')
    .eq('project_id', projectId)
    .not('status', 'in', '("cancelled","superseded")')
    .order('created_at');

  return (data as unknown as ExecutionReference[]) ?? [];
}

/**
 * Fetches all execution references for the gate dashboard (all projects).
 */
export async function fetchAllReferences(): Promise<ExecutionReference[]> {
  if (!isSupabaseConfigured || !supabase) {
    const { MOCK_EXECUTION_REFERENCES } = await import('../data/mockExecutionReferences');
    return MOCK_EXECUTION_REFERENCES;
  }

  const { data } = await supabase
    .from('project_execution_references')
    .select(`
      *,
      project:projects!project_execution_references_project_id_fkey(
        project_code, so_number, customer_name, project_status
      ),
      created_by_profile:profiles!project_execution_references_created_by_fkey(full_name, email),
      confirmed_by_profile:profiles!project_execution_references_confirmed_by_fkey(full_name)
    `)
    .not('status', 'in', '("cancelled","superseded")')
    .order('created_at', { ascending: false });

  return (data as unknown as ExecutionReference[]) ?? [];
}

/**
 * Fetches approved projects that are missing their required execution reference.
 */
export async function fetchProjectsMissingReference(
  type: 'wo' | 'pn',
): Promise<Project[]> {
  if (!isSupabaseConfigured || !supabase) {
    const { MOCK_PROJECTS } = await import('../data/mockProjects');
    const { MOCK_EXECUTION_REFERENCES } = await import('../data/mockExecutionReferences');
    const location = type === 'wo' ? 'saudi' : 'dubai';
    const haveRef = new Set(
      MOCK_EXECUTION_REFERENCES
        .filter((r) => r.reference_type === type && r.status !== 'cancelled' && r.status !== 'superseded')
        .map((r) => r.project_id),
    );
    return MOCK_PROJECTS.filter(
      (p) =>
        p.project_status === 'approved' &&
        p.manufacturing_location === location &&
        !haveRef.has(p.id),
    );
  }

  const location = type === 'wo' ? 'saudi' : 'dubai';

  // Approved projects with the matching route
  const { data: allProjects } = await supabase
    .from('projects')
    .select('*, sales_owner:profiles!projects_sales_owner_id_fkey(full_name, email)')
    .eq('project_status', 'approved')
    .eq('manufacturing_location', location);

  if (!allProjects || allProjects.length === 0) return [];

  // Find which ones already have an active reference
  const projectIds = allProjects.map((p) => p.id);
  const { data: existingRefs } = await supabase
    .from('project_execution_references')
    .select('project_id')
    .in('project_id', projectIds)
    .eq('reference_type', type)
    .not('status', 'in', '("cancelled","superseded")');

  const withRef = new Set((existingRefs ?? []).map((r) => r.project_id));
  return (allProjects as unknown as Project[]).filter((p) => !withRef.has(p.id));
}
