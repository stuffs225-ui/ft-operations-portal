# Production Readiness Gaps

**Date:** 2026-05-31  
**Phase complete through:** Phase 10 (Reports, SLA, Control Tower)  
**Next planned phase:** Phase 11 (Notifications, Real-time, Mobile)

---

## CRITICAL — Must resolve before production go-live

### GAP-01: No real authentication backend
- Supabase Auth not connected. All auth currently uses `DevModeBanner` / mock profile.
- **Fix:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables. Run migrations 001–057 on a real Supabase project.

### GAP-02: No file storage
- Document uploads in Projects, QC, AFS use placeholder UI. No `supabase.storage` calls implemented.
- **Fix:** Create a `documents` storage bucket in Supabase. Wire upload handlers in DocumentList and ProjectNew.

### GAP-03: RLS not verified end-to-end
- All RLS policies exist in migrations but have not been tested against a live Supabase instance with real JWT roles.
- **Fix:** Run the Phase 10.5 smoke test plan against a staging database before go-live.

### GAP-04: WO / PN gates are UI-only
- The system shows warnings when WO/PN are missing but does not block record creation at the database level.
- **Fix:** Implement `can_start_saudi_factory` and `can_start_dubai_followup` DB functions as hard constraints in Phase 11.

---

## HIGH — Should resolve before first real user

### GAP-05: SLA events are not auto-triggered
- `sla_events` rows must be inserted by a Supabase Edge Function or pg_cron job when project status changes.
- Currently only mock data is shown in SLA dashboards.

### GAP-06: Health scores are not calculated automatically
- `project_health_scores` rows must be refreshed by a scheduled function.
- Currently static mock data from `mockReports.ts`.

### GAP-07: No email / push notifications
- Inbox tasks, SLA breaches, and CAPA due dates have no outbound notification mechanism.
- **Fix:** Implement Supabase Edge Function → Resend/SendGrid webhook in Phase 11.

### GAP-08: Audit log actor data relies on client
- `audit_log` actor fields (actor_email, actor_role) are written by the client.
- **Fix:** Move audit writes to a Supabase RLS-protected function or trigger to prevent spoofing.

---

## MEDIUM — Can be deferred to Phase 11

### GAP-09: Reports are mock-only
- All 16 report pages read from `mockReports.ts`. No live aggregation queries.
- Acceptable for pilot; must be replaced with live Supabase views or materialized tables.

### GAP-10: No pagination on list pages
- Projects, Procurement, QC, AFS, and Issues lists load all rows. Will degrade at scale.
- **Fix:** Add `.range(offset, offset + PAGE_SIZE - 1)` to all Supabase list queries.

### GAP-11: No optimistic updates
- All write actions (approve, reject, submit) use `setTimeout` in dev mode.
- In production, show a loading spinner and handle errors explicitly.

### GAP-12: Medical serial number tracking is note-only
- The system notes that medical items require serial numbers but does not enforce it.
- Scheduled for Phase 6+ enforcement.

### GAP-13: Vehicle chassis + photos requirement is note-only
- Every vehicle must have chassis number and photos before delivery (Playbook §4.7).
- UI shows a reminder note; no hard block yet.

---

## LOW — Cosmetic / developer experience

### GAP-14: Database type stubs not generated
- `src/types/database.ts` is hand-authored. Should be replaced with `supabase gen types typescript` output after migrations run.

### GAP-15: No end-to-end tests
- Phase-level test plans exist in `docs/PHASE_N_TEST_PLAN.md` but there are no automated Playwright or Cypress tests.

### GAP-16: No error boundary
- React error boundaries are not implemented. Any unhandled exception crashes the whole app.
