# Step 18.7C — Factory / Production Work Center Rebuild

**Branch:** `feature/step-18-7c-factory-production-work-center`
**Date:** 2026-06-20
**Scope:** `factory_user` role and shared components only

---

## Executive Summary

Full rebuild of the Factory / Production Work Center for the `factory_user` role. The factory sidebar now has two dedicated sections (FACTORY EXECUTION and FACTORY MATERIALS), the dashboard shows live KPI cards and work queues, and every factory page has been redesigned with consistent orange theme, WO governance enforcement, and clear readiness-check workflows. A new Send to QC page provides a governed handoff queue. Factory Reports now fetch live data and cover 8 report types.

---

## Part 1 — Discovery & Safety Check

**DB tables confirmed:**
- `factory_records` — production tracking records (one per project or project+vehicle line)
- `factory_item_requirements` — BOQ, BOM, GA Drawing, Detail Drawing, Manhours per record
- `factory_requirement_types` — lookup table for requirement type names
- `production_raw_material_requests` — RMRs with `request_type: 'project_related' | 'stock'`
- `project_execution_references` — WO/PN references (used by WoPnGate)

**Key `FactoryRecord` fields:**
- `wo_reference_id` — nullable; NULL means no WO confirmed
- `production_status: FactoryProductionStatus` — 16-value union
- `progress_percentage` — 0–100
- `monthly_update_required` — boolean flag
- `last_updated_at` — used for overdue threshold (>30 days)
- `project_vehicle_line_id` — nullable; presence means line-level record

**Safety:** No DB schema changes, no migrations, no RLS changes. All writes guarded by `isSupabaseConfigured` check. Existing route guards (`RequireRole`) preserved. WO/PN gate logic in `WoPnGate.tsx` untouched.

---

## Part 2 — Sidebar IA

**File:** `src/data/navigation.ts`

Added two new sections before EXECUTION:

### FACTORY EXECUTION (roles: admin, operations_manager, factory_user)
| Key | Path | Icon |
|-----|------|------|
| factory-dashboard | /factory | Factory |
| factory-wo-gate | /wo-pn-gate | GitBranch |
| factory-projects | /factory/projects | Wrench |
| factory-production-lines | /factory/projects | Layers (deferred — same page, no separate table) |
| factory-requirements | /factory/requirements | FileText |
| factory-rmr | /factory/raw-material-requests | Package |
| factory-monthly-updates | /factory/monthly-updates | CalendarClock |
| factory-send-to-qc | /factory/send-to-qc | CheckCircle2 |

### FACTORY MATERIALS (roles: admin, operations_manager, factory_user)
| Key | Path | Icon |
|-----|------|------|
| factory-materials-requested | /factory/raw-material-requests | Package |
| factory-materials-issued | /custody | PackageCheck |
| factory-custody | /custody | ShieldCheck |

**Changes to existing sections:**
- Removed `factory_user` from EXECUTION section's 'factory' item (now admin/ops_manager only in EXECUTION)
- Changed PROJECTS 'wo-pn-gate' visibility: removed `factory_user` (now factory-specific WO gate is used)
- EXECUTION 'custody' remains for store_user/afs_user; factory_user uses FACTORY MATERIALS section

---

## Part 3 — Factory Dashboard

**File:** `src/pages/Factory.tsx` (full rewrite)

**Theme:** Orange (`bg-orange-600`, `text-orange-700`, `border-orange-500`)

### 8 KPI Cards
| Card | Field | Color |
|------|-------|-------|
| Missing WO | factory_records with no wo_reference_id | Red |
| Ready to Start | status = not_started with WO | Sky |
| In Production | status = in_production | Blue |
| Waiting Materials | status = pending_raw_materials | Amber |
| Monthly Update Due | monthly_update_required = true | Amber |
| Monthly Overdue | monthly_update_required = true AND >30 days | Red |
| Ready for QC | status = production_completed | Green |
| Blocked / On Hold | status = on_hold | Orange |

### 8 Work Queues
Priority-sorted queue items with variant (critical/warning/clear) and links to relevant pages.

### Top Actions Bar
6 quick-action buttons: New RMR, Factory Projects, Requirements, Monthly Updates, Send to QC, WO Gate.

### Factory Rules Card
Displays `ROLE_MATRIX.factory_user.rules` directly on the dashboard.

### Data Loading
Parallel Supabase queries: projects, factory_records, monthly count, RMR count. Falls back to mock data when unconfigured.

---

## Part 4 — WO Gate

**File:** `src/pages/WoPnGate.tsx` — **kept as-is (no changes)**

Existing WoPnGate.tsx is well-implemented with full Add/Edit/Confirm/Cancel/Supersede modals. Sidebar prominence increased by moving the link to the dedicated FACTORY EXECUTION section.

