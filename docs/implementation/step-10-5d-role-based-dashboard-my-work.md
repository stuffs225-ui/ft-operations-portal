# Step 10.5D — Role-Based Dashboard and My Work Foundation

**Date:** 2026-06-16  
**Branch:** `feature/step-10-5d-role-based-dashboard-my-work`  
**Scope:** Dashboard UI redesign — display/role-awareness only  
**Depends on:** Step 10.5C (PR #79, merged), Steps 10.5A/B, 1–10 (all merged)  
**Source of truth:** `docs/implementation/step-10-5b-target-ia-blueprint.md`

---

## 1. Executive Summary

Step 10.5D transforms the Dashboard from a generic "Operations Control Tower" into a role-aware "My Work" foundation. The page title is updated, a role-specific subtitle is shown, a MY WORK quick-access section is added at the top, the project summary strip is scoped to oversight roles, and the flat "Your Modules" tile list is replaced with role-grouped sections that align directly with the Step 10.5C navigation groups.

All changes are in `src/pages/Dashboard.tsx`. No route guards, RLS, queries, or page logic were changed.

---

## 2. Step 10.5C Alignment

| Step 10.5C Navigation Group | Dashboard Section | Status |
|-----------------------------|-------------------|--------|
| MY WORK | My Work (new quick-access strip) | ✅ Implemented |
| SALES & COMMERCIAL | Sales & Commercial tile group | ✅ Implemented |
| PROJECTS | Projects & Governance tile group | ✅ Implemented |
| EXECUTION | Execution tile group | ✅ Implemented |
| QUALITY & RELEASE | Quality & Release tile group | ✅ Implemented |
| DUBAI / AFS | Dubai / AFS tile group | ✅ Implemented |
| REPORTING | Reporting tile group | ✅ Implemented |
| ADMIN & SYSTEM | Not shown on Dashboard (deliberate) | Documented below |

> **ADMIN & SYSTEM** is intentionally omitted from the Dashboard tile groups. Admin configuration tools (settings, user management, audit logs) are accessed via the sidebar; they are not day-to-day dashboard items. This decision is documented in Section 9.

---

## 3. Old Dashboard Issues

| Issue | Severity | How Addressed |
|-------|----------|---------------|
| Title "Operations Control Tower" conflicts with separate `/control-tower` page | High | Renamed to "Dashboard" |
| Subtitle "Operational status across all modules" is generic | Medium | Replaced with role-specific subtitle |
| "Your Modules" is a flat grid with no role context grouping | High | Replaced with 6 role-grouped sections |
| Project Summary Strip shown to all roles including dept users who don't use it | Medium | Now scoped to oversight roles only |
| `KpiCardItem` used `useNavigate(onClick)` — non-semantic, bad accessibility | Low | Changed to `<Link>` component |
| Missing tiles (Vehicle Receiving, Custody, WO/PN Gate, Admin Approvals, Receivables, Hot Projects) | Medium | All added to appropriate section groups |
| No "My Work" entry point — inbox buried in nav | High | MY WORK section added at top |
| `control-tower` tile still labelled "Control Tower" in the old flat grid | Medium | Relabelled "Operations Overview" to match Step 10.5C nav rename |

---

## 4. New Dashboard Structure

```
Dashboard
├── PageHeader — "Dashboard" + role-specific subtitle + DataSourceBadge
├── Live mode info banner (unchanged)
├── MY WORK section                          ← NEW
│   ├── Action Inbox (all roles)
│   ├── Pending Approvals (admin, ops_mgr)
│   ├── Coordinator Queue (sales_coordinator)
│   └── WO / PN Gate shortcut (factory_user)
├── Project Summary Strip                    ← now role-gated
│   └── Only shown to: admin, ops_mgr, viewer, sales_coordinator
├── Critical Operational Indicators (KPI cards, mock only)
├── Dubai / AFS & After Sales (KPI cards, mock only)
├── Role-grouped sections                    ← replaces flat "Your Modules"
│   ├── Sales & Commercial
│   ├── Projects & Governance
│   ├── Execution
│   ├── Quality & Release
│   ├── Dubai / AFS
│   └── Reporting
└── Governance Golden Rules Banner (unchanged, all roles)
```

---

## 5. Role-Based Section Matrix

For each role, the table shows which sections appear on the Dashboard.

| Section | admin | ops_mgr | sales_user | sales_coord | procurement | factory | store | qc | afs | viewer |
|---------|:-----:|:-------:|:----------:|:-----------:|:-----------:|:-------:|:-----:|:--:|:---:|:------:|
| MY WORK — Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MY WORK — Pending Approvals | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MY WORK — Coordinator Queue | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MY WORK — WO/PN Gate shortcut | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Project Summary Strip | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sales & Commercial tiles | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Projects & Governance tiles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Execution tiles | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Quality & Release tiles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Dubai / AFS tiles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Reporting tiles | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Governance Banner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### What each role sees (summary):

| Role | Dashboard experience |
|------|---------------------|
| **admin** | All sections; full project summary; pending approvals shortcut |
| **ops_mgr** | All sections except ADMIN & SYSTEM tiles; project summary; pending approvals shortcut |
| **sales_user** | MY WORK (inbox), SALES & COMMERCIAL, PROJECTS — simplified; no execution/QC/Dubai |
| **sales_coord** | MY WORK (inbox + coordinator queue), Sales & Commercial, PROJECTS, Reporting; project summary |
| **procurement** | MY WORK (inbox), PROJECTS, EXECUTION (procurement only), Reporting |
| **factory** | MY WORK (inbox + WO/PN shortcut), PROJECTS (projects + WO/PN gate), EXECUTION (factory + custody) |
| **store** | MY WORK (inbox), PROJECTS, EXECUTION (store + custody + vehicle receiving) |
| **qc** | MY WORK (inbox), PROJECTS, QUALITY & RELEASE, Reporting |
| **afs** | MY WORK (inbox), PROJECTS, EXECUTION (custody only), DUBAI/AFS, Reporting |
| **viewer** | MY WORK (inbox), SALES & COMMERCIAL, PROJECTS, Reporting; project summary |

---

## 6. Cards / Quick Actions Implemented

### MY WORK Section (new)

| Card | Path | Roles | Description |
|------|------|-------|-------------|
| Action Inbox | `/inbox` | All roles | Pending actions and tasks |
| Pending Approvals | `/admin-approvals` | admin, ops_mgr | Review SO and PO approval queue |
| Coordinator Queue | `/sales-coordinator` | sales_coordinator | Process quotations and updates |
| WO / PN Gate | `/wo-pn-gate` | factory_user | Manage work orders and project numbers |

### New tiles added to module sections (were missing from old "Your Modules"):

| Tile | Section | Path | Roles |
|------|---------|------|-------|
| Hot Projects | Sales & Commercial | `/hot-projects` | admin, ops_mgr, sales_user, sales_coord, viewer |
| Receivables | Sales & Commercial | `/receivables` | admin, ops_mgr, sales_user, sales_coord, viewer |
| Admin Approvals | Projects & Governance | `/admin-approvals` | admin, ops_mgr |
| WO / PN Gate | Projects & Governance | `/wo-pn-gate` | admin, ops_mgr, factory_user |
| Material Custody | Execution | `/custody` | admin, ops_mgr, store_user, factory_user, afs_user |
| Vehicle Receiving | Execution | `/store/vehicle-receiving` | admin, ops_mgr, store_user |

### Navigation label aligned:

| Old tile label | New tile label | Route unchanged |
|----------------|---------------|-----------------|
| "Control Tower" | "Operations Overview" | `/control-tower` ✅ |

---

## 7. My Work Landing Recommendation (Part E Decision)

**Decision: Option 1 — Single `/dashboard` route with role-conditioned sections.**

Rationale:
- The role-grouped sections approach (implemented in this step) already gives each role a focused, relevant view.
- Department users (factory, store, qc, afs) see only their relevant sections — there is no "noise" from other modules.
- The MY WORK quick-access strip at the top gives each role their primary entry point.
- Creating per-role routes (`/my-work/factory`, etc.) would require new routes, new pages, and more maintenance surface area with no meaningful UX benefit over well-filtered Dashboard sections.

**Deferred to Step 10.5E or later:**
- If a specific role needs a more specialized workbench (e.g., a factory_user dashboard with production queue counts), that can be a dedicated sub-component loaded within the Dashboard or a separate `/workbench` route. This decision should be made after Step 10.5E (ProjectDetail) is complete.

---

## 8. Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/Dashboard.tsx` | Modified | Title, subtitle, My Work section, role-gated summary strip, grouped module sections |
| `docs/implementation/step-10-5d-role-based-dashboard-my-work.md` | Created | This document |

---

## 9. UI-Only Confirmation

- **Business logic:** No change. No queries, no data fetching, no mutation logic changed.
- **Route guards:** No change. `src/app/App.tsx` untouched.
- **RLS / schema:** No change. No migration files touched.
- **Permissions:** No change. `usePermission.ts` untouched. Role-based rendering uses `useAuth().role` — the existing established pattern.
- **Route paths:** No change. All `path` values in every tile and card are identical to previously accessible routes.
- **Direct route access:** No change. Pages accessible by direct URL remain accessible.
- **Existing KPI card logic:** Unchanged. `mockOrEmpty(DASHBOARD_KPI_CARDS)` and `mockOrEmpty(AFS_KPI_CARDS)` behavior preserved.
- **Existing project summary data:** Unchanged. `mockOrValue(PROJECT_SUMMARY, EMPTY_SUMMARY)` preserved.
- **Governance banner:** Unchanged. All 8 governance rules preserved verbatim.
- **ProjectDetail:** No change. Deferred to Step 10.5E.
- **No new dependencies added.**

### Accessibility improvement (non-breaking)

The old `KpiCardItem` used `useNavigate` inside an `onClick` handler on a `<div>`. This was replaced with a semantic `<Link to={card.path}>`. The visual output is identical; the HTML is now correct anchor markup. This is a pure improvement with no behavior change.

---

## 10. Ambiguous Decisions

### Decision A — ADMIN & SYSTEM section omitted from Dashboard tiles

**Rationale:** Admin configuration tools (Settings, Users, Notification Rules, Report Subscriptions, Audit Log, Access Requests, Document Templates) are sidebar-accessed configuration tools, not day-to-day dashboard entry points. Including them in the Dashboard would make admin-only users' dashboards feel like a settings panel.

**If needed:** Admin can access all these tools via the ADMIN & SYSTEM section in the sidebar. A future Step 10.5G could add an "Admin Quick Actions" shortcut card if admin feedback warrants it.

### Decision B — Project Summary Strip visibility

**Rationale:** The 8-metric strip (Active Projects, Saudi Route, Dubai Route, With WO, With PN, In Production, In QC, Ready to Deliver) is a management/oversight view of the portfolio. Department users (factory_user, store_user, qc_user, afs_user, procurement_user) don't need aggregate project counts — they work on specific projects they're assigned to.

**Preserved for:** admin, ops_mgr, viewer, sales_coordinator (oversight and read-only roles).

**REVIEW-NEEDED:** `sales_user` does not see the summary strip. Their commercial focus is on quotation pipeline rather than aggregate project counts. If sales_user feedback indicates they want project counts, this can be toggled by adding `'sales_user'` to the `showSummaryStrip` role array — a one-line change.

### Decision C — MY WORK cards use no live counts

The MY WORK quick-access cards use neutral descriptive labels rather than live counts ("Pending actions and tasks" rather than "3 pending"). This is consistent with the dashboard's existing behavior (mock data hidden in live mode). Live counts can be added in a later step when live Supabase queries are wired to the dashboard.

---

## 11. Items Intentionally Deferred

| Item | Deferred To | Reason |
|------|-------------|--------|
| Live counts in MY WORK cards (e.g., "3 pending approvals") | Post-Step 10.5I | Requires Supabase live queries on Dashboard — out of scope for UI structure step |
| Per-role workbench routes (e.g., `/workbench/factory`) | Step 10.5G or later | Decision A above — single Dashboard is sufficient for now |
| ProjectDetail role-based tab restructure | Step 10.5E | Requires ProjectDetail.tsx changes |
| `financialVisibility` enforcement in Dashboard financial tiles | Step 10.5F | No financial columns on Dashboard; not applicable |
| Admin Quick Actions shortcut group | Step 10.5G | Low priority — admin has sidebar access |
| Dashboard page title on browser tab (`<title>`) | Step 10.5G | Minor; out of scope |
| sales_user Project Summary Strip toggle | Step 10.5G | REVIEW-NEEDED item; needs user feedback first |

---

## 12. Manual Test Checklist

Test with each role by toggling dev-mode role in `AuthContext` or via login.

**General:**
1. [ ] **Dashboard title reads "Dashboard"** (not "Operations Control Tower")
2. [ ] **Subtitle is role-specific** — e.g., admin sees "Full system access across all modules and governance"; factory_user sees "Production execution, work orders, and factory operations"
3. [ ] **Page is responsive** — 2-col mobile, 3-col sm, 4-col lg, 6-col xl for tile grids
4. [ ] **Governance banner is present** with all 8 rules intact

**MY WORK section:**
5. [ ] **Action Inbox tile is present for all roles** under MY WORK
6. [ ] **Pending Approvals tile is present for admin/ops_mgr** and absent for all other roles
7. [ ] **Coordinator Queue tile is present for sales_coordinator** only
8. [ ] **WO / PN Gate shortcut is present for factory_user** only

**Project Summary Strip:**
9. [ ] **Strip visible for admin, ops_mgr, viewer, sales_coordinator**
10. [ ] **Strip hidden for sales_user, procurement_user, factory_user, store_user, qc_user, afs_user**

**Role-grouped sections:**
11. [ ] **sales_user sees:** MY WORK (inbox only), Sales & Commercial, Projects & Governance — no Execution/Quality/Dubai sections
12. [ ] **factory_user sees:** MY WORK (inbox + WO/PN shortcut), Projects & Governance (projects + WO/PN gate + admin approvals absent), Execution (factory + custody)
13. [ ] **qc_user sees:** MY WORK (inbox), Projects & Governance, Quality & Release, Reporting
14. [ ] **afs_user sees:** MY WORK (inbox), Projects & Governance, Execution (custody only), Dubai/AFS, Reporting
15. [ ] **viewer sees:** MY WORK (inbox), Sales & Commercial, Projects & Governance, Reporting; no Execution/QC/Dubai sections

**Tile content:**
16. [ ] **"Operations Overview" tile links to `/control-tower`** (not "Control Tower")
17. [ ] **Receivables tile appears under Sales & Commercial** (not under Reporting)
18. [ ] **Hot Projects tile appears under Sales & Commercial**
19. [ ] **Admin Approvals tile appears under Projects & Governance** (visible to admin/ops_mgr only)
20. [ ] **WO / PN Gate tile appears under Projects & Governance** (visible to admin/ops_mgr/factory_user)
21. [ ] **Vehicle Receiving tile appears under Execution** (visible to admin/ops_mgr/store_user)
22. [ ] **Material Custody tile appears under Execution** (visible to admin/ops_mgr/store_user/factory_user/afs_user)

**Navigation & routes:**
23. [ ] **Direct route access unchanged** — all tile paths navigate correctly
24. [ ] **Active route highlighting** in sidebar still works after navigating from Dashboard tiles
25. [ ] **KPI cards still show in dev/mock mode** — `DASHBOARD_KPI_CARDS` section still renders

---

## 13. Recommended Step 10.5E Scope

Step 10.5E should focus on **ProjectDetail — 6-tab restructure with role-based tab matrix**.

The Step 10.5B blueprint defines:

| Target Tab | Replaces | Roles |
|-----------|---------|-------|
| Overview | overview + details | All roles |
| Commercial | lines (financial visibility enforced) | admin, ops_mgr, sales_user, sales_coordinator, viewer |
| Execution | procurement + factory + store + custody | admin, ops_mgr, procurement_user, factory_user, store_user, afs_user |
| Quality & Release | qc_release | admin, ops_mgr, qc_user |
| Documents | documents | All roles |
| Activity | timeline + audit | All roles (audit: admin/ops_mgr only) |

### Step 10.5E constraints (must not violate):
- Do NOT change route guards or RLS
- Do NOT change existing query logic in tabs
- Do NOT break Step 10 WO/PN gate behavior (factory tab governance)
- Do NOT change the approval flow (Step 9 behavior)
- Do NOT change the QC release gate logic
- UI-only tab restructure — tab keys and data fetching stay as-is; tabs are merged visually

### Step 10.5E approach:
1. Read `src/pages/ProjectDetail.tsx` in full
2. Map the 12 current tab keys to 6 target tabs
3. Implement role-based tab filtering using `useAuth().role` (same pattern as Dashboard)
4. Use `usePermission().financialVisibility` to gate financial columns in the Commercial tab
5. Document which tab key → target tab mapping was used
6. Do NOT remove any existing sub-component logic — consolidate visually, preserve data access

### What Step 10.5E must NOT do:
- Do not change Supabase queries
- Do not change WO/PN gate enforcement in ProjectDetail
- Do not change the approval/rejection flow
- Do not add new routes
- Do not add new dependencies
