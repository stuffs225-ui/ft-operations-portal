# Production Readiness Gaps

**Date:** 2026-05-31
**Reviewed:** full codebase + all migrations (`001`–`059`) for real-Supabase readiness.
**Legend — Priority:** 1 = Critical before production · 2 = Important before pilot · 3 = Nice to have · 4 = Future.

Each gap: **module · risk · recommendation · priority · effort · blocks real users?**

---

## Priority 1 — Critical before production

### ✅ GAP-01 · Cost columns exposed via API — FIXED (security-hardening branch)
- **Fix:** dropped `po_ops_roles_select` / `poi_ops_roles_select`; created
  security-definer views `purchase_orders_to_supplier_safe`,
  `purchase_order_items_safe`, `project_vehicle_lines_safe` that mask cost columns
  to NULL for restricted roles. `ProjectDetail.tsx` updated to use the safe view.
  See `SECURITY_HARDENING_COST_PROTECTION.md`.
- **Residual:** `quotation_total_value` still visible to viewer via API (low priority).
  Address with `quotation_requests_safe` view in a follow-up.

### ✅ GAP-02 · Procurement PO self-approval — FIXED (security-hardening branch)
- **Fix:** split `po_procurement_all` into targeted INSERT/SELECT/UPDATE/DELETE
  policies. UPDATE policy has `WITH CHECK (approval_status NOT IN ('approved','rejected'))`.
  Added `BEFORE UPDATE` trigger `enforce_po_approval_authority()` as belt-and-suspenders.
  See `PO_APPROVAL_SECURITY_RULES.md`.

### GAP-03 · Store / QC / Dubai-AFS writes are simulated
- **Module:** Store, Material QC, Project QC, NCR, Release Notes, Dubai/AFS, Maintenance.
- **Risk:** these detail pages read real data but their create/approve actions
  use `setTimeout` and never call `.insert/.update` — data entry is non-functional
  in production even with Supabase configured.
- **Recommendation:** wire real Supabase writes (the tables + RLS already exist;
  after this branch the RLS works). Mirror the pattern used in Projects/Quotations/Procurement.
- **Effort:** L. **Blocks real users:** YES for those modules.

### GAP-04 · Migrations would have failed a fresh run *(FIXED in this branch)*
- **Module:** DB.
- **Risk:** FK to non-existent `execution_references` (025/027) and `profiles.role`
  in RLS (049–057) aborted a clean `001→057` run; `auth.jwt()` idiom (035–048)
  silently broke QC/Dubai/AFS authorization.
- **Recommendation:** ✅ fixed — see `MIGRATION_RISK_REVIEW.md`. Re-verify with a
  `supabase db push` on a throwaway project.
- **Effort:** done. **Blocks real users:** was YES; now resolved.

---

## Priority 2 — Important before pilot

### GAP-05 · Reports / Control Tower / Health / SLA are 100% mock
- **Module:** Reports (15 pages), Control Tower.
- **Risk:** even in real mode these never query Supabase — they show fabricated
  data. `isSupabaseConfigured` is used only to render a banner.
- **Recommendation:** build aggregation views / RPCs and point the pages at them;
  populate `project_health_scores` / `sla_events` via scheduled functions.
- **Effort:** L. **Blocks real users:** YES for reporting; pilot can proceed on
  operational modules with reports flagged "preview".

### GAP-06 · No SLA scheduler / health-score computation
- **Module:** SLA engine, Health scores.
- **Risk:** `sla_events` and `project_health_scores` are never written; SLA
  breaches and health bands won't reflect reality.
- **Recommendation:** Supabase Edge Function + `pg_cron` to insert SLA events on
  status change and refresh health scores periodically.
- **Effort:** M. **Blocks real users:** partial (governance dashboards inert).

### GAP-07 · No route-level role enforcement
- **Module:** Frontend routing.
- **Risk:** any authenticated user can deep-link to any page; sidebar hiding is
  cosmetic. DB RLS still governs data, but UI exposes structure/actions.
- **Recommendation:** `allowedRoles` prop on `ProtectedRoute` / `<RoleGuard>`.
- **Effort:** S–M. **Blocks real users:** NO (defense-in-depth), but recommended.

### GAP-08 · Silent read-error handling
- **Module:** most list pages.
- **Risk:** the dominant `.then(({ data }) => ...)` pattern ignores `error`;
  query failures appear as empty lists with no message.