---

## Part 5 — Factory Projects

**File:** `src/pages/FactoryProjects.tsx` (full rewrite)

### 8 Filter Tabs
`all | missing_wo | ready | in_production | waiting_materials | blocked | ready_for_qc | completed`

### Key Features
- `interface ProjectWithRecords { project, records, hasWo, overallStatus, avgProgress, lastUpdated }`
- `getNextAction(hasWo, status)` — contextual next action string
- `matchesTab(tab, item)` — filter logic per tab
- WO status badge column (Active WO / Missing WO)
- Missing WO alert banner at top
- Orange accent throughout

---

## Part 6 — Production Lines (Deferred)

**Schema gap:** No separate `production_lines` table exists.

**Resolution:** "Production Lines" sidebar link points to `/factory/projects` (same page). The FactoryProjectWorkspace at `/factory/projects/:projectId` shows vehicle line details per project. Documented as deferred pending schema addition of a production_lines table if needed.

---

## Part 7 — Factory Requirements

**File:** `src/pages/FactoryRequirements.tsx` (full rewrite)

### Tabs
`all | missing | submitted | under_review | approved | rejected`

Status mappings:
- `missing` → `['pending']` → Badge: "Missing / Pending" (critical)
- `submitted` → `['uploaded']`
- `under_review` → `['in_progress']`

### Key Additions
- WO governance note with link to `/wo-pn-gate`
- Requirement types legend: BOQ · BOM · GA Drawing · Detail Drawing · Manhours
- `isPriority` flag shows "Required" badge for tracked types
- Schema note about file uploads via Factory Project workspace

---

## Part 8 — Raw Material Requests

**File:** `src/pages/FactoryRawMaterialRequests.tsx` (full rewrite)

### New Features
- **WO Linked column:** WO Linked (success) / No WO (critical) / — based on `wo_reference_id` + `request_type`
- `getNextAction(rmr)` → `{ label: string; warn: boolean }` for contextual next action
- `projectWithoutWo` count with alert banner
- Orange "New Request" primary button
- Status count: `${filtered.length} requests · ${openCount} open`

---

## Part 9 — Monthly Updates

**File:** `src/pages/FactoryMonthlyUpdates.tsx` (full rewrite)

### Key Changes
- Loads **all active records** (not just `monthly_update_required=true`) — filtered client-side
- Excludes only `sent_to_qc` and `not_started` statuses
- 4 tabs: Due / Overdue (>30 days) / In Production / All
- Two alert banners: red for overdue (>30 days), amber for due
- Inline submit form with orange styling
- `recordFactoryEvent()` audit trail on successful update

### Overdue Logic
```typescript
const OVERDUE_DAYS = 30;
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const isOverdue = (r) => r.monthly_update_required && r.last_updated_at && daysSince(r.last_updated_at) > OVERDUE_DAYS;
```

---

## Part 10 — Send to QC

**File:** `src/pages/FactorySendToQC.tsx` (new file)

### Filter Tabs
- `ready` — `production_status === 'production_completed'`
- `sent` — `production_status === 'sent_to_qc'`
- `all` — both

### Readiness Checklist (per record, expandable)
```typescript
function getReadinessChecks(record: FactoryRecord): ReadinessCheck[] {
  return [
    { label: 'Work Order confirmed',       passed: !!record.wo_reference_id },
    { label: 'Production completed',        passed: status === 'production_completed' || 'sent_to_qc' },
    { label: 'Monthly update submitted',   passed: !record.monthly_update_required },
    { label: 'Progress ≥ 100%',            passed: record.progress_percentage >= 100 },
  ];
}
```

### "Send to QC" button
Visible only when all 4 checks pass. Not yet wired to mutation (see schema gap below).

**Schema gap:** `factory_records` has `sent_to_qc` as a valid `production_status` value but no dedicated `send_to_qc_at` timestamp. The mutation path is `UPDATE factory_records SET production_status = 'sent_to_qc' WHERE id = $1`. The actual Supabase update is not wired in this PR — governance note and schema comment are in place.

**Route:** `factory/send-to-qc` with `RequireRole: ['factory_user', 'operations_manager']`

---

## Part 11 — Factory Materials / Custody (Deferred)

**Schema gap:** No dedicated "materials issued to factory" table/view. Materials issued to factory are tracked through the custody system (`MaterialCustody` at `/custody`).

**Resolution:** FACTORY MATERIALS sidebar section links:
- "Materials Requested" → `/factory/raw-material-requests` (existing)
- "Materials Issued to Factory" → `/custody` (custody-based view, already has factory_user RequireRole)
- "Factory Custody" → `/custody` (same)

---

## Part 12 — Factory Reports

