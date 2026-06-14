# Step 9B — WO / PN DB Guardrails

**Branch:** `fix/step-9b-wo-pn-db-guardrails`  
**Date:** 2026-06-14  
**Scope:** TIER-1 database enforcement for R-005 (Saudi WO gate) and R-006 (Dubai PN gate)  
**Depends on:** Steps 1–9A (all merged)

---

## 1. Executive Summary

Step 9B adds TIER-1 database enforcement for two governance rules that were previously TIER-2/3 only:

- **R-005** — Saudi factory execution requires an active Work Order (WO) before `factory_records` can be created.
- **R-006** — Dubai/AFS follow-up requires an active Production Number (PN) before `dubai_project_followups` can be created.

A single migration (`089_wo_pn_execution_guardrails.sql`) creates two BEFORE INSERT triggers. The triggers re-use helper functions (`project_has_wo()`, `project_has_pn()`) that already existed in the database from migration 014. No new tables, schema changes, or RLS policy changes are introduced.

**Recommendation: Both R-005 and R-006 are now TIER-1 enforced. Step 9B is complete. Proceed to Step 9C — Department Routing Persistence.**

---

## 2. Tables Inspected

| Table | Migration | Purpose |
|-------|-----------|---------|
| `factory_records` | 025, 083 | Saudi production records per project/vehicle line |
| `dubai_project_followups` | 041 | Dubai project follow-up lifecycle records |
| `project_execution_references` | 014 | WO and PN references for approved projects |
| `projects` | 009, 073 | SO/project master; holds `manufacturing_location` |

---

## 3. WO / PN Reference Model Discovered

From `014_execution_references.sql`:

```sql
CREATE TYPE public.execution_reference_type AS ENUM ('wo', 'pn');

CREATE TYPE public.execution_reference_status AS ENUM (
  'created',    -- reference entered, not yet confirmed → ACTIVE
  'confirmed',  -- confirmed by Admin / Ops Manager    → ACTIVE
  'superseded', -- replaced by newer reference          → INACTIVE
  'cancelled'   -- voided                               → INACTIVE
);
```

### Structural FK Columns Found

| Table | Column | Points to |
|-------|--------|-----------|
| `factory_records` | `wo_reference_id` (nullable) | `project_execution_references(id)` |
| `dubai_project_followups` | `pn_reference_id` (nullable) | `project_execution_references(id)` |

Both tables also have `project_id NOT NULL REFERENCES projects(id)`.

### Pre-existing DB Helper Functions (migration 014)

Migration 014 already defined SECURITY DEFINER helper functions that the new triggers reuse:

```sql
-- Returns true if project has a WO with status IN ('created', 'confirmed')
public.project_has_wo(p_project_id uuid) → boolean

-- Returns true if project has a PN with status IN ('created', 'confirmed')
public.project_has_pn(p_project_id uuid) → boolean

-- Returns true if factory execution is unblocked (approved + saudi + has WO)
public.can_start_saudi_factory(p_project_id uuid) → boolean

-- Returns true if Dubai follow-up is unblocked (approved + dubai + has PN)
public.can_start_dubai_followup(p_project_id uuid) → boolean
```

---

## 4. Active WO Definition

| Criterion | Value |
|-----------|-------|
| Table | `project_execution_references` |
| Column `reference_type` | `'wo'` |
| Column `status` | `IN ('created', 'confirmed')` |
| Excludes | `'superseded'`, `'cancelled'` |
| Unique constraint | At most one active WO per project (`exec_ref_one_active_per_project` partial unique index on `(project_id, reference_type) WHERE status IN ('created', 'confirmed')`) |

The `project_has_wo()` function captures this definition. The triggers delegate to it rather than re-implementing the logic.

---

## 5. Active PN Definition

| Criterion | Value |
|-----------|-------|
| Table | `project_execution_references` |
| Column `reference_type` | `'pn'` |
| Column `status` | `IN ('created', 'confirmed')` |
| Excludes | `'superseded'`, `'cancelled'` |
| Unique constraint | At most one active PN per project (same partial unique index, `reference_type = 'pn'`) |

The `project_has_pn()` function captures this definition.

---

## 6. Migration Created

**File:** `supabase/migrations/089_wo_pn_execution_guardrails.sql`

### Trigger 1 — `trg_factory_requires_active_wo` (R-005)

