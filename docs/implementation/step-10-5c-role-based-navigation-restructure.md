# Step 10.5C — Role-Based Navigation Restructure

**Date:** 2026-06-16  
**Branch:** `feature/step-10-5c-role-based-navigation-restructure`  
**Scope:** UI navigation restructure — display/grouping only  
**Depends on:** Step 10.5B (PR #78, merged), Steps 10.5A, 1–10 (all merged)  
**Source of truth:** `docs/implementation/step-10-5b-target-ia-blueprint.md`

---

## 1. Executive Summary

Step 10.5C implements the navigation grouping and section renaming defined in the Step 10.5B blueprint. The old 7-section navigation becomes 8 well-labelled sections: MY WORK, SALES & COMMERCIAL, PROJECTS, EXECUTION, QUALITY & RELEASE, DUBAI / AFS, REPORTING, and ADMIN & SYSTEM.

Three items move between sections (Notifications, Receivables, Control Tower nav item rename). All route paths are unchanged. No route guards, RLS, or page logic were touched.

This is a UI display layer change only.

---

## 2. Step 10.5B Blueprint Alignment

| Blueprint Decision | Implemented |
|--------------------|-------------|
| D-001: MY WORK replaces CONTROL CENTER | ✅ |
| D-002: SALES & COMMERCIAL replaces SALES & QUOTATION | ✅ |
| D-003: EXECUTION replaces OPERATIONS | ✅ |
| D-004: QUALITY & RELEASE replaces QUALITY | ✅ |
| D-005: REPORTS & ADMIN split into REPORTING + ADMIN & SYSTEM | ✅ |
| D-006: Action Inbox stays under MY WORK | ✅ (was already logically there) |
| D-007: Notifications moves to MY WORK | ✅ |
| D-008: Receivables moves to SALES & COMMERCIAL | ✅ |
| D-009: Control Tower nav label renamed "Operations Overview" | ✅ |
| D-010: WO/PN Gate and Admin Approvals stay under PROJECTS | ✅ |
| D-011: All route paths unchanged | ✅ |

---

## 3. Old Navigation Groups (7 sections)

| Section Label | Item Count | Items |
|--------------|-----------|-------|
| CONTROL CENTER | 2 | Dashboard, Action Inbox |
| SALES & QUOTATION | 4 | Quotations, Sales Workspace, Hot Projects, Sales Coordinator |
| PROJECTS | 3 | Projects/SO, Admin Approvals, WO/PN Gate |
| OPERATIONS | 5 | Procurement, Factory, Store, Custody, Vehicle Receiving |
| QUALITY | 2 | Material QC, Project/Vehicle QC |
| DUBAI / AFS | 2 | Dubai/AFS, After Sales Maintenance |
| REPORTS & ADMIN | 11 | Receivables, Control Tower, Reports, Templates, Notifications, Settings, Admin/Users, Access Requests, Notification Rules, Report Subscriptions, Audit Log |

**Total items: 29**

---

## 4. New Navigation Groups (8 sections)

| Section Label | Item Count | Items |
|--------------|-----------|-------|
| MY WORK | 3 | Dashboard, Action Inbox, Notifications |
| SALES & COMMERCIAL | 5 | Quotations, Sales Workspace, Hot Projects, Sales Coordinator, Receivables |
| PROJECTS | 3 | Projects/SO, Admin Approvals, WO/PN Gate |
| EXECUTION | 5 | Procurement, Factory, Store, Custody, Vehicle Receiving |
| QUALITY & RELEASE | 2 | Material QC, Project/Vehicle QC |
| DUBAI / AFS | 2 | Dubai/AFS, After Sales Maintenance |
| REPORTING | 2 | Operations Overview (was Control Tower), Reports |
| ADMIN & SYSTEM | 7 | Document Templates, Access Requests, Notification Rules, Report Subscriptions, Admin/Users, Settings, Audit Log |

**Total items: 29** (unchanged — restructure only, no additions or deletions)

---

## 5. Item Movement Table

| Item | Old Section | New Section | Route Path | Label Changed | Roles Changed |
|------|-------------|-------------|-----------|---------------|---------------|
| Dashboard | CONTROL CENTER | MY WORK | `/` | "Home" → "Dashboard" | No |
| Notifications | REPORTS & ADMIN | MY WORK | `/notifications` | No | No |
| Receivables | REPORTS & ADMIN | SALES & COMMERCIAL | `/receivables` | No | No |
| Control Tower nav | REPORTS & ADMIN | REPORTING | `/control-tower` | "Control Tower" → "Operations Overview" | No |
| Action Inbox | CONTROL CENTER | MY WORK | `/inbox` | No | No |

**Items with only section rename (not moved):**

| Item | Old Section Label | New Section Label |
|------|------------------|------------------|
| All OPERATIONS items | OPERATIONS | EXECUTION |
| All QUALITY items | QUALITY | QUALITY & RELEASE |
| All SALES & QUOTATION items | SALES & QUOTATION | SALES & COMMERCIAL |
| All remaining REPORTS & ADMIN items | REPORTS & ADMIN | ADMIN & SYSTEM |

---

## 6. Role Visibility Summary

The `buildVisibleNav()` function in `Sidebar.tsx` derives visibility from the `roles` array on each `NavItem`. All role arrays were preserved exactly from the pre-Step-10.5C baseline.

| Role | Sections Visible | Notes |
|------|-----------------|-------|
| **admin** | All 8 sections | No change from baseline |
| **operations_manager** | MY WORK, SALES & COMMERCIAL, PROJECTS, EXECUTION, QUALITY & RELEASE, DUBAI/AFS, REPORTING, ADMIN & SYSTEM (excl. Users/Settings/Audit Log) | No change |
| **sales_user** | MY WORK (no Dashboard¹), SALES & COMMERCIAL, PROJECTS | Simplified — EXECUTION/QUALITY/DUBAI/ADMIN not shown |
| **sales_coordinator** | MY WORK (no Dashboard¹ wait — sales_coordinator DOES get Dashboard), SALES & COMMERCIAL (excl. Sales Workspace), PROJECTS, REPORTING, ADMIN & SYSTEM (templates only) | No change |
| **procurement_user** | MY WORK (Dashboard+Inbox+Notifications), PROJECTS, EXECUTION (procurement only), REPORTING | No change |
| **factory_user** | MY WORK, PROJECTS (projects+WO/PN Gate), EXECUTION (factory+custody), ADMIN & SYSTEM (templates) | No change |
| **store_user** | MY WORK, PROJECTS, EXECUTION (store+custody+vehicle-receiving), ADMIN & SYSTEM (templates) | No change |
| **qc_user** | MY WORK, PROJECTS, QUALITY & RELEASE, REPORTING, ADMIN & SYSTEM (templates) | No change |
| **afs_user** | MY WORK, PROJECTS, EXECUTION (custody only), DUBAI/AFS, REPORTING, ADMIN & SYSTEM (templates) | No change |
| **viewer** | MY WORK, SALES & COMMERCIAL (excl. Sales Coordinator), PROJECTS, REPORTING | No change |

¹ `sales_user` does not see Dashboard because they redirect to `/sales` at root. The Dashboard nav item preserves its existing `roles` exclusion.

> **REVIEW-NEEDED (from Step 10.5B):** The `sales_coordinator` role had Dashboard in the old baseline. This is preserved here. Step 10.5D will determine whether `sales_coordinator` needs a dedicated workbench or stays on the Dashboard.

---

## 7. Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `src/data/navigation.ts` | Modified | Section restructure — 7 → 8 groups; 3 items moved; 5 label changes |
| `src/components/layout/Sidebar.tsx` | Modified | Added `BarChart2` to ICON_MAP (pre-existing bug: `reports` used `BarChart2` icon key but it was not imported) |
| `docs/implementation/step-10-5c-role-based-navigation-restructure.md` | Created | This document |

---

## 8. UI-Only Confirmation

The following confirms no production logic was changed:

- **Business logic:** No change. Zero modifications to page components, hooks (other than confirming `usePermission` unchanged), context, or data fetching logic.
- **Route guards (`RequireRole`):** No change. `src/app/App.tsx` is untouched.
- **RLS / Supabase schema:** No change. No migration files touched.
- **Permissions:** No change. `usePermission.ts` is untouched. No `roles` arrays were modified.
- **Route paths:** No change. All `path` values in `NAV_ITEMS` are identical to the baseline.
- **Direct route access:** No change. Routes that were accessible by direct URL remain accessible.
- **Page components:** No change. No `.tsx` page files were modified.
- **ProjectDetail:** No change. Deferred to Step 10.5E.
- **Dashboard logic:** No change. Deferred to Step 10.5D.

---

## 9. Ambiguous Mapping Decisions

### Decision A — Receivables placement: SALES & COMMERCIAL (not REPORTING)

**Ambiguity:** Receivables is an aging/invoicing tool. It could logically sit in REPORTING (financial report) or SALES & COMMERCIAL (commercial finance).

**Decision:** SALES & COMMERCIAL. Receivables is operationally used by sales_user and sales_coordinator to track customer invoicing status — a commercial activity. It is not a retrospective management report.

**Documented in:** Step 10.5B blueprint, section 3.2.

### Decision B — Notifications placement: MY WORK (not ADMIN & SYSTEM)

**Ambiguity:** Notifications could be a user preference tool (ADMIN & SYSTEM) or a live task feed (MY WORK).

**Decision:** MY WORK. The `/notifications` page in context is a notification feed, not a notification settings panel. Users check it as part of their daily work routine. The *rules* for notifications (`/admin/notification-rules`) stay in ADMIN & SYSTEM.

### Decision C — "Control Tower" nav label renamed to "Operations Overview"

**Ambiguity:** The Dashboard page (at `/`) is titled "Operations Control Tower". The nav item (at `/control-tower`) was also labeled "Control Tower". This created a persistent naming collision documented in Step 10.5A (UX-RISK-003).

**Decision:** Rename nav label to "Operations Overview". Route path `/control-tower` is unchanged. The Dashboard page title ("Operations Control Tower") is a Step 10.5D concern.

### Decision D — "Home" nav label renamed to "Dashboard"

**Ambiguity:** "Home" could mean the root URL, a personal workbench, or the dashboard.

**Decision:** Rename to "Dashboard". This matches the actual page content (KPI cards, project summary, module tiles). "Home" is ambiguous — "Dashboard" is standard and searchable.

---

## 10. Items Intentionally Deferred

| Item | Deferred To | Reason |
|------|-------------|--------|
| Dashboard page title rename ("Operations Control Tower" → "Dashboard") | Step 10.5D | Requires page component change |
| Role-aware Dashboard sections (My Work panels per role) | Step 10.5D | Page logic change |
| ProjectDetail 12 → 6 tab consolidation | Step 10.5E | Significant page component change |
| Role-based tab visibility in ProjectDetail | Step 10.5E | Requires ProjectDetail.tsx changes |
| `usePermission` enforcement in nav (e.g., `hasPermission('can_view_costs')` to hide financial nav items) | Step 10.5E/F | Current nav items don't carry financial data; no risk in this step |
| Collapsible navigation sections | Step 10.5D or later | Step 10.5B deferred this (DF-009); requires Sidebar component change |
| `sales_user` simplified PROJECTS section | Step 10.5G | Currently sees full Projects list; may need per-project RLS scoping review |

---

## 11. Manual Test Checklist

Test with each role by toggling dev-mode role in `AuthContext` or via login.

1. [ ] **Sidebar renders 8 section headers for admin/ops_mgr:** MY WORK, SALES & COMMERCIAL, PROJECTS, EXECUTION, QUALITY & RELEASE, DUBAI / AFS, REPORTING, ADMIN & SYSTEM
2. [ ] **Action Inbox appears under MY WORK** (not under SALES & COMMERCIAL)
3. [ ] **Notifications appears under MY WORK** (not under ADMIN & SYSTEM)
4. [ ] **WO / PN Gate appears under PROJECTS**
5. [ ] **Admin Approvals appears under PROJECTS**
6. [ ] **Procurement, Factory, Store, Custody, Vehicle Receiving appear under EXECUTION**
7. [ ] **Material QC and Project/Vehicle QC appear under QUALITY & RELEASE**
8. [ ] **Dubai/AFS and After Sales appear under DUBAI / AFS**
9. [ ] **"Operations Overview" and "Reports" are the only items under REPORTING**
10. [ ] **Receivables appears under SALES & COMMERCIAL** (not under REPORTING or ADMIN & SYSTEM)
11. [ ] **ADMIN & SYSTEM contains:** Templates, Access Requests, Notification Rules, Report Subscriptions, Admin/Users, Settings, Audit Log
12. [ ] **sales_user sees simplified nav:** MY WORK (no Dashboard), SALES & COMMERCIAL, PROJECTS only
13. [ ] **factory_user sees:** MY WORK (Dashboard+Inbox+Notifications), PROJECTS (projects+WO-PN-Gate), EXECUTION (factory+custody), ADMIN & SYSTEM (templates only)
14. [ ] **qc_user sees:** MY WORK, PROJECTS, QUALITY & RELEASE, REPORTING, ADMIN & SYSTEM (templates only)
15. [ ] **afs_user sees:** MY WORK, PROJECTS, EXECUTION (custody only), DUBAI/AFS, REPORTING, ADMIN & SYSTEM (templates only)
16. [ ] **Direct route access unchanged:** Navigating to `/receivables`, `/control-tower`, `/notifications`, `/admin/users` directly still works regardless of nav placement
17. [ ] **Active route highlighting still works:** Current route highlights correctly in new section structure
18. [ ] **Mobile sidebar overlay still works:** Open/close behavior unchanged
19. [ ] **"Reports" nav icon renders** (was broken pre-10.5C due to missing `BarChart2` in ICON_MAP — now fixed)

---

## 12. Recommended Step 10.5D Scope

Step 10.5D should focus on **Dashboard / My Work per-role sections** — making the Dashboard useful for each role rather than generic.

Suggested scope:

### Part A — Dashboard page improvements
- Rename Dashboard page `<PageHeader>` title from "Operations Control Tower" to "Dashboard"
- Add role-conditioned sections that show the most relevant KPI cards for each role
- Hide sections that are irrelevant to the current role (use `usePermission()` hook)
- For `admin`/`ops_mgr`: show full KPI cards, project summary, governance rules banner (current behavior)
- For `procurement_user`: show only procurement-relevant KPI cards
- For `factory_user`: show production KPI cards
- For `store_user`: show store/custody KPI cards
- For `qc_user`: show QC status cards
- For `afs_user`: show Dubai/AFS status cards
- For `viewer`: show summary-only view (project summary strip + reporting links)
- For `sales_coordinator`: show quotation pipeline summary

### Part B — My Work nav entry point per role
- Consider whether each role needs a custom "My Work" landing page or whether the Dashboard with role-filtered sections is sufficient
- Step 10.5B deferred this (DF-001): "My Work page vs. Dashboard with role sections"

### Part C — Governance rules banner
- Verify governance rules banner on Dashboard still shows correctly after any title change

### What Step 10.5D must NOT do:
- Do not change route paths
- Do not change RLS or route guards
- Do not redesign ProjectDetail (Step 10.5E)
- Do not add new pages — improve existing Dashboard and module hub pages

---

## Appendix A — Stable Nav Item IDs

All `id` values from the baseline are preserved unchanged. The following components or logic that reference nav item IDs by string will continue to work:

| ID | Path | Notes |
|----|------|-------|
| `dashboard` | `/` | Label changed from "Home" to "Dashboard" |
| `inbox` | `/inbox` | Unchanged |
| `notifications` | `/notifications` | Moved section only |
| `quotations` | `/quotations` | Unchanged |
| `sales` | `/sales` | Unchanged |
| `hot-projects` | `/hot-projects` | Unchanged |
| `sales-coordinator` | `/sales-coordinator` | Unchanged |
| `receivables` | `/receivables` | Moved section only |
| `projects` | `/projects` | Unchanged |
| `admin-approvals` | `/admin-approvals` | Unchanged |
| `wo-pn-gate` | `/wo-pn-gate` | Unchanged |
| `procurement` | `/procurement` | Unchanged |
| `factory` | `/factory` | Unchanged |
| `store` | `/store` | Unchanged |
| `custody` | `/custody` | Unchanged |
| `vehicle-receiving` | `/store/vehicle-receiving` | Unchanged |
| `material-qc` | `/material-qc` | Unchanged |
| `project-qc` | `/project-qc` | Unchanged |
| `dubai-afs` | `/dubai-afs` | Unchanged |
| `after-sales` | `/after-sales` | Unchanged |
| `control-tower` | `/control-tower` | Label changed to "Operations Overview" |
| `reports` | `/reports` | Unchanged |
| `templates` | `/templates` | Unchanged |
| `admin-access-requests` | `/admin/access-requests` | Unchanged |
| `admin-notification-rules` | `/admin/notification-rules` | Unchanged |
| `admin-report-subscriptions` | `/admin/report-subscriptions` | Unchanged |
| `admin-users` | `/admin/users` | Unchanged |
| `settings` | `/settings` | Unchanged |
| `audit-log` | `/audit-log` | Unchanged |

> **Note:** One new separator ID was added: `sep-7` for the ADMIN & SYSTEM section header. The old `sep-6` which was REPORTS & ADMIN is now REPORTING. The old REPORTS & ADMIN items under `sep-6` are now split between `sep-6` (REPORTING) and `sep-7` (ADMIN & SYSTEM). No existing code references separator IDs.
