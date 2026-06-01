# Scheduled Reports & Escalations — Design

**Date:** 2026-05-31 · **Phase:** Pre-launch support layer
**Migration:** `066_report_snapshots_subscriptions.sql`

## Purpose
Let Admin/Ops configure recurring department reports (e.g. daily procurement
delay report to the Operations Manager) and define escalation ladders. Manual
"generate now" works today; automated delivery is provider-gated.

## Tables
- **report_snapshots** — saved point-in-time exports (`report_key`,
  `report_title`, department, date range, `filters_json`, `summary_json`,
  `metrics_json`, `rows_json`, `status`, `generated_by`). Written by
  `saveReportSnapshot`.
- **scheduled_report_subscriptions** — `report_key`, `department`,
  `recipients_json` (`[{name,email,role}]`), `frequency`
  (daily/weekly/monthly/manual), `channels[]`, `is_active`, `created_by`.
- **report_delivery_logs** — delivery audit: `subscription_id`, `report_key`,
  `generated_at`, `delivery_channel`, `delivery_status`, `recipients_json`,
  `error_message`.

## RLS
- `report_snapshots`: owner + admin/ops.
- `scheduled_report_subscriptions`: SELECT all authenticated; write admin/ops.
- `report_delivery_logs`: admin/ops SELECT; insert admin/ops (and the future Edge
  Function via service role).

## Pages
- `/admin/report-subscriptions` — list + create subscriptions (admin/ops).
- `/admin/report-subscriptions/:id` — config, Active/Pause toggle, **Generate
  Now** (manual run that records delivery-log rows: `in_app` = `sent`,
  `email`/`sms` = `skipped` when no provider), and delivery history.

## Escalations
`notification_escalation_rules` (migration 065) defines first/second-level role
ladders and `escalation_after_hours`. Examples seeded: PO approval overdue (Ops →
Admin after 24h), critical SLA breach (Ops → Admin after 4h). Escalation
**evaluation/dispatch** runs server-side (Edge Function + `pg_cron`) once a
provider exists; the rules and their effects are **visible in the UI even without
a provider** (`/admin/notification-rules`).

## Automated delivery (future)
A Supabase Edge Function `run-scheduled-reports`:
1. On schedule (`pg_cron`), selects active subscriptions due to run.
2. Generates the report snapshot server-side (reusing the report registry).
3. Renders (HTML/PDF) and sends to recipients via the configured provider.
4. Writes `report_delivery_logs` with the real `delivery_status`.

Until then: configure subscriptions, generate snapshots, and download/print
manually. The UI clearly flags that scheduled sending requires provider setup —
see `EMAIL_SMS_INTEGRATION_PLAN.md`.
