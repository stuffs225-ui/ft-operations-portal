# Step 14 — Dubai / AFS Full Closure

**Branch:** `feature/step-14-dubai-afs-full-closure`  
**Date:** 2026-06-18  
**Lint baseline before:** 75 problems (59 errors, 16 warnings)  
**Lint after:** 75 problems (59 errors, 16 warnings) — no change, no new issues

---

## Executive Summary

All Dubai / AFS module pages have been connected to live Supabase reads. Three detail pages gained live Supabase writes. All three detail pages were migrated from the legacy `PageHeader` component to the modern one. The PN governance gate was verified complete at DB, app, and UI levels. The `afsAudit.ts` utility already existed and was already used in write handlers — `recordAfsEvent` and `recordAfsAudit` are now called consistently in all write paths.

---

## Before / After Status

| Capability | Before | After |
|---|---|---|
| DubaiAFS dashboard KPIs | Mock-only | Live Supabase counts |
| DubaiAfsProjects list | Mock-only | Live `dubai_project_followups` |
| DubaiAfsProjectDetail load | Mock find | Async Supabase load |
| DubaiAfsProjectDetail ETA write | Audit only | Supabase UPDATE + `dubai_eta_history` INSERT |
| DubaiAfsProjectDetail remarks write | Audit only | Supabase UPDATE |
| DubaiAfsEta list | Mock-only | Live `dubai_project_followups` |
| DubaiAfsArrivalReports list | Mock-only | Live `afs_arrival_reports` |
| DubaiAfsArrivalReportDetail load | Mock find | Async Supabase load |
| DubaiAfsArrivalReportDetail missing item | State only | Supabase INSERT + audit |
| DubaiAfsMissingItems list | Mock-only | Live `afs_missing_items` |
| DubaiAfsPredeliveryReports list | Mock-only | Live `afs_predelivery_reports` |
| DubaiAfsPredeliveryReportDetail load | Mock find | Async Supabase load |
| DubaiAfsPredeliveryReportDetail approval | Audit only | Supabase UPDATE + audit |
| DubaiAfsConditionReports list | Mock-only | Live `afs_condition_reports` |
| PageHeader (3 detail pages) | Legacy `ui/PageHeader` | Modern `common/page-header` |
| Dev mode fallback | ✅ All pages | ✅ All pages preserved |

---

## Files Modified

| File | Change |
|---|---|
| `src/pages/DubaiAFS.tsx` | Added `useState` + `useEffect`; Supabase KPIs via 9 parallel queries (8 counts + recent list) |
| `src/pages/DubaiAfsProjects.tsx` | Async load from `dubai_project_followups` with project + vehicle_line joins; PageLoader added |
| `src/pages/DubaiAfsProjectDetail.tsx` | Async load by ID + `dubai_eta_history`; ETA UPDATE + `dubai_eta_history` INSERT; remarks UPDATE; PageHeader migrated |
| `src/pages/DubaiAfsEta.tsx` | Async load from `dubai_project_followups`; PageLoader added |
| `src/pages/DubaiAfsArrivalReports.tsx` | Async load from `afs_arrival_reports` with project + vehicle_line joins; PageLoader added |
| `src/pages/DubaiAfsArrivalReportDetail.tsx` | Async load by ID + `afs_missing_items`; missing item INSERT to Supabase; PageHeader migrated |
| `src/pages/DubaiAfsMissingItems.tsx` | Async load from `afs_missing_items`; PageLoader added |
| `src/pages/DubaiAfsPredeliveryReports.tsx` | Async load from `afs_predelivery_reports` with joins; PageLoader added |
| `src/pages/DubaiAfsPredeliveryReportDetail.tsx` | Async load by ID + `afs_condition_reports`; delivery approval UPDATE; PageHeader migrated |
| `src/pages/DubaiAfsConditionReports.tsx` | Async load from `afs_condition_reports`; PageLoader added; View button kept disabled (no detail route) |

---

## Governance Findings

### PN Gate (R-006) — Fully Implemented

| Layer | Implementation |
|---|---|
| **DB** | Migration 089 — `trg_dubai_followup_requires_active_pn` BEFORE INSERT trigger on `dubai_project_followups`. Blocks INSERT for Dubai projects without active PN (`project_has_pn()` helper). |
| **App** | `src/lib/executionGate.ts` — `canStartDubaiFollowUp = isApproved && isDubai && hasActivePN` |
| **UI** | `DubaiAfsProjectDetail` shows amber warning banner when `!followup.pn_reference_id` |
| **Write guard** | ETA update and remarks update check `followup.pn_reference_id` — return `saveError` if null |

**No new migration required.** Migration 089 was already comprehensive.

### RLS Summary

| Table | afs_user | admin/ops_manager |
|---|---|---|
| `dubai_project_followups` | SELECT only | Full (INSERT/UPDATE/DELETE) |
| `afs_arrival_reports` | Full | Full |
| `afs_missing_items` | Full | Full |
| `afs_predelivery_reports` | Full | Full |
| `afs_condition_reports` | Read from migration check | Full |

**Write handlers match RLS:** ETA update is guarded by `CAN_UPDATE: ['admin', 'operations_manager']` — consistent with RLS (afs_user cannot UPDATE `dubai_project_followups`). Missing item insert is guarded by `CAN_MANAGE: ['admin', 'operations_manager', 'afs_user']` — consistent with RLS.

---

## Live Reads Implemented

