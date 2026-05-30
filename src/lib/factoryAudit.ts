import { supabase, isSupabaseConfigured } from './supabase';

export async function recordFactoryEvent(
  entityType: string,
  entityId: string,
  projectId: string | null,
  eventType: string,
  title: string,
  actorId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    console.debug('[dev] factory event:', eventType, title);
    return;
  }
  await supabase.from('audit_log').insert({
    action: eventType,
    entity_type: entityType,
    entity_id: entityId,
    description: title,
    before_data: null,
    after_data: { project_id: projectId, ...metadata },
    actor_id: actorId,
  });
}
