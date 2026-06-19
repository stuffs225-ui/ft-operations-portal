# Step 18.5A — Role Screenshot UX Audit

**Date:** 2026-06-19  
**Branch:** `feature/step-18-5a-test-users-and-ux-audit`  
**Auditor:** Static code analysis (browser unavailable in CI environment)  
**Method:** Full codebase review of all role-bearing pages, navigation config, route guards, and component code. Screenshots deferred to local/staging run — see "Running Screenshots" section below.

---

## Screenshot Inventory

Screenshots were not captured in this CI run because no browser binary is available in the remote execution environment (Playwright Chromium download blocked; system snap unavailable). The `scripts/playwright/ux-audit-screenshots.spec.ts` script is ready to run locally or on a proper staging machine.

### Running Screenshots Locally

```bash
# 1. Install browsers
npx playwright install chromium

# 2. Start dev server
npm run dev

# 3. Set role credentials
export VITE_APP_URL=http://localhost:5173
export TEST_ADMIN_EMAIL=admin.test@example.com
export TEST_ADMIN_PASSWORD=Naffco%%%745
export TEST_OPS_EMAIL=ops.test@example.com
export TEST_OPS_PASSWORD=Naffco%%%745
# ... (all 8 roles)

# 4. Run audit
npx playwright test scripts/playwright/ux-audit-screenshots.spec.ts

# Screenshots land in docs/ux-audit/screenshots/{role}/
```

Screenshot directories are created and ready:
- `docs/ux-audit/screenshots/admin/`
- `docs/ux-audit/screenshots/operations_manager/`
- `docs/ux-audit/screenshots/sales_user/`
- `docs/ux-audit/screenshots/procurement_user/`
- `docs/ux-audit/screenshots/store_user/`
- `docs/ux-audit/screenshots/factory_user/`
- `docs/ux-audit/screenshots/afs_user/`
- `docs/ux-audit/screenshots/qc_user/`

---

## Login Success / Failure by Role

Test users were created via `scripts/create-test-users.mjs`. Execution was skipped in this environment due to missing `SUPABASE_SERVICE_ROLE_KEY` (expected in CI — run locally with staging credentials).

| Role | Email | Expected Result |
|---|---|---|
| admin | admin.test@example.com | ✅ Should succeed → lands on `/` (Dashboard) |
| operations_manager | ops.test@example.com | ✅ Should succeed → lands on `/` (Dashboard) |
| sales_user | sales.test@example.com | ✅ Should succeed → redirected to `/sales` |
| procurement_user | procurement.test@example.com | ✅ Should succeed → lands on `/` (Dashboard) |
| store_user | store.test@example.com | ✅ Should succeed → lands on `/` (Dashboard) |
| factory_user | factory.test@example.com | ✅ Should succeed → lands on `/` (Dashboard) |
| afs_user | afs.test@example.com | ✅ Should succeed → lands on `/` (Dashboard) |
| qc_user | qc.test@example.com | ✅ Should succeed → lands on `/` (Dashboard) |

---

## Broken Routes Found

### BR-1: sales_user cannot navigate to `/reports` (hard block)
The route `/reports` is guarded: `roles={['operations_manager', 'viewer', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'sales_coordinator']}`. `sales_user` is excluded. Their only report link is `/reports/sales` which is accessible only via the Sales Workspace page. There is no sidebar Reports link for `sales_user`.

**Impact:** Sales users have no discoverable path to their own sales report from the sidebar.

### BR-2: admin role missing from many `/reports/*` route guards
The `/reports` route and most subroutes list specific roles but **omit `admin`**. `admin` bypasses `RequireRole` (hardcoded admin pass-through), so this works correctly — but the omission is confusing when reading the code and could cause bugs if the bypass is ever removed.

### BR-3: `factory_user` visits `/reports` and sees 9 clickable cards — 8 give "Access Restricted"
The Reports hub (`/reports`) shows all cards where `!card.roles || card.roles.includes(role)`. Cards without a `roles` field (Project Reports, Sales Reports, Procurement Reports, Store Reports, QC Reports, AFS Reports, Data Quality, Issues & Risks) are shown to all roles. However, all of these except Factory Reports have route guards that block `factory_user`. Result: 8 visible cards that navigate to "Access Restricted".

Same issue affects: `procurement_user` (sees 8 cards, 7 lead to denial), `store_user` (8 cards, 7 denial), `qc_user` (8 cards, 5 denial), `afs_user` (8 cards, 7 denial).

