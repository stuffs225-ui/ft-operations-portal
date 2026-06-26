# Management and Support Sprint — After Sales, Reports, Control Tower, Admin, Viewer

**Branch:** `feature/management-support-sprint-after-sales-reports-control-tower-viewer`
**Base main SHA:** `e745203b70e3d12793276ca72cadf16e762478a1`

---

## Executive Summary

This sprint covers the management and support surfaces — After Sales, Reports, Control Tower /
Operations Manager, Admin overview, and Viewer / Management dashboard — to improve visibility and
executive-readiness without changing business logic, schema, RLS, route guards, permissions, or
workflow gates.

On inspection, **all five areas were already mature** (PageHeader, real-data KPI cards, proper
loading/empty states, role filtering, read-only where required, no fabricated counts). They came
from prior dedicated sprints (Phase 16 After Sales closure, Phase 17 Control Tower / SLA reports,
Phase 18 Work Centers, Phase 19 UX modernization, and the recent Commercial Admin Controls).

The one genuine, safe **functional gap** found was an **After Sales deep-link gap**: the After
Sales dashboard's six KPI cards all linked to an unfiltered `/after-sales/maintenance` (which
defaults to the "Open" tab), and the maintenance list ignored URL params — so clicking "Critical
Priority", "Completed", etc. did not filter to the matching view. This PR fixes that with the same
validated `?tab=` deep-link pattern already used for Procurement and the Coordinator Queue. The
other four areas had no clear gaps and are documented as mature / unchanged.

---

## Scope

| Area | Outcome |
|------|---------|
| After Sales | **Changed** — KPI cards now deep-link to the matching maintenance tab; list reads `?tab=` |
| Reports | **Inspected, unchanged** — mature; all 14 report routes verified to exist (no broken links) |
| Control Tower / Operations Manager | **Inspected, unchanged** — mature, all live-data |
| Admin overview | **Inspected, unchanged** — mature; commercial-control cards already present |
| Viewer / Management dashboard | **Inspected, unchanged** — mature, read-only, all live-data |

---

## Files Inspected

- `src/pages/AfterSales.tsx`, `src/pages/AfterSalesMaintenance.tsx`
- `src/pages/Reports.tsx`
- `src/pages/ControlTower.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/ManagementDashboard.tsx`
- `src/app/App.tsx` (routes + guards for all of the above)

## Routes Inspected

`/after-sales`, `/after-sales/maintenance`, `/reports` (+ all 14 `/reports/*` targets),
`/control-tower`, `/admin-dashboard`, `/admin/invoicing-schedule`, `/admin/sales-targets`,
`/management-dashboard`.

---

## After Sales — current state and changes

**Current state:** Mature. `AfterSales.tsx` has a `PageLoader`, six real-data KPI cards (Open,
In Progress, Parts Waiting, Critical Priority, Completed, Total — all from
`afs_maintenance_requests` count queries with mock fallback), a recent-requests list with an empty
state, and governance rules. `AfterSalesMaintenance.tsx` has tabbed filtering (Open / Critical /
In Progress / Completed / Closed / All) with real counts.

**Gap:** the six dashboard KPI cards all linked to `/after-sales/maintenance` with no parameter,
and the list initialised its tab to `'open'` regardless of how it was reached — so the KPIs were
not actionable filters.

**Changes (read-only, navigation only):**
1. `AfterSalesMaintenance.tsx` — reads a validated `?tab=<key>` query param (checked against the
   `TABS` keys) to set the initial tab; unknown/absent values fall back to `'open'`. Existing tab
   behaviour is otherwise unchanged.
2. `AfterSales.tsx` — the six KPI cards now deep-link to the matching tab:
   - Open Requests → `?tab=open`
   - In Progress → `?tab=in_progress`
   - Parts Waiting → `?tab=in_progress` (correct superset — `parts_waiting` ∈ `IN_PROGRESS_STATUSES`;
     the list has no standalone parts-waiting tab)
   - Critical Priority → `?tab=critical`
   - Completed → `?tab=completed`
   - Total Requests → `?tab=all`

No maintenance workflow, mutation, status logic, or query was changed.

## Reports — current state (unchanged)

