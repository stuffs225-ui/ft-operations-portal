# Step 18.7J — Viewer / Management Read-Only Work Center

**Date:** 2026-06-21
**Branch:** `feature/step-18-7j-viewer-read-only-work-center`
**Depends on:** Step 18.7I (PR #120 — Admin Work Center and System Governance Foundation)

---

## Executive Summary

Rebuilt the `viewer` role experience into a focused, read-only Management View. Viewer now lands on `/management-dashboard` — a purpose-built executive dashboard with live KPI strip, management visibility shortcuts, and executive report links. The sidebar shows two dedicated viewer-only sections (MANAGEMENT VISIBILITY and EXECUTIVE REPORTS) that cleanly separate viewer context from admin, operational, and coordinator contexts. The generic generic dashboard, Sales Workspace link, and shared section items are removed from viewer's sidebar.

**Viewer nav: broad generic → 13 focused management items in 3 viewer-only sections.**

---

## Current Viewer UX Problems (Discovery)

| Problem | Source | Fix |
|---|---|---|
| Viewer lands on `/` (generic Dashboard) | `roleMatrix.viewer.landingRoute = '/'` | Changed to `/management-dashboard` |
| Viewer sees "SALES & COMMERCIAL" section header and Sales Workspace link | navigation.ts `sales` had `roles: ['admin', 'viewer']` | Removed viewer from `sales` |
| Viewer saw same nav section labels as operational users | shared SALES & COMMERCIAL, PROJECTS, REPORTING sections | New MANAGEMENT VISIBILITY + EXECUTIVE REPORTS sections |
| Admin bypass showed viewer-specific items for admin too | `isItemVisible` always bypassed for admin | Added `strict?: boolean` to NavItem; strict items skip admin bypass |
| Viewer saw `/projects` but query scoped to user's own projects | `isBroadView = admin || ops_mgr` (viewer excluded) | Added viewer to `isBroadView` — viewer sees all projects read-only |
| No viewer-specific governance rules | viewer had 3 generic rules | Expanded to 7 focused read-only governance rules |
| No viewer-specific landing page | — | Created `ManagementDashboard.tsx` |
| No direct report links for viewer-safe reports | viewer only had /reports and /control-tower in REPORTING | Added 5 direct executive report links in EXECUTIVE REPORTS section |

---

## Schema / Storage Gaps

| Gap | Detail |
|---|---|
| No viewer-scoped RLS on projects | RLS handles this at DB level; `isBroadView` fix ensures the query returns all projects (not scoped to user_id) |
| `management-dashboard` KPIs fallback to `'—'` when Supabase not configured | Intentional — isSupabaseConfigured guard identical to AdminDashboard pattern |

---

## Files Changed

- `src/types/index.ts` — added `strict?: boolean` to NavItem interface
- `src/components/layout/Sidebar.tsx` — `isItemVisible` respects `strict` flag (admin bypass skipped)
- `src/lib/roleMatrix.ts` — viewer `landingRoute` + expanded `rules` (3 → 7)
- `src/data/navigation.ts` — viewer nav restructure: removed viewer from 8 shared items, added management-dashboard + MANAGEMENT VISIBILITY section (5 items) + EXECUTIVE REPORTS section (5 items)
- `src/pages/ManagementDashboard.tsx` — new viewer landing page at `/management-dashboard`
- `src/pages/Projects.tsx` — added viewer to `isBroadView` (viewer sees all projects read-only)
- `src/app/App.tsx` — lazy import + route for `management-dashboard`
- `docs/implementation/step-18-7j-viewer-management-read-only-work-center.md` — this file

---

## Viewer Sidebar Changes

### Before (viewer nav items across shared sections)

| Section | Items |
|---|---|
| MY WORK | dashboard (generic landing), inbox, notifications |
| SALES & COMMERCIAL | sales, hot-projects, quotations, receivables |
| PROJECTS | projects |
| REPORTING | control-tower, reports |

**Total: ~10 items across shared sections with generic headers**

### After (viewer nav — focused management structure)

| Section | Items |
|---|---|
| MY WORK | management-dashboard (viewer landing), inbox, notifications |
| MANAGEMENT VISIBILITY | Portfolio Overview, Operations Overview, Hot Projects, Quotation Pipeline, Receivables |
| EXECUTIVE REPORTS | Reports Hub, Executive Report, SLA & Delays, Health Scores, Data Quality |

**Total: 13 focused items in viewer-specific sections**

All other sections (SALES COORDINATION, CONTROL TOWER, PROCUREMENT, STORE OPERATIONS, QUALITY HANDOFF, QUALITY CONTROL, FACTORY EXECUTION, FACTORY MATERIALS, EXECUTION, QUALITY & RELEASE, DUBAI/AFS EXECUTION, AFS MATERIALS, AFTER SALES, DUBAI/AFS, WORKSTREAM MONITORING, REPORTING, OPERATIONS REPORTING, SYSTEM ADMINISTRATION, SYSTEM GOVERNANCE) — **auto-hidden** for viewer by `buildVisibleNav()` since they have no visible children.

### `strict` flag in NavItem

All viewer-only nav items have `strict: true`. This disables the admin bypass in `isItemVisible`, preventing admin from seeing viewer-specific sections and avoiding duplicate nav items. Admin continues to see their own EXECUTION, REPORTING, SYSTEM ADMINISTRATION, SYSTEM GOVERNANCE sections unchanged.

---

## Management Dashboard (`/management-dashboard`)

New page at `src/pages/ManagementDashboard.tsx`.

- **Slate/blue accent** — neutral management identity
- **Read-only badge** — inline in header actions (`"Read-only"` pill + DataSourceBadge)
- **RoleRulesCard** — auto-reads viewer governance rules from ROLE_MATRIX

### KPI Strip (8 KPIs, live Supabase or `'—'` fallback)

| KPI | Source | Severity Logic |
|---|---|---|
| Active Projects | `projects` count in [active, approved, submitted] | info (always blue) |
| Pending Approval | `projects` where status = submitted_for_approval | warning if > 0 |
| Overdue Projects | `projects` in active statuses AND delivery_date < today | critical if > 0, green if 0 |
| Release Blocked | `release_notes` where release_status = blocked | critical if > 0, green if 0 |
| Open QC Blockers | `project_qc_findings` in open/rework statuses | warning if > 0, green if 0 |
| Open NCRs | `material_ncrs` in open/assigned statuses | warning if > 0, green if 0 |
| Hot Projects Open | `hot_projects` in active pipeline stages | info |
| Open Quotations | `quotation_requests` in open pipeline stages | info |

Each KPI card links to the relevant page. Severity drives left-border color (red/amber/blue/green) and icon.

### Management Visibility (5 links)

Portfolio Overview → /projects  
Operations Overview → /control-tower  
Hot Projects → /hot-projects  
Quotation Pipeline → /quotations  
Receivables → /receivables  

### Executive Reports (5 links)

Reports Hub → /reports  
Executive Report → /reports/executive  
SLA & Delays → /reports/sla  
Health Scores → /reports/health-scores  
Data Quality → /reports/data-quality  

---

## Portfolio Overview

Route: `/projects`  
Behavior: Viewer now included in `isBroadView` (`Projects.tsx:73`), so viewer sees **all projects** (not scoped to their user_id). `canCreate` is `false` for viewer — no "New SO / Project" button is shown. Export CSV is present (read-only export).

**No create/edit/delete/approve buttons visible to viewer on this page.**

---

## Delivery Readiness View

**Status: Partial — deferred as dedicated page.**

Viewer accesses delivery readiness context via:
- ManagementDashboard KPIs: Overdue Projects, Release Blocked
- Operations Overview (/control-tower) — existing read-only view with delivery status
- Reports Hub (/reports) → executive and SLA reports

A dedicated `/management/delivery-readiness` page (tabs: Ready, Release Blocked, Missing WO/PN, QC Blocked) is **deferred** pending a schema gap review for readiness status derivation.

---

## Critical Blockers View

**Status: Partial — deferred as dedicated page.**

Viewer accesses blocker context via:
- ManagementDashboard KPIs: Release Blocked, Open QC Blockers, Open NCRs
- Operations Overview (/control-tower) — existing exceptions list
- Data Quality report (/reports/data-quality) — data anomalies

A dedicated `/management/blockers` page (categorized blocker table by module) is **deferred** pending schema gap review for cross-module blocker aggregation.

---

## SLA & Delays View

**Status: Improved — routed to existing page.**

Viewer accesses SLA view via:
- `/reports/sla` — existing viewer-safe page (`RequireRole([ops_mgr, viewer])`) ✅
- Direct link in EXECUTIVE REPORTS section: "SLA & Delays"
- Direct link tile on ManagementDashboard

---

## Executive Reports

**Status: Improved.**

Viewer now has direct nav links to:
- `/reports/executive` (`RequireRole([ops_mgr, viewer])`) ✅
- `/reports/sla` (`RequireRole([ops_mgr, viewer])`) ✅
- `/reports/health-scores` (`RequireRole([ops_mgr, viewer])`) ✅
- `/reports/data-quality` (`RequireRole([ops_mgr, viewer])`) ✅
- `/reports` (hub, RequireRole includes viewer) ✅

Previously, viewer could reach these only by navigating to /reports and clicking through. Now they appear directly in the sidebar EXECUTIVE REPORTS section and on the ManagementDashboard.

---

## Project Viewer View

**Status: Improved.**

`Projects.tsx` now includes viewer in `isBroadView`, so viewer sees all projects in the portfolio list (not just their own sales-owner projects). The "New SO / Project" button is hidden (`canCreate` is false for viewer). Export to CSV works (read-only). Financial columns are shown only if `canViewCosts` is true (viewer's permission already controlled by `usePermission`).

`ProjectDetail.tsx` — viewer can navigate to individual project detail. The page has role-based guards for financial visibility (`canSeeMoney`) and audit actions (`canAudit`) that already exclude viewer. No new changes needed.

---

## Read-Only Action Cleanup

| Page | Viewer-visible? | Action buttons visible to viewer? | Status |
|---|---|---|---|
| /management-dashboard | ✅ viewer landing | None — all links only | ✅ safe |
| /projects | ✅ via Portfolio Overview | "New SO" button hidden (canCreate false) | ✅ safe |
| /hot-projects | ✅ | No create/edit buttons for viewer | ✅ safe |
| /quotations | ✅ | No create/edit buttons for viewer | ✅ safe |
| /receivables | ✅ | Read-only table | ✅ safe |
| /control-tower | ✅ | All read-only metrics and links | ✅ safe |
| /reports | ✅ | Read-only report list | ✅ safe |
| /reports/executive | ✅ | Read-only metrics | ✅ safe |
| /reports/sla | ✅ | Read-only + CSV export | ✅ safe |
| /reports/health-scores | ✅ | Read-only scores | ✅ safe |
| /reports/data-quality | ✅ | Read-only anomaly list | ✅ safe |
| /inbox | ✅ | No operational tasks for viewer | ✅ safe (empty) |
| /notifications | ✅ | Read-only | ✅ safe |

**Admin-only pages** (user management, audit log, settings, access requests, notification rules, report subscriptions, governance pages): **not visible to viewer**, route guards block access.

---

## Viewer Role-Specific Rules (ROLE_MATRIX)

```
1. Viewer access is read-only — no create, edit, approve, delete, or upload actions available.
2. Use dashboards and reports for portfolio and operational visibility only.
3. Operational actions belong to assigned role work centers — contact the responsible role owner if action is needed.
4. Admin and system settings are restricted to the Admin role.
5. Approvals are performed by authorized operational roles only — viewer cannot approve or reject.
6. Data shown is based on current system records or clearly derived read-only indicators.
7. Report discrepancies or anomalies to the Operations Manager or relevant module owner.
```

---

## Route Smoke Test — All Viewer Nav Items

`RequireRole.tsx:29` — viewer is checked by `roles.includes(role)`. Admin bypasses; viewer does NOT bypass, so only listed roles pass.

| # | Nav ID | Label | Path | Route Guard | Viewer Access | Note |
|---|---|---|---|---|---|---|
| 1 | management-dashboard | Management Dashboard | /management-dashboard | RequireRole(['viewer']) | ✅ explicit | NEW landing |
| 2 | inbox | Action Inbox | /inbox | none | ✅ all auth | empty for viewer |
| 3 | notifications | Notifications | /notifications | none | ✅ all auth | |
| 4 | viewer-portfolio | Portfolio Overview | /projects | none | ✅ all auth | viewer sees all projects |
| 5 | viewer-ops-overview | Operations Overview | /control-tower | RequireRole([ops_mgr, viewer]) | ✅ explicit | |
| 6 | viewer-hot-projects | Hot Projects | /hot-projects | RequireRole([admin, ops_mgr, sales_user, sales_coord, viewer]) | ✅ explicit | |
| 7 | viewer-quotations | Quotation Pipeline | /quotations | none | ✅ all auth | read-only |
| 8 | viewer-receivables | Receivables | /receivables | RequireRole([admin, ops_mgr, sales_user, sales_coord, viewer]) | ✅ explicit | |
| 9 | viewer-reports-hub | Reports Hub | /reports | RequireRole([ops_mgr, viewer, ...]) | ✅ explicit | |
| 10 | viewer-report-executive | Executive Report | /reports/executive | RequireRole([ops_mgr, viewer]) | ✅ explicit | |
| 11 | viewer-report-sla | SLA & Delays | /reports/sla | RequireRole([ops_mgr, viewer]) | ✅ explicit | |
| 12 | viewer-report-health | Health Scores | /reports/health-scores | RequireRole([ops_mgr, viewer]) | ✅ explicit | |
| 13 | viewer-report-data-quality | Data Quality | /reports/data-quality | RequireRole([ops_mgr, viewer]) | ✅ explicit | |

**13/13 pass. No Access Restricted links. No dead routes. No blank pages.**

---

## Visual / UX Identity

- **Read-only badge** in ManagementDashboard header ("Read-only" pill + DataSourceBadge)
- **Slate/blue neutral accent** — management identity distinct from admin (purple), ops_mgr (indigo), sales (emerald)
- **Severity-coded KPI cards** — left-border color: critical (red), warning (amber), info (blue), normal (green)
- **Severity icons** — XCircle (critical), AlertTriangle (warning), AlertCircle (info), CheckCircle2 (normal)
- **Section shortcuts** (Management Visibility + Executive Reports) — 5-column grid with colored icon borders
- **Governance Rules card** — viewer-specific rules, auto-populated from ROLE_MATRIX
- **Empty states** — inbox shows empty state for viewer (no operational tasks), projects shows all portfolio
- **No disabled buttons** — create/edit/approve buttons are hidden entirely for viewer (not disabled-without-explanation)

---

## Safety Review

| Item | Changed |
|---|---|
| DB / RLS / migrations | No |
| Route guards weakened | No — viewer was already in RequireRole for all routes it accesses; management-dashboard adds new explicit guard |
| Route guards removed | No |
| Business workflow | No |
| SO approval/routing logic | No |
| Procurement/Store/Factory/QC/AFS workflows | No |
| Operations Manager behavior | No |
| Sales User behavior | No |
| Sales Coordinator behavior | No |
| Admin behavior | No — `strict: true` prevents viewer-specific items from showing in admin nav |
| Admin-only features exposed to viewer | No — viewer cannot reach /admin/*, /audit-log, /settings, /admin-dashboard |
| Execution actions exposed to viewer | No — viewer has read-only pages only |
| Secrets or sensitive config exposed | No |
| Fake live data added | No — KPIs use `'—'` fallback when Supabase not configured |
| Role assignment source changed | No |

---

## Deferred Items

- **Delivery Readiness page** (`/management/delivery-readiness`) — tabs: Ready, Release Blocked, Missing WO/PN, QC Blocked. Requires cross-table join (projects + release_notes + qc_findings). Deferred pending schema gap review.
- **Critical Blockers page** (`/management/blockers`) — categorized by module (procurement delay, QC finding, AFS missing item, etc.). Requires aggregation across multiple tables. Deferred.
- **SLA & Delays dedicated viewer view** — currently routes to `/reports/sla` which is ops_mgr-shared. Viewer-specific version deferred.
- **Projects at Risk page** — derived from overdue + blocked + missing WO/PN. Deferred.
- **Portfolio export / print** — CSV export from Portfolio Overview (Projects.tsx) already works for viewer. PDF export deferred.

---

## Validation Results

- `npm run build`: ✅ PASS — 0 errors, 5.27s
- `npx tsc --noEmit`: ✅ PASS — 0 errors
- `npx eslint` (changed files, excluding Projects.tsx baseline): ✅ PASS — 0 errors, 0 warnings
- `npx eslint src/pages/Projects.tsx`: 1 pre-existing error (`react-hooks/set-state-in-effect`) — **unchanged from main baseline**
- `npm run lint` (global): 82 problems — **unchanged from main baseline**