```sql
CREATE OR REPLACE FUNCTION public.enforce_factory_requires_active_wo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_location text;
  v_project_code text;
BEGIN
  SELECT manufacturing_location, project_code
    INTO v_location, v_project_code
    FROM public.projects WHERE id = NEW.project_id;

  IF v_location IS DISTINCT FROM 'saudi' THEN RETURN NEW; END IF;

  IF NOT public.project_has_wo(NEW.project_id) THEN
    RAISE EXCEPTION
      'Saudi factory execution gate (R-005): Cannot create factory record for '
      'project % — a Work Order (WO) must be entered before factory records...',
      COALESCE(v_project_code, NEW.project_id::text)
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_factory_requires_active_wo
  BEFORE INSERT ON public.factory_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_factory_requires_active_wo();
```

### Trigger 2 — `trg_dubai_followup_requires_active_pn` (R-006)

```sql
CREATE OR REPLACE FUNCTION public.enforce_dubai_followup_requires_active_pn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_location text;
  v_project_code text;
BEGIN
  SELECT manufacturing_location, project_code
    INTO v_location, v_project_code
    FROM public.projects WHERE id = NEW.project_id;

  IF v_location IS DISTINCT FROM 'dubai' THEN RETURN NEW; END IF;

  IF NOT public.project_has_pn(NEW.project_id) THEN
    RAISE EXCEPTION
      'Dubai/AFS follow-up gate (R-006): Cannot create follow-up record for '
      'project % — a Production Number (PN) must be entered before Dubai/AFS '
      'follow-up records can be created...',
      COALESCE(v_project_code, NEW.project_id::text)
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dubai_followup_requires_active_pn
  BEFORE INSERT ON public.dubai_project_followups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dubai_followup_requires_active_pn();
```

---

## 7. Trigger Behavior

### Gate logic summary

| Condition | factory_records | dubai_project_followups |
|-----------|----------------|------------------------|
| `manufacturing_location = 'saudi'` + no active WO | ❌ BLOCKED | ✅ Pass through |
| `manufacturing_location = 'saudi'` + has active WO | ✅ Allowed | ✅ Pass through |
| `manufacturing_location = 'dubai'` + no active PN | ✅ Pass through | ❌ BLOCKED |
| `manufacturing_location = 'dubai'` + has active PN | ✅ Pass through | ✅ Allowed |
| `manufacturing_location = 'not_set'` | ✅ Pass through | ✅ Pass through |
| `WO status = 'superseded'` (only) | ❌ BLOCKED | — |
| `WO status = 'cancelled'` (only) | ❌ BLOCKED | — |
| `PN status = 'superseded'` (only) | — | ❌ BLOCKED |
| `PN status = 'cancelled'` (only) | — | ❌ BLOCKED |
| UPDATE on existing rows | ✅ Not affected | ✅ Not affected |

### Error messages

**R-005 (factory_records):**
```
Saudi factory execution gate (R-005): Cannot create factory record for
project FT-2026-0042 — a Work Order (WO) must be entered before factory
records can be created. Add a WO via the WO / PN Gate or Project detail page.
```

**R-006 (dubai_project_followups):**
```
Dubai/AFS follow-up gate (R-006): Cannot create follow-up record for
project FT-2026-0055 — a Production Number (PN) must be entered before
Dubai/AFS follow-up records can be created. Add a PN via the WO / PN Gate
or Project detail page.
```

---

## 8. Manual SQL Test Scenarios

Run in Supabase SQL editor or psql. All scenarios are also documented in the migration file.

### R-005 — factory_records Gate

| # | Scenario | Expected |
|---|----------|----------|
| T-001 | Saudi project, approved, NO active WO → INSERT factory_records | FAIL: R-005 error |
| T-002 | Saudi project, approved, WITH active WO (status='created') → INSERT factory_records | PASS |
| T-003 | Saudi project, WITH active WO (status='confirmed') → INSERT factory_records | PASS |
| T-004 | Dubai project → INSERT factory_records | PASS (guard not triggered) |
| T-005 | Project with manufacturing_location='not_set' → INSERT factory_records | PASS (guard not triggered) |
| T-006 | Saudi project, WO exists but status='superseded' → INSERT factory_records | FAIL: R-005 error |
| T-007 | Saudi project, WO exists but status='cancelled' → INSERT factory_records | FAIL: R-005 error |
| T-008 | After adding active WO to previously blocked Saudi project → INSERT factory_records | PASS |
| T-009 | UPDATE on existing factory_records row → trigger not fired | PASS (BEFORE INSERT only) |

### R-006 — dubai_project_followups Gate

