# Step 9 — SO Approval and Routing Final Sign-off

**Date:** 2026-06-14  
**Branch:** `feature/step-9e-so-approval-routing-final-signoff`  
**Scope:** Complete summary of Steps 9A – 9E (SO Approval / Routing pipeline)

---

## 1. Step Summary

| Step | Title | PR | Key Output |
|------|-------|----|-----------|
| 9A | SO Approval Routing Audit | #69 | Audit doc; gaps G-9A-01 through G-9A-04 identified |
| 9B | WO/PN DB Guardrails | #70 | Migration 089; WoPnGate DB enforcement |
| 9C | Department Routing Persistence | #71 | Migration 090 (`project_department_routing`); AdminApprovals routing INSERT |
| 9D | Routing Cleanup & Approval Visibility | — | Migration 091 (sales_user SELECT); delete-before-insert; RoutingSummaryCard; PageHeader migration |
| 9E | Final Sign-off | — | ApprovePanel routing checkboxes; routing persistence from ProjectDetail; RoutingSummaryCard refresh |

---

## 2. Governance Rules Confirmed (R-001 – R-006)

| Rule | Description | Enforcement | Status |
|------|-------------|-------------|--------|
| R-001 | Only admin/operations_manager may approve a project | `CAN_APPROVE` array + RLS `pdr_admin_all` | TIER-1 (DB + UI) |
| R-002 | Approval requires manufacturing_location and medical_items to be set | ApprovePanel enforces selection before commit | TIER-2 (UI) |
| R-003 | Department routing decisions are persisted as structured rows (not only timeline metadata) | `project_department_routing` INSERT in both AdminApprovals and ApprovePanel | TIER-2 (UI+DB) |
| R-004 | Re-approval replaces stale routing rows (delete-before-insert) | DELETE `source='so_approval'` then INSERT checked depts | TIER-2 (UI) |
| R-005 | Department users can only SELECT their own department's routing rows | RLS policies `pdr_procurement_select`, `pdr_factory_select`, `pdr_store_select`, `pdr_qc_select`, `pdr_afs_select` | TIER-1 (DB) |
| R-006 | sales_user can SELECT routing rows for own projects only | RLS policy `pdr_sales_select` (migration 091) | TIER-1 (DB) |

---

## 3. Migrations Created (Steps 9A – 9E)

| Migration | Step | Description |
|-----------|------|-------------|
| 089 | 9B | WO/PN execution reference DB guardrails |
| 090 | 9C | `project_department_routing` table + RLS (7 policies) |
| 091 | 9D | `pdr_sales_select` — sales_user own-project SELECT |

No new migration in Step 9E (no schema changes needed).

---

## 4. Files Changed in Step 9E

### `src/pages/ProjectDetail.tsx`

**Part A — ApprovePanel routing checkboxes:**
- Added `routes` state (same defaults as AdminApprovals: procurement ✓, factory ✓, store ✓, material_qc ✗, project_qc ✓, dubai_afs ✗)
- Added `handleLocationChange()` — updates `location` and auto-sets `dubai_afs`
- Added `handleMedicalChange()` — updates `medical` and auto-sets `material_qc`
- Location and Medical buttons now call handlers instead of raw setters
- Added Department Routing card in JSX (between Medical card and Actions section) with 6 checkboxes using `DEPT_LABELS`

**Part B — Routing persistence from ApprovePanel:**
- Added `onRoutingWarning?: (msg: string) => void` prop to `ApprovePanelProps`
- `handleApprove()` now:
  1. Updates project (as before)
  2. Records timeline event with `routing: routes` in metadata (closes gap for ProjectDetail approvals)
  3. Records audit entry (as before)
  4. DELETE `project_department_routing` WHERE `project_id = ? AND source = 'so_approval'` (non-blocking)
  5. INSERT checked depts only (non-blocking)
  6. Calls `onSuccess()` in all paths
- If DELETE or INSERT fails: calls `onRoutingWarning(msg)` and returns early from routing block; approval is already committed

