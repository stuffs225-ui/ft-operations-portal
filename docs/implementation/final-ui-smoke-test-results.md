# Final UI Smoke Test — Results

**Branch:** `feature/final-production-readiness-screenshot-smoke-go-no-go`
**Base main SHA:** `1a385a6f2bfbb9c2a3d27ef51cba7b932b2f20f7`

> **Method note:** the build sandbox has no Supabase secrets and the Supabase host is blocked by
> network egress, so interactive real-auth rendering is **not possible here**. Each route was
> **static + code-path verified** (route defined, guard correct, page defensively coded, deep-links
> resolve). Live rendering is covered by the screenshot baseline (run #2 triggered this sprint —
> see `final-screenshot-baseline-results.md`) and the manual smoke packet. Statuses below are
> **Static-verified** unless a live result is recorded.

Severity: **B** = blocker · **M** = major · **m** = minor.

| # | Route | Status | Evidence | Issue | Sev | Fix | Follow-up |
|---|-------|--------|----------|-------|-----|-----|-----------|
| 1 | `/sales` | Static-verified | route defined (no guard = broad, RLS-scoped); `data?.`/`?? []` guards; `scheduleUnavailable` derived from `invoicingScheduleUnavailable` warning (false now 100 applied → real data, no banner) | none | — | none | live smoke + screenshot |
| 2 | `/admin/invoicing-schedule` | Static-verified | `RequireRole admin`; `MigrationPendingNotice` only when `!availability.available` (now available → hidden); `rows.length===0` empty state; modals gated on rows | none | — | none | live smoke + screenshot |
| 3 | `/admin/sales-targets` | Static-verified | `RequireRole admin`; `available` gating; Add/Edit disabled when `!available` (now available); KPIs show `—` only when unavailable | none | — | none | live smoke + screenshot |
| 4 | `/sales-coordinator` | Static-verified | `RequireRole [sales_coordinator, ops_manager]`; KPI tiles deep-link to `/coordinator-queue?tab=…&filter=…` (destination reads both params; all source values valid keys) | none | — | none | live smoke |
| 5 | `/projects` | Static-verified | route defined (broad, RLS-scoped); KPI strip computed from loaded data; list defensive | none | — | none | live smoke |
| 6 | `/procurement` | Static-verified | `RequireRole [procurement_user, ops_manager]`; KPI cards link `?status=`; PO/PR/Supplier lists read `?status=` (validated) | none | — | none | live smoke |
| 7 | `/store` | Static-verified | `RequireRole [store_user, ops_manager]`; real counts incl. QC-handoff + custody-approval; loading shows `…` (PR #146) | none | — | none | live smoke |
| 8 | `/factory` | Static-verified | `RequireRole [factory_user, ops_manager]`; fabricated "Requirements Missing" queue removed (PR #146) | none | — | none | live smoke |
| 9 | `/qc` | Static-verified | `RequireRole [qc_user, ops_manager]`; all KPIs/queues from real count queries; loading skeletons | none | — | none | live smoke |
| 10 | `/dubai-afs` | Static-verified | `RequireRole [afs_user, ops_manager]`; real KPIs + PN-gate alert | none | — | none | live smoke |
| 11 | `/after-sales` | Static-verified | `RequireRole [afs_user, ops_manager]`; KPI cards deep-link `/after-sales/maintenance?tab=…` (destination reads `?tab=`) | none | — | none | live smoke |
| 12 | `/reports` | Static-verified | role-filtered hub; **all 14 `/reports/*` card routes confirmed defined** (no broken links) | none | — | none | live smoke |
| 13 | `/control-tower` | Static-verified | `RequireRole [ops_manager, viewer]`; `PageLoader`; real cross-module counts; no admin-only mutations | none | — | none | live smoke |
| 14 | `/management-dashboard` | Static-verified | `RequireRole [viewer]` (+admin implicit); read-only `<Link>` tiles only; **no edit/approve/delete/create** | none | — | none | live smoke |
| 15 | `/admin-dashboard` | Static-verified | `RequireRole admin`; quick-action cards incl. admin-only commercial controls | none | — | none | live smoke |

---

## Code-path findings

- **No broken routes.** All 15 critical routes defined with appropriate guards; all 14 `/reports/*`
  card targets exist; all deep-link destinations (`?status=`, `?tab=`, `?filter=`) read their
  params and every source value maps to a valid key.
- **No null-data crash risk** on the three now-active commercial pages — all use optional chaining,
  `?? []`, availability gating, and controlled empty states.
- **No stale migration-pending wording.** Sales/Admin pages derive the pending state dynamically
  from runtime query results (`deferredMigrationSafety` / `isMissingRelationError`); with 099/100
  applied, these states clear automatically.

## Fixes made

**None** — no safe bug was found that warranted a code change. The system is statically clean.

## Pending (operational, needs live auth)

- Live render confirmation of all 15 routes (covered by the screenshot baseline run #2 + the manual
  smoke packet `post-migration-099-100-ui-smoke-test.md`).