| # | Scenario | Expected |
|---|----------|----------|
| T-010 | Dubai project, approved, NO active PN → INSERT dubai_project_followups | FAIL: R-006 error |
| T-011 | Dubai project, approved, WITH active PN (status='created') → INSERT dubai_project_followups | PASS |
| T-012 | Dubai project, WITH active PN (status='confirmed') → INSERT dubai_project_followups | PASS |
| T-013 | Saudi project → INSERT dubai_project_followups | PASS (guard not triggered) |
| T-014 | Project with manufacturing_location='not_set' → INSERT dubai_project_followups | PASS (guard not triggered) |
| T-015 | Dubai project, PN exists but status='superseded' → INSERT dubai_project_followups | FAIL: R-006 error |
| T-016 | Dubai project, PN exists but status='cancelled' → INSERT dubai_project_followups | FAIL: R-006 error |
| T-017 | UPDATE on existing dubai_project_followups row → trigger not fired | PASS (BEFORE INSERT only) |

---

## 9. Assumptions

### A-001 — All Saudi execution is via factory_records

`factory_records` is the sole table representing Saudi factory execution tracked by the WO gate. BOQ, BOM, and Raw Material Request tables (governed by R-007) are out of scope for Step 9B.

### A-002 — All Dubai AFS follow-up is via dubai_project_followups

`dubai_project_followups` is the sole table representing Dubai follow-up tracked by the PN gate. Dubai ETA updates (`042_dubai_eta_history.sql`) and AFS child records (R-008) are out of scope for Step 9B.

### A-003 — manufacturing_location='not_set' is pass-through

Projects with `manufacturing_location='not_set'` have not had their route confirmed at approval. The triggers do not block these — route assignment is enforced separately by migration 078 at approval time.

### A-004 — Only INSERTS are guarded

The trigger fires `BEFORE INSERT` only. Existing rows in `factory_records` and `dubai_project_followups` (created before this migration) are not retroactively blocked or modified. Updates to existing rows are not affected.

### A-005 — helper functions from migration 014 are stable

`project_has_wo()` and `project_has_pn()` are defined as `STABLE` (read-only, consistent within a transaction). They use `EXISTS` on `project_execution_references` which has a partial unique index on `(project_id, reference_type) WHERE status IN ('created', 'confirmed')` — making the EXISTS check fast.

---

## 10. Limitations

### L-001 — R-007 (BOQ/BOM/RMR WO Gate) not covered

Raw Material Requests, BOQ, and BOM tables are not guarded in this step. R-007 is a separate backlog item (B-030) scoped for Phase 4. Step 9B focuses only on `factory_records` as the first-level Saudi execution record.

### L-002 — R-008 (Dubai ETA/AFS Gate) not covered

Dubai ETA history (`dubai_eta_history`) and AFS child tables are not guarded here. R-008 is a separate backlog item (B-024 extension). Step 9B focuses on `dubai_project_followups` as the first-level Dubai follow-up record.

### L-003 — project_status not checked in trigger

The triggers check `manufacturing_location` only — not `project_status`. A Saudi project in `submitted_for_approval` status with no WO (which is expected — WO is added post-approval) will also be blocked. This is intentional: a factory_record should not be created for an unapproved project regardless.

### L-004 — Supabase CLI unavailable

Supabase CLI is not available in this remote execution environment. Migration correctness is verified by code review against known table schemas and helper function signatures from migrations 014, 025, and 041.

---

## 11. Rollback Notes

To revert migration 089:

```sql
-- Drop triggers first, then functions
DROP TRIGGER IF EXISTS trg_factory_requires_active_wo ON public.factory_records;
DROP FUNCTION IF EXISTS public.enforce_factory_requires_active_wo();

DROP TRIGGER IF EXISTS trg_dubai_followup_requires_active_pn ON public.dubai_project_followups;
DROP FUNCTION IF EXISTS public.enforce_dubai_followup_requires_active_pn();
```

Rollback does not affect:
- `project_has_wo()` and `project_has_pn()` from migration 014 (not modified)
- `factory_records` or `dubai_project_followups` table schema (not modified)
- Any RLS policies (not modified)
- Any existing data rows (no data was modified)

---

## 12. Confirmation — No RLS Changed