### BR-4: No 404 route
The router has no catch-all `<Route path="*">` element. Navigating to an unknown URL renders nothing (blank content area inside AppLayout) with no error message.

---

## Sidebar Visibility Issues

### SV-1: sales_user has no "Dashboard" in sidebar
`Dashboard` nav item has roles list that excludes `sales_user`. When `sales_user` logs in, they are redirected to `/sales` via `RootRedirect`. The sidebar shows no Dashboard entry, and clicking the NAFFCO logo navigates to `/` which redirects back to `/sales`. But there is no explicit "Home" or "Sales Dashboard" label in the sidebar — the "Sales Workspace" item is the implicit home. New users will not understand this pattern.

**Affected roles:** sales_user only.

### SV-2: Action Inbox has no role restriction in sidebar
`Action Inbox` nav item has no `roles` field — visible to all authenticated users. This is intentional (inbox is cross-role), but inbox content is not filtered by role in live mode, meaning all roles see all tasks.

### SV-3: admin sidebar is extremely long (23+ items)
Admin sees all 8 sections and 23+ navigation items. There is no collapsing, pinning, or "favourites" mechanism. On a 900px viewport, the sidebar will be scrollable but users must scroll to reach ADMIN & SYSTEM items. Visual scanning is expensive.

### SV-4: Sidebar section headers are hidden when no items are visible
`buildVisibleNav()` correctly suppresses empty sections and their separators. This is implemented correctly. ✅

### SV-5: No active-state scrolling
On deep sidebar scrolling, the active NavLink is not scrolled into view. If a user is deep in a section, the sidebar won't scroll to show the active link.

### SV-6: `procurement_user` gets Dashboard but no cross-functional context
Dashboard for procurement_user shows the generic operations KPI strip. But procurement_user has no visibility into projects or QC — the KPI strip's "Projects Active", "In QC" etc. may be misleading context for a purchasing role.

---

## Confusing Navigation Issues

### CN-1: "Operations Overview" (Control Tower) vs "Dashboard"
The main Dashboard page title is "Operations Control Tower" but the nav item for the dedicated control tower page is "Operations Overview". These two names overlap and create confusion about which page is the "control tower."

### CN-2: Reports hub is titled "Reports & Control Tower" but links to /control-tower
The Reports hub PageHeader says "Reports & Control Tower" and has a prominent "Open Control Tower" button. Users who reach the Reports hub are already past the point where they expected to find the control tower — duplicating the link here is redundant.

### CN-3: sales_user workflow is implicit
`sales_user` lands on Sales Workspace. From there they can navigate to Quotations, Hot Projects, Receivables, Projects. But there is no breadcrumb trail back to Sales Workspace, and the page title "Sales Workspace" gives no indication that this is the user's "home" or primary page.

### CN-4: "Projects / SO" nav item is visible to all roles
The `Projects / SO` nav item has no `roles` restriction — all authenticated users can navigate to the Projects list. A `qc_user` or `factory_user` who navigates to Projects sees the full project list including financial data (project value in SAR). This may be an intentional product decision but it exposes financial amounts to non-commercial roles.

### CN-5: Duplicate navigation paths to the same content
- "WO/PN Gate" is in sidebar under PROJECTS
- Dashboard KPI strip for factory_user links to `/wo-pn-gate`
- WO/PN gate content also appears in the Operations Overview/ControlTower page
Three paths to the same gate information; no canonical path established.

### CN-6: Templates accessible to 8 roles but shows one shared document library
Document Templates (`/templates`) is accessible to all operational roles but shows a single shared list. There is no per-role template filtering. A `store_user` will see quotation templates, factory templates, etc. — all templates mixed.

---

## Weak Layouts

### WL-1: Reports hub card grid breaks role boundaries (see BR-3)
The most severe layout issue: the card grid in `/reports` does not correctly filter by route guard roles, causing clickable dead-end cards.

### WL-2: Dashboard "My Work" quick-access cards are static
The My Work quick-access cards in Dashboard are hardcoded per role with static navigation links. They do not show live counts (open tasks, pending approvals, etc.). For an operations_manager, seeing "0 PRs pending" or an actual count would be far more useful than a generic link.

### WL-3: Action Inbox empty state is unclear
When `mockOrEmpty()` returns `[]` in live mode, the inbox shows `EmptyState`. The message doesn't distinguish between "no tasks today" and "live data not yet wired up."