`Reports.tsx` is a mature, role-filtered report hub: PageHeader, six grouped sections (Executive,
Projects & Sales, Operations, Suppliers, Operational Excellence, Reference), a role-based "no
reports available" empty state, and an "Open Control Tower" action. All cards are role-gated
(`admin` sees all; others see only their permitted reports). **All 14 linked `/reports/*` routes
were verified to exist — no broken links.** No fabricated data. No calculation logic on this page
(it is pure navigation). **No gaps found; left unchanged.**

## Control Tower / Operations Manager — current state (unchanged)

`ControlTower.tsx` is mature: `PageLoader`, ~16 live-data `count`-exact queries across projects,
QC findings, NCRs, release notes, procurement, AFS maintenance, hot projects, quotations, and
execution references; a "Critical Exceptions" section auto-computed from live data; severity
badges; and CSV export of overdue items. Title/subtitle already read "Operations Control Tower" /
the exact cross-module monitoring copy. Guarded to `operations_manager` + `viewer`. **No
fabricated counts. No gaps found; left unchanged.**

## Admin overview — current state (unchanged)

`AdminDashboard.tsx` is mature: real-data KPI strip (users, access requests, pending SO approvals,
active projects), a 10-card Quick Actions grid that **already includes the Commercial Controls
cards** added earlier (`/admin/invoicing-schedule`, `/admin/sales-targets`), a Cross-Module
Monitoring grid, and the governance `RoleRulesCard`. Admin-only by route guard; no non-admin
exposure. **No gaps found; left unchanged.**

> Optional future polish (explicitly **not** done here to avoid unnecessary change to a mature,
> working page): group the 10 quick-action cards under labelled subsections (User & Access /
> Commercial Controls / Governance & Approvals / System Monitoring). This is purely presentational
> and was deferred as a non-gap.

## Viewer / Management dashboard — current state (unchanged)

`ManagementDashboard.tsx` is mature and **read-only**: a "Read-only" badge, eight real-data KPIs
with severity colouring and a graceful fallback set, Management Visibility links, Executive Report
shortcuts, and governance rules. Every tile is a `<Link>` (navigation only) — there are **no
mutation actions** (no edit/approve/delete/create). Guarded to `viewer`. **No gaps found; left
unchanged.**

---

## Data Sources Used

Only the existing `afs_maintenance_requests`-derived KPI values already loaded by `AfterSales.tsx`
were re-used (to choose KPI-card destinations). **No new queries, tables, views, functions, or
columns were introduced.** No migration object is referenced.

## Role Access / Route / Guard Review

- **Routes changed:** None (route *definitions* in `App.tsx` are untouched; the maintenance list
  now honours an incoming `?tab=` param on its existing route).
- **Route guards changed:** None.
- **roleMatrix changed:** None.
- **Navigation changed:** None (sidebar/nav data untouched).
- **Permissions broadened:** None. No admin-only data is exposed to viewer/management; the Viewer
  dashboard remains read-only.

## Business Logic Safety Review

| Area | Changed? |
|------|----------|
| After Sales workflow / mutations / status logic | No |
| Report calculations / export behaviour | No |
| Control Tower business logic | No |
| Admin role management / user creation | No |
| Viewer permissions / read-only behaviour | No |
| Sales Dashboard / Coordinator / Commercial Admin | No |
| Projects/SO / Procurement / Store / Factory / QC / AFS workflows | No |
| DB schema / RLS / migrations | No |

## Migration Policy Confirmation

No migrations were applied, created, or pushed; no SQL executed. The change is pure client-side
navigation; no unapplied-migration object is referenced, so no new runtime dependency on a
deferred migration was introduced.

---

## Validation Results

- `npm run build` — zero TypeScript errors ✓
- `npx tsc --noEmit` — clean ✓
- Changed-file lint (`AfterSales.tsx`, `AfterSalesMaintenance.tsx`) — zero issues ✓
- Full lint — 56 problems (22 errors, 34 warnings); identical to the current baseline; zero new
  issues ✓
- Local route validation — not performed; the remote environment has no seeded auth/data session.
  The change is navigation-only and covered by build + typecheck + lint.

---

## Remaining Risks

- **Non-blocking:** Interactive route validation not possible without a seeded session.
- **Non-blocking:** "Parts Waiting" KPI links to the In Progress tab (a correct superset) because
  the maintenance list has no standalone parts-waiting tab; this is intentional and documented.

---

## Recommended Next Step

- Optionally group the Admin Quick Actions into labelled subsections (presentational only).
- Proceed to the planned full migration audit / go-live readiness work as a separate, supervised
  effort — explicitly **out of scope** here.