**Part C — RoutingSummaryCard refresh:**
- `RoutingSummaryCard` accepts optional `refreshKey?: number` prop
- `refreshKey` added to useEffect dependency array — re-fetches when key increments
- useEffect resets `loadingRouting` and `routingLoadError` at start of each fetch
- Main component adds `routingRefreshKey` (number) and `approvalRoutingWarning` (string | null) state
- `handleApprovalSuccess()` increments `routingRefreshKey` → card re-fetches after approval
- Approval tab JSX: `<RoutingSummaryCard refreshKey={routingRefreshKey} />`
- Approval tab JSX: amber warning banner shown when `approvalRoutingWarning` is set
- `<ApprovePanel onRoutingWarning={setApprovalRoutingWarning} />`

---

## 5. Part D — sales_coordinator Visibility Decision

**Decision: No migration 092. Deferred.**

`sales_coordinator` has no `sales_owner_id` ownership link on the `projects` table. The `sales_owner_id` column links only to `sales_user` accounts. Coordinators manage quotations, not projects directly. No safe ownership pattern exists to scope a coordinator SELECT policy without granting broader access than intended.

This remains as limitation L-001 (now re-labelled to the Step 9E context). Deferred to a future step when coordinator-project linking is clarified.

---

## 6. Routing Persistence: Both Approval Paths Now Covered

| Approval Path | Routing Checkboxes | Routing Persisted | Re-approval Cleanup |
|---------------|--------------------|-------------------|---------------------|
| AdminApprovals.tsx `ApproveModal` | Yes (Step 9C) | Yes (Step 9C + 9D) | Yes — delete-before-insert (Step 9D) |
| ProjectDetail.tsx `ApprovePanel` | Yes (Step 9E) | Yes (Step 9E) | Yes — delete-before-insert (Step 9E) |

---

## 7. Limitations Carried Forward

| ID | Limitation | Deferred To |
|----|-----------|-------------|
| L-001 | `sales_coordinator` has no routing table access | Future step — no safe ownership pattern |
| L-002 | Downstream modules do not read from routing table for visibility | Steps 10–15 per module |
| L-003 | `RoutingSummaryCard` uses no polling or real-time subscription | Future enhancement |

---

## 8. Validation Results (Step 9E)

| Check | Result |
|-------|--------|
| `npm run build` | PASS (`✓ built in 4.91s`) |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run lint` | 79 problems (63 errors, 16 warnings) — same as before Step 9E |
| Step 7 Sales & Quotation logic changed | No |
| Step 8 UX logic changed | No |
| Quotation files changed | No |
| Procurement / Store / Factory / Dubai / QC / After-Sales logic changed | No |
| Downstream module visibility changed | No |
| Approval role logic changed | No |
| Approval status values changed | No |
| New RLS policies added | No (routing table RLS complete after Steps 9C/9D) |

---

## 9. Rollback Notes

**Part A/B (ApprovePanel routing):**
- Remove `routes` state, `handleLocationChange`, `handleMedicalChange` from `ApprovePanel`
- Revert location/medical buttons to use raw setters
- Remove routing checkboxes card from JSX
- Remove routing persistence block from `handleApprove()` (DELETE + INSERT)
- Remove `onRoutingWarning` prop from `ApprovePanelProps`
- Remove `routing: routes` from timeline event metadata call

**Part C (RoutingSummaryCard refresh):**
- Remove `refreshKey` prop from `RoutingSummaryCard` and its useEffect deps
- Remove `routingRefreshKey` and `approvalRoutingWarning` state from main component
- Remove `setRoutingRefreshKey((k) => k + 1)` from `handleApprovalSuccess`
- Remove `refreshKey={routingRefreshKey}` and `onRoutingWarning={setApprovalRoutingWarning}` from JSX
- Remove amber warning banner from approval tab JSX

---

## 10. Recommended Next Steps (Steps 10–15)

| Step | Module | Routing Gate |
|------|--------|-------------|
| 10 | WO / PN | Gate: only show factory/WO tab if routing row `department = 'factory'` exists |
| 11 | Procurement | Gate: only allow PRs if routing row `department = 'procurement'` exists |
| 12 | Store | Gate: only allow receipts if routing row `department = 'store'` exists |
| 13 | Factory | Gate: only allow factory records if routing row `department = 'factory'` exists |
| 14 | Dubai / AFS | Gate: only allow Dubai follow-up if routing row `department = 'dubai_afs'` exists |
| 15 | QC | Gate: only allow QC inspections if routing row `department IN ('material_qc', 'project_qc')` exists |
