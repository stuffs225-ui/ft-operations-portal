# Admin — Artifact Brief

## 1. Role Summary

- **Role name:** `admin` (Administrator)
- **Operational purpose:** govern the system — users/roles/access, commercial controls (invoicing
  schedule, sales targets), audit, configuration, and exception oversight. `admin` **bypasses every
  route guard** (can reach all pages).
- **Expected landing route:** `/admin-dashboard`
- **Main responsibilities:** user & access management, commercial admin controls, audit review,
  reference data/config, approvals visibility.
- **Permission level:** full (governed by RLS).
- **Read/write scope:** CRUD on `sales_user_targets` and `project_invoicing_schedule` (via the
  migration-100 RPCs); user/role/access management; system settings; reads everything else.
- **Sensitive restrictions:** admin pages must stay admin-only; admin should use module work centers
  (not the admin console) for daily operational execution.
- **Modules/pages accessible:** everything. The **owning-role** files carry full detail for module
  pages; this file fully details the **admin-unique** pages and references the rest.

## 2. Design Principles for This Role

- **See first:** governance KPIs (users, pending access, pending approvals, active projects) and any
  exceptions; quick access to the commercial controls.
- **Obvious actions:** user management, access requests, invoicing schedule, sales targets, audit.
- **Hide:** nothing is hidden from admin, but daily operational execution should be steered to the
  module work centers, not the admin console.
- **Read-only vs write:** commercial controls are full-CRUD here (the only place targets/schedule
  can be edited); audit log is read-only.
- **Highlight:** pending approvals, overdue invoicing alerts, access requests awaiting review.
- **Minimize:** clutter — group the many admin actions into clear sections.
- **UX tone:** control-room/governance SaaS; calm, dense-but-organised, exception-aware.

## 3. Page Inventory

> Admin can reach all 121 routes. Below: **admin-unique** pages (full detail in §4) and the
> module/shared pages (cross-referenced to their owning-role brief). Admin-specific note: on module
> pages admin sees the same view as the owning role (admin always passes the guard).

| # | Page | Route | Component | Priority | Artifact | Detail location |
|---|------|-------|-----------|----------|----------|-----------------|
| 1 | Admin Dashboard | `/admin-dashboard` | `src/pages/AdminDashboard.tsx` | **P1** | Yes | §4 here |
| 2 | Admin Invoicing Schedule | `/admin/invoicing-schedule` | `src/pages/AdminInvoicingSchedule.tsx` | **P0** | Yes | §4 here |
| 3 | Admin Sales Targets | `/admin/sales-targets` | `src/pages/AdminSalesTargets.tsx` | **P0** | Yes | §4 here |
| 4 | User Management | `/admin/users` | `src/pages/AdminUsers*.tsx` | P2 | Yes | §4 (condensed) |
| 5 | Access Requests | `/admin/access-requests` (+`/:id`) | access-request pages | P2 | Yes | §4 (condensed) |
| 6 | Audit Log | `/audit-log` | `src/pages/AuditLog.tsx` | P2 | Yes | §4 (condensed) |
| 7 | System Settings | `/settings` | `src/pages/Settings.tsx` | P2 | Yes | §4 (condensed) |
| 8 | Notification Rules | `/admin/notification-rules` | notification-rules page | P3 | Optional | §4 (condensed) |
| 9 | Report Subscriptions | `/admin/report-subscriptions` (+`/:id`) | report-subscriptions pages | P3 | Optional | §4 (condensed) |
| 10 | Admin Approvals | `/admin-approvals` | `src/pages/AdminApprovals.tsx` | P2 | Yes | §4 (condensed) |
| 11 | WO / PN Gate | `/wo-pn-gate` | `src/pages/WoPnGate.tsx` | P2 | Optional | §4 (condensed) |
| 12 | Template Approvals | `/templates/approvals` | template-approvals page | P3 | Optional | §4 (condensed) |
| 13 | Sales / Coordinator / Projects pages | `/sales`, `/sales-coordinator`, `/projects`, … | — | mixed | — | See `sales_user.md`, `sales_coordinator.md` |
| 14 | Procurement / Store / Factory / QC / AFS pages | `/procurement…`, `/store…`, `/factory…`, `/qc…`, `/dubai-afs…` | — | mixed | — | See respective role briefs |
| 15 | Control Tower / Reports | `/control-tower`, `/reports*` | — | mixed | — | See `operations_manager.md` |
| 16 | Management Dashboard | `/management-dashboard` | — | P2 | — | See `viewer.md` |
| 17 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | P3 | Optional | See `sales_user.md` Shared appendix |

