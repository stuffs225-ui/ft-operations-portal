# Pre-Launch Feature Test Plan

**Date:** 2026-05-31 · Covers the pre-launch support layer (reports/export,
templates, fillable docs, access requests, user/role admin, notifications,
scheduled reports). Run in **dev mode** (no Supabase) and again on a **real
Supabase** project. Dev mode must never crash and must show "Dev mode — changes
not persisted" on writes.

## 1. Department reporting & exports
- [ ] Open Reports → Procurement / Factory / Sales / SLA. Export bar visible.
- [ ] "Export CSV" downloads a CSV with the visible rows; cost columns appear only
      for admin/ops/procurement on the procurement report.
- [ ] "Print" prints only the report area (sidebar/header hidden).
- [ ] "Save Snapshot" shows success; dev mode says not persisted; real mode writes
      `report_snapshots`.
- [ ] "Share by email" shows a "provider not configured" badge (not a send).

## 2. Template management
- [ ] `/templates` lists templates; tabs Approved/Department/Pending/My Submitted
      filter correctly; search works.
- [ ] `/templates/new`: create a template, add fields, "Detect placeholders from
      body" adds missing fields. Save as Draft and Submit for Approval both work.
- [ ] `/templates/:id`: approved template shows "Generate Document"; pending shows
      Approve/Reject (admin/ops); Reject requires a reason; approved shows the
      "cannot edit directly" notice.
- [ ] `/templates/approvals`: pending queue; approve/reject simulated in dev.

## 3. Fillable templates
- [ ] `/templates/generate/:id`: required fields enforced; live preview updates;
      unfilled `{{x}}` render as `[x]`.
- [ ] Generate creates a `generated_documents` row (real) / navigates (dev).
- [ ] `/templates/generated` lists docs; `/templates/generated/:id` prints &
      downloads the rendered text.

## 4. Access request workflow
- [ ] `/request-access` is reachable **without login**. Submit with full_name +
      email → success panel. No account is created.
- [ ] `/admin/access-requests` (admin/ops) lists requests by status; search works.
- [ ] `/admin/access-requests/:id`: assign role/department/status; approve / mark
      under review / reject (reason-required). "Manual user creation required"
      info box is shown.
- [ ] Real mode: anon INSERT into `access_requests` succeeds; anon SELECT denied.

## 5. User profile & role assignment
- [ ] `/admin/users`: filter by department/role/status; search; view details;
      assign role; suspend/reactivate (dev simulated). Banner links to access
      requests.

## 6. Notifications
- [ ] Header bell shows unread count; links to `/notifications`.
- [ ] `/notifications`: severity/module filters; mark-as-read; mark-all-as-read.
- [ ] `/notifications/settings`: per-event in_app/email/sms toggles; email/sms show
      "provider not configured"; Save works (dev simulated).
- [ ] `/admin/notification-rules`: events + escalation rules visible (admin/ops).

## 7. Scheduled reports & escalations
- [ ] `/admin/report-subscriptions`: list; create subscription (report, frequency,
      channels, recipients).
- [ ] `/admin/report-subscriptions/:id`: Active/Pause; "Generate Now" records a
      delivery-log row (in_app sent, email/sms skipped without provider); history
      table renders.

## 8. Regression (must not break)
- [ ] All existing modules load (Projects, Quotations, Procurement, Factory, Store,
      QC, Dubai/AFS, Reports, Control Tower, Settings, Admin Approvals).
- [ ] Cost protection intact: factory/store/qc/afs/viewer/sales cannot see costs
      (migrations 060/061 unaffected).
- [ ] `npm run build` passes with zero TypeScript errors.

## 9. Security
- [ ] No `VITE_` secret beyond URL + anon key; no service role key in `src/`.
- [ ] No email/SMS sent from the browser.
- [ ] Only admin/ops can read `access_requests`, approve templates, manage
      subscriptions/rules.