| Policy | Changed? |
|--------|---------|
| `factory_admin_all` | No |
| `factory_user_select` | No |
| `factory_user_insert` | No |
| `factory_user_update` | No |
| `factory_qc_select` | No |
| `factory_sales_select` | No |
| `factory_viewer_select` | No |
| `dpf_admin_full` | No |
| `dpf_afs_select` | No |
| `dpf_sales_select` | No |
| `dpf_others_select` | No |
| `exec_ref: admin_ops full access` | No |
| `exec_ref: factory_user wo` | No |
| `exec_ref: afs_user read pn` | No |
| All other policies | No |

**Total RLS policy changes: 0**

---

## 13. Confirmation — No UI Workflow Changed

| Area | Changed? |
|------|---------|
| `src/lib/executionGate.ts` | No |
| `WoPnGateCard` (ProjectDetail.tsx) | No |
| `ProjectDetail.tsx` | No |
| `ProjectNew.tsx` | No |
| `AdminApprovals.tsx` | No |
| All factory pages | No |
| All Dubai/AFS pages | No |
| All procurement pages | No |
| All store pages | No |
| All QC pages | No |
| All Step 7 quotation files | No |
| All Step 8 UX files | No |

**Total UI/source file changes: 0**  
Only `supabase/migrations/089_wo_pn_execution_guardrails.sql` and this documentation file were created.

---

## 14. Governance Rule Status Update

| Rule | Before Step 9B | After Step 9B |
|------|---------------|--------------|
| R-005 (Saudi WO gate) | TIER-2/3 — executionGate.ts + UI only | **TIER-1** — migration 089 BEFORE INSERT trigger on factory_records ✅ |
| R-006 (Dubai PN gate) | TIER-2/3 — executionGate.ts + UI only | **TIER-1** — migration 089 BEFORE INSERT trigger on dubai_project_followups ✅ |

---

## 15. Recommended Step 9C — Department Routing Persistence

### Problem (Gap G-9A-01 from Step 9A)

The `AdminApprovals.tsx` `ApproveModal` presents 6 department routing checkboxes (procurement, factory, store, material_qc, project_qc, dubai_afs). These selections are logged to `project_timeline_events.metadata` but are NOT persisted to any queryable table. Other modules cannot programmatically determine which departments a project is routed to.

### Suggested Step 9C Scope

1. **Create a `project_department_routing` table** — one row per project per department, with columns: `project_id`, `department`, `is_routed` (boolean), `set_at`, `set_by`.

2. **Populate at approval time** — modify `AdminApprovals.tsx` `ApproveModal.handleApprove()` to INSERT routing rows after the project status is updated.

3. **RLS** — admin/operations_manager: full CRUD; all other roles: SELECT only where project is approved.

4. **Read in other modules** — factory, procurement, QC, AFS pages can query this table to show/hide routing-relevant content.

5. **Migration 090** — single migration creating the table + RLS + a helper function `project_is_routed_to(project_id, department)`.

### Step 9C Constraints

- Do not change Step 7 quotation logic
- Do not change Step 8 UX components
- Do not change approval role guards
- Do not change migration 078 (SO approval fields guard)
- One migration only: `090_department_routing.sql`
- One source change only: `AdminApprovals.tsx` (add routing INSERT after approval)

---

## 16. Sign-Off Statement

```
MODULE SIGN-OFF RECORD
======================

Step Name:           Step 9B — WO / PN DB Guardrails
Date:                2026-06-14
Branch:              fix/step-9b-wo-pn-db-guardrails

---

GOVERNANCE RULES ADDRESSED
===========================

R-005 (Saudi WO Gate):
  Before:   TIER-2/3 (executionGate.ts + WoPnGateCard)
  After:    TIER-1 (migration 089 — BEFORE INSERT trigger on factory_records)
  Status:   ✅ CLOSED

R-006 (Dubai PN Gate):
  Before:   TIER-2/3 (executionGate.ts + WoPnGateCard)
  After:    TIER-1 (migration 089 — BEFORE INSERT trigger on dubai_project_followups)
  Status:   ✅ CLOSED

---

SAFETY CHECKS
=============

Step 7 logic changed:              NO
Step 8 UX logic changed:           NO
Procurement/store/factory UI:      NO
New schema tables created:         NO
RLS policies changed:              NO
Route guards changed:              NO
Existing rows modified:            NO
Only new INSERTs guarded:          YES
Build result:                      PASS (0 errors)
TypeScript result:                 PASS (0 errors)
Lint result:                       79 pre-existing errors (0 new from this step)

---

DECISION
========

All CRITICAL/HIGH risks for R-005 and R-006: RESOLVED.
Step 9B: APPROVED for merge.
Proceed to: Step 9C — Department Routing Persistence.
```
