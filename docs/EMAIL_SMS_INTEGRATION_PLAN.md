# Email / SMS Integration Plan

**Date:** 2026-05-31 · **Status:** Foundation built, provider NOT configured

## Principles (non-negotiable)
1. **No provider secret in the frontend.** `VITE_*` vars are public; an email/SMS
   API key must never be a `VITE_` var.
2. **No sending from the browser.** The client only *records* notification intent
   (`notifications` rows) and report-delivery intent (`report_delivery_logs`).
3. Until a server-side dispatcher exists, email/sms rows are `skipped` and the UI
   shows a clear "provider not configured" badge.

## Current state
- `src/lib/notifications.ts`: `EMAIL_PROVIDER_CONFIGURED = false`,
  `SMS_PROVIDER_CONFIGURED = false`. `createNotification` writes `in_app`
  immediately and marks `email`/`sms` as `skipped`.
- `notification_preferences` capture user opt-ins regardless of provider state.

## Recommended production architecture
```
workflow event (client)  ──insert──▶  notifications (pending/skipped)
                                           │
                          pg trigger / pg_cron / Realtime
                                           ▼
                          Supabase Edge Function "dispatch-notifications"
                          (holds provider key in Function secrets)
                                           │
                  ┌────────────────────────┼─────────────────────────┐
                  ▼                         ▼                         ▼
            SMTP / SendGrid /          SMS provider             corporate email
            Resend / AWS SES          (Twilio / Unifonic)         gateway
                  │                         │                         │
                  └─────────── update notifications.delivery_status ─┘
```

## Steps to enable email
1. Choose a provider (SendGrid / Resend / AWS SES / corporate SMTP).
2. Create a Supabase Edge Function `dispatch-notifications`; store the key in
   **Function secrets** (`supabase secrets set ...`) — never in the repo.
3. Function reads `notifications` rows where `channel='email'` and
   `delivery_status IN ('pending')`, sends, then updates `delivery_status` to
   `sent`/`failed` and sets `sent_at`.
4. Schedule via `pg_cron` (e.g. every minute) or trigger on insert.
5. Flip the client badge by exposing a **public, non-secret** flag (e.g. a row in
   a `system_flags` table the client can read) — do not embed provider details.

## Steps to enable SMS
Same pattern with an SMS provider (Twilio / Unifonic for KSA). Reserve SMS for
`critical` events to control cost (channel logic already does this).

## Steps to enable scheduled report delivery
See `SCHEDULED_REPORTS_AND_ESCALATION_DESIGN.md`. The same Edge Function pattern
generates a report snapshot, renders it, and emails recipients, writing
`report_delivery_logs`.

## Security checklist
- [ ] Provider key only in Edge Function secrets.
- [ ] No `VITE_`-prefixed secret anywhere.
- [ ] Edge Function authenticates its own invocation (service role / cron).
- [ ] Rate limiting / retry on the Function, not the client.
- [ ] PII in messages minimised; logs avoid storing message bodies long-term.