---

## 4. Pages Detail

### Page 2: Admin Invoicing Schedule (P0)

**Route:** `/admin/invoicing-schedule`

**Current Component / Files**
- `src/pages/AdminInvoicingSchedule.tsx`; `src/lib/projectInvoicingScheduleQueries.ts`
  (`getProjectInvoicingScheduleAdminList`, `…History`, `…Alerts`, `rescheduleProjectInvoicingSchedule`,
  `updateProjectInvoicingScheduleAmount`, `computeInvoicingScheduleKpis`);
  `src/lib/deferredMigrationSafety.ts` (`classifyAvailability`); local components
  (`MigrationPendingNotice`, `KpiCards`, `StatusBadge`, modals: Reschedule, Amount, History drawer,
  Split [disabled]). Migration 100 objects: `project_invoicing_schedule`, `_history`,
  `_alerts_view`, the two RPCs.

**Current Page Purpose**
The admin control surface for the project invoicing schedule (now DB-active): view/filter schedule
lines, see KPIs and overdue alerts, reschedule a line's date (reason + history), and adjust a line's
amount (reason + history).

**Current Version Description**
- **Header** + migration-pending notice (now hidden — 100 applied).
- **6 KPI cards:** Total Scheduled, Pending Invoicing, Overdue Amount, Overdue Lines, Invoiced,
  Rescheduled — computed client-side.
- **Filters:** Year, Month, Status, Overdue-only, Search (project code/customer).
- **Overdue Alerts** section (from `project_invoicing_schedule_alerts_view`).
- **Schedule table:** Project / Customer / Sales Owner / Line # / Label / Invoice Date / Amount / % /
  Status / Delays / Last Reason / Updated / Actions.
- **Modals:** Reschedule (new date + reason → RPC), Update Amount (amount ≥ 0 + reason → RPC),
  History drawer; Split modal present but **disabled**. Invoiced/cancelled lines locked.
- **Empty/loading/error** + migration-deferred states.

**Current Data / Business Context**
- Reads schedule list joined to projects + sales-owner profile; alerts view; history; mutates only
  via the two SECURITY DEFINER RPCs (admin-only, write a history row each). Admin-only route.

**Current Strengths**
- Complete control surface; migration-safe; every mutation is reason-logged with history; KPIs from
  real data; locked terminal states.

**Current UX Gaps / Opportunities**
- Very wide table (12+ columns) — hard to scan on anything below a large desktop.
- Overdue alerts and the main table are separate; an operator must reconcile them.
- The reschedule/amount modals are functional but the "why locked" (invoiced/cancelled) isn't always
  obvious until you try.
- KPIs are uniform tiles; the two critical ones (Overdue Amount/Lines) don't stand out.
- The disabled Split modal needs a clear "coming with a future RPC" affordance, not a dead button.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A focused commercial-control console: critical-first KPIs, an integrated overdue lens, a tighter
table with a row drawer for detail/history/actions, and explicit lock/disabled affordances — same
data, same RPCs, same admin-only scope.

**Improved Version Layout Requirements**
- **KPI band:** emphasise Overdue Amount + Overdue Lines (red) ahead of the rest; 6 tiles, the two
  critical ones visually heavier.
