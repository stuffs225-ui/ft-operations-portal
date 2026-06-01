# Notification System — Design

**Date:** 2026-05-31 · **Phase:** Pre-launch support layer
**Migration:** `065_notifications.sql`

## Tables
- **notification_events** — catalog: `event_key` (unique), `event_name`,
  `module_name`, `severity` (routine/important/critical), `default_channels[]`,
  `is_active`. Seeded with 22 events (SO submitted/approved/rejected, missing
  WO/PN, PO>10k pending, PO approved/rejected, ETA delayed, material received,
  material pending QC, NCR created, rework required, release note issued, custody
  pending approval/acceptance, Dubai ETA delayed, AFS missing item critical,
  maintenance critical, SLA breached, CAPA due, data-quality critical).
- **notification_preferences** — per user/event: `in_app_enabled`,
  `email_enabled`, `sms_enabled`. Unique `(user_id, event_key)`.
- **notifications** — delivered/queued rows: `title`, `message`, `module_name`,
  `event_key`, `related_entity_type/id`, `severity`, `channel`
  (in_app/email/sms), `delivery_status` (pending/sent/failed/skipped/read),
  `read_at`, `sent_at`.
- **notification_escalation_rules** — `rule_key`, `module_name`,
  `trigger_condition`, `first_level_roles[]`, `second_level_roles[]`,
  `escalation_after_hours`, `channels[]`, `is_active`.

## Channel logic
`src/lib/notifications.ts` → `channelsForSeverity`:
- routine → `in_app`
- important → `in_app` + `email`
- critical → `in_app` + `email` + `sms`

## Provider safety (critical)
- **No email/SMS is ever sent from the browser.** `EMAIL_PROVIDER_CONFIGURED` /
  `SMS_PROVIDER_CONFIGURED` are `false` in the client build and there is no client
  provider/secret.
- `createNotification` persists `in_app` rows as `pending`/`sent`; `email`/`sms`
  rows are recorded as **`skipped`** (or `pending` if a server dispatcher exists)
  via `plannedDeliveryStatus`. Real dispatch must happen in a Supabase Edge
  Function holding the provider key server-side — see `EMAIL_SMS_INTEGRATION_PLAN.md`.
- Dev mode: `createNotification` is a no-op success so mock flows keep working.

## RLS
- `notifications`: users SELECT/UPDATE (mark read) **own**; admin/ops SELECT all;
  any authenticated user may INSERT (workflow events targeting a user).
- `notification_preferences`: user manages own.
- `notification_events` / `notification_escalation_rules`: SELECT to all
  authenticated; write admin/ops only.

## UI
- Header **bell** with unread count → `/notifications`.
- `/notifications` — center with severity/module filters, mark-as-read,
  mark-all-as-read.
- `/notifications/settings` — per-event channel toggles (email/sms show a
  "provider not configured" tag but remain togglable as saved preferences).
- `/admin/notification-rules` — events catalog + escalation rules (admin/ops).

## Dev mode
Falls back to `src/data/mockNotifications.ts`.
