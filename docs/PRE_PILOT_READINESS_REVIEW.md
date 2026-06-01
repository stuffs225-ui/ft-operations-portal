# Pre-Pilot Readiness Review

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Purpose:** Honest go / no-go assessment after Wave A + Wave B.

---

## 1. What Wave A + Wave B fixed

### Wave A — mock-data isolation
- Added `src/lib/dataMode.ts` (`getDataMode`, `isLiveMode`, `isDevMockMode`, `mockOrEmpty`, `mockOrValue`) and `src/components/ui/DataSourceBadge.tsx`.
- Fixed **25 pages** that previously rendered mock data in live mode; each now shows an empty state + preview badge in live mode. Mock data **no longer leaks** when Supabase is configured.
- `Dashboard` and `ControlTower` show an "aggregation not yet connected to live data" notice in live mode instead of fabricated KPIs.
- See `docs/MOCK_DATA_ISOLATION_REVIEW.md`.

### Wave B — security + critical fixes
- Added `src/components/auth/RequireRole.tsx` — route-level role guard. Closes **GAP-07** (previously any authenticated user could deep-link to `/admin/*`, `/settings`, `/audit-log`).
- Applied `RequireRole` to all admin/management routes in `src/app/App.tsx`.
- **Cost-view fix:** `ProjectDetail` now queries `project_vehicle_lines_safe` (was the base table, which exposed revenue to all project-participant roles).
- **Crash fix:** `NotificationSettings` removed an unsafe `.find(...)!` that crashed on empty preferences.

---

## 2. Security posture now

| Area | Status |
|------|--------|
| GAP-07 route-level role enforcement | **CLOSED** (Wave B `RequireRole`) |
| Service-role keys / secrets in `src` | **None** — verified clean |
| Email / SMS sending from browser | **Disabled** — providers false; nothing sends client-side |
| RLS — projects row-isolation | **Verified correct** |
| RLS — access_requests anon-insert-only | **Verified correct** |
| RLS — document_templates no-self-approval | **Verified correct** |
| Cost/revenue exposure (ProjectDetail) | **Fixed** via `_safe` view |

Defense-in-depth note: a couple of procurement detail pages still query base
`purchase_order_items` / `purchase_orders_to_supplier`. This is acceptable
(procurement-only pages), but `purchase_order_items_safe` could be used for
extra defense-in-depth in a later pass.

---

## 3. Remaining blockers before pilot

| Ref | Blocker | Detail |
|-----|---------|--------|
| **GAP-03** | Store / QC / AFS / Maintenance writes still simulated | These modules' write paths are not wired to Supabase; ProjectDetail Store/QC sub-tabs render empty in live mode pending real reads. |
| **GAP-05** | Reports mock-only (13 pages) | 13 reports pages still show sample analytics in live mode; need the Wave A preview treatment (Wave F). |
| **GAP-08** | Silent read errors | Failed Supabase reads can fail silently instead of surfacing an error state. |
| **GAP-09** | Document upload not wired | Document upload / storage integration is not connected. |
| — | Deferred UX waves C–F | Design system, navigation restructure, role workspaces, reports overhaul still outstanding. |

---

## 4. Verdicts (strict)

### Ready for role-by-role testing? — **CONDITIONAL YES**
Mock data no longer leaks in live mode, and admin routes are guarded by
`RequireRole`. Proceed **only after** a manual smoke pass
(`docs/FINAL_ROUTE_TEST_PLAN.md`) confirms every route loads, shows correct
empty states in live mode, and the role guards behave.

### Ready for pilot? — **NO**
GAP-03 (simulated writes), GAP-05 (reports mock-only), and GAP-09 (document
upload) mean core operational workflows cannot be exercised end-to-end on real
data. Role workspaces (Wave E) are also outstanding, so roles still see a
non-role-aware Dashboard.

### Ready for Vercel deploy? — **NO**
Do not deploy until the pilot blockers above are resolved **and** live-mode
environment variables are verified (Supabase URL/key present and correct, app
confirmed running in `live` mode, empty-DB behaviour validated).

---

## 5. Recommended next steps (in order)

1. **Manual smoke test** — run `docs/FINAL_ROUTE_TEST_PLAN.md` in both dev and live mode; fix any crash/leak found.
2. **GAP-03** — wire real reads/writes for Store, QC, AFS, Maintenance (and ProjectDetail sub-tabs).
3. **GAP-08** — add visible error states for failed reads (consider the deferred `useSupabaseQuery` hook).
4. **GAP-09** — wire document upload / storage.
5. **GAP-05 (Wave F)** — apply `mockOrEmpty` + preview badge to the 13 reports pages; then build real aggregation for Dashboard/ControlTower.
6. **Wave E** — role-aware Dashboard / workspaces (`docs/ROLE_WORKSPACE_REDESIGN.md`).
7. **Waves C / D** — design-system unification and navigation restructure.
8. **Pre-deploy** — verify live-mode env vars; re-run the route test plan against the real Supabase project; then deploy.
