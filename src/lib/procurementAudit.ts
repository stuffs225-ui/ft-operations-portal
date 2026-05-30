import { supabase, isSupabaseConfigured } from './supabase';

export async function recordProcurementEvent(
  entityType: string,
  entityId: string,
  projectId: string | null,
  eventType: string,
  title: string,
  _body: string | null,
  actorId: string | null,
  _actorName: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    console.debug('[dev] procurement event:', eventType, title);
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

export async function recordEtaChange(
  entityType: string,
  entityId: string,
  projectId: string | null,
  oldEta: string | null,
  newEta: string | null,
  reason: string,
  remarks: string | null,
  changedBy: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    console.debug('[dev] ETA change:', entityType, entityId, oldEta, '->', newEta, reason);
    return;
  }
  await supabase.from('eta_change_history').insert({
    entity_type: entityType,
    entity_id: entityId,
    project_id: projectId,
    old_eta: oldEta,
    new_eta: newEta,
    changed_by: changedBy,
    reason,
    remarks,
  });
}