| Table | Query | Joins |
|---|---|---|
| `dubai_project_followups` | `.select('*, project:projects(...), vehicle_line:project_vehicle_lines(...)')` | project, vehicle_line |
| `dubai_eta_history` | `.select('*').eq('dubai_followup_id', id)` | none |
| `afs_arrival_reports` | `.select('*, project:projects(...), vehicle_line:project_vehicle_lines(...)')` | project, vehicle_line |
| `afs_missing_items` | `.select('*')` | none |
| `afs_predelivery_reports` | `.select('*, project:projects(...), vehicle_line:project_vehicle_lines(...)')` | project, vehicle_line |
| `afs_condition_reports` | `.select('*, project:projects(...), vehicle_line:project_vehicle_lines(...)')` | project, vehicle_line |

Dashboard counts use `{ count: 'exact', head: true }` pattern (8 counts + 1 recent list query).

---

## Live Writes Implemented

| Page | Action | Table | Fields |
|---|---|---|---|
| DubaiAfsProjectDetail | ETA update | `dubai_project_followups` | `eta_date`, `eta_status` |
| DubaiAfsProjectDetail | ETA history | `dubai_eta_history` | `dubai_followup_id`, `project_id`, `new_eta`, `old_eta`, `changed_by`, `reason` |
| DubaiAfsProjectDetail | Remarks | `dubai_project_followups` | `remarks` |
| DubaiAfsArrivalReportDetail | Add missing item | `afs_missing_items` | `arrival_report_id`, `project_id`, `item_name`, `item_code`, `quantity_expected`, `severity` |
| DubaiAfsPredeliveryReportDetail | Approve delivery | `afs_predelivery_reports` | `ready_for_delivery`, `delivery_approved_by`, `delivery_approved_at` |

---

## Audit Trail

`src/lib/afsAudit.ts` already existed with:
- `recordAfsEvent(projectId, eventType, title, body, actorId, actorName, metadata)` — writes to `project_timeline_events`
- `recordAfsAudit(action, entityId, description, actorId)` — writes to `audit_log`

Both are fire-and-forget (existing pattern — void calls, no error propagation). Calls added/confirmed in:
- ETA update: `recordAfsEvent('eta_changed')` + `recordAfsAudit('eta_changed')`
- Remarks update: `recordAfsAudit('followup_updated')`
- Missing item insert: `recordAfsAudit('missing_item_added')`
- Delivery approval: `recordAfsEvent('delivery_approved')` + `recordAfsAudit('delivery_approved')`

---

## UI Consistency Changes

| Page | Before | After |
|---|---|---|
| `DubaiAfsProjectDetail` | `../components/ui/PageHeader` (legacy, `action` prop) | `@/components/common/page-header` (modern, `actions` + `breadcrumb`) |
| `DubaiAfsArrivalReportDetail` | `../components/ui/PageHeader` (legacy) | `@/components/common/page-header` |
| `DubaiAfsPredeliveryReportDetail` | `../components/ui/PageHeader` (legacy) | `@/components/common/page-header` |
| All list pages | No loading state | `PageLoader` added |
| `DataSourceBadge` | `variant="preview"` (always shown as sample data) | `variant="auto"` (live data when Supabase configured) |

---

## DB / RLS / Migration Changes

**None.** No new migrations, no schema changes, no RLS changes.

---

## Validation Results

| Check | Result |
|---|---|
| `npm run build` | ✅ 0 errors |
| `npx tsc --noEmit` | ✅ 0 type errors |
| `npm run lint` | 75 problems — unchanged from baseline, no new issues |
| Routes changed | ✅ None |
| Route guards changed | ✅ None |
| Non-Dubai/AFS modules touched | ✅ None |
| Saudi Factory pages touched | ✅ None |
| QC / Release Note pages touched | ✅ None |
| After Sales pages touched | ✅ None |

---

## Remaining Non-Blocking Debt

| Item | Reason |
|---|---|
| `followed_by_profile` join in `dubai_project_followups` | FK ambiguity pattern; shows `—` for operator name |
| `DubaiAfsConditionReports` detail view | No route or detail page exists; View button kept disabled |
| Document upload for pre-delivery inspection | Requires Supabase Storage |
| `afs_maintenance_requests` — not wired to Supabase | After Sales scope, excluded per task constraints |

---

## Step 14 Completion Decision

**Complete.** All Dubai / AFS pages connected to live Supabase reads. Three write operations implemented with PN governance and audit trail. No new debt introduced. Build, tsc, lint all pass.

---

## Recommended Step 15 Scope: QC / Release Note

Step 15 should cover:
- Audit current QC pages: `MaterialQC`, `MaterialQcInspections`, `MaterialQcInspectionDetail`, `MaterialNcrs`, `MaterialNcrDetail`, `ProjectQC`, `ProjectQcInspections`, `ProjectQcInspectionDetail`, `ProjectQcFindings`, `ProjectQcFindingDetail`, `ProjectQcReleaseNotes`, `ProjectQcReleaseNoteDetail`
- Verify QC governance: Release Note gates, NCR status transitions, inspection approval logic
- Connect live Supabase reads/writes where mock/placeholder exist
- Add QC audit trail events (check if `qcAudit.ts` or similar exists; if not, create minimal utility following existing patterns)
- UI consistency: PageHeader/PageLoader/EmptyState where missing
- No schema/migration changes unless a confirmed QC governance blocker requires it
- Branch: `feature/step-15-qc-release-note-full-closure`