**File:** `src/pages/ReportsFactory.tsx` (full rewrite)

### 8 Report Tabs (was 5)
| Tab | Description |
|-----|-------------|
| Missing WO | Records with no wo_reference_id |
| Missing BOQ | Records without uploaded/approved BOQ requirement |
| Missing GA Drawing | Records without uploaded/approved GA Drawing |
| Monthly Update Due | Records where monthly_update_required = true |
| Ready for QC | Records with production_completed status |
| Sent to QC | Records with sent_to_qc status |
| Blocked / On Hold | Records with on_hold status |
| Raw Material Requests | All RMRs with WO Linked column |

### Live Data
Parallel Supabase queries for all three tables. Falls back to mock data when unconfigured. Orange tab accent (was brand-600).

---

## Part 13 — Project Factory View (Deferred)

`src/pages/ProjectDetail.tsx` is a multi-role shared component with complex tab logic. Touching it risked cross-role regressions. Deferred to a dedicated step focused on ProjectDetail factory tab hardening.

---

## Part 14 — Role Matrix Updates

**File:** `src/lib/roleMatrix.ts`

`factory_user.rules` expanded from 4 to 6:
1. WO is mandatory before Saudi Factory execution begins
2. No BOQ, BOM, drawings, manhours, or project RMRs before WO is issued
3. Project-based RMRs must be linked to a Project and WO
4. Monthly production updates must be submitted on time — overdue records are escalated
5. Completed factory work must be sent to QC for inspection before handoff
6. Materials issued from Store must be accepted, tracked, and resolved

---

## Part 15 — Visual / UX Improvements

- Orange accent throughout all factory pages (`text-orange-700`, `border-orange-500`, `bg-orange-50`)
- Consistent `PageHeader` with breadcrumb on all pages
- `DataSourceBadge` on all pages
- Proper `EmptyState` component with contextual messages on all pages
- Tab counts shown as pills, orange when active
- Alert banners for critical states (missing WO, overdue, no RMR WO linkage)
- Governance notes visible on relevant pages

---

## Part 16 — Documentation

This file. Created at `docs/implementation/step-18-7c-factory-production-work-center.md`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/data/navigation.ts` | Added FACTORY EXECUTION + FACTORY MATERIALS sidebar sections |
| `src/lib/roleMatrix.ts` | Expanded factory_user.rules from 4 to 6 |
| `src/pages/Factory.tsx` | Full rewrite — orange dashboard, 8 KPIs, 8 work queues, top actions |
| `src/pages/FactoryProjects.tsx` | Full rewrite — WO filter tabs, next action, orange accent |
| `src/pages/FactoryRequirements.tsx` | Full rewrite — better tabs, WO note, priority badges |
| `src/pages/FactoryRawMaterialRequests.tsx` | Full rewrite — WO Linked column, next action, orange accent |
| `src/pages/FactoryMonthlyUpdates.tsx` | Full rewrite — all-records view, overdue logic, submit form |
| `src/pages/FactorySendToQC.tsx` | New file — readiness checklist, expandable panel, QC queue |
| `src/pages/ReportsFactory.tsx` | Full rewrite — 8 tabs, live Supabase queries, orange accent |
| `src/app/App.tsx` | Added FactorySendToQC lazy import and route |
| `docs/implementation/step-18-7c-factory-production-work-center.md` | This file |

---

## Schema Gaps (No Changes Made)

| Gap | Workaround |
|-----|-----------|
| No separate `production_lines` table | Sidebar "Production Lines" → /factory/projects |
| No `send_to_qc_at` timestamp on `factory_records` | Send to QC button UI present, mutation not wired; schema note documented |
| No dedicated "materials issued to factory" table | FACTORY MATERIALS sidebar links to /custody |
| File uploads tracked via `document_id` not `storage_path` | Upload handled in FactoryProjectWorkspace, not in requirements list |

---

## Deferred Items

| Item | Reason | Risk if Done Now |
|------|--------|-----------------|
| Send to QC Supabase mutation | No `send_to_qc_at` column; production_status update safe but UI needs confirmation modal | Low — could add in next step |
| ProjectDetail factory tab hardening | Multi-role shared component, cross-role regression risk | High |
| Production Lines schema addition | New table required | Schema migration needed |
| Factory Materials dedicated view | New table/view required | Schema migration needed |

---

## Safety Review

- No DB schema changes, no migrations, no RLS changes
- WO/PN gate (`WoPnGate.tsx`) untouched
- All existing route guards preserved
- All writes through RLS-enforced Supabase client
- `mockOrEmpty()` guard on all mock data
- `isSupabaseConfigured` guard on all live queries
- No unsupported workflows presented as complete
- No fake live data
- Admin always bypasses `RequireRole` (framework behaviour)