### WL-4: Table-heavy pages have no pagination
Pages like Quotations, Projects, Procurement Requests show all rows in one table. In production with large datasets (100+ rows), these will be very slow and unusable without pagination.

### WL-5: Mobile layout — sidebar drawer works but tables overflow
Tables use `overflow-x-auto` but have no `min-width` set on cells. On 375px mobile, most operational tables will be unreadable without horizontal scroll guidance.

### WL-6: Login page does not reflect staging vs production clearly
The Login page shows "Supabase Auth" badge in green when Supabase is configured. There is no environment label (staging vs production). A staging user could be confused about which environment they're logging into.

### WL-7: PageHeader breadcrumbs are inconsistently applied
Some pages have breadcrumbs (e.g. Reports pages), others do not (e.g. Action Inbox, Notifications, Dashboard). Inconsistent application breaks wayfinding across the app.

---

## Unclear Action Buttons

### AB-1: "Fix" link in Data Quality report opens in same tab with ExternalLink icon
`ReportsDataQuality` uses `<Link to={check.fix_path}>` with `<ExternalLink />` icon. The icon implies a new tab but it navigates in the same tab. Misleading icon.

### AB-2: ReportExportBar "Print" and "Export CSV" look identical in weight
Both buttons use the same visual style (icon + text) with no hierarchy. If the intent is Print as primary and CSV as secondary, visual hierarchy should reflect that.

### AB-3: "New" buttons are visible to all authenticated users on Quotations page
`/quotations/new` route has `RequireRole roles={['admin', 'operations_manager', 'sales_user']}`. But the "New Quotation" button on the Quotations list page is always visible (the list page itself has no role guard). A `factory_user` can see the New Quotation button and navigate to `/quotations/new`, getting a RequireRole denial on the create form — confusing.

### AB-4: WoPnGateCard "blocked" state provides no clear action
When `gate.hasActiveWO` is false, the `WoPnGateCard` shows a blocked state message. There is no CTA to "Request a WO" or link to the governance page where a WO would be created.

### AB-5: Convert to SO button in Sales page
The "Convert to SO" action in the Quotation list requires `operations_manager` or `admin` but is visible in the UI for `sales_user`. Clicking it triggers a `RequireRole` failure or API-level rejection. The button should be conditionally rendered.

---

## Poor Empty/Error States

### ES-1: Live mode empty states — generic "No data" messages
When `isSupabaseConfigured` is true and no data exists, `mockOrEmpty()` returns `[]`. All tables show their generic empty-row state. There is no contextual message explaining whether data is expected ("No procurement requests yet") vs. a data load error.

### ES-2: No 404 page
As noted in BR-4, unknown routes render a blank content area. Users have no way to know why the page is empty or where to go.

### ES-3: RequireRole denial message is generic
"You don't have permission to view this page. If you believe this is a mistake, contact your administrator." This message does not tell the user what role IS required, making it hard to determine if the denial is a configuration error or expected.

### ES-4: DataSourceBadge "Preview" pages
Pages like Supplier Scorecards, CAPA, Issues, and Health Scores show `variant="preview"` badge. The badge says "Preview" but shows data (mock data). Users may think the data is real. The badge needs a clearer tooltip or inline explanation.

### ES-5: ControlTower schema blocker notices
`ReportsExecutive` shows an inline amber notice about missing health scores and SLA events. The notice text is developer-facing ("schema blocker"). End users should never see developer notes.

### ES-6: WO/PN gate blocked state — no context for non-admin users
`factory_user` can see the WO/PN gate via the sidebar. When no active WO exists, they see a blocked state with no actionable path — the admin approvals route is hidden from them. Dead end.

---

## Report / Print Issues

### RP-1: Print CSS is correct but inconsistently tested
`.report-print-root` and `.no-print` classes exist. Only pages with `ReportExportBar` have the Print button. Pages without the bar (Supplier Reports, CAPA, Issues, Health Scores, Data Quality) have no print option despite showing tabular data that users would likely want to print.

### RP-2: CSV export column formatting
`exportRowsToCsv()` uses `ReportColumn<T>` with a `value` function. For reports with nested data (e.g., delayed_po_count / total_po_count as a ratio string), the CSV exports two separate numeric columns which may not match the visual "8 / 12" display.

### RP-3: Reports hub card "Badge" labels are inconsistent
Some cards show "Live" badge (Control Tower), some show "SLA" badge, most show nothing. There is no visual indicator of which reports have live data vs preview data at the hub level — users must click into each report to see the `DataSourceBadge`.

