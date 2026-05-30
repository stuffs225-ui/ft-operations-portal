import { supabase, isSupabaseConfigured } from './supabase';

export async function recordQuotationEvent(
  quotationId: string,
  eventType: string,
  title: string,
  body: string | null,
  actorId: string | null,
  actorName: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    console.debug('[dev] quotation event:', eventType, title);
    return;
  }
  await supabase.from('quotation_timeline_events').insert({
    quotation_request_id: quotationId,
    event_type: eventType,
    title,
    body,
    actor_id: actorId,
    actor_name: actorName,
    metadata: metadata ?? null,
    is_system: false,
  });
}

export async function recordQuotationAuditEntry(
  action: string,
  entityId: string,
  description: string,
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
  actorId: string | null,
  actorEmail: string | null,
  actorRole: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    console.debug('[dev] quotation audit:', action, description);
    return;
  }
  await supabase.from('audit_log').insert({
    action,
    entity_type: 'quotation',
    entity_id: entityId,
    description,
    before_data: beforeData,
    after_data: afterData,
    actor_id: actorId,
    actor_email: actorEmail,
    actor_role: actorRole,
  });
}
