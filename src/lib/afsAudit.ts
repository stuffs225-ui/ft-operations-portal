import { supabase, isSupabaseConfigured } from './supabase';

export async function recordAfsEvent(
  projectId: string,
  eventType: string,
  title: string,
  body: string | null,
  actorId: string | null,
  actorName: string | null,
  metadata: Record<string, unknown> | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('project_timeline_events').insert({
    project_id: projectId,
    event_type: eventType,
    title,
    body,
    actor_id: actorId,
    actor_name: actorName,
    metadata,
    is_system: false,
  });
}

export async function recordAfsAudit(
  action: string,
  entityId: string,
  description: string,
  actorId: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('audit_log').insert({
    action,
    entity_type: 'afs',
    entity_id: entityId,
    description,
    actor_id: actorId,
  });
}
