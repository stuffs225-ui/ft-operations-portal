// Notification foundation + provider abstraction.
//
// SAFETY: this module NEVER sends email/SMS from the browser and never holds a
// provider secret. in_app notifications are persisted; email/sms rows are
// recorded with delivery_status reflecting whether a server-side provider is
// configured. Real dispatch must happen in a Supabase Edge Function that holds
// the provider key server-side (see docs/EMAIL_SMS_INTEGRATION_PLAN.md).

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  NotificationChannel,
  NotificationSeverity,
} from '../types';

/**
 * Whether a server-side email/SMS dispatcher is wired. There is deliberately no
 * client provider, so this is false in the browser build. A future Edge Function
 * can flip this via a public, non-secret feature flag if desired.
 */
export const EMAIL_PROVIDER_CONFIGURED = false;
export const SMS_PROVIDER_CONFIGURED = false;

/** Resolve channels for a severity level per the governance channel logic. */
export function channelsForSeverity(severity: NotificationSeverity): NotificationChannel[] {
  switch (severity) {
    case 'routine':
      return ['in_app'];
    case 'important':
      return ['in_app', 'email'];
    case 'critical':
      return ['in_app', 'email', 'sms'];
    default:
      return ['in_app'];
  }
}

/** Delivery status a non-in_app channel should record given provider state. */
export function plannedDeliveryStatus(channel: NotificationChannel): 'pending' | 'skipped' {
  if (channel === 'in_app') return 'pending';
  if (channel === 'email') return EMAIL_PROVIDER_CONFIGURED ? 'pending' : 'skipped';
  if (channel === 'sms') return SMS_PROVIDER_CONFIGURED ? 'pending' : 'skipped';
  return 'skipped';
}

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  moduleName?: string;
  eventKey?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** Override the severity-derived channel set. */
  channels?: NotificationChannel[];
}

/**
 * Create notification rows (one per channel). In dev mode this is a no-op that
 * resolves successfully so existing mock flows keep working. Real email/SMS rows
 * are written as 'skipped' until a server-side provider exists.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ created: number; persisted: boolean }> {
  const channels = input.channels ?? channelsForSeverity(input.severity);

  if (!isSupabaseConfigured || !supabase) {
    return { created: channels.length, persisted: false };
  }

  const rows = channels.map((channel) => ({
    user_id: input.userId,
    title: input.title,
    message: input.message,
    module_name: input.moduleName ?? null,
    event_key: input.eventKey ?? null,
    related_entity_type: input.relatedEntityType ?? null,
    related_entity_id: input.relatedEntityId ?? null,
    severity: input.severity,
    channel,
    delivery_status: plannedDeliveryStatus(channel),
    sent_at: channel === 'in_app' ? new Date().toISOString() : null,
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  return { created: rows.length, persisted: !error };
}

/** Mark a single notification read (in-app). Dev mode is a no-op success. */
export async function markNotificationRead(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  const { error } = await supabase
    .from('notifications')
    .update({ delivery_status: 'read', read_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}
