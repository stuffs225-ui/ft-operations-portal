# Step 9C — Department Routing Persistence

**Branch:** `feature/step-9c-department-routing-persistence`  
**Date:** 2026-06-14  
**Scope:** SO approval department routing persistence into a structured database table  
**Depends on:** Step 9A (merged PR #69), Step 9B (merged PR #70)

---

## 1. Executive Summary

Step 9A identified gap G-9A-01: the six department routing checkboxes in `AdminApprovals.tsx` (`ApproveModal`) were written only to `project_timeline_events.metadata.routing` as JSON. No structured table existed, making routing decisions impossible to query by department, audit programmatically, or surface to downstream operational modules.

This step closes G-9A-01 by:

1. Creating table `project_department_routing` (migration 090).
2. Updating `AdminApprovals.tsx` to upsert checked departments after each SO approval.
3. Adding the table type to `src/types/database.ts` (required because the Supabase client types are hand-maintained in this repo and not auto-generated).

All existing approval behavior, timeline events, and audit logging are preserved unchanged.

---

## 2. Gap Closed: G-9A-01

| Field | Detail |
|-------|--------|
| Gap ID | G-9A-01 |
| Source | `docs/implementation/step-9a-so-approval-routing-audit.md` §6 |
| Description | Department routing selections were UI-only state; not persisted to a queryable table |
| Impact before | Cannot query "which projects are routed to Material QC?"; downstream modules have no programmatic routing signal |
| Status after | **CLOSED** — routing decisions are now persisted in `project_department_routing` |

---

## 3. Table Created: `project_department_routing`

**Migration:** `supabase/migrations/090_project_department_routing.sql`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `project_id` | uuid | NOT NULL, FK → projects(id) ON DELETE CASCADE | |
| `department` | text | NOT NULL, CHECK constraint | See valid values below |
| `is_required` | boolean | NOT NULL DEFAULT true | Always true in SO approval flow |
| `routed_at` | timestamptz | NOT NULL DEFAULT now() | Approval timestamp |
| `routed_by` | uuid | NULLABLE, FK → auth.users(id) | Approver's user ID |
| `source` | text | NOT NULL DEFAULT 'so_approval', CHECK source ≠ '' | Routing source identifier |
| `metadata` | jsonb | NOT NULL DEFAULT '{}' | Stores manufacturing_location + medical_items at time of approval |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | Auto-maintained by trigger |

**Valid department values** (CHECK constraint `pdr_department_valid`):
`procurement`, `factory`, `store`, `material_qc`, `project_qc`, `dubai_afs`

**Unique constraint:** `UNIQUE (project_id, department)` — named `pdr_project_department_unique`. Allows upsert on conflict.

**Indexes:**
- `idx_pdr_project` on `project_id` — for per-project lookups
- `idx_pdr_department` on `department` — for per-department queries

**`updated_at` trigger:** `trg_pdr_updated_at` → `set_updated_at_pdr()`. No shared update timestamp function exists in this codebase; each table defines its own small function, per the pattern established in migration 041 (`set_updated_at_dpf()`).

---

## 4. RLS Policies Created

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `pdr_admin_all` | ALL (SELECT/INSERT/UPDATE/DELETE) | admin, operations_manager | Unrestricted |
| `pdr_viewer_select` | SELECT | viewer | All rows |
| `pdr_procurement_select` | SELECT | procurement_user | `department = 'procurement'` |
| `pdr_factory_select` | SELECT | factory_user | `department = 'factory'` |
| `pdr_store_select` | SELECT | store_user | `department = 'store'` |
| `pdr_qc_select` | SELECT | qc_user | `department IN ('material_qc', 'project_qc')` |
| `pdr_afs_select` | SELECT | afs_user | `department = 'dubai_afs'` |

All policies use `public.current_user_role()` (SECURITY DEFINER, defined in migration 003) — the standard role-check function in this codebase.

No department operational user can INSERT, UPDATE, or DELETE routing rows. Only admin and operations_manager can mutate.

`sales_user` and `sales_coordinator` are not granted direct routing access in this step. If needed, a future migration can add a `pdr_sales_select` policy restricted to their own projects. This is documented as a limitation (L-001).

---

## 5. AdminApprovals.tsx Change

**File:** `src/pages/AdminApprovals.tsx`  
**Function:** `ApproveModal.handleApprove()`  
**Nature:** Additive — no existing code removed or altered; new code inserted after `recordAuditEntry()`

### What was added

1. **`routingWarning` state** (`useState<string | null>(null)`) — tracks non-blocking routing persistence failure.
2. **Routing persistence block** — after `recordAuditEntry()` completes, checked departments are upserted into `project_department_routing`.
3. **Routing warning banner** — amber-style banner rendered in the modal body when `routingWarning` is set.
4. **Conditional footer buttons** — when `routingWarning` is set (approval succeeded, routing failed), the footer shows only a "Close" button calling `onSuccess()` instead of the normal Cancel + Approve pair.
5. **`project_department_routing` type** added to `src/types/database.ts` — required because Supabase types are hand-maintained in this repo.

### Routing persistence code summary

```typescript
const DEPT_KEYS = ['procurement', 'factory', 'store', 'material_qc', 'project_qc', 'dubai_afs'] as const;
const checkedDepts = DEPT_KEYS.filter((d) => routes[d]);
if (checkedDepts.length > 0) {
  const routingRows = checkedDepts.map((dept) => ({
    project_id: project.id,
    department: dept,
    is_required: true,
    routed_by: profile?.id ?? null,
    source: 'so_approval',
    metadata: { manufacturing_location: location, medical_items: medical },
  }));
  const { error: routingErr } = await supabase
    .from('project_department_routing')
    .upsert(routingRows, { onConflict: 'project_id,department' });
  if (routingErr) {
    setRoutingWarning(`Project approved. Department routing could not be persisted: ...`);
    setSubmitting(false);
    return; // Modal stays open with warning; user clicks Close → onSuccess()
  }
}
onSuccess();
```

---

## 6. Persistence Approach: Checked-Only

**Selected approach:** Only checked (selected) departments are inserted. Unchecked departments are not inserted.

**Why checked-only (not checked + unchecked with `is_required = false`):**

| Criteria | Checked-only | Checked + unchecked |
|----------|-------------|-------------------|
| Query simplicity | `SELECT * WHERE project_id = $1` | `SELECT * WHERE project_id = $1 AND is_required = true` |
| Row count per project | 1–6 rows (only what's relevant) | Always 6 rows (clutters audit) |
| Downstream module check | Row existence = routed | Existence check ambiguous without `is_required` filter |
| Re-routing semantics | Upsert adds new depts; old remain (soft history) | All 6 rows always overwritten |

The checked-only approach makes the table a **positive list of active routing destinations**, which is the simplest and most useful semantics for downstream queries.

**Timeline metadata preserved:** The existing `recordProjectEvent()` call continues to write `{ routing: routes }` into `project_timeline_events.metadata`, which includes all 6 checkbox states (both checked and unchecked). This provides the full routing decision record for audit purposes, regardless of what gets persisted to the routing table.

---

## 7. Approval Blocking Behavior

**Approval is NOT blocked if routing persistence fails.**

**Rationale:**

1. The SO approval write (`projects` table update + `project_status = 'approved'`) happens first and is committed before routing persistence is attempted.
2. The Supabase JS client does not provide true multi-statement transactions within a single client call. Wrapping approval + routing in a transaction would require an RPC function (not appropriate for this step scope).
3. A failed routing persistence does not mean approval data is corrupt — the approval fields (`project_status`, `manufacturing_location`, `medical_items`, `approved_at`, `approved_by`) are all committed. The routing is supplementary.
4. The timeline event (which contains the routing metadata) is committed before routing persistence is attempted. The approval decision is always recoverable from the timeline.

**User-facing behavior on routing failure:**

- The modal remains open and displays an amber warning banner.
- The "Approve Project" button is replaced with a "Close" button.
- Clicking "Close" calls `onSuccess()` → modal closes, list reloads, success toast appears.
- Routing can be manually inserted by admin via Supabase dashboard or future admin UI.

---

## 8. Manual Test Scenarios

### Setup

For each test, approve a project using the `AdminApprovals` page. The SQL checks are run in the Supabase SQL editor.

---

**Test 1 — Saudi non-medical project: procurement, factory, store selected**

Approve a project with:
- Manufacturing location: Saudi Arabia
- Medical items: No
- Routing: procurement ✓, factory ✓, store ✓, material_qc ✗, project_qc ✓, dubai_afs ✗

Expected:
```sql
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Returns: procurement, factory, store, project_qc (4 rows)
-- material_qc and dubai_afs NOT present
```

---

**Test 2 — Saudi medical project: procurement, factory, store, material_qc, project_qc selected**

Approve with Medical items: Yes (auto-checks material_qc), location: Saudi.

Expected:
```sql
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Returns: procurement, factory, store, material_qc, project_qc (5 rows)
-- dubai_afs NOT present
```

---

**Test 3 — Dubai project: procurement, dubai_afs selected**

Approve with location: Dubai (auto-checks dubai_afs), Medical: No.
Uncheck factory, store, project_qc.

Expected:
```sql
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Returns: procurement, dubai_afs (2 rows)
-- factory, store, project_qc NOT present
```

---

**Test 4 — viewer can SELECT routing rows**

```sql
SET ROLE viewer; -- or use viewer session
SELECT * FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: all rows for the project returned
```

---

**Test 5 — procurement_user sees only procurement rows**

```sql
-- As procurement_user session:
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: only 'procurement' returned (other departments filtered by RLS)
```

---

**Test 6 — factory_user sees only factory rows**

```sql
-- As factory_user session:
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: only 'factory'
```

---

**Test 7 — store_user sees only store rows**

```sql
-- As store_user session:
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: only 'store'
```

---

**Test 8 — qc_user sees material_qc and project_qc rows**

```sql
-- As qc_user session:
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: 'material_qc', 'project_qc' (if both were checked)
```

---

**Test 9 — afs_user sees only dubai_afs rows**

```sql
-- As afs_user session:
SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
-- Expected: only 'dubai_afs' (if checked)
```

---

**Test 10 — department user cannot INSERT**

```sql
-- As factory_user session:
INSERT INTO project_department_routing (project_id, department)
VALUES ('<proj_id>', 'factory');
-- Expected: ERROR — new row violates row-level security policy
```

---

**Test 11 — admin/operations_manager can manage routing rows**

```sql
-- As admin session:
INSERT INTO project_department_routing (project_id, department, source)
VALUES ('<proj_id>', 'store', 'admin_override');
-- Expected: success

UPDATE project_department_routing SET is_required = false
WHERE project_id = '<proj_id>' AND department = 'store';
-- Expected: success

DELETE FROM project_department_routing
WHERE project_id = '<proj_id>' AND department = 'store';
-- Expected: success
```

---

**Test 12 — Existing timeline metadata still records routes**

```sql
SELECT metadata->'routing' AS routing_snapshot
FROM project_timeline_events
WHERE project_id = '<proj_id>' AND event_type = 'approved'
ORDER BY created_at DESC LIMIT 1;
-- Expected: JSON object with all 6 department keys and their boolean values
-- e.g., {"factory": true, "store": true, "procurement": true, "project_qc": true,
--         "dubai_afs": false, "material_qc": false}
```

---

## 9. Rollback Notes

To fully revert Step 9C:

**Database:**
```sql
DROP TABLE IF EXISTS public.project_department_routing;
DROP FUNCTION IF EXISTS public.set_updated_at_pdr();
```

**Application:**
- Revert `src/pages/AdminApprovals.tsx`: remove `routingWarning` state, routing persistence block, warning banner, and conditional footer buttons.
- Revert `src/types/database.ts`: remove `project_department_routing` entry from the Tables section.

The timeline events remain unchanged — routing data in `project_timeline_events.metadata.routing` is preserved regardless of whether the structured table exists.

---

## 10. Assumptions

| ID | Assumption |
|----|-----------|
| A-001 | `public.current_user_role()` (migration 003) returns the correct role for the authenticated session. All RLS policies in this table use this function — the same pattern as all other tables in the codebase. |
| A-002 | `profile?.id` in the application equals `auth.uid()` in the database. The `profiles` table uses the auth user ID as PK, so `routed_by` references the correct auth user. |
| A-003 | The Supabase JS client's `upsert` with `onConflict: 'project_id,department'` correctly targets the `pdr_project_department_unique` constraint. Supabase PostgREST resolves `onConflict` by column name matching the unique constraint columns. |
| A-004 | Routing persistence is attempted only when `isSupabaseConfigured && supabase` are truthy (enforced by the existing early-return guard in `handleApprove()`). In dev/mock mode, the routing upsert is never attempted. |
| A-005 | The `metadata` column stores `manufacturing_location` and `medical_items` at the time of routing. Future re-approvals or routing changes may result in different metadata values; the column captures a point-in-time snapshot, not a live reference. |

---

## 11. Limitations

| ID | Limitation |
|----|-----------|
| L-001 | `sales_user` and `sales_coordinator` have no direct SELECT access to `project_department_routing` in this step. They can read routing decisions from `project_timeline_events.metadata.routing`. A future Step 9D can add a `pdr_sales_select` policy if needed. |
| L-002 | Re-approvals (e.g., after send-back + resubmit) upsert the new routing, but previous routing rows for unchecked departments remain in the table. The table does not automatically delete unchecked departments on re-approval. This provides a conservative audit trail at the cost of potentially stale rows. Future Step 9D can address this with explicit cleanup or a `is_active` flag. |
| L-003 | The routing table does not enforce that `routed_by` is an admin or operations_manager. This is implicitly enforced because only admin/operations_manager can approve projects (enforced in `AdminApprovals.tsx` and `ProjectDetail.tsx`). No TIER-1 trigger prevents other roles from inserting routing rows via direct API (admin/ops can INSERT per RLS). |
| L-004 | Downstream modules (procurement, factory, store, QC, AFS) do not yet read from `project_department_routing` to gate visibility or access. The table is populated but not consumed. Step 9D will add the consumption layer. |

---

## 12. Safety Review

| Check | Result |
|-------|--------|
| Step 7 Sales & Quotation logic changed | No |
| Step 8 UX / PageHeader / PageLoader logic changed | No |
| Quotation files changed | No |
| Procurement / Store / Factory / Dubai / QC / After-Sales module logic changed | No |
| Downstream module visibility behavior changed | No — modules do not yet read from `project_department_routing` |
| Approval role logic changed | No — only admin/operations_manager can approve |
| Approval status values changed | No |
| Existing approval update (projects table) preserved | Yes — unchanged |
| Existing timeline event (project_timeline_events) preserved | Yes — unchanged |
| Existing audit log (audit_log) preserved | Yes — unchanged |
| New RLS scoped to `project_department_routing` only | Yes |
| Build result | PASS (`✓ built in 4.92s`) |
| Typecheck result | PASS (`npx tsc --noEmit` — 0 errors) |
| Lint result | 79 pre-existing problems, 0 new from Step 9C |

---

## 13. Recommended Step 9D Scope

Step 9D should address the consumption of routing data and the remaining gaps:

1. **Routing consumption:** Allow each operational module to query `project_department_routing` to determine which projects are routed to their department. This enables filtering (e.g., factory module shows only `manufacturing_location = 'saudi'` AND `department = 'factory'` rows).

2. **Re-approval cleanup (L-002):** On re-approval, DELETE existing routing rows for the project before upserting new ones. Or add `is_active boolean` column with toggle semantics.

3. **Sales user routing visibility (L-001):** Add `pdr_sales_select` policy so `sales_user` can see routing decisions for their own projects.

4. **ProjectDetail routing tab:** Add a routing summary panel in the "Approval & Routing" tab of `ProjectDetail.tsx` that reads from `project_department_routing` and displays the current routing decisions.

5. **G-9A-03 (UX debt):** Migrate `ProjectDetail.tsx` and `AdminApprovals.tsx` from legacy `PageHeader` (with `icon=`) to the Step 8C `PageHeader` (without `icon=`).

---

## 14. Sign-Off

Step 9C is complete. Gap G-9A-01 is closed. Department routing decisions are now persisted in a structured, queryable table with proper RLS scoped to each operational department. All existing approval behavior is preserved. Build, typecheck, and lint all pass.
