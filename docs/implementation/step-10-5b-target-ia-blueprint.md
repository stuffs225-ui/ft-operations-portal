# Step 10.5B — Target IA Blueprint and Role-Based UX Architecture

**Date:** 2026-06-16  
**Branch:** `feature/step-10-5b-target-ia-blueprint`  
**Scope:** Documentation-only — target information architecture blueprint before implementation  
**Depends on:** Step 10.5A (PR #77, merged), Steps 1–10 (all merged)  
**Source of truth:** `docs/implementation/step-10-5a-ux-ia-role-audit.md`

---

## 1. Executive Summary

Step 10.5A diagnosed the portal's UX as module-first: every department module added a tab to ProjectDetail, a section to the sidebar, and pages to the router. The cumulative effect is a system that exposes all operational detail to all roles regardless of relevance.

Step 10.5B establishes the **target IA blueprint** — the architectural decisions, role-based navigation structure, ProjectDetail tab matrix, dashboard model, and component plan that all subsequent implementation steps (10.5C–10.5I) must follow.

**Two important updates since Step 10.5A was written:**

1. `usePermission.ts` hook is now live on main — the `PERMISSION_KEYS` gap is **closed**. The hook provides `hasPermission()`, `financialVisibility`, `canViewCosts`, and `canAccessFinancials` for any component to consume.
2. The following components now exist on main and are available for Step 10.5C onwards: `src/components/ui/tabs.tsx` (Radix UI), `src/components/feedback/empty-state.tsx`, `error-state.tsx`, `loading-state.tsx`, `data-display/data-table.tsx`, `data-display/filter-bar.tsx`, `auth/PermissionGate.tsx`, `ui/skeleton.tsx`, `ui/sheet.tsx`, `ui/dialog.tsx`.

This means Step 10.5C's component consolidation work is significantly reduced in scope.

**Recommendation: Proceed to Step 10.5C** after this blueprint is merged.

---

## 2. Target UX Model

### 2.1 Transition Statement

| From (Current) | To (Target) |
|----------------|------------|
| Module-first navigation | Role-first navigation |
| All modules visible to all roles | Only role-relevant modules visible |
| ProjectDetail as module aggregator (12 tabs, all visible to all) | ProjectDetail as project command center (role-filtered tabs) |
| Generic dashboard for all non-sales roles | Role-aware dashboard sections with My Work |
| Operational detail always shown in full | Summary-first; full detail on demand or in workbench |
| Manual role checks scattered per page | `usePermission()` hook and `PermissionGate` component used consistently |

### 2.2 Target UX Principles

| Principle | Definition |
|-----------|-----------|
| **My Work First** | Every role's landing page shows their pending tasks, not a generic module map. |
| **Role-Specific Navigation** | Sidebar sections and items rendered by role — not all roles see all sections. |
| **ProjectDetail as Command Center** | ProjectDetail is a role-filtered overview of a project's status — not a full replica of every operational module. |
| **Summary First, Detail on Demand** | Operational data appears as status cards in ProjectDetail; full operational detail lives in the department workbench. |
| **Operational Work Inside Workbenches** | Factory users work in `/factory/projects/:id`. QC users work in `/project-qc`. Store users work in `/store`. ProjectDetail links to these workbenches; it does not replicate them. |
| **Sensitive Data Hidden Where Appropriate** | Financial data, internal factory records, procurement costs, QC internal findings are hidden from roles that do not need them. All UI-level hiding is documented against its RLS/route-guard backing. |
| **No UI-Only Security Assumptions** | Hiding a tab or section at the UI level does NOT constitute a security boundary. Every sensitive data hide must be cross-referenced against the route guard or RLS that backs it. |
| **Permission Hook as the Single Source** | `usePermission()` is used for all permission checks. Hard-coded `role === 'admin'` checks in page components are acceptable for narrow cases only; must not spread. |

---

## 3. Target Navigation Architecture

### 3.1 Proposed Navigation Groups

The current 7-section navigation becomes 7 restructured sections. Item counts are reduced by consolidation; no routes are deleted.

| Section | Label | Purpose | Roles That See It |
|---------|-------|---------|------------------|
| 1 | **MY WORK** | Personal task queue, notifications, home | All roles |
| 2 | **SALES & COMMERCIAL** | Quotations, projects (commercial view), receivables, hot projects | admin, ops_mgr, sales_user, sales_coordinator, viewer |
| 3 | **PROJECTS** | All projects/SO list, admin approvals, WO/PN gate | All roles (filtered by item) |
| 4 | **EXECUTION** | Procurement, Factory, Store, Custody, Vehicle Receiving | admin, ops_mgr, procurement_user, factory_user, store_user, afs_user |
| 5 | **QUALITY & RELEASE** | Material QC, Project/Vehicle QC | admin, ops_mgr, qc_user |
| 6 | **DUBAI / AFS** | Dubai/AFS hub, After Sales Maintenance | admin, ops_mgr, afs_user |
| 7 | **REPORTING** | Reports, Control Tower, Sales Coordinator tools | admin, ops_mgr, viewer, dept users per report |
| 8 | **ADMIN & SYSTEM** | Settings, Users, Notification Rules, Report Subscriptions, Access Requests, Audit Log, Document Templates | admin, ops_mgr (filtered) |

> Note: 8 sections proposed, replacing 7 current sections. The CONTROL CENTER section is renamed MY WORK. REPORTS & ADMIN is split into REPORTING and ADMIN & SYSTEM.

### 3.2 Section-by-Section Detail

#### MY WORK

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Dashboard / Home | CONTROL CENTER as "Home" | Full — rename to "Dashboard" | all excl. sales_user |
| Action Inbox | Between CONTROL CENTER and SALES | Full | All roles |
| Notifications | REPORTS & ADMIN | Move to MY WORK bottom | All roles |

**Decision: Action Inbox moves into MY WORK as second item.** It is cross-role. Its placement under SALES & QUOTATION (current state) implies it is sales-only. It is not.

#### SALES & COMMERCIAL

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Quotation Requests | SALES & QUOTATION | Full | admin, ops_mgr, sales_user, sales_coordinator, viewer |
| Sales Workspace | SALES & QUOTATION | Full | admin, ops_mgr, sales_user |
| Hot Projects | SALES & QUOTATION | Full | admin, ops_mgr, sales_user, sales_coordinator, viewer |
| Sales Coordinator | SALES & QUOTATION | Full | admin, ops_mgr, sales_coordinator |
| **Receivables** | **REPORTS & ADMIN** → **Move here** | Full | admin, ops_mgr, sales_user, sales_coordinator, viewer |

**Decision: Receivables moves to SALES & COMMERCIAL.** It is a sales-facing tool (aging, invoicing) — not an admin or reporting tool.

#### PROJECTS

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Projects / SO | PROJECTS | Full | All roles |
| Admin Approvals | PROJECTS | Full | admin, ops_mgr |
| WO / PN Gate | PROJECTS | Full | admin, ops_mgr, factory_user |

No change to items — section kept focused. WO/PN Gate is a governance page correctly grouped with Projects.

#### EXECUTION

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Procurement | OPERATIONS | Full | admin, ops_mgr, procurement_user |
| Factory / Production | OPERATIONS | Full | admin, ops_mgr, factory_user |
| Store / Warehouse | OPERATIONS | Full | admin, ops_mgr, store_user |
| Material Custody | OPERATIONS | Full | admin, ops_mgr, store_user, factory_user, afs_user |
| Vehicle Receiving | OPERATIONS | Full | admin, ops_mgr, store_user |

**Decision: OPERATIONS renamed to EXECUTION.** The word "Operations" is overloaded with the role `operations_manager`. EXECUTION better describes what this section covers — active production work.

**Decision: Dubai / AFS remains its own section** (see DUBAI / AFS below). AFS work is geographically and operationally distinct; merging it into EXECUTION would confuse afs_user who only needs their section.

#### QUALITY & RELEASE

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Material QC | QUALITY | Full | admin, ops_mgr, qc_user |
| Project / Vehicle QC | QUALITY | Full | admin, ops_mgr, qc_user |

No change to items. Section kept as-is. QUALITY renamed to QUALITY & RELEASE to better reflect its scope (Release Notes live here).

#### DUBAI / AFS

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Dubai / AFS | DUBAI / AFS | Full | admin, ops_mgr, afs_user |
| After Sales Maintenance | DUBAI / AFS | Full | admin, ops_mgr, afs_user |

No change to items. Section kept separate.

#### REPORTING

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Control Tower | REPORTS & ADMIN | Full | admin, ops_mgr, viewer |
| Reports | REPORTS & ADMIN | Full | admin, ops_mgr, dept users per report, sales_coordinator, viewer |

**Decision: Control Tower and Reports are the only items in REPORTING.** Everything else moves to ADMIN & SYSTEM.

#### ADMIN & SYSTEM

| Item | Current Location | Target Access | Roles |
|------|-----------------|---------------|-------|
| Document Templates | REPORTS & ADMIN | Full | admin, ops_mgr, most dept roles |
| Access Requests | REPORTS & ADMIN | Full | admin, ops_mgr |
| Notification Rules | REPORTS & ADMIN | Full | admin, ops_mgr |
| Report Subscriptions | REPORTS & ADMIN | Full | admin, ops_mgr |
| Admin / Users | REPORTS & ADMIN | Full | admin |
| Settings | REPORTS & ADMIN | Full | admin |
| Audit Log | REPORTS & ADMIN | Full | admin |

**Decision: Document Templates moves to ADMIN & SYSTEM.** Template management is an admin/ops tool. Most dept roles can use templates without needing to see them in a top-level navigation section. If a role needs to generate a document, they do so from within their module or from a page action, not from the nav.

> **Exception:** If document generation is a frequent daily task for department users, a "Generate Document" shortcut can be added to the relevant module hub page. This is a Step 10.5E/10.5G decision, not navigation.

### 3.3 Role-Based Navigation Matrix

For each role, items are listed as **visible** or filtered out by `buildVisibleNav`.

| Item | admin | ops_mgr | sales_user | sales_coord | procurement | factory | store | qc | afs | viewer |
|------|:-----:|:-------:|:----------:|:-----------:|:-----------:|:-------:|:-----:|:--:|:---:|:------:|
| **MY WORK** | | | | | | | | | | |
| Dashboard | ✅ | ✅ | ❌¹ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Action Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SALES & COMMERCIAL** | | | | | | | | | | |
| Quotation Requests | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sales Workspace | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Hot Projects | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sales Coordinator | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Receivables | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PROJECTS** | | | | | | | | | | |
| Projects / SO | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Approvals | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| WO / PN Gate | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **EXECUTION** | | | | | | | | | | |
| Procurement | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Factory / Production | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Store / Warehouse | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Material Custody | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Vehicle Receiving | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **QUALITY & RELEASE** | | | | | | | | | | |
| Material QC | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Project / Vehicle QC | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **DUBAI / AFS** | | | | | | | | | | |
| Dubai / AFS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| After Sales Maintenance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **REPORTING** | | | | | | | | | | |
| Control Tower | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reports | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ADMIN & SYSTEM** | | | | | | | | | | |
| Document Templates | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Access Requests | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notification Rules | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Report Subscriptions | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Admin / Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

¹ `sales_user` redirects to `/sales` at root. Dashboard nav item intentionally hidden.

**Visible item count by role (target):**

| Role | Target Count | Current Count | Delta |
|------|-------------|---------------|-------|
| admin | 28 | 29 | -1² |
| ops_mgr | 23 | 24 | -1² |
| sales_user | 10 | 10 | 0 |
| sales_coordinator | 11 | 11 | 0 |
| procurement | 8 | 8 | 0 |
| factory | 9 | 9 | 0 |
| store | 9 | 9 | 0 |
| qc | 8 | 8 | 0 |
| afs | 8 | 8 | 0 |
| viewer | 10 | 11 | -1² |

² Slight reduction from removing Notifications from REPORTS & ADMIN and merging it into MY WORK (net count: same item, better placement). The delta shows administrative items consolidated in ADMIN & SYSTEM vs. scattered through REPORTS & ADMIN.

> **Note on item counts:** The target navigation does not reduce item counts significantly for most roles. The primary improvement is **section grouping and labels**, not item elimination. The quality of navigation improves through better section names and logical placement, not through hiding more items.

### 3.4 Navigation Item Label Changes

| Current Label | Target Label | Reason |
|---------------|-------------|--------|
| CONTROL CENTER | MY WORK | "Control Center" implies a management tool; MY WORK is universal |
| Home | Dashboard | "Home" is ambiguous; "Dashboard" is standard |
| SALES & QUOTATION | SALES & COMMERCIAL | "Commercial" includes Receivables and Invoicing, not just Quotations |
| OPERATIONS | EXECUTION | "Operations" is the role name of `operations_manager`; confusing |
| QUALITY | QUALITY & RELEASE | Release Notes live here — naming should reflect that |
| REPORTS & ADMIN | Split: REPORTING + ADMIN & SYSTEM | Over-grouped; splitting by function improves clarity |
| Control Tower | Operations Overview | Distinguishes from "Dashboard" which is also a management view |

> **Decision: "Control Tower" renamed to "Operations Overview".** The nav item "Home" already points to a page titled "Operations Control Tower". Having both a nav item called "Control Tower" (at `/control-tower`) and a page titled "Operations Control Tower" (at `/`) creates persistent user confusion documented in Step 10.5A.

---

## 4. ProjectDetail Target IA

### 4.1 Design Philosophy

ProjectDetail is currently a **module aggregator** — it pulls in sub-tables from every operational module into one place. The target is a **project command center** — a status-first view that shows what is happening and links to the module workbench where detailed work is done.

**Core principle:** If a department user needs to do operational work on a project, they go to their workbench (e.g., `/factory/projects/:id`). ProjectDetail shows the summary and links to the workbench. It does not replicate the workbench's full detail tables.

### 4.2 Current vs. Target Tab Structure

| Current Tab | Target Tab | Treatment |
|-------------|-----------|-----------|
| Overview | **Overview** | Kept — enhanced with blockers card |
| SO Details | **Commercial** | Merged with Vehicle Lines |
| Vehicle Lines | → merged into Commercial | |
| Documents | **Documents** | Kept |
| Procurement | → summary in **Execution Progress** | Full detail → workbench link |
| Factory | → summary in **Execution Progress** | Full detail → workbench link |
| Store | → summary in **Execution Progress** | Full detail → workbench link |
| Dubai / AFS | → conditional section in **Execution Progress** | Only shown for Dubai route |
| QC & Release | **Quality & Release** | Reduced to status cards + release note |
| Approval & Routing | → folded into **Overview** + **Activity** | Routing card moves to Overview; ApprovePanel stays in dedicated section |
| Timeline | **Activity** | Merged with approval history |
| Audit | → panel in **Activity** (admin only) | Not a separate tab |

**Target tabs (6):**

| # | Tab Key | Label | Purpose |
|---|---------|-------|---------|
| 1 | `overview` | Overview | Project status, health, WO/PN gate, routing summary, blockers, invoicing link |
| 2 | `commercial` | Commercial | SO details + vehicle lines (merged) |
| 3 | `execution` | Execution | Procurement/Factory/Store/AFS status cards + workbench links |
| 4 | `quality` | Quality & Release | QC status cards + release note status |
| 5 | `documents` | Documents | Uploaded project documents |
| 6 | `activity` | Activity | Timeline + approval history; Audit panel (admin only) |

**Net reduction: 12 tabs → 6 tabs for all roles, then further filtered by role.**

### 4.3 Tab-by-Tab Definition

#### Tab 1: Overview

**Purpose:** The project at a glance — where it is in its lifecycle, what is blocking it, and quick links to the next action.

**Data shown:**
- Project info card: code, SO number, customer, status badge, location, medical flag
- Dates & people: delivery date, sales owner, created/approved dates
- WO/PN Gate card (existing `WoPnGateCard` — unchanged)
- Department Routing summary (`RoutingSummaryCard` — existing, move here from Approval tab)
- Project Health card: health score, open blockers, SLA breaches, open issues (mock data → live data in Step 10.5F)
- Blockers banner (red): if any critical governance condition is unmet (no WO after approval, open NCRs blocking release, etc.)
- Invoicing quick-link card (existing)
- Financial card (canViewCosts roles only — uses `usePermission().canViewCosts`)

**Actions allowed:**
- Add WO/PN reference (admin, ops_mgr, factory_user — existing `canAddRef`)
- No approval actions (moved to `activity` tab / dedicated approval section)

**Approval panel placement decision:** The `ApprovePanel` (Approve / Send Back / Reject buttons) is currently in the `approval` tab. In the target IA, it moves to a **sticky action bar** at the top of the page when `project_status === 'submitted_for_approval'` AND the user has `CAN_APPROVE` role. This removes the need for an approval-specific tab entirely and makes the approval action contextually visible without needing to navigate to a specific tab.

> **Security note:** ApprovePanel already checks `role in CAN_APPROVE` before rendering. Moving it to a sticky header does not change the role check or the DB enforcement. RLS still enforces on the `projects` table.

#### Tab 2: Commercial

**Purpose:** The commercial record for this project — what was sold, to whom, under what terms.

**Data shown (merged from current SO Details + Vehicle Lines):**
- Full SO fields grid (all SO columns)
- Vehicle lines table with qty, type, description
- Financial columns conditional on `financialVisibility` (via `useFinancialVisibility()`)
- Revision reason or rejection reason banners if set

**Actions allowed:**
- Read-only for all roles
- No edit actions at this stage (SO editing is a future Step 11+ concern)

**Role visibility:**
- All roles that can see the project can see this tab
- Financial columns: `full` (admin) and `quotation_only` (sales_user/coordinator) see sales values; `none` roles see no values
- `cost_only` (procurement_user) does not see total_sales_value but may see line counts

#### Tab 3: Execution

**Purpose:** What is happening operationally across Procurement, Factory, Store, and Dubai/AFS. Status-first, with workbench links for detail.

**Data shown (replaces current Procurement + Factory + Store + Dubai/AFS tabs):**
- **Procurement section:**
  - Summary cards: Open PRs count, Pending PO approvals count, Delayed POs count
  - Table: PRs (pr_number, status) — max 5 rows + "View all in Procurement →" link
  - Table: POs (po_number, supplier, status, ETA) — max 5 rows; PO value only shown if `canViewCosts`
- **Factory section** (Saudi route only; hidden for Dubai route):
  - WO status indicator (active WO number or "No WO yet")
  - Production status summary: stages (BOQ, BOM, Production, Final Assembly)
  - Link: "Open Factory Workspace →" → `/factory/projects/:id`
- **Store section:**
  - Summary counts: vehicle receipts, material receipts, open custody records
  - Link: "View Store Activity →" → `/store` (filtered by project where possible)
- **Dubai / AFS section** (Dubai route only; hidden for Saudi route):
  - PN status indicator
  - Dubai follow-up status count
  - Link: "Open AFS Workspace →" → `/dubai-afs/projects/:id`

**Actions allowed:**
- Read-only summary; links to workbenches for write operations
- "View all" links to module pages (route-guarded independently)

**Role visibility:**
- `sales_user`: **tab hidden entirely** — see Section 4.6
- `admin`, `ops_mgr`: full summary of all sections
- `procurement_user`: Procurement section visible; Factory/Store/AFS sections show summary only (no values)
- `factory_user`: Factory section full; Procurement/Store show summary; AFS hidden for Saudi projects
- `store_user`: Store section full; Procurement/Factory show summary
- `qc_user`: See Quality & Release tab instead; Execution tab shown read-only summary
- `afs_user`: AFS section full; Factory section hidden; Store section summary

#### Tab 4: Quality & Release

**Purpose:** QC status and delivery readiness for this project.

**Data shown (replaces current QC & Release tab, reduced scope):**
- **Release Gate status card** (prominent): Shows whether a Release Note has been issued or is blocked. If blocked: lists what is blocking it (open findings, open NCRs). This is the most important QC signal for any role.
- **Material QC summary card**: inspection count, open NCR count (links to `/material-qc`)
- **Project QC summary card**: inspection count, open findings count, rework required count (links to `/project-qc`)
- **Release Notes table**: list of issued release notes (max 5, "View all" link)

**What is removed from current QC tab:**
- Individual inspection sub-tables (moved to QC workbench pages)
- Full NCR detail tables (moved to `/material-qc/ncrs`)
- Individual finding tables (moved to `/project-qc/findings`)

**Actions allowed:**
- `qc_user`: Issue Release Note shortcut if `can_issue_release_note` permission and no blocking conditions
- Other roles: Read-only

**Role visibility:**
- `sales_user`: **simplified version only** — Release Gate status card and Release Note list only (no internal QC details). See Section 4.6.
- `qc_user`: Full tab including issue action
- `admin`, `ops_mgr`: Full tab
- Other dept roles: Summary cards only (no release note actions)

#### Tab 5: Documents

**Purpose:** Project document management. Unchanged from current implementation.

**Data shown:**
- Document list via `DocumentPanel` (existing component)
- Upload form for eligible roles (admin, ops_mgr, sales_user)

**Role visibility:**
- All roles: visible and read-only
- admin, ops_mgr, sales_user: can upload (existing rule — no change)

#### Tab 6: Activity

**Purpose:** Project history — timeline events, approval decisions, routing record.

**Data shown (merged from current Timeline + Approval & Routing tabs):**
- Timeline events in reverse-chronological order (existing timeline display)
- Approval history section: last approval/rejection/sendback with reason and who acted
- Routing decisions panel: `RoutingSummaryCard` (or simplified routing history)
- Audit entries panel (admin only — behind `canAudit` check, existing behavior)

**Actions allowed:**
- Read-only for all roles
- Admin: can expand audit panel

**Role visibility:**
- All roles: Timeline and approval history visible
- Admin only: Audit panel

### 4.4 ProjectDetail Role-Based Tab Matrix

| Tab | admin | ops_mgr | sales_user | sales_coord | procurement | factory | store | qc | afs | viewer |
|-----|:-----:|:-------:|:----------:|:-----------:|:-----------:|:-------:|:-----:|:--:|:---:|:------:|
| **Overview** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Commercial** | ✅ Full | ✅ Full | ✅ Read-only | ✅ Read-only | ✅ No values | ✅ No values | ✅ No values | ✅ No values | ✅ No values | ✅ No values |
| **Execution** | ✅ Full | ✅ Full | ❌ Hidden | ❌ Hidden | ✅ Proc. full | ✅ Factory full | ✅ Store full | ✅ Summary | ✅ AFS full | ✅ Summary |
| **Quality & Release** | ✅ Full | ✅ Full | ✅ Release only | ✅ Release only | ✅ Summary | ✅ Summary | ✅ Summary | ✅ Full | ✅ Summary | ✅ Summary |
| **Documents** | ✅ Full | ✅ Full | ✅ Full | ✅ Read-only | ✅ Read-only | ✅ Read-only | ✅ Read-only | ✅ Read-only | ✅ Read-only | ✅ Read-only |
| **Activity** | ✅ +Audit | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

**Default tab by role:**

| Role | Default Tab | Rationale |
|------|------------|-----------|
| admin | Overview | Command center view |
| ops_mgr | Overview | Approval decisions and blockers |
| sales_user | Overview | Project status for customer follow-up |
| sales_coordinator | Overview | Same as sales |
| procurement_user | Execution | Their work is in Procurement section |
| factory_user | Execution | Their work is in Factory section |
| store_user | Execution | Their work is in Store section |
| qc_user | Quality & Release | Their primary work tab |
| afs_user | Execution | Their work is in Dubai/AFS section |
| viewer | Overview | Read-only status view |

### 4.5 ProjectDetail Tab Filtering Implementation Notes

The current filter logic (line ~823 in `ProjectDetail.tsx`):
```tsx
TABS.filter((t) => {
  if (t.key === 'audit' && !canAudit) return false;
  return true;
})
```

Target logic pattern (illustrative — for Step 10.5E implementation):
```tsx
TABS.filter((tab) => {
  if (tab.key === 'execution' && isSalesRole) return false;
  if (tab.key === 'quality' && isSalesRole) return false; // replaced by simplified card in Overview
  // ... etc.
  return true;
})
```

Where `isSalesRole = role === 'sales_user' || role === 'sales_coordinator'`.

The new `usePermission()` hook and `PermissionGate` component (both now on main) should be used to drive conditional section rendering within tabs.

---

## 5. Sales User ProjectDetail Target Experience

### 5.1 What Sales User Sees (Target)

Sales users have `financialVisibility: 'quotation_only'` — they see quotation values but not internal procurement costs. They need project status for customer follow-up, not operational detail.

**Visible tabs:** Overview, Commercial, Quality & Release (simplified), Documents, Activity

**Tab-by-tab sales experience:**

| Tab | What Sales Sees | What Sales Does Not See |
|-----|----------------|------------------------|
| **Overview** | Status badge, customer, SO number, delivery date, health score, blockers, WO/PN status (readable gate card), department routing summary (which depts are active), invoicing link | Financial total, cost data, ApprovePanel |
| **Commercial** | SO fields, vehicle line types and quantities | Unit/total sales values hidden (quotation_only applies to quotation values, not SO line values — **see Section 5.3**) |
| **Quality & Release** | Release Gate status card (can we deliver?), list of issued Release Notes | Individual QC inspections, NCR details, finding details |
| **Documents** | All documents | — (full access, can upload Customer PO/contract) |
| **Activity** | Full timeline of events | Audit panel |
| **Execution** | **Hidden** | All Procurement, Factory, Store, AFS detail |

### 5.2 What Sales User Never Sees in ProjectDetail

| Data | Why Hidden | Security Backing |
|------|-----------|-----------------|
| Procurement PR/PO lists | Internal supplier management | Route guard: `/procurement/*` blocks sales_user |
| PO values, supplier names | `financialVisibility: cost_only` is procurement's view; sales sees neither | `usePermission().canViewCosts` → false |
| Factory production records, BOQ/BOM | Internal production detail | Route guard: `/factory/projects/:id` blocks sales_user |
| Raw material requests | Internal logistics | Same route guard |
| Store receipts, vehicle receipt details | Internal logistics | Route guard: `/store/*` blocks sales_user |
| Custody records | Internal logistics | Same |
| Material QC inspection details | Internal QC | Route guard: `/material-qc/*` blocks sales_user |
| NCR details | Internal quality incident | Same |
| Project QC finding details | Internal quality | Route guard: `/project-qc/*` blocks sales_user |
| Dubai/AFS follow-up details | Internal AFS operation | Route guard: `/dubai-afs/*` blocks sales_user |
| Approval & Routing panel (ApprovePanel) | Sales cannot approve | `CAN_APPROVE` check — existing |
| Audit log entries | Governance data | `canAudit` check — existing |

### 5.3 Financial Visibility Decision for Sales in ProjectDetail

`financialVisibility: 'quotation_only'` means sales sees quotation-stage values. Once a quotation converts to an SO/project, the `total_sales_value` on the project is an internal record.

**Decision:** `sales_user` should NOT see `total_sales_value` or vehicle line financial values in ProjectDetail. The `canSeeMoney` check in current ProjectDetail code (`role === 'admin' || role === 'operations_manager'`) correctly excludes sales_user from financial cards and line value columns. **This behavior is correct and must be preserved in Step 10.5E.**

The `usePermission().canViewCosts` function (now on main) returns `false` for `sales_user` — use this in Step 10.5E to replace inline role checks.

### 5.4 Sales User RLS Alignment

| Hide/Show Rule | UI-Only Safe? | RLS Backing |
|----------------|--------------|-------------|
| Hide Execution tab | ✅ UI-only safe | Destination routes (`/procurement/*`, `/factory/*`, `/store/*`, `/dubai-afs/*`) are route-guarded |
| Show simplified Quality tab | ✅ UI-only safe | `/project-qc/*` is route-guarded; Release Note status reads from `project_qc_release_notes` — RLS needs verification |
| Show RoutingSummaryCard in Overview | ✅ UI-only safe | `pdr_sales_select` (migration 091) already scopes to own projects |
| Show timeline | ✅ UI-only safe | `project_timeline_events` — verify RLS scopes to sales_user's own projects |
| Show documents | ✅ UI-only safe | `project_documents` — verify RLS allows sales_user SELECT on own project's documents |
| Hide financial values | ✅ UI-only safe | `canViewCosts` → false; financial data is not in the project row itself for sales to query |

---

## 6. Dashboard / My Work Blueprint

### 6.1 Architecture Decision: One Dashboard with Role-Based Sections

**Decision: One `Dashboard` component with role-based section rendering.**

Arguments against separate role dashboards (rejected):
- Creates 10 separate page components to maintain
- Route management complexity (which role goes where on root redirect)
- Duplication of shared elements (page header, common layout)

Arguments for role-based sections within one component (chosen):
- `useAuth().role` is already available
- Sections are rendered conditionally by role — existing pattern in `Dashboard.tsx`
- Sales_user root redirect (`/sales`) already exists and should remain
- The dashboard is naturally role-aware via the `role` variable

**Decision: `sales_user` root redirect to `/sales` (Sales Workspace) is kept.** The Sales Workspace IS the sales dashboard. No change to this redirect.

### 6.2 Dashboard Blueprint by Role

#### Admin Dashboard

| Section | Content | Data Source |
|---------|---------|-------------|
| Pending Action Items | Pending access requests count, pending template approvals count | Live: `access_requests`, `template_approvals` |
| Project Summary Strip | Active projects, pending approvals, missing WO/PN | Live: `projects` query |
| Recent Audit Events | Last 5 audit log entries with severity | Live: `audit_log` |
| System Health | Supabase configured, mock data warning if dev mode | `isSupabaseConfigured` |
| Module Tiles | All modules (existing pattern) | Static |

#### Operations Manager Dashboard

| Section | Content | Data Source |
|---------|---------|-------------|
| **My Approvals** | Projects pending SO approval, POs pending approval (>10k SAR) | Live: `projects WHERE status='submitted_for_approval'`, `purchase_orders WHERE pending_approval` |
| **Governance Alerts** | Projects approved but missing WO (Saudi), projects approved but missing PN (Dubai) | Live: `projects` + `project_execution_references` |
| Project Summary Strip | Active, in production, in QC, ready to deliver | Live |
| SLA Breach Alerts | Projects with overdue milestones | Live (SLA engine) |
| Module Tiles | Filtered to ops_mgr-relevant modules | Static |

#### Sales Coordinator Dashboard

**Location:** `/sales-coordinator` (existing SalesCoordinator page) becomes the coordinator dashboard. No separate `/` route needed — redirect sales_coordinator to `/sales-coordinator` (future — not in Step 10.5F, document as planned).

| Section | Content | Data Source |
|---------|---------|-------------|
| Quotations Needing Action | Quotations in `coordinator_processing` or `pending_estimation` | Live: `quotations` |
| Returned Quotations | Quotations sent back from Sales | Live: `quotations WHERE status='returned_to_coordinator'` |
| Recently Processed | Last 10 quotations I processed | Live |

#### Procurement Dashboard

**Location:** `/procurement` (Procurement hub) IS the procurement dashboard/workbench. Its hub page should show:

| Section | Content | Data Source |
|---------|---------|-------------|
| My Open PRs | PRs in my queue | Live: `procurement_requests` |
| POs Pending Approval | POs awaiting ops_mgr approval | Live: `purchase_orders` |
| ETAs Due This Week | POs with ETA in next 7 days | Live |
| Delayed POs | POs past ETA with no receipt | Live |

#### Factory Dashboard

**Location:** `/factory` (Factory hub) IS the factory workbench.

| Section | Content | Data Source |
|---------|---------|-------------|
| Active Projects with WO | My projects in production | Live: `factory_records` + `project_execution_references` |
| Projects Awaiting WO | Approved Saudi projects without active WO | Live |
| Pending Raw Material Requests | Open RMRs in my queue | Live: `production_raw_material_requests` |

#### Store Dashboard

**Location:** `/store` (Store hub) IS the store workbench.

| Section | Content | Data Source |
|---------|---------|-------------|
| Incoming Deliveries | POs with ETA in next 7 days (from Procurement) | Live: `purchase_orders` |
| Pending Vehicle Receipts | Projects expecting vehicle but no receipt | Live |
| Open Custody Records | Custody records `in_custody` status | Live |

#### QC Dashboard

**Location:** `/material-qc` and `/project-qc` are the QC workbenches. Future: merge into a single `/qc` hub.

| Section | Content | Data Source |
|---------|---------|-------------|
| Inspections Pending | Scheduled or overdue inspections | Live |
| Open NCRs | NCRs not yet closed | Live |
| Findings Blocking Release | Findings with `rework_required = true` and not completed | Live |
| Release Note Queue | Projects ready for release note issuance | Live |

#### AFS Dashboard

**Location:** `/dubai-afs` (Dubai/AFS hub) IS the AFS workbench.

| Section | Content | Data Source |
|---------|---------|-------------|
| Dubai Projects with PN | Active Dubai projects | Live |
| Pending Arrival Reports | Projects expecting vehicle arrival without report | Live |
| Open Maintenance Requests | Maintenance requests not closed | Live |

#### Viewer Dashboard

**Location:** `/` (Dashboard) — same page as ops_mgr but fewer sections.

| Section | Content | Data Source |
|---------|---------|-------------|
| Project Summary Strip | High-level count strip | Live |
| Module Tiles | Reports Hub, Control Tower | Static |

### 6.3 Action Inbox Evolution

The current Action Inbox (`/inbox`) uses mock data from `mockInbox.ts`. In the target, it becomes a **real-time task queue** scoped to the authenticated user's role.

**Architecture:**
- Task items are generated from actual database records (pending approvals, pending PRs, pending QC inspections)
- Inbox is scoped by `auth.uid()` and role — only my tasks
- Badge count on the "Action Inbox" nav item reflects actual pending task count

This requires live data connections — **implementation in Step 10.5F**, not 10.5C/D.

---

## 7. Page Consolidation Blueprint

### 7.1 Consolidation Classification

| Page / Area | Current Route(s) | Decision | Target | Step |
|------------|-----------------|---------|--------|------|
| Vehicle Receiving redirect | `/vehicle-receiving` | **Keep as redirect** — backward-compat for bookmarks | Redirect to `/store/vehicle-receiving` (already implemented in Step 8C) | No change |
| Factory Raw Material Requests duplicate | `/factory/pending-raw-materials` → same component as `/factory/raw-material-requests` | **Remove from nav; keep route** | Route kept as deep-link alias; remove from sidebar | 10.5D |
| Material QC + Project QC hubs | `/material-qc` + `/project-qc` | **Keep separate** | QUALITY & RELEASE section — do not merge yet (Step 15 scope) | Deferred |
| Dubai/AFS + After Sales hubs | `/dubai-afs` + `/after-sales` | **Keep separate** | DUBAI / AFS section — do not merge (Step 14 scope) | Deferred |
| ProjectDetail tabs 5–9 (Procurement, Factory, Store, QC, Dubai/AFS) | Single 12-tab page | **Merge into 6-tab structure** | Execution tab + Quality & Release tab | 10.5E |
| ProjectDetail Approval tab | 12-tab page | **Merge into Overview sticky + Activity tab** | ApprovePanel → sticky action bar; RoutingSummaryCard → Overview | 10.5E |
| PageHeader (legacy ui/ + common/) | Two components | **Consolidate to `@/components/common/page-header`** | All pages use common version | 10.5C |
| EmptyState (ui/ + feedback/) | Two components | **Consolidate to `@/components/feedback/empty-state`** | All pages use feedback version | 10.5C |
| Loading (PageLoader + raw Loader2 + LoadingState) | Three patterns | **Consolidate: PageLoader for page-level; Skeleton for tables** | `src/components/ui/skeleton.tsx` (already on main) | 10.5C |
| Receivables placement | Under REPORTS & ADMIN | **Move to SALES & COMMERCIAL nav section** | Config change only in `navigation.ts` | 10.5D |
| Notifications in nav | Under REPORTS & ADMIN | **Move to MY WORK section** | Config change only in `navigation.ts` | 10.5D |
| Document Templates in nav | Under REPORTS & ADMIN | **Move to ADMIN & SYSTEM section** | Config change only in `navigation.ts` | 10.5D |
| Reports + Control Tower | Under REPORTS & ADMIN | **Keep; rename section to REPORTING** | Config change only in `navigation.ts` | 10.5D |
| Action Inbox placement | Between CONTROL CENTER and SALES | **Move to MY WORK section** | Config change only in `navigation.ts` | 10.5D |

### 7.2 What Is Explicitly Not Consolidated in Steps 10.5B–10.5I

| Area | Reason for Deferral |
|------|-------------------|
| QC hub pages (Material QC + Project QC) | Merging these requires new routing and RLS review; deferred to Step 15 |
| Dubai/AFS hub pages | Step 14 scope |
| Report sub-pages | Step 17 scope |
| Procurement sub-pages | Step 11 scope |
| Factory sub-pages | Step 13 scope |
| Store sub-pages | Step 12 scope |
| Any deep-link routes | Never delete routes; only reorganize navigation items |

---

## 8. Role Visibility and Security Alignment Plan

### 8.1 Visibility Classification Framework

| Class | Definition |
|-------|-----------|
| **UI-ONLY** | Hiding/showing is safe without additional DB backing. The data behind the hidden element is either (a) not sensitive, or (b) already guarded by route guard or RLS at the destination. |
| **ROUTE-GUARD** | The hidden element links to a route that has a `RequireRole` guard. Even if the UI element is mistakenly visible, navigation to the target is blocked. |
| **RLS-BACKED** | The data fetched by the hidden element is protected at the DB row level. Even a direct Supabase API call returns no unauthorized data. |
| **REVIEW-NEEDED** | The security backing for this hide/show rule is unclear or incomplete. Must be verified before implementation. |

### 8.2 ProjectDetail Visibility Security Map

| Hide/Show Rule | Class | Security Backing | Status |
|----------------|-------|-----------------|--------|
| Hide Execution tab from sales_user | ROUTE-GUARD | `/procurement/*`, `/factory/*`, `/store/*`, `/dubai-afs/*` all have RequireRole guards | ✅ Safe |
| Show simplified Quality tab to sales_user | ROUTE-GUARD | `/project-qc/*` has RequireRole; `project_qc_release_notes` — verify RLS | ⚠️ Verify |
| Hide financial values from factory/store/qc/afs | UI-ONLY | `usePermission().canViewCosts` returns false; data not exposed in query | ✅ Safe |
| Show RoutingSummaryCard to sales_user | RLS-BACKED | `pdr_sales_select` (migration 091) scopes SELECT to own projects | ✅ Safe |
| Hide ApprovePanel from non-CAN_APPROVE | UI-ONLY | `CAN_APPROVE` check is existing; DB also validates via `project_status` checks | ✅ Safe |
| Show timeline to all roles | RLS-BACKED | `project_timeline_events` — verify RLS policy exists for all roles | ⚠️ Verify |
| Show documents to all roles | RLS-BACKED | `project_documents` — verify sales_user can SELECT on own project docs | ⚠️ Verify |
| Show Dubai/AFS section only for Dubai route | UI-ONLY | `project.manufacturing_location === 'dubai'` check; no DB exposure risk | ✅ Safe |
| Hide Factory section for Dubai route | UI-ONLY | `project.manufacturing_location !== 'saudi'` check; no DB exposure risk | ✅ Safe |

### 8.3 Financial Visibility Enforcement Map

`usePermission().financialVisibility` is now available. Current code uses ad-hoc checks. Target: all financial column/card renders use the hook.

| Data Point | Who Sees It | Current Enforcement | Target Enforcement |
|-----------|------------|-------------------|------------------|
| `total_sales_value` | admin, ops_mgr | `canSeeMoney = role === 'admin' || role === 'operations_manager'` | `usePermission().canViewCosts` |
| Vehicle line `unit_sales_value`, `line_total_value` | admin, ops_mgr | `canSeeMoney` | `usePermission().canViewCosts` |
| PO `purchase_value` | admin, ops_mgr, procurement_user | `canSeeCost = ['admin', 'operations_manager', 'procurement_user'].includes(role)` | `usePermission().hasPermission('can_approve_po')` or `financialVisibility !== 'none'` |
| Quotation `quoted_price` | sales_user, sales_coordinator, admin, ops_mgr | `financialVisibility: 'quotation_only'` defined but not enforced | `usePermission().financialVisibility === 'quotation_only' \|\| 'full'` |

### 8.4 Navigation Visibility Security

Navigation visibility is **UI-ONLY** by design (documented in `docs/architecture/06-rbac-and-permissions-architecture.md`). The sidebar filtering is for usability; route guards are the enforcement layer. This is correct and does not need to change.

### 8.5 Action Inbox Security

The Action Inbox currently uses mock data — no real security boundary is needed yet. When wired to live data (Step 10.5F):
- Tasks must be scoped to `auth.uid()` — RLS on the task source tables ensures this
- The inbox must not expose task data from other users or roles
- A `WHERE assigned_role = current_user_role()` or `WHERE assigned_to = auth.uid()` filter must be applied

**Classification: REVIEW-NEEDED when live data is connected. UI-ONLY is acceptable for mock stage.**

### 8.6 Items Classified as REVIEW-NEEDED Before Implementation

| Item | What to Verify | When |
|------|---------------|------|
| `project_timeline_events` RLS | Does the existing RLS policy allow sales_user SELECT on their own projects' events? | Before Step 10.5E |
| `project_documents` RLS | Does the existing RLS policy allow sales_user SELECT on their own projects' documents? | Before Step 10.5E |
| `project_qc_release_notes` RLS | Does sales_user have SELECT access to release notes for their projects? | Before Step 10.5E |
| Department user project scope | Are factory/store/qc/afs users restricted via RLS to only projects routed to their department? | Before Step 10.5E |
| Action Inbox live data query | Is the inbox query properly scoped to auth.uid() / role? | Before Step 10.5F |
| Dashboard live queries | Do all ops_mgr/admin dashboard queries respect RLS boundaries? | Before Step 10.5F |

---

## 9. Component Blueprint

### 9.1 Components Available on Main (Already Built)

These exist and should be used/extended — do not rebuild:

| Component | Path | Status | Use In |
|-----------|------|--------|--------|
| `PageHeader` | `@/components/common/page-header` | ✅ Use | All pages (consolidation in 10.5C) |
| `EmptyState` | `@/components/feedback/empty-state` | ✅ Use | All empty states (consolidation in 10.5C) |
| `LoadingState` | `@/components/feedback/loading-state` | ✅ Use | Table/card skeleton loading |
| `ErrorState` | `@/components/feedback/error-state` | ✅ Use | Error fallbacks |
| `DataTable` | `@/components/data-display/data-table` | ✅ Use | All list tables (Step 10.5G) |
| `FilterBar` | `@/components/data-display/filter-bar` | ✅ Use | All list pages (Step 10.5G) |
| `Tabs` (Radix UI) | `@/components/ui/tabs` | ✅ Use | ProjectDetail tabs (Step 10.5E) |
| `Sheet` | `@/components/ui/sheet` | ✅ Use | Drawer previews (Step 10.5G) |
| `Dialog` | `@/components/ui/dialog` | ✅ Use | Confirmation dialogs |
| `Skeleton` | `@/components/ui/skeleton` | ✅ Use | Loading states (Step 10.5C) |
| `PermissionGate` | `@/components/auth/PermissionGate` | ✅ Use | Conditional rendering by permission |
| `usePermission` | `@/hooks/usePermission` | ✅ Use | All permission/financial visibility checks |
| `MetricCard` | `@/components/common/metric-card` | ✅ Use | Dashboard KPI cards |
| `SectionCard` | `@/components/common/section-card` | ✅ Use | Content sections in detail pages |
| `TimelineItem` | `@/components/common/timeline-item` | ✅ Use | Timeline displays |
| `StatusBadge` | `@/components/status/status-badge` | ✅ Use | Unified status rendering |
| `RoleBadge` | `@/components/status/role-badge` | ✅ Use | Role indicators |

### 9.2 New Components Needed (Not Yet Built)

| Component | Purpose | Used Where | Priority | Phase |
|-----------|---------|-----------|----------|-------|
| **`RoleAwareSidebar`** | Wraps existing Sidebar with new section groupings and badge counts | AppLayout | High | 10.5D |
| **`ProjectCommandHeader`** | Sticky project header with approval action bar (ApprovePanel integrated) | ProjectDetail top | High | 10.5E |
| **`ProjectProgressRail`** | Visual lifecycle stage indicator (Draft → Submitted → Approved → In Production → QC → Released) | ProjectDetail Overview | Medium | 10.5E |
| **`ProjectBlockersCard`** | Red banner listing governance blockers for this project | ProjectDetail Overview | High | 10.5E |
| **`ExecutionStatusSummary`** | Compact status cards for Procurement/Factory/Store/AFS | ProjectDetail Execution tab | High | 10.5E |
| **`ReleaseGateCard`** | "Ready to deliver" / "Blocked by X items" card | ProjectDetail Quality tab | High | 10.5E |
| **`MyWorkSection`** | Role-specific dashboard section rendering pending tasks | Dashboard | High | 10.5F |
| **`WorkbenchKPI`** | Compact KPI strip for module hub pages (Procurement, Factory, etc.) | All hub pages | Medium | 10.5F |
| **`RoleAwareTabList`** | Tab list that receives a role-based filter map and renders correct tabs | ProjectDetail | High | 10.5E |
| **`DrawerPreview`** | Sheet-based slide-out for table row quick preview | All list tables | Medium | 10.5G |
| **`TableActionMenu`** | Dropdown for per-row actions in DataTable | All list tables | Medium | 10.5G |
| **`FormSection`** | Labeled collapsible/expandable form section | Multi-section forms | Low | 10.5G |

### 9.3 Components to Consolidate (Step 10.5C)

| Old Component | New Component | Migration Rule |
|---------------|-------------|---------------|
| `src/components/ui/PageHeader.tsx` (legacy) | `@/components/common/page-header` | Replace import; map `action=` → `actions=`; map `path=` → `href=` |
| `src/components/ui/EmptyState.tsx` (legacy) | `@/components/feedback/empty-state` | Replace import; re-map props |
| Raw `<Loader2>` spinners | `@/components/feedback/loading-state` + `@/components/ui/skeleton` | Replace inline div patterns |
| Custom `Badge.tsx` (ui/) | `@/components/status/status-badge` or `@/components/ui/primitives/badge` | Assessment needed in Step 10.5C |
| Custom tab bar in ProjectDetail | `@/components/ui/tabs` (Radix UI) | Step 10.5E |

---

## 10. Visual IA Recommendations

### 10.1 Page Structure Standard

Every page in the target system follows this structure:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PageHeader  [Title]  [Breadcrumb]                    [Actions]     │
├─────────────────────────────────────────────────────────────────────┤
│  [FilterBar / search / status tabs if applicable]                   │
├─────────────────────────────────────────────────────────────────────┤
│  [Content area: Table or Card grid or Detail layout]                │
│                                                                     │
│  [EmptyState if no data]                                            │
└─────────────────────────────────────────────────────────────────────┘
```

**ProjectDetail additionally has:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ProjectCommandHeader  [project code]  [status]  [approve action]  │
├─────────────────────────────────────────────────────────────────────┤
│  ProjectProgressRail  [Draft] → [Approved] → [Production] → [QC]   │
├─────────────────────────────────────────────────────────────────────┤
│  RoleAwareTabList   [Overview] [Commercial] [Execution] ...         │
├─────────────────────────────────────────────────────────────────────┤
│  Tab content                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Summary-First Pattern for Detail Pages

The target pattern for all ProjectDetail tabs that show operational data:

```
┌─── Summary Row ────────────────────────────────────────────────┐
│  [KPI card: count/status]  [KPI card: alerts]  [KPI card: ...]  │
└────────────────────────────────────────────────────────────────┘
┌─── Table (max 5 rows) ────────────────────────────────────────┐
│  Condensed table of most recent/urgent items                    │
│  [View all →] link to module workbench                         │
└────────────────────────────────────────────────────────────────┘
```

Full detail is NEVER replicated in ProjectDetail — it lives in the module workbench.

### 10.3 Sidebar Visual Hierarchy

Target sidebar visual treatment:

- Section labels: `text-[10px] uppercase tracking-widest text-gray-400` — keep current style
- Active item: `bg-brand-50 text-brand-700` — keep current style
- Badge counts: Red pill on Action Inbox and Admin Approvals — implement in Step 10.5D
- Section separators: Light `border-t border-gray-100` — keep current style
- Collapsed state (future Step 10.5H): Icon-only mode with tooltips

---

## 11. Step 10.5C–10.5I Implementation Roadmap

### Step 10.5C — Visual Identity System v2

| Field | Detail |
|-------|--------|
| **Objective** | Consolidate the component foundation; eliminate dual-component inconsistencies |
| **Allowed changes** | Component file changes (consolidation), import path updates, Tailwind token additions |
| **Forbidden changes** | Business logic, route guards, RLS, page structure, navigation, any form logic |
| **Expected files** | `src/components/ui/PageHeader.tsx` (deprecate), `src/components/ui/EmptyState.tsx` (deprecate), all ~30 pages using legacy PageHeader, all ~15 pages using legacy EmptyState |
| **Documentation output** | `docs/implementation/step-10-5c-visual-identity-v2.md` |
| **Validation** | Build + TypeScript 0 errors + lint 0 new warnings |
| **Risk level** | Low (mechanical import replacement) |
| **Dependencies** | None — can start immediately after Step 10.5B merges |
| **Key tasks** | (1) Migrate all legacy PageHeader → common/page-header. (2) Migrate all legacy EmptyState → feedback/empty-state. (3) Replace raw Loader2 divs with PageLoader or LoadingState. (4) Add aria-labels to all icon-only buttons. (5) Apply focus-visible globally. |

### Step 10.5D — App Shell & Navigation Redesign

| Field | Detail |
|-------|--------|
| **Objective** | Implement target navigation grouping; wire badge counts |
| **Allowed changes** | `src/data/navigation.ts` (section labels, item placement), `src/components/layout/Sidebar.tsx` (section rendering), Dashboard page minor updates |
| **Forbidden changes** | Route paths, RequireRole guards, page content, business logic |
| **Expected files** | `src/data/navigation.ts`, `src/components/layout/Sidebar.tsx` |
| **Documentation output** | `docs/implementation/step-10-5d-app-shell-navigation.md` |
| **Validation** | Build + TypeScript 0 errors + manual check of all 10 role nav views |
| **Risk level** | Low-Medium (navigation config change; easy to verify) |
| **Dependencies** | Step 10.5C complete |
| **Key tasks** | (1) Rename section labels per Section 3.1. (2) Move Receivables to SALES & COMMERCIAL. (3) Move Notifications to MY WORK. (4) Move Document Templates to ADMIN & SYSTEM. (5) Create REPORTING section (Control Tower + Reports). (6) Create ADMIN & SYSTEM section. (7) Wire inbox badge count from real data (or add TODO comment). (8) Rename "Home" → "Dashboard". (9) Rename "Control Tower" nav item → "Operations Overview". |

### Step 10.5E — ProjectDetail Redesign

| Field | Detail |
|-------|--------|
| **Objective** | Implement role-based tab filtering and 6-tab structure |
| **Allowed changes** | `src/pages/ProjectDetail.tsx` — tab structure, tab filtering, component replacement |
| **Forbidden changes** | Business logic (approval, routing persistence, WO/PN gate), governance rules, Supabase queries (add/remove queries only if clearly safe), RLS |
| **Expected files** | `src/pages/ProjectDetail.tsx`, new shared components: `ProjectCommandHeader`, `ExecutionStatusSummary`, `ReleaseGateCard`, `RoleAwareTabList` |
| **Documentation output** | `docs/implementation/step-10-5e-project-detail-redesign.md` |
| **Validation** | Build + TypeScript 0 errors + manual test all 10 roles on ProjectDetail + verify governance gates still fire |
| **Risk level** | High (complex page; must preserve all business logic) |
| **Dependencies** | Step 10.5C (components available), Step 10.5D (navigation complete), RLS REVIEW-NEEDED items verified |
| **Key tasks** | (1) Implement 6-tab structure using Radix UI Tabs. (2) Implement `RoleAwareTabList` with role-based tab filter map. (3) Move `ApprovePanel` to sticky `ProjectCommandHeader`. (4) Move `RoutingSummaryCard` to Overview tab. (5) Merge SO Details + Vehicle Lines into Commercial tab. (6) Create Execution tab with summary cards + workbench links. (7) Create Quality & Release tab with `ReleaseGateCard`. (8) Merge Timeline + Approval into Activity tab. (9) Replace `canSeeMoney`/`canSeeCost` inline checks with `usePermission()`. (10) Gate Dubai/AFS section by `project.manufacturing_location`. |

### Step 10.5F — Dashboard / My Work Redesign

| Field | Detail |
|-------|--------|
| **Objective** | Wire real data to dashboard panels; implement role-specific sections |
| **Allowed changes** | `src/pages/Dashboard.tsx`, `src/pages/ActionInbox.tsx`, module hub pages (Procurement, Factory, Store, QC, DubaiAFS), Supabase queries added |
| **Forbidden changes** | Business logic, approval flows, governance gates, RLS |
| **Expected files** | `Dashboard.tsx`, `ActionInbox.tsx`, hub pages, new `MyWorkSection` component |
| **Documentation output** | `docs/implementation/step-10-5f-dashboard-my-work.md` |
| **Validation** | Build + TypeScript 0 errors + test dashboard with all 10 roles in live mode |
| **Risk level** | Medium (new live queries; no write operations) |
| **Dependencies** | Step 10.5E complete; Supabase configured in test environment |
| **Key tasks** | (1) Replace mock Project Summary Strip with live count query. (2) Add ops_mgr My Approvals section. (3) Add admin access request pending count. (4) Wire Action Inbox to live data scoped by role. (5) Add WorkbenchKPI sections to hub pages. |

### Step 10.5G — Tables / Forms / Filters Redesign

| Field | Detail |
|-------|--------|
| **Objective** | Modernize data tables and forms |
| **Allowed changes** | List page components, form components (adopt RHF/Zod), TanStack Table expansion |
| **Forbidden changes** | Governance validation logic, approval flows, RLS, Supabase schema |
| **Expected files** | `Projects.tsx`, `Quotations.tsx`, `ProcurementRequests.tsx`, `ProcurementPurchaseOrders.tsx`, `ProjectNew.tsx`, `QuotationNew.tsx` |
| **Documentation output** | `docs/implementation/step-10-5g-tables-forms-filters.md` |
| **Validation** | Build + TypeScript 0 errors + all form submissions tested |
| **Risk level** | Medium (form changes must preserve validation logic) |
| **Dependencies** | Step 10.5F complete |
| **Key tasks** | (1) Expand DataTable to Projects, Quotations, PRs, POs. (2) Add status filter to Projects list. (3) Adopt RHF + Zod for ProjectNew. (4) Adopt RHF + Zod for QuotationNew. (5) Gate mock data imports behind `import.meta.env.DEV`. (6) Add DrawerPreview proof-of-concept. |

### Step 10.5H — Interaction / Performance / Accessibility

| Field | Detail |
|-------|--------|
| **Objective** | Polish interaction quality and fix accessibility gaps |
| **Allowed changes** | Interaction enhancements, animation, keyboard nav, command palette |
| **Forbidden changes** | Business logic, permissions, routes |
| **Expected files** | Scattered across components |
| **Documentation output** | `docs/implementation/step-10-5h-interaction-performance-a11y.md` |
| **Validation** | Build + TypeScript 0 + accessibility audit |
| **Risk level** | Low |
| **Dependencies** | Steps 10.5C–10.5G |
| **Key tasks** | (1) Add cmdk command palette. (2) Add Framer Motion tab transitions in ProjectDetail. (3) Keyboard navigation audit. (4) Virtual scrolling for Projects list if >100 rows. (5) Optimistic UI for status changes. |

### Step 10.5I — UX Final Sign-off

| Field | Detail |
|-------|--------|
| **Objective** | Validate all Step 10.5 changes; confirm Step 11 can start |
| **Allowed changes** | Documentation only; minor bug fixes if found |
| **Expected files** | `docs/implementation/step-10-5i-ux-final-signoff.md` |
| **Validation** | Full manual QA all 10 roles; all governance gates verified; build clean |
| **Risk level** | None |
| **Dependencies** | Steps 10.5C–10.5H |
| **Key tasks** | (1) Manual QA checklist for all roles. (2) Governance gate regression test. (3) Build/lint/typecheck. (4) Final sign-off. |

---

## 12. Decisions Made

| ID | Decision |
|----|---------|
| D-001 | Navigation moves from 7 sections to 8 sections: MY WORK, SALES & COMMERCIAL, PROJECTS, EXECUTION, QUALITY & RELEASE, DUBAI / AFS, REPORTING, ADMIN & SYSTEM |
| D-002 | Action Inbox moves to MY WORK section |
| D-003 | Receivables moves to SALES & COMMERCIAL section |
| D-004 | Notifications moves to MY WORK section |
| D-005 | Document Templates moves to ADMIN & SYSTEM section |
| D-006 | OPERATIONS renamed to EXECUTION |
| D-007 | Control Tower nav item renamed to "Operations Overview" |
| D-008 | Home nav item renamed to "Dashboard" |
| D-009 | REPORTS & ADMIN split into REPORTING (Control Tower + Reports) and ADMIN & SYSTEM |
| D-010 | Dubai/AFS remains its own navigation section — not merged into EXECUTION |
| D-011 | QC remains its own navigation section — not merged with other modules |
| D-012 | ProjectDetail consolidates from 12 tabs to 6 tabs: Overview, Commercial, Execution, Quality & Release, Documents, Activity |
| D-013 | ApprovePanel moves from dedicated Approval tab to sticky ProjectCommandHeader bar |
| D-014 | RoutingSummaryCard moves from Approval tab to Overview tab |
| D-015 | SO Details tab and Vehicle Lines tab merge into a single Commercial tab |
| D-016 | Timeline tab and Approval & Routing tab merge into Activity tab |
| D-017 | sales_user sees: Overview, Commercial (no financial values), Quality & Release (simplified), Documents, Activity |
| D-018 | sales_user does NOT see: Execution tab, financial values in Commercial, internal QC details |
| D-019 | One Dashboard with role-based sections — not separate dashboards per role |
| D-020 | sales_user root redirect to `/sales` is kept — Sales Workspace is their dashboard |
| D-021 | `usePermission()` hook (already on main) is the sole mechanism for permission checks — inline `role === 'admin'` checks are refactored out in Step 10.5E |
| D-022 | Execution tab Procurement/Factory/Store/AFS sections show summary cards + workbench links; full detail stays in module workbenches |
| D-023 | Dubai/AFS section in Execution tab is conditionally shown only for `project.manufacturing_location === 'dubai'` |
| D-024 | Factory section in Execution tab is conditionally hidden for Dubai route |
| D-025 | `@/components/ui/tabs` (Radix UI, already on main) is used for all tab implementations |
| D-026 | Mock data imports must be gated behind `import.meta.env.DEV` (Step 10.5G) |

---

## 13. Decisions Deferred

| ID | Deferred Decision | Why | When |
|----|------------------|-----|------|
| DF-001 | Merge Material QC and Project QC into single QC Hub | Requires new routing, RLS review; scope belongs to Step 15 | Step 15 |
| DF-002 | Merge Dubai/AFS and After Sales into single AFS Hub | Step 14 scope | Step 14 |
| DF-003 | Sales Coordinator root redirect to `/sales-coordinator` | Low priority; no user impact | Step 10.5F |
| DF-004 | Virtual scrolling for Projects list | Need to measure actual list size in production first | Step 10.5H |
| DF-005 | RTL / Arabic support | Not in current requirements | Future |
| DF-006 | Command palette (cmdk) | Low priority interaction polish | Step 10.5H |
| DF-007 | Inter/IBM Plex Sans font | Typography decision requires product owner input | Step 10.5C optional |
| DF-008 | Collapsed icon-only sidebar mode | Medium-priority desktop density feature | Step 10.5H |
| DF-009 | `can_issue_release_note` full permission enforcement | Currently `qc_user` RLS and `PermissionGate` partially handle this; full enforcement is Step 15 | Step 15 |
| DF-010 | Bulk actions on list tables | Requires careful governance review (bulk approve is high risk) | Step 10.5G with caution |
| DF-011 | `usePermission` for all legacy inline role checks in non-ProjectDetail pages | Wide sweep; Step 10.5C starts the work; full adoption is ongoing | Steps 10.5C–10.5G |
| DF-012 | Global custom font loading | Minor visual improvement; no functional impact | Step 10.5C (optional) |

---

## 14. Risks and Mitigations

| ID | Risk | Severity | Mitigation |
|----|------|----------|-----------|
| R-001 | ProjectDetail tab refactor accidentally breaks ApprovePanel governance logic | Critical | Preserve all existing governance checks; add regression test checklist in Step 10.5E sign-off |
| R-002 | Role-based tab hiding introduces a regression where ops_mgr loses a tab they need | High | Test all 10 roles manually before merge; ops_mgr always gets full view |
| R-003 | Navigation section rename (`OPERATIONS` → `EXECUTION`) breaks user mental model for existing users | Medium | Communicate change in release notes; section rename is cosmetic only |
| R-004 | Moving ApprovePanel to sticky header creates UI layout issues on small screens | Medium | ApprovePanel only shows when `project_status === 'submitted_for_approval'` — conditional rendering limits exposure |
| R-005 | `RoutingSummaryCard` moved to Overview creates a fetch-on-load for all users viewing Overview | Low | Existing `RoutingSummaryCard` already lazy-fetches; no regression |
| R-006 | Merging SO Details + Vehicle Lines into one tab makes it too long | Low | Use `SectionCard` collapsible pattern within the tab |
| R-007 | Sales user sees simplified Quality tab but internal QC findings still accessible via direct URL | Low | Route guards on `/project-qc/*` block sales_user; document in RLS review |
| R-008 | `import.meta.env.DEV` gating of mock data may break dev mode UX if done incorrectly | Medium | Test dev mode after change; ensure Supabase dev mode (`!isSupabaseConfigured`) still works |
| R-009 | Step 10.5F live dashboard queries may surface data outside RLS scope | High | All queries must include userId/role filter; verify with Supabase Studio before deploy |
| R-010 | Step 10.5C component consolidation may break pages that use legacy EmptyState/PageHeader with prop differences | Medium | Use systematic find-and-replace; run full build verification after migration |

---

## 15. Items Intentionally Not Changed

| Category | Items |
|----------|-------|
| Business logic | All quotation, SO, WO/PN, procurement, factory, store, QC, Dubai/AFS, after-sales logic |
| Database schema | No migrations created or modified |
| RLS policies | No RLS policies changed |
| Route guards | No RequireRole guards changed |
| Route paths | No route paths added, removed, or renamed |
| Approval logic | ApprovePanel, AdminApprovals, PO approval — unchanged |
| Governance gates | WO gate, PN gate, PO 10k gate, Release Note gate, Quotation spec gate — all unchanged |
| Form validation | All form validation and submission logic — unchanged |
| Mock data content | Mock data files — unchanged |
| Supabase functions | No Supabase functions changed |
| Existing UI behavior | No current UI behavior changed in this step |

---

## 16. Safety Review

| Check | Result |
|-------|--------|
| Business logic changed | ❌ No |
| Database schema changed | ❌ No |
| Migrations created | ❌ No |
| RLS policies changed | ❌ No |
| Route guards changed | ❌ No |
| Routes added/removed/renamed | ❌ No |
| Production source code changed | ❌ No |
| New npm dependencies added | ❌ No |
| UI behavior changed | ❌ No |

---

## 17. Validation Results

| Check | Result | Notes |
|-------|--------|-------|
| `npm run build` | ⚠️ Pre-existing failure | `tsconfig.app.json baseUrl` deprecation warning; vite config type errors. Not caused by this step. |
| `npx tsc --noEmit` | ✅ PASS | Zero TypeScript errors |
| `npm run lint` | ⚠️ Pre-existing failure | `@eslint/js` package not found in audit container. Not caused by this step. |
| Source files modified | ❌ None | Documentation only |

Pre-existing failures documented in Step 10.5A baseline. Not introduced by this step.

---

## 18. Final Recommendation: Proceed to Step 10.5C

**Assessment: Proceed to Step 10.5C — Visual Identity System v2.**

**Rationale:**
1. All navigation decisions are made (26 decisions documented, Section 12).
2. ProjectDetail target structure is fully defined with a 6-tab model and role-based tab matrix for all 10 roles.
3. Sales user experience is precisely defined — what they see, what they don't, and why each hide/show is safe.
4. Dashboard/My Work architecture is decided (one dashboard with role sections; sales_user redirects to `/sales`).
5. Component foundation on main is now stronger than at Step 10.5A: `usePermission`, Radix UI Tabs, Skeleton, Sheet, Dialog, PermissionGate are all available.
6. Step 10.5C is low-risk (component consolidation only) and can start immediately.
7. The 6 REVIEW-NEEDED RLS items in Section 8.6 must be verified before Step 10.5E begins — they do not block 10.5C or 10.5D.

---

*Step 10.5B complete. Documentation-only. No application code, schema, RLS, or route guards changed. Proceed to Step 10.5C.*