- **Filter bar:** Year / Month / Status / Overdue-only / Search in one compact bar.
- **Table → "overdue-aware" list:** fewer always-visible columns (Project/Customer, Date, Amount,
  Status, Delays); the rest (line #, label, %, last reason, sales owner, updated) in a **row detail
  drawer** that also hosts History and the Reschedule/Amount actions. Locked lines show a lock icon
  + reason on hover.
- **Overdue toggle** integrates the alerts view into the same table (filter), removing the separate
  section duplication (keep a count chip).
- **Modals:** Reschedule (date + required reason), Amount (≥0 + required reason); Split shown as a
  clearly-disabled "Coming soon (needs split RPC)" affordance.
- Preserve empty/loading/error + migration-deferred notice.

**Improved Version Content Requirements**
- KPI labels unchanged. Lock tooltip: "Invoiced/cancelled lines cannot be rescheduled or adjusted."
  Split affordance: "Installment split — available in a future release."

**Improved Version Visual Direction**
Governance SaaS; white cards; **red reserved for overdue**; amber for rescheduled/clarification;
green for invoiced; tabular-nums money; compact dense table; no playful UI; no fabricated data.

**Artifact Prompt for This Page**
> Create a Current Version and an Improved Version of an "Admin — Project Invoicing Schedule" control
> page for an enterprise operations portal (NAFFCO, governance SaaS). It is ADMIN-ONLY. Do not change
> the data model, the two admin-only RPCs (reschedule date with reason+history; adjust amount with
> reason+history), the locking of invoiced/cancelled lines, or permissions. Every mutation requires
> a reason and writes a history record; do not add new mutations.
>
> CURRENT VERSION: header; six KPI cards (Total Scheduled, Pending Invoicing, Overdue Amount, Overdue
> Lines, Invoiced, Rescheduled); a filter row (Year, Month, Status, Overdue-only, Search); a separate
> "Overdue Alerts" section; a wide schedule table (Project, Customer, Sales Owner, Line #, Label,
> Invoice Date, Amount, %, Status, Delays, Last Reason, Updated, Actions); a Reschedule modal (new
> date + required reason), an Update Amount modal (amount ≥ 0 + required reason), a History drawer,
> and a disabled Split modal; invoiced/cancelled rows locked. Include empty, loading, error, and a
> "migration pending" state.
>
> IMPROVED VERSION (same data + RPCs + admin-only scope): a KPI band that visually emphasises Overdue
> Amount and Overdue Lines (red) ahead of the rest; one compact filter bar; a tighter table showing
> Project/Customer, Invoice Date, Amount, Status, Delays, with the remaining fields, the History, and
> the Reschedule/Amount actions inside a row-detail drawer; an "Overdue" toggle that filters the same
> table (replacing the separate alerts section, keeping a count chip); locked rows show a lock icon +
> tooltip reason; the Split action shown as a clearly-disabled "Coming soon (needs split RPC)"
> control. Preserve empty/loading/error and the migration-pending notice.
>
> Visual: white cards, red reserved for overdue, amber for rescheduled, green for invoiced,
> tabular-nums money, compact dense table, no dark panels, no playful UI, realistic placeholder data.
> Desktop 1440px primary; tablet keeps a frozen Project column with horizontal scroll. Output: both
> versions, design rationale, component breakdown (PageHeader, KpiBand, FilterBar, ScheduleTable,
> RowDrawer, RescheduleModal, AmountModal, HistoryDrawer, MigrationPendingNotice), implementation
> notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- Uses only `projectInvoicingScheduleQueries` + the two existing RPCs; no new mutation/field.
- Reschedule/Amount require a reason and write history (unchanged); invoiced/cancelled locked.
- Overdue lens derives from the existing alerts view / status+date; KPIs unchanged.
- Migration-deferred + empty/loading/error states preserved; Split stays disabled.
- Admin-only; no exposure to other roles.

**Safe Implementation Notes:** UI only; do not change the RPCs, schema, RLS, locking rules, or
admin-only guard; reuse existing helpers; no fabricated data.

---

### Page 3: Admin Sales Targets (P0)

**Route:** `/admin/sales-targets`
**Current Component / Files:** `src/pages/AdminSalesTargets.tsx`; `src/lib/salesTargetsQueries.ts`
(`getSalesUsers`, `getSalesTargetsAdminList`, `upsertSalesTarget`, `validateTargetInput`,
`computeMissingTargetUsers`); `deferredMigrationSafety`. Migration 099 `sales_user_targets`.
**Current Page Purpose:** set per-Sales-User annual targets (Sales Order, Invoicing, Collection) and
see which sales users are missing a target for the year.
**Current Version Description:** header + migration-pending notice (now hidden); 5 KPI cards (With
Targets, Missing Targets, Total SO, Total Invoicing, Total Collection); filters (Target Year,
Search); targets table (Sales User / Year / SO / Invoicing / Collection / Currency / Notes /
Updated / Edit); Add/Edit upsert modal (one record per user+year; blank = NULL/not set, 0 = explicit
zero; collection never substituted); missing-target list with inline "Create Target". Sales users
sourced from `user_roles.role='sales_user'`.
**Current Data / Business Context:** reads/writes `sales_user_targets` (admin-only upsert on
`(sales_user_id, target_year)`); migration-safe; admin-only route.
**Current Strengths:** clean upsert; NULL-vs-0 semantics correct; missing-target visibility;
migration-safe.
**Current UX Gaps / Opportunities:** the three target types per user are columns — hard to compare
"who is set vs unset" across types; missing-target list and table are separate; the NULL-vs-0
distinction isn't visually explained; no per-year copy-forward affordance (would be a new feature —
do NOT add, but note that the current flow requires re-entry).
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a clearer per-user target editor: a single roster that shows set/
unset status per target type, an inline edit drawer, and an integrated "missing" filter — same data,
same upsert, same NULL/0 semantics.
**Improved Version Layout Requirements:** 5 KPI tiles (Missing Targets emphasised); year selector +
search; a roster table (Sales User, SO/Invoicing/Collection each shown as a value **or** a "Not set"
pill, Currency, Updated) with a "Missing only" toggle that replaces the separate missing list; an
Edit drawer/modal with the three target fields, currency, notes, and explicit helper text ("Blank =
not set; 0 = explicit zero; Collection is never copied from Invoicing"). Preserve empty/loading/
error + migration-pending.
**Improved Version Content Requirements:** "Not set" pills for NULL; helper text exactly as above;
KPI labels unchanged.
**Improved Version Visual Direction:** governance SaaS; neutral for "Not set"; restrained accents;
no playful UI; no fabricated data.
**Artifact Prompt for This Page**
> Create a Current Version and Improved Version of an "Admin — Sales Annual Targets" page (NAFFCO
> enterprise governance SaaS). ADMIN-ONLY. Each sales user has one record per year with three
> nullable targets: Sales Order, Invoicing, Collection — blank means "not set" (NULL), 0 means an
> explicit zero, and the Collection target is never substituted from Invoicing. Do not change this
> data model, the upsert (one record per user+year), or permissions; no new fields.
> CURRENT VERSION: header; five KPI cards (With Targets, Missing Targets, Total SO, Total Invoicing,
> Total Collection); a Year filter + search; a targets table (Sales User, Year, Sales Order,
> Invoicing, Collection, Currency, Notes, Updated, Edit); an Add/Edit upsert modal; and a separate
> "missing target" list with inline "Create Target". Include empty, loading, error, and a "migration
> pending" state.
> IMPROVED VERSION (same data + upsert + semantics): five KPI tiles with "Missing Targets"
> emphasised; a year selector + search; a single roster table where each of the three targets shows
> a value or a neutral "Not set" pill, plus a "Missing only" toggle that replaces the separate list;
> an Edit drawer with the three target fields, currency, notes, and explicit helper text "Blank = not
> set; 0 = explicit zero; Collection is never copied from Invoicing." Preserve empty/loading/error +
> migration-pending. Visual: white cards, neutral "Not set" pills, restrained accents, tabular-nums
> money, no playful UI, realistic placeholder data. Output both versions + rationale + component
> breakdown (KpiBand, RosterTable, NotSetPill, EditDrawer, MissingToggle, MigrationPendingNotice) +
> implementation notes.
**Development Acceptance Criteria:** uses only `salesTargetsQueries` + existing upsert; NULL renders
"Not set"; 0 renders as 0; Collection never substituted; missing-only derives from existing data;
admin-only; migration-deferred + empty/loading/error preserved.
**Safe Implementation Notes:** UI only; do not change `sales_user_targets`, the upsert/unique
constraint, RLS, NULL/0 semantics, or the admin-only guard.

---

### Page 1: Admin Dashboard (P1)

**Route:** `/admin-dashboard`
**Current Component / Files:** `src/pages/AdminDashboard.tsx`; `PageHeader`, `SectionHeader`,
`RoleRulesCard`. Reads counts (profiles, access_requests submitted, projects pending/active).
**Current Page Purpose:** admin console — governance KPIs + quick actions + cross-module monitoring.
**Current Version Description:** KPI strip (Total Users, Pending Access Requests, Pending SO
Approvals, Active Projects, each a link); "Admin Quick Actions" grid of 10 cards (Users, Access
Requests, Admin Approvals, WO/PN Gate, Audit Log, Settings, Notification Rules, Report Subscriptions,
**Invoicing Schedule**, **Sales Targets**) with left-border color strips; "Cross-Module Monitoring"
grid (Control Tower, Reports, Data Quality, Projects, Templates, Health Scores); RoleRulesCard.
**Current Data / Business Context:** read-only counts; navigation hub; admin-only.
**Current Strengths:** clear KPIs; commercial controls already surfaced; governance rules visible.
**Current UX Gaps / Opportunities:** 10 flat quick-action cards lack grouping (Access vs Commercial
vs Monitoring vs Config); the two commercial controls don't stand out as the newest/most important;
no "exceptions needing admin" focal strip (pending approvals/access live only as KPIs).
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a grouped admin console with an exceptions focal strip and a
distinct "Commercial Controls" group — same links, same counts.
**Improved Version Layout Requirements:** KPI strip (unchanged links); an "Needs attention" strip
(pending access requests + pending SO approvals when > 0, linking to those pages); quick actions
grouped under labelled sections — **User & Access**, **Commercial Controls** (Invoicing Schedule,
Sales Targets), **Governance & Approvals** (Admin Approvals, WO/PN Gate, Audit Log), **System & Config**
(Settings, Notification Rules, Report Subscriptions); keep Cross-Module Monitoring + RoleRulesCard.
**Improved Version Content Requirements:** group titles as above; card labels unchanged.
**Improved Version Visual Direction:** governance SaaS; restrained color strips; no playful UI.
**Artifact Prompt for This Page**
> Create a Current Version and Improved Version of an "Admin Dashboard / Console" (NAFFCO enterprise
> governance SaaS). ADMIN-ONLY navigation hub; read-only counts; do not add features or change links/
> permissions. CURRENT VERSION: a KPI strip (Total Users, Pending Access Requests, Pending SO
> Approvals, Active Projects — each links somewhere); a flat grid of ten quick-action cards (User
> Management, Access Requests, Admin Approvals, WO/PN Gate, Audit Log, System Settings, Notification
> Rules, Report Subscriptions, Invoicing Schedule, Sales Targets) with colored left borders; a
> "Cross-Module Monitoring" grid (Control Tower, Reports, Data Quality, Projects, Templates, Health
> Scores); a governance rules card. IMPROVED VERSION (same links + counts): keep the KPI strip; add a
> "Needs attention" strip that appears when pending access requests or pending SO approvals > 0
> (linking to those pages); group the ten quick actions under labelled sections — User & Access,
> Commercial Controls (Invoicing Schedule, Sales Targets), Governance & Approvals, System & Config;
> keep Cross-Module Monitoring + governance rules. Visual: white/off-white cards, restrained color
> strips, compact, no playful UI, realistic placeholder counts. Output both versions + rationale +
> component breakdown (KpiStrip, AttentionStrip, GroupedQuickActions, MonitoringGrid, RoleRulesCard)
> + implementation notes.
**Development Acceptance Criteria:** same links/counts; grouping is presentational only; attention
strip derives from existing counts; admin-only; no new actions.
**Safe Implementation Notes:** UI only; presentational regrouping; no route/permission/logic change.

---

### Pages 4–12 (condensed full sections)

> Reuse Page 2's visual direction, output requirements, and safe-implementation notes. Each ships a
> usable prompt; all are admin-only or admin/ops governance pages.

- **User Management (`/admin/users`)** — user list, role assignment (from `user_roles`), suspend.
  *Prompt:* "Current + Improved of an admin user-management table (user, role, status, last active)
  with role-assignment and suspend actions. Improved: clearer role badges, a status filter, and a
  safe confirm on role change; same actions/permissions; role source = `user_roles`; no new powers."
- **Access Requests (`/admin/access-requests` + `/:id`)** — review/approve/reject access requests.
  *Prompt:* "Current + Improved of an access-request queue + detail (requester, requested role,
  justification, decision). Improved: a clearer approve/reject with required reason; same workflow."