---

## Top 20 UX Fixes — Ranked by Priority

| # | Issue ID | Finding | Priority | Category |
|---|---|---|---|---|
| 1 | BR-3 | Reports hub shows unreachable cards for operational roles — massive confusion | P0 Critical | Broken |
| 2 | BR-4 | No 404 page — unknown routes show blank screen | P0 Critical | Broken |
| 3 | AB-3 | "New Quotation" button visible to all roles, leads to access denied | P1 High | Broken |
| 4 | ES-5 | Developer "schema blocker" text exposed to end users in ReportsExecutive | P1 High | Content |
| 5 | SV-1 | sales_user has no "Dashboard" sidebar entry — no clear home | P1 High | Navigation |
| 6 | CN-1 | "Operations Control Tower" (dashboard title) vs "Operations Overview" (nav) name collision | P1 High | Navigation |
| 7 | ES-3 | RequireRole denial message doesn't indicate what role is needed | P1 High | Error State |
| 8 | AB-5 | "Convert to SO" button visible to sales_user who lacks permission | P1 High | Permission |
| 9 | WL-4 | No pagination on large tables (Quotations, Projects, Procurement) | P1 High | Performance |
| 10 | AB-1 | ExternalLink icon on in-app navigation links (Data Quality "Fix") | P2 Medium | UX Detail |
| 11 | CN-4 | All roles see Projects list including financial SAR amounts | P2 Medium | Data Visibility |
| 12 | WL-2 | My Work cards show no live counts — static links only | P2 Medium | Missing Feature |
| 13 | AB-4 | WO/PN Gate blocked state has no action path for factory_user | P2 Medium | Dead End |
| 14 | ES-4 | "Preview" DataSourceBadge is ambiguous — users think data is real | P2 Medium | Clarity |
| 15 | WL-3 | Action Inbox empty state doesn't distinguish no-tasks vs not-wired | P2 Medium | Empty State |
| 16 | ES-6 | WO/PN blocked state has no actionable next step for factory_user | P2 Medium | Dead End |
| 17 | CN-2 | Reports hub duplicates "Open Control Tower" link redundantly | P3 Low | Polish |
| 18 | SV-3 | Admin sidebar has 23+ items with no collapsing or pinning | P3 Low | Polish |
| 19 | RP-3 | Reports hub cards don't show Live vs Preview badge at hub level | P3 Low | Clarity |
| 20 | WL-7 | PageHeader breadcrumbs applied inconsistently across pages | P3 Low | Polish |

---

## Quick Wins vs Larger Redesign Items

### Quick Wins (< 1 hour each, single file, no schema change)

| Fix | File(s) | Effort |
|---|---|---|
| **Fix Reports hub card filtering** — add route guard roles to each `ReportCardDef` so only accessible cards show | `src/pages/Reports.tsx` | 30 min |
| **Add 404 catch-all route** — add `<Route path="*">` with a NotFound page | `src/app/App.tsx` + new `src/pages/NotFound.tsx` | 20 min |
| **Remove developer notes from ReportsExecutive** — replace schema blocker notice with user-facing "Coming soon" text | `src/pages/ReportsExecutive.tsx` | 10 min |
| **Fix ExternalLink icon on Data Quality Fix links** — change to `ArrowRight` or remove icon | `src/pages/ReportsDataQuality.tsx` | 5 min |
| **Conditionally render "New Quotation" button** — check role before rendering the button | `src/pages/Quotations.tsx` | 15 min |
| **Fix "Convert to SO" button visibility** — render only for ops_manager/admin | `src/pages/Sales.tsx` | 10 min |

### Medium Effort (1–4 hours, requires design decisions)

| Fix | Effort |
|---|---|
| Add "sales_user" landing page or rename Sales Workspace as "My Dashboard" in sidebar | 2 hours |
| Resolve "Operations Control Tower" vs "Operations Overview" naming — rename one consistently | 1 hour |
| Add live task counts to My Work quick-access cards on Dashboard | 3 hours |
| Add contextual empty states per module (not generic "No data") | 4 hours |
| Add `min-w-0` / responsive improvements to key table columns | 2 hours |

### Larger Redesign Items (Step 19 scope)

