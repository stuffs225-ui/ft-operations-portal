// Workflow notifications — the first real callers of the notification
// foundation (audit finding C4: createNotification existed with zero callers).
//
// Design rules:
//   • Best-effort and NON-blocking: a notification failure must never break the
//     workflow action that triggered it — every call is wrapped and swallowed.
//   • Pre-migration safe: notifying a ROLE group needs the SECURITY DEFINER
//     resolver from migration 102 (notification_recipients_for_roles). Until
//     102 is applied that RPC is missing and the call quietly no-ops.
//     Notifying a specific user (the project creator) works today.
//   • In-app only by default ('routine'); no email/SMS is dispatched from the
//     browser (see notifications.ts).

import { supabase, isSupabaseConfigured } from './supabase';
import { createNotification } from './notifications';
import type { NotificationSeverity, UserRole } from '../types';

interface WorkflowNotice {
  title: string;
  message: string;
  severity?: NotificationSeverity;
  entityType?: string;
  entityId?: string;
  moduleName?: string;
  eventKey?: string;
}

/** Notify one user. Skips silently when the target is the actor or absent. */
export async function notifyUser(
  targetUserId: string | null | undefined,
  actorUserId: string | null | undefined,
  notice: WorkflowNotice,
): Promise<void> {
  if (!targetUserId || targetUserId === actorUserId) return;
  try {
    await createNotification({
      userId: targetUserId,
      title: notice.title,
      message: notice.message,
      severity: notice.severity ?? 'routine',
      moduleName: notice.moduleName ?? 'projects',
      eventKey: notice.eventKey,
      relatedEntityType: notice.entityType,
      relatedEntityId: notice.entityId,
      channels: ['in_app'],
    });
  } catch {
    // Best-effort by design — never surface or block.
  }
}

/**
 * Notify every active user holding one of the given roles (excluding the
 * actor). Requires migration 102's notification_recipients_for_roles RPC;
 * before it is applied this resolves to a silent no-op.
 */
export async function notifyRoles(
  roles: UserRole[],
  actorUserId: string | null | undefined,
  notice: WorkflowNotice,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data, error } = await supabase.rpc('notification_recipients_for_roles', {
      p_roles: roles,
    });
    if (error || !data) return; // RPC missing (102 pending) or blocked — no-op.
    const ids = (data as { user_id?: string }[] | string[]).map((r) =>
      typeof r === 'string' ? r : (r.user_id as string),
    );
    await Promise.all(
      [...new Set(ids)]
        .filter((id) => id && id !== actorUserId)
        .map((id) => notifyUser(id, actorUserId, notice)),
    );
  } catch {
    // Best-effort by design.
  }
}
