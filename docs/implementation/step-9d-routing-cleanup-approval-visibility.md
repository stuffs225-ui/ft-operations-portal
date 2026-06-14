# Step 9D — Routing Cleanup, Approval Visibility, and Approval UI Alignment

**Branch:** `feature/step-9d-routing-cleanup-approval-visibility`  
**Date:** 2026-06-14  
**Scope:** Re-approval routing cleanup, sales visibility, ProjectDetail routing summary, PageHeader alignment  
**Depends on:** Step 9A (PR #69), Step 9B (PR #70), Step 9C (PR #71)

---

## 1. Executive Summary

Step 9D resolves all safe remaining gaps from Step 9C:

| Part | Issue | Result |
|------|-------|--------|
| A | Re-approval leaves stale routing rows in `project_department_routing` | Fixed — delete-before-insert replaces upsert |
| B | `sales_user` had no visibility of routing rows for their own projects | Fixed — migration 091 adds scoped SELECT policy |
| C | `ProjectDetail` Approval & Routing tab had no routing summary panel | Fixed — `RoutingSummaryCard` component added |
| D | `AdminApprovals.tsx` and `ProjectDetail.tsx` used legacy `PageHeader` | Fixed — both migrated to `@/components/common/page-header` |

Downstream module visibility (L-004) is explicitly deferred to Steps 10–15 per task scope.

---

## 2. Issues Addressed

### 2.1 Stale Routing Rows on Re-Approval (L-002)

**Before:** Step 9C used `upsert` which adds/updates routing rows but never removes old ones. If a project is re-approved with different department selections, stale rows from the previous approval remain.

**After:** `handleApprove()` now executes DELETE (`source = 'so_approval'`) before INSERT. The sequence is:
1. Approve project (projects table)
2. Record timeline event
3. Record audit log
4. DELETE existing `project_department_routing` rows for this project where `source = 'so_approval'`
5. INSERT new rows for currently-checked departments only

If DELETE fails, a non-blocking warning is shown and approval is preserved (already committed). If INSERT fails after a successful DELETE, the project is approved but routing is empty — the warning advises the user that routing is recorded in the timeline instead.

### 2.2 Sales Visibility (L-001)

**Before:** `sales_user` had no direct SELECT access to `project_department_routing`.

**After:** Migration 091 adds `pdr_sales_select` — `sales_user` can SELECT routing rows for projects where `sales_owner_id = auth.uid()`. This follows the identical ownership pattern used in:
- `dubai_project_followups` (migration 041 — `dpf_sales_select`)
- Other module tables with own-project sales access

`sales_coordinator` is NOT granted access. Coordinators process quotations and have no `sales_owner_id` ownership link on the `projects` table.

No INSERT / UPDATE / DELETE is granted to `sales_user`.

### 2.3 ProjectDetail Routing Summary (L-004 partial)

**Before:** The Approval & Routing tab in `ProjectDetail.tsx` had no structured routing display.

**After:** A new `RoutingSummaryCard` component is rendered in the Approval & Routing tab between the Current Status card and the ApprovePanel. It:
- Fetches `project_department_routing` rows for the current project on mount
- Shows routed departments as brand-coloured badge pills (using `CheckCircle2` icon)
- Shows "No structured routing decisions recorded yet." when the table has no rows for this project
- Shows an amber warning if the fetch fails (falls back gracefully — does not break the page)
- In dev/mock mode (`!isSupabaseConfigured`): shows empty state (no mock routing rows)

### 2.4 PageHeader Alignment (G-9A-03 partial)

**Before:** Both `AdminApprovals.tsx` and `ProjectDetail.tsx` imported the legacy `../components/ui/PageHeader` which accepts `icon=` and `action=` props.

**After:** Both files now import `@/components/common/page-header`. Changes per file:

| File | Changes |
|------|---------|
| `AdminApprovals.tsx` | Import updated; `icon={<CheckSquare size={18} />}` removed from PageHeader call |
| `ProjectDetail.tsx` | Import updated; `icon={<FolderOpen size={18} />}` removed; `action=` → `actions=`; breadcrumb `path:` → `href:` |

Icons `CheckSquare` and `FolderOpen` are retained in their lucide imports — both are still used elsewhere in their respective files (TABS icon arrays).

---

## 3. Migration Created

**`supabase/migrations/091_project_department_routing_sales_visibility.sql`**

| Field | Detail |
|-------|--------|
| Policy | `pdr_sales_select` |
| Table | `project_department_routing` |
| Operation | SELECT |
| Role | `sales_user` |
| Condition | `project_id IN (SELECT id FROM projects WHERE sales_owner_id = auth.uid())` |

---

## 4. RLS Policy Added

| Policy | Table | Op | Role | Condition |
|--------|-------|----|------|-----------|
| `pdr_sales_select` | `project_department_routing` | SELECT | sales_user | Own projects (`sales_owner_id = auth.uid()`) |

No existing policies changed. No other tables changed.

---

## 5. AdminApprovals.tsx Changes

- Import: `'../components/ui/PageHeader'` → `'@/components/common/page-header'`
- PageHeader call: removed `icon={<CheckSquare size={18} />}`
- `handleApprove()` routing block: replaced upsert with DELETE (`source = 'so_approval'`) followed by INSERT
- ESLint disable comment broadened to cover both `react-hooks/exhaustive-deps` and `react-hooks/set-state-in-effect` for the main load useEffect (pre-existing pattern, avoids spurious lint warning about unused disable)

---

## 6. ProjectDetail.tsx Changes

- Import: `'../components/ui/PageHeader'` → `'@/components/common/page-header'`
- PageHeader call: `icon=` removed, `action=` → `actions=`, breadcrumb `path:` → `href:`
- New `RoutingSummaryCard` component added (before `ApprovePanel` definition)
- `<RoutingSummaryCard projectId={project.id} />` inserted in approval tab JSX between Current Status card and ApprovePanel

---

## 7. Downstream Module Visibility: Explicitly Deferred

Per Step 9D task scope, downstream module visibility changes are deferred:

| Module | Step |
|--------|------|
| WO / PN gate | Step 10 |
| Procurement | Step 11 |
| Store | Step 12 |
| Factory | Step 13 |
| Dubai / AFS | Step 14 |
| QC | Step 15 |

The `project_department_routing` table is now populated and queryable, but no module reads from it to show/hide records yet.

---

## 8. Manual Test Scenarios

**Test 1 — Approve with procurement + factory + store selected → 3 routing rows**
```sql
SELECT department FROM project_department_routing
WHERE project_id = '<proj_id>' ORDER BY department;
-- Expected: factory, procurement, store (3 rows)
```

**Test 2 — Re-approve same project with only procurement selected → stale rows removed**
Approve a second time with only `procurement` checked.
```sql
SELECT department FROM project_department_routing
WHERE project_id = '<proj_id>';
-- Expected: only 'procurement' (1 row)
-- factory and store rows from previous approval are gone
```

**Test 3 — Timeline metadata still records all 6 route booleans**
```sql
SELECT metadata->'routing' FROM project_timeline_events
WHERE project_id = '<proj_id>' AND event_type = 'approved'
ORDER BY created_at DESC LIMIT 1;
-- Expected: {"factory": true, "store": false, "procurement": true,
--            "project_qc": false, "dubai_afs": false, "material_qc": false}
```

**Test 4 — Audit log still records approval**
```sql
SELECT action_type FROM audit_log
WHERE entity_id = '<proj_id>' AND action_type = 'project_approved'
ORDER BY created_at DESC LIMIT 1;
-- Expected: 'project_approved'
```

**Test 5 — Admin / operations_manager sees all routing rows**
```sql
-- As admin/operations_manager session:
SELECT * FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: all rows returned
```

**Test 6 — sales_user sees routing rows for own projects**
```sql
-- As sales_user session (project belongs to this user):
SELECT department FROM project_department_routing WHERE project_id = '<owned_proj_id>';
-- Expected: rows returned
-- As sales_user (project belongs to other user):
SELECT department FROM project_department_routing WHERE project_id = '<other_proj_id>';
-- Expected: 0 rows (RLS filters them)
```

**Test 7 — sales_user cannot insert/update/delete routing rows**
```sql
-- As sales_user session:
INSERT INTO project_department_routing (project_id, department)
VALUES ('<owned_proj_id>', 'procurement');
-- Expected: ERROR — RLS violation
```

**Test 8 — Department users retain their Step 9C select behavior**
```sql
-- As factory_user session:
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: only 'factory' rows
-- As qc_user session:
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: only 'material_qc' and 'project_qc' rows
```

**Test 9 — ProjectDetail shows routing summary when rows exist**
- Navigate to a project that has been approved with routing decisions
- Open the Approval & Routing tab
- Expected: brand-coloured badge pills for each routed department appear under "Department Routing"

**Test 10 — ProjectDetail shows empty state when no routing rows exist**
- Navigate to a project that has not been approved, or was approved before Step 9C was deployed
- Open the Approval & Routing tab
- Expected: "No structured routing decisions recorded yet." message under "Department Routing"

**Test 11 — ProjectDetail approval actions still work**
- Open Approval & Routing tab as admin/operations_manager on a submitted project
- Approve / Send Back / Reject — all actions should function as before
- The routing summary panel is read-only and does not interfere

**Test 12 — No downstream module visibility changed**
- Procurement, Factory, Store, QC, Dubai/AFS tabs in ProjectDetail: all unchanged
- No module filters its records based on `project_department_routing` yet

---

## 9. Assumptions

| ID | Assumption |
|----|-----------|
| A-001 | Re-approvals only occur via `AdminApprovals.tsx` or `ProjectDetail.tsx` ApprovePanel. The delete-before-insert in Part A only covers `AdminApprovals.tsx`. `ProjectDetail.tsx` `ApprovePanel` does NOT persist routing to the table (it has no routing checkboxes). If admin approves via ProjectDetail, routing table is not updated (no regression — it wasn't updated before Step 9C either). |
| A-002 | DELETE `.eq('source', 'so_approval')` preserves any future admin-inserted rows with `source = 'admin_override'`. Only ApproveModal-sourced rows are replaced on re-approval. |
| A-003 | `sales_user` projects are identified by `sales_owner_id = auth.uid()` on the `projects` table. This is the established ownership pattern used by all other sales_user RLS policies. |
| A-004 | The legacy `../components/ui/PageHeader` remains in the codebase for other pages not yet migrated (e.g., QuotationDetail, ProcurementRequests). Step 9D only migrates AdminApprovals and ProjectDetail per task scope. |

---

## 10. Limitations

| ID | Limitation | Deferred To |
|----|-----------|-------------|
| L-001 | `sales_coordinator` has no routing table access | Step 9E or later — no clear ownership pattern exists |
| L-002 | `ProjectDetail.tsx` `ApprovePanel` (inline approval without routing checkboxes) does not update `project_department_routing`. Re-approval via ProjectDetail leaves routing table unchanged. | Step 10 or step where ApprovePanel gets routing checkboxes |
| L-003 | Downstream modules do not read from routing table for visibility | Steps 10–15 per module |
| L-004 | `RoutingSummaryCard` uses no polling or real-time subscription — shows routing at page load only | Future enhancement if real-time needed |

---

## 11. Rollback Notes

**Part A (AdminApprovals routing cleanup):**
Revert `handleApprove()` in AdminApprovals.tsx to use `upsert` instead of delete-then-insert. The routing table may have stale rows but functional data is unaffected.

**Part B (migration 091):**
```sql
DROP POLICY IF EXISTS pdr_sales_select ON public.project_department_routing;
```

**Part C (ProjectDetail routing summary):**
Remove `RoutingSummaryCard` function from ProjectDetail.tsx, remove `<RoutingSummaryCard projectId={project.id} />` from the approval tab JSX, remove `DEPT_LABELS` constant.

**Part D (PageHeader migration):**
- AdminApprovals.tsx: revert import to `'../components/ui/PageHeader'`, restore `icon={<CheckSquare size={18} />}`
- ProjectDetail.tsx: revert import to `'../components/ui/PageHeader'`, restore `icon={<FolderOpen size={18} />}`, change `actions=` back to `action=`, change breadcrumb `href:` back to `path:`

---

## 12. Safety Review

| Check | Result |
|-------|--------|
| Step 7 Sales & Quotation logic changed | No |
| Step 8 UX logic changed (beyond PageHeader) | No |
| Quotation files changed | No |
| Procurement / Store / Factory / Dubai / QC / After-Sales logic changed | No |
| Downstream module visibility changed | No |
| Approval role logic changed | No |
| Approval status values changed | No |
| Existing projects table update preserved | Yes |
| Existing timeline event (`recordProjectEvent`) preserved | Yes |
| Existing audit log (`recordAuditEntry`) preserved | Yes |
| New RLS scoped only to `project_department_routing` | Yes |
| Build result | PASS (`✓ built in 5.04s`) |
| Typecheck result | PASS (`npx tsc --noEmit` — 0 errors) |
| Lint result | 79 problems (63 errors, 16 warnings) — **same as before Step 9D** |

---

## 13. Recommended Step 9E Scope

Step 9E should be a final sign-off and stabilization step for the SO approval / routing pipeline:

1. **ApprovePanel routing checkboxes:** Add the 6 department routing checkboxes to `ProjectDetail.tsx` `ApprovePanel` (the inline approval panel) so that approval via ProjectDetail also persists routing. Currently, routing is only persisted via AdminApprovals. This closes L-002.

2. **Re-approval routing for ApprovePanel:** Once ApprovePanel has checkboxes, apply the same delete-before-insert pattern from Step 9D.

3. **`sales_coordinator` routing visibility decision:** Determine if `sales_coordinator` needs routing visibility and implement if a safe ownership pattern can be identified.

4. **G-9A-03 completion:** The remaining legacy PageHeader usages (other pages not in scope for Step 9D) can be migrated as a standalone cleanup step.

5. **Final SO/routing governance sign-off document:** Summarize all R-001 to R-006 governance rules, confirming TIER-1/2/3 enforcement levels after Steps 9A–9D, for the governance register.
