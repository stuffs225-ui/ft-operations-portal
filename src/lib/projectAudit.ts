import { supabase, isSupabaseConfigured } from './supabase';

export async function recordProjectEvent(
  projectId: string,
  eventType: string,
  title: string,
  body: string | null,
  actorId: string | null,
  actorName: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('project_timeline_events').insert({
    project_id: projectId,
    event_type: eventType,
    title,
    body,
    actor_id: actorId,
    actor_name: actorName,
    metadata: metadata ?? null,
    is_system: false,
  });
}

export async function recordAuditEntry(
  action: string,
  entityId: string,
  description: string,
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
  actorId: string | null,
  actorEmail: string | null,
  actorRole: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('audit_log').insert({
    action,
    entity_type: 'project',
    entity_id: entityId,
    description,
    before_data: beforeData,
    after_data: afterData,
    actor_id: actorId,
    actor_email: actorEmail,
    actor_role: actorRole,
  });
}