| Fix | Effort |
|---|---|
| Pagination for all list pages (Quotations, Projects, Procurement, etc.) | 1–2 days |
| Sidebar collapsible/pinnable items for admin/ops | 2 days |
| Reports hub redesign — role-specific report landing pages | 1 day |
| Add role context to RequireRole denial — show which role is required | 2 hours + design review |
| DataSourceBadge tooltip/explanation system | 1 day |

---

## Recommended First UX Fix PR

**PR Title:** `fix(ux): Reports hub broken cards, missing 404, and role visibility quick wins`

**Scope (6 files, ~100 LOC total):**

1. `src/pages/Reports.tsx` — add explicit `roles` to all report cards matching route guards; remove redundant Control Tower button from header
2. `src/app/App.tsx` — add `<Route path="*" element={<NotFound />} />` catch-all
3. `src/pages/NotFound.tsx` (new) — simple "Page not found" with home link
4. `src/pages/ReportsExecutive.tsx` — replace developer schema blocker notices with user-facing "Coming soon" cards
5. `src/pages/ReportsDataQuality.tsx` — fix ExternalLink icon to ArrowRight
6. `src/pages/Quotations.tsx` — conditional "New Quotation" button render

**Expected impact:** Eliminates 6 of the top 10 UX issues. Roles `factory_user`, `store_user`, `qc_user`, and `afs_user` stop seeing inaccessible report cards. All users get a proper 404 page. Developer content removed from production UI.

**No schema changes, no workflow changes, no route guard changes.**

---

## Role-by-Role Summary

### admin
- Sees all 23+ sidebar items across 8 sections
- Lands on Dashboard (Operations KPI strip + My Work)
- Full access to all reports, admin tools, audit log
- **Issue:** Sidebar length — must scroll to reach admin tools

### operations_manager
- Very similar to admin except no Admin/Users, Settings, Audit Log
- Best-served role in the app — full operational visibility
- **Issue:** "Operations Control Tower" dashboard title vs "Operations Overview" nav create naming confusion

### sales_user
- Redirected to `/sales` on login — Sales Workspace is implicit home
- Sidebar: no Dashboard, Notifications, Sales Workspace, Hot Projects, Quotations, Receivables, Projects/SO, Templates
- Reports: only `/reports/sales` (no sidebar link — must go through Sales Workspace)
- **Issue:** No clear "home" in sidebar; no breadcrumb back from reports to sales workspace

### procurement_user
- Lands on Dashboard
- Sidebar: Dashboard, Action Inbox, Notifications, Projects/SO, Procurement (full sub-nav), Custody, Templates, Reports
- Reports: only Procurement Reports and Supplier Reports are accessible; all other cards in the Reports hub lead to Access Restricted
- **Critical issue:** 7 out of 9 visible report cards navigate to denial pages

### store_user
- Lands on Dashboard
- Sidebar: Dashboard, Action Inbox, Notifications, Projects/SO, Store, Custody, Vehicle Receiving, Templates, Reports
- **Critical issue:** 7 out of 9 visible report cards in Reports hub navigate to denial pages

### factory_user
- Lands on Dashboard
- Sidebar: Dashboard, Action Inbox, Notifications, Projects/SO, WO/PN Gate, Factory/Production, Custody, Templates, Reports
- **Critical issue:** 8 out of 9 visible report cards in Reports hub navigate to denial pages
- **Issue:** WO/PN gate blocked state has no action path

### afs_user
- Lands on Dashboard
- Sidebar: Dashboard, Action Inbox, Notifications, Projects/SO, Dubai/AFS, After Sales, Custody, Templates, Reports
- **Critical issue:** 7 out of 8 visible report cards navigate to denial pages

### qc_user
- Lands on Dashboard
- Sidebar: Dashboard, Action Inbox, Notifications, Projects/SO, Material QC, Project QC, Templates, Reports
- Report access: QC Reports, CAPA Records, Issues & Risks (3 accessible)
- **Issue:** 5 out of 8 visible report cards navigate to denial pages

---

## Appendix — Sidebar Visibility Matrix by Role

| Nav Item | admin | ops | sales | proc | store | factory | afs | qc |
|---|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Action Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sales Workspace | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hot Projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quotations | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sales Coordinator | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Receivables | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Projects / SO | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Approvals | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| WO / PN Gate | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Procurement | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Factory / Production | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Store / Warehouse | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Material Custody | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Vehicle Receiving | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Material QC | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Project / Vehicle QC | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dubai / AFS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| After Sales | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Operations Overview | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Document Templates | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Access Requests | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notification Rules | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Report Subscriptions | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Admin / Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
