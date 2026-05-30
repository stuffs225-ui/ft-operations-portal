import { supabase, isSupabaseConfigured } from './supabase';

export async function recordStoreEvent(
  projectId: string | null,
  eventType: string,
  title: string,
  body: string | null,
  actorId: string | null,
  actorName: string | null,
  metadata: Record<string, unknown> | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (projectId) {
    await supabase.from('project_timeline_events').insert({
      project_id: projectId, event_type: eventType,
      title, body, actor_id: actorId, actor_name: actorName,
      metadata, is_system: true,
    });
  }
  await supabase.from('timeline_events').insert({
    entity_type: 'store', entity_id: projectId ?? 'global',
    event_type: eventType, title, body,
    actor_id: actorId, actor_name: actorName,
    metadata, is_system: true,
  });
}

export async function recordStoreAudit(
  action: string,
  entityId: string,
  description: string,
  actorId: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('audit_log').insert({
    action, entity_type: 'store', entity_id: entityId,
    description, actor_id: actorId,
  });
}