- **Audit Log (`/audit-log`)** — read-only system audit trail. *Prompt:* "Current + Improved of a
  read-only audit log (timestamp, actor, action, entity, detail) with filters; Improved: better
  filter bar + entity badges + readable diff; strictly read-only."
- **System Settings (`/settings`)** — reference data (vehicle types, SLA rules, categories).
  *Prompt:* "Current + Improved of a system-settings/reference-data manager grouped by category;
  same data; clearer section tabs; no new settings."
- **Admin Approvals (`/admin-approvals`)** — pending SO/PO approvals queue. *Prompt:* "Current +
  Improved of a pending-approvals queue (SO/PO) with approve/send-back/reject; preserve the approval
  workflow + thresholds; Improved: clearer item context + decision panel; no logic change."
- **WO / PN Gate (`/wo-pn-gate`)** — execution reference gate. *Prompt:* "Current + Improved of the
  WO/PN gate page; preserve gate logic; Improved: clearer per-project gate status; no rule change."
- **Notification Rules (`/admin/notification-rules`)** — config. *Prompt:* "Current + Improved of a
  notification-rules config list; same triggers; clearer enable/disable + grouping."
- **Report Subscriptions (`/admin/report-subscriptions` + `/:id`)** — scheduled report distribution.
  *Prompt:* "Current + Improved of report-subscription management (schedule, recipients, report);
  same data; clearer schedule/recipient display."
- **Template Approvals (`/templates/approvals`)** — template governance. *Prompt:* "Current +
  Improved of a template-approvals queue; same workflow; clearer status."

### Module / shared pages
For `/sales`, `/sales-coordinator`, `/projects*`, `/procurement*`, `/store*`, `/factory*`, `/qc*`,
`/dubai-afs*`, `/control-tower`, `/reports*`, `/management-dashboard`, and shared Inbox/Notifications/
Templates, **use the owning-role brief** (`sales_user.md`, `sales_coordinator.md`,
`procurement_user.md`, `store_user.md`, `factory_user.md`, `qc_user.md`, `afs_user.md`,
`operations_manager.md`, `viewer.md`). Admin sees the same view (admin bypasses guards); no
admin-specific redesign is required for those.
