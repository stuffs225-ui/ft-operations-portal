# Step 18.7K — Final Role UX Closure Audit and Stabilization

**Date:** 2026-06-21
**Branch:** `fix/step-18-7k-final-role-ux-closure-audit`
**Depends on:** Step 18.7J (PR #121 — Viewer / Management Read-Only Work Center)

---

## Executive Summary

Final closure audit for all role-based UX/IA work from Steps 18.7A–18.7J. Verified all 10 roles
across 8 audit dimensions: landing routes, nav/sidebar, route guards, action visibility, governance
rules, reports access, admin/ops/viewer separation, and project safety spot check.

**One confirmed blocker found and fixed:** `HotProjects.tsx` — "New Opportunity" button shown to
all roles without a `canCreate` guard. Viewer and sales_coordinator could see the button but were
blocked by `RequireRole` when clicking through to `/hot-projects/new`. Fixed by adding `CAN_CREATE`
gate (admin / operations_manager / sales_user only), matching the `/hot-projects/new` route guard.

**No other blockers found.** All 10 roles have correct landing pages, clean sidebars, valid routes,
and no unauthorized action buttons.

---

## Files Changed

- `src/pages/HotProjects.tsx` — added `CAN_CREATE` constant + `canCreate` boolean; gated both
  "New Opportunity" buttons (header action + empty-state action) — viewer and sales_coordinator no
  longer see buttons that lead to Access Restricted
- `docs/implementation/step-18-7k-final-role-ux-closure-audit.md` — this file

---

## Part 1 — Landing Route Audit

| # | Role | ROLE_MATRIX.landingRoute | Route in App.tsx | Guard | Pass |
|---|------|--------------------------|------------------|-------|------|
| 1 | admin | /admin-dashboard | ✅ registered | RequireRole(['admin']) | ✅ |
| 2 | operations_manager | /control-tower | ✅ registered | RequireRole(['operations_manager', 'viewer']) | ✅ |
| 3 | sales_user | /sales | ✅ registered | unguarded | ✅ |
| 4 | sales_coordinator | /sales-coordinator | ✅ registered | RequireRole(['sales_coordinator', 'operations_manager']) | ✅ |
| 5 | procurement_user | /procurement | ✅ registered | RequireRole(['procurement_user', 'operations_manager']) | ✅ |
| 6 | factory_user | /factory | ✅ registered | RequireRole(['factory_user', 'operations_manager']) | ✅ |
| 7 | store_user | /store | ✅ registered | RequireRole(['store_user', 'operations_manager']) | ✅ |
| 8 | qc_user | /qc | ✅ registered | RequireRole(['qc_user', 'operations_manager']) | ✅ |
| 9 | afs_user | /dubai-afs | ✅ registered | RequireRole(['afs_user', 'operations_manager']) | ✅ |
| 10 | viewer | /management-dashboard | ✅ registered | RequireRole(['viewer']) | ✅ |

**10/10 pass. RootRedirect correctly reads ROLE_MATRIX[role].landingRoute and navigates.**

---

## Part 2 — Nav / Sidebar Audit

| # | Role | Sections visible | Viewer-only items visible? | Admin-only items visible? | Pass |
|---|------|-----------------|--------------------------|--------------------------|------|
| 11 | admin | MY WORK · SALES & COMMERCIAL · PROJECTS · EXECUTION · QUALITY & RELEASE · DUBAI/AFS · REPORTING · SYSTEM ADMINISTRATION · SYSTEM GOVERNANCE | No (strict: true) | ✅ all admin items | ✅ |
| 12 | operations_manager | MY WORK · CONTROL TOWER · WORKSTREAM MONITORING · OPERATIONS REPORTING | No | No | ✅ |
| 13 | sales_user | MY WORK · SALES & COMMERCIAL · REPORTING (templates only) | No | No | ✅ |
| 14 | sales_coordinator | MY WORK · SALES COORDINATION | No | No | ✅ |
| 15 | procurement_user | MY WORK · PROCUREMENT · REPORTING | No | No | ✅ |
| 16 | factory_user | MY WORK · FACTORY EXECUTION · FACTORY MATERIALS · REPORTING | No | No | ✅ |
| 17 | store_user | MY WORK · STORE OPERATIONS · QUALITY HANDOFF · REPORTING | No | No | ✅ |
| 18 | qc_user | MY WORK · QUALITY CONTROL · QUALITY REPORTING | No | No | ✅ |
| 19 | afs_user | MY WORK · DUBAI/AFS EXECUTION · AFS MATERIALS · AFTER SALES · REPORTING | No | No | ✅ |
| 20 | viewer | MY WORK · MANAGEMENT VISIBILITY · EXECUTIVE REPORTS | ✅ viewer-only sections | No | ✅ |

**`strict: true` on all 11 viewer nav items correctly blocks the admin bypass. buildVisibleNav()
auto-hides empty sections for all roles.**

---

## Part 3 — Route Guard Consistency

| # | Path | Route guard | Nav items that reach it | Viewer access | Pass |
|---|------|------------|------------------------|---------------|------|
| 21 | /admin-dashboard | RequireRole(['admin']) | admin-dashboard (admin nav) | No — RequireRole blocks | ✅ |
| 22 | /management-dashboard | RequireRole(['viewer']) | management-dashboard (viewer nav, strict) | ✅ explicit | ✅ |
| 23 | /admin/users | RequireRole(['admin']) | admin-users (admin nav) | No | ✅ |
| 24 | /admin/access-requests | RequireRole(['admin']) | admin-access-requests (admin nav) | No | ✅ |
| 25 | /admin/notification-rules | RequireRole(['admin']) | admin-notification-rules (admin nav) | No | ✅ |
| 26 | /admin/report-subscriptions | RequireRole(['admin']) | admin-report-subscriptions (admin nav) | No | ✅ |
| 27 | /coordinator-queue | RequireRole(['sales_coordinator', 'operations_manager']) | coord-queue (coordinator nav) | No | ✅ |
| 28 | /afs/pn-gate | RequireRole(['afs_user', 'operations_manager']) | afs-pn-gate (afs_user nav) | No | ✅ |
| 29 | /afs/ready-for-delivery | RequireRole(['afs_user', 'operations_manager']) | afs-ready-delivery (afs_user nav) | No | ✅ |
| 30 | /afs/materials | RequireRole(['afs_user', 'operations_manager']) | afs-materials (afs_user nav) | No | ✅ |

**All 10 spot-checked routes have registered pages in App.tsx and correctly scoped guards.**

---

## Part 4 — Action Visibility Audit

| # | Page | Role | Create button visible? | Guard | Pass |
|---|------|------|----------------------|-------|------|
| 31 | Projects.tsx | viewer | No — `canCreate` false (viewer not in CAN_CREATE) | ✅ safe | ✅ |
| 32 | Projects.tsx | sales_user | Yes — sales_user in CAN_CREATE | Route allows | ✅ |
| 33 | Quotations.tsx | viewer | No — `canCreate` false (viewer not in CAN_CREATE) | ✅ safe | ✅ |
| 34 | Quotations.tsx | sales_coordinator | No — coordinator not in CAN_CREATE | ✅ safe | ✅ |
| 35 | HotProjects.tsx | viewer | **FIXED** — `canCreate` gate added; was always shown → now hidden | ✅ safe | ✅ |
| 36 | HotProjects.tsx | sales_coordinator | **FIXED** — `canCreate` gate added; was always shown → now hidden | ✅ safe | ✅ |
| 37 | ProjectDetail.tsx | viewer | No — `canApprove` false (viewer not in CAN_APPROVE) | ✅ safe | ✅ |
| 38 | ProjectDetail.tsx | viewer | No — `canSeeMoney` false (viewer excluded from financial) | ✅ safe | ✅ |
| 39 | Receivables.tsx | viewer | No buttons at all — pure read-only table | ✅ safe | ✅ |
| 40 | ControlTower.tsx | viewer | Navigation + export only — no create/edit/approve | ✅ safe | ✅ |

---

## Part 5 — Governance Rules Audit

| # | Role | Rule count | Key rule verified | Pass |
|---|------|-----------|------------------|------|
| 41 | admin | 8 | "Admin-only pages must remain admin-only — do not expose to other roles." | ✅ |
| 42 | operations_manager | 7 | "Do not bypass WO, PN, Store, QC, or Release gates — monitor them, not override them." | ✅ |
| 43 | sales_user | 6 | "SO / project creation follows the approval and routing workflow — do not bypass." | ✅ |
| 44 | sales_coordinator | 8 | "Do not bypass the Sales or SO approval workflow — quotation conversion is a Sales action." | ✅ |

*(All 10 roles have role-specific rules in ROLE_MATRIX. Only 4 shown above for brevity.)*

---

## Part 6 — Reports Access Audit

| # | Report route | Viewer access | Ops_mgr access | Sales_user access | Pass |
|---|-------------|--------------|----------------|------------------|------|
| N/A | /reports | ✅ (viewer listed) | ✅ (ops_mgr listed) | ❌ (blocked) | ✅ |
| N/A | /reports/executive | ✅ viewer listed | ✅ ops_mgr listed | ❌ blocked | ✅ |
| N/A | /reports/sla | ✅ viewer listed | ✅ ops_mgr listed | ❌ blocked | ✅ |
| N/A | /reports/health-scores | ✅ viewer listed | ✅ ops_mgr listed | ❌ blocked | ✅ |
| N/A | /reports/data-quality | ✅ viewer listed | ✅ ops_mgr listed | ❌ blocked | ✅ |
| N/A | /reports/sales | ✅ viewer listed | ✅ ops_mgr listed | ✅ sales_user listed | ✅ |
| N/A | /reports/procurement | ❌ blocked | ✅ ops_mgr listed | ❌ blocked | ✅ |
| N/A | /reports/factory | ❌ blocked | ✅ ops_mgr listed | ❌ blocked | ✅ |

**Viewer has access to 5 executive-level reports. Cost-sensitive operational reports (/procurement,
/factory, /store, /qc, /afs) are correctly blocked for viewer.**

---

## Part 7 — Admin / Ops_mgr / Viewer Separation

| # | Dimension | Admin | Ops_mgr | Viewer | Pass |
|---|-----------|-------|---------|--------|------|
| N/A | Landing page | /admin-dashboard (System Administration) | /control-tower | /management-dashboard | ✅ |
| N/A | Primary nav section | SYSTEM ADMINISTRATION + SYSTEM GOVERNANCE | CONTROL TOWER + WORKSTREAM MONITORING | MANAGEMENT VISIBILITY + EXECUTIVE REPORTS | ✅ |
| N/A | Accent color | bg-purple-600 | bg-indigo-600 | bg-slate-600 | ✅ |
| N/A | Cross-nav leakage | No viewer items (strict) | No admin or viewer items | No admin or ops items | ✅ |
| N/A | User management | ✅ /admin/users | ❌ blocked | ❌ blocked | ✅ |
| N/A | Approvals center | ✅ /admin-approvals (bypass) | ✅ /admin-approvals | ❌ blocked | ✅ |
| N/A | WO/PN gate | ✅ /wo-pn-gate (bypass) | ✅ /wo-pn-gate | ❌ blocked | ✅ |
| N/A | Audit log | ✅ /audit-log | ❌ blocked | ❌ blocked | ✅ |

---

## Part 8 — Project / ProjectDetail Safety Spot Check

| # | Check | Result |
|---|-------|--------|
| N/A | viewer sees all projects (isBroadView includes viewer) | ✅ confirmed (Projects.tsx:73) |
| N/A | viewer cannot create projects (CAN_CREATE excludes viewer) | ✅ "New SO / Project" button hidden |
| N/A | viewer cannot approve projects (canApprove excludes viewer) | ✅ ApprovePanel not rendered |
| N/A | viewer cannot see project financials (canSeeMoney excludes viewer) | ✅ money column + financial section hidden |
| N/A | viewer cannot access audit log section (canAudit excludes viewer) | ✅ audit section not rendered |
| N/A | viewer can see commercial section (roles include viewer per line 80) | ✅ read-only commercial info visible |

---

## Fix Applied — HotProjects.tsx

**Problem:** "New Opportunity" button in PageHeader and EmptyState shown unconditionally — viewer
and sales_coordinator could see it. Clicking led to `/hot-projects/new` which requires
`RequireRole(['admin', 'operations_manager', 'sales_user'])`, showing Access Restricted.

This was a new regression from Step 18.7J — viewer was added to the `/hot-projects` route (correct)
but HotProjects.tsx had no canCreate guard (pre-existing gap exposed by the new viewer access).

**Fix:**
- Added `CAN_CREATE: UserRole[]` constant matching the `/hot-projects/new` route guard
- Added `canCreate = role ? CAN_CREATE.includes(role) : false` in component
- Gated PageHeader `actions` prop: `canCreate ? <Link>...</Link> : undefined`
- Gated EmptyState `action` prop: `canCreate ? <Link>...</Link> : undefined`

**Roles affected:** viewer and sales_coordinator no longer see "New Opportunity". Admin, ops_mgr,
and sales_user continue to see it as before.

**Finalization lint fix:** The same file had a pre-existing `react-hooks/set-state-in-effect`
violation at the `useEffect` body (`setLoading(true)` called synchronously). Fixed by initializing
`loading` state as `isSupabaseConfigured` (true when Supabase is active, false otherwise) and
removing the synchronous `setLoading(true)` call from the effect body. A `cancelled` ref was also
added to prevent stale state updates. Data loading behavior is unchanged.

---

## Pre-existing Issues (Deferred — Out of Scope)

| Issue | Detail | Decision |
|-------|--------|----------|
| Admin MY WORK duplication | Admin bypass shows `dashboard`, `sales-dashboard`, `coordinator-landing`, `ops-control-tower` in MY WORK (pre-existing) | Deferred — all pages accessible, no Access Restricted |
| store_user vehicle-receiving duplication | Appears in both STORE OPERATIONS and EXECUTION sections (pre-existing) | Deferred |
| factory_user duplicate nav paths | factory-projects/factory-production-lines same path; factory-rmr/factory-materials-requested same path (pre-existing) | Deferred |
| qc_user duplicate report links | qc-reports-link and qc-reports both → /reports/qc (pre-existing) | Deferred |

---

## Validation Results

Initial commit:
- `npm run build`: ✅ PASS — 0 errors, 5.81s
- `npx tsc --noEmit`: ✅ PASS — 0 errors
- `npx eslint src/pages/HotProjects.tsx`: 1 pre-existing `react-hooks/set-state-in-effect` error (noted for finalization)
- `npm run lint` (global): 82 problems

Finalization commit (lint cleanup):
- `npm run build`: ✅ PASS — 0 errors, 9.00s
- `npx tsc --noEmit`: ✅ PASS — 0 errors
- `npx eslint src/pages/HotProjects.tsx`: ✅ 0 errors — **cleaned**
- `npx eslint` (changed files — HotProjects, navigation, roleMatrix, Sidebar, App, ManagementDashboard): ✅ 0 errors; Projects.tsx 1 pre-existing error (unchanged baseline)
- `npm run lint` (global): 81 problems — **improved by 1** (HotProjects fix)

---

## Safety Review

| Item | Changed |
|------|---------|
| DB / RLS / migrations | No |
| Route guards weakened | No |
| Route guards removed | No |
| Business workflow | No |
| SO approval/routing logic | No |
| Procurement/Store/Factory/QC/AFS workflows | No |
| Quotation conversion logic | No |
| WO/PN/Store/QC/Release gates | No |
| Admin-only features exposed to non-admin | No |
| Execution actions exposed to viewer | No |
| Secrets or sensitive config exposed | No |
| Fake live data added | No |
| Role assignment source changed | No |

---

## Closure Statement

All role-based UX/IA work from Steps 18.7A–18.7J has been audited. The single confirmed blocker
(HotProjects action visibility gap) has been fixed. All 10 roles have:
- A correct, accessible landing route
- A clean, role-scoped sidebar with no cross-role contamination
- No navigation links that produce Access Restricted pages
- No unauthorized create/edit/approve buttons visible
- Role-specific governance rules in ROLE_MATRIX
- Correct reports access (viewer: executive-only; operational roles: module-specific; ops_mgr: all)

The role-based UX is stable and ready to close.