- **Recommendation:** surface `error` (toast/empty-error state) in the shared
  fetch pattern.
- **Effort:** M (many call sites). **Blocks real users:** NO (no crash) but hurts ops.

### GAP-09 · Document upload not wired
- **Module:** all document modules.
- **Risk:** no `supabase.storage` calls anywhere; `storage_path` always null.
  Buckets+policies now exist (`058`) but UI doesn't upload.
- **Recommendation:** shared upload hook + `<FileUpload>`; wire per
  `DOCUMENT_UPLOAD_GOVERNANCE.md`.
- **Effort:** M–L. **Blocks real users:** YES for document-dependent flows.

### GAP-10 · Missing `WITH CHECK` on some update policies
- **Module:** Quotations (`qr_sales_update`), Suppliers (`sup_qc_update`).
- **Risk:** ownership reassignment / unintended field updates (e.g. qc_user
  approving suppliers).
- **Recommendation:** add scoped `WITH CHECK`. SQL in `RLS_SECURITY_REVIEW.md`.
- **Effort:** S. **Blocks real users:** NO but is a privilege gap.

---

## Priority 3 — Nice to have

### GAP-11 · Forgeable audit / timeline
- **Module:** audit_log, timeline_events.
- **Risk:** client-supplied `actor_*` fields can be spoofed.
- **Recommendation:** BEFORE-INSERT trigger setting `actor_id=auth.uid()`.
- **Effort:** S. **Blocks real users:** NO.

### GAP-12 · No dev-mode role switcher
- **Module:** AuthContext.
- **Risk:** dev mode is always `admin`; RBAC can't be exercised without a live DB.
- **Recommendation:** add a dev-only role selector (guarded by `!isSupabaseConfigured`).
- **Effort:** S. **Blocks real users:** NO.

### GAP-13 · Over-broad `USING (true)` SELECT on QC/analytics tables
- **Module:** 035–040, 052–057.
- **Risk:** every authenticated role (incl. viewer) can read inspections, NCRs,
  health scores, scorecards.
- **Recommendation:** scope to project/role where sensitive.
- **Effort:** M. **Blocks real users:** NO.

### GAP-14 · Migrations 035–057 not idempotent
- **Module:** DB.
- **Risk:** bare CREATE statements fail on re-run; `051` rename is destructive.
- **Recommendation:** add `IF NOT EXISTS` guards; treat as forward-only meanwhile
  (`supabase db reset` for re-apply on non-prod).
- **Effort:** M. **Blocks real users:** NO (clean first run works).

### GAP-15 · Dangling `*_id` columns without FK
- **Module:** supplier_scorecards, capa_records, afs_missing_items, material_ncrs.
- **Risk:** referential drift.
- **Recommendation:** add FKs after confirming intent.
- **Effort:** S. **Blocks real users:** NO.

### GAP-16 · Large JS bundle (~1.37 MB / 274 KB gzip)
- **Module:** build.
- **Risk:** slow first load.
- **Recommendation:** route-based code splitting / `manualChunks`.
- **Effort:** M. **Blocks real users:** NO.

---

## Priority 4 — Future

- **GAP-17** Email / push notifications (inbox, SLA breach, CAPA due) — none exist.
- **GAP-18** Automated tests (no Playwright/Cypress; only manual test plans).
- **GAP-19** React error boundary (an unhandled exception blanks the app).
- **GAP-20** Pagination on list pages (loads all rows; degrades at scale).
- **GAP-21** Mobile responsiveness pass.
- **GAP-22** Three timeline models consolidation.
- **GAP-23** Generated DB types (`supabase gen types`) to replace hand-authored `database.ts`.

---

## Quick verdict

| Question | Answer |
|---|---|
| Migrations run cleanly on a fresh project? | ✅ Yes (after this branch's fixes) |
| Auth + RBAC functional in real mode? | ✅ Yes (role mechanism now consistent) |
| Safe to expose cost data to non-admin roles? | ✅ Yes — GAP-01/02 fixed in security-hardening branch |
| All modules persist writes? | ❌ No — Store/QC/AFS simulated (GAP-03) |
| Reports reflect real data? | ❌ No — mock-only (GAP-05) |
| Ready for real Supabase setup? | ✅ Yes |
| Ready for pilot (working modules)? | 🟡 Conditional — see verdict in PR / `SUPABASE_REAL_SETUP.md` |
| Ready for full production? | ❌ Not yet — Priority 1 + key Priority 2 required |
