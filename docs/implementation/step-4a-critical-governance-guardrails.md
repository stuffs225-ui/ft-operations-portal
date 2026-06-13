# Step 4A — Critical Governance Guardrails

**Branch:** `fix/critical-governance-guardrails`  
**Date:** 2026-06-13  
**Status:** Complete  
**Governance References:** R-015 (B-001), R-011 (B-002)

---

## Summary

This document records the implementation of two Tier 0 database-level governance guardrails identified during the Step 3 Playbook-to-System Mapping audit. Both guardrails follow the dual-layer enforcement pattern established in `supabase/migrations/061_po_approval_guard.sql`.

Neither guardrail modifies any React source code, existing migration files, or unrelated database objects.

---

## Guardrails Implemented

| Migration | Rule | Table | Status |
|-----------|------|-------|--------|
| `076_release_note_gate.sql` | R-015 | `release_notes` | ✅ Created |
| `077_medical_serial_gate.sql` | R-011 | `store_receipt_items` | ✅ Created |

---

## Tables Inspected

The following migrations were read before writing any SQL:

| Migration | Table | Purpose |
|-----------|-------|---------|
| `040_release_notes.sql` | `release_notes` | Release Note schema, `release_status_enum`, existing RLS |
| `038_project_qc_findings.sql` | `project_qc_findings` | Finding schema, `finding_status_enum`, project/vehicle line FK |
| `037_project_qc_inspections.sql` | `project_qc_inspections` | Inspection schema, `project_qc_result_enum`, `readiness_status_enum` |
| `036_material_ncrs.sql` | `material_ncrs` | NCR schema, `ncr_status_enum` (referenced in limitations) |
| `035_material_qc_inspections.sql` | `material_qc_inspections` | Material QC schema, `medical_serial_number_id` FK |
| `031_medical_serial_numbers.sql` | `medical_serial_numbers` | Serial number schema, `serial_qc_status`, `serial_current_status` |
| `030_store_receipt_items.sql` | `store_receipt_items` | Item schema, `serial_required boolean`, `item_status` enum |
| `009_projects.sql` | `projects` | `medical_items_enum`, `manufacturing_location_enum` |
| `061_po_approval_guard.sql` | `purchase_orders_to_supplier` | Gold standard dual-layer pattern (reference) |
| `002_roles.sql` | `user_roles` | Role definitions, `current_user_role()` usage |

---

## Migration 076 — Release Note Gate (R-015)

### Objective

Block any `release_notes` row from advancing to `release_status = 'ready_to_issue'` or `'issued'` while any `project_qc_findings` row for the same project (or vehicle line) has `finding_status NOT IN ('closed', 'cancelled')`.

### Trigger Function

```
Function: public.enforce_release_note_gate()
Language: plpgsql, SECURITY DEFINER
Trigger:  BEFORE INSERT OR UPDATE ON public.release_notes FOR EACH ROW
```

### Logic

1. **Early return** if `NEW.release_status` is not `'ready_to_issue'` or `'issued'` — no check needed for draft, blocked, or cancelled.
2. **Early return** if `TG_OP = 'UPDATE'` and status is unchanged — allows column updates on already-issued notes without re-running the gate.
3. **Scope determination:**
   - If `release_type = 'vehicle_line_release'` AND `project_vehicle_line_id IS NOT NULL` → count open findings for that vehicle line only.
   - Otherwise → count open findings for the entire project (safest for `project_release` and `partial_release`).
4. **Enforcement:** if `open_finding_count > 0` → `RAISE EXCEPTION` with count and scope in the message.

### Dual-Layer Enforcement

| Layer | Mechanism | What It Blocks |
|-------|-----------|----------------|
| Layer 1 | Existing RLS (`rn_insert`, `rn_update`) | Limits writes to `admin`, `operations_manager`, `qc_user` |
| Layer 2 | New trigger `release_note_gate` | Blocks any of those roles from advancing status when open findings remain |

The existing RLS policies were NOT modified. The trigger is additive.

### Error Message

```
Release Note gate (R-015): Cannot set Release Note to '<status>' — 
<N> open QC finding(s) remain for <project/vehicle line>.
All QC findings must be closed or cancelled before a Release Note can be issued.
```

---

## Migration 077 — Medical Serial Gate (R-011)

### Objective

Block any `store_receipt_items` row with `serial_required = TRUE` from advancing to `status = 'accepted_by_qc'` or `'installed'` unless at least one `medical_serial_numbers` record exists for that item.

### Why Trigger on `store_receipt_items` (Not `material_qc_inspections`)

The Step 2 audit explicitly identified `store_receipt_items.status` as the canonical lifecycle status for items, and `serial_required` as the flag for medical/serialized items. The audit document (R-011) specified: *"DB trigger on `store_receipt_items` UPDATE: raise exception if `serial_required = true` and `status IN ('accepted_by_qc', 'installed')` and no serial records exist."*

Triggering on `store_receipt_items` covers both the QC acceptance phase (`accepted_by_qc`) and the installation phase (`installed`) in one place.

### Trigger Function

```
Function: public.enforce_medical_serial_gate()
Language: plpgsql, SECURITY DEFINER
Trigger:  BEFORE INSERT OR UPDATE ON public.store_receipt_items FOR EACH ROW
```

### Logic

1. **Early return** if `NEW.serial_required IS NOT TRUE` — non-medical items pass through unconditionally.
2. **Early return** if `NEW.status NOT IN ('accepted_by_qc', 'installed')` — other status transitions not constrained.
3. **Early return** if `TG_OP = 'UPDATE'` and status is unchanged — allows column updates on already-accepted items.
4. **Count** `medical_serial_numbers` records for `store_receipt_item_id = NEW.id`.
5. **Enforcement:** if `serial_count = 0` → `RAISE EXCEPTION` with item name in the message.

### Dual-Layer Enforcement

| Layer | Mechanism | What It Blocks |
|-------|-----------|----------------|
| Layer 1 | Existing RLS (`store_receipt_items_store_all`) | Limits writes to `store_user`, `admin`, `operations_manager` |
| Layer 2 | New trigger `medical_serial_gate` | Blocks serial-required items from advancing to accepted/installed without registration |

The existing RLS policies were NOT modified. The trigger is additive.

### Error Message

```
Medical Serial gate (R-011): Cannot set status to '<status>' for item '<item_name>' — 
this item requires serial number registration (serial_required = TRUE).
Register at least one serial number in medical_serial_numbers before accepting or installing this item.
```

---

## Manual Test Scenarios

No automated migration test infrastructure exists in this repository (B-005 — ESLint not configured; no test runner). The following SQL scenarios should be run against a development Supabase project after applying these migrations.

### Migration 076 Tests — Release Note Gate

**Test 1 — Gate blocks advancement with open findings (expected: FAIL)**
```sql
-- 1. Get a project with open findings
SELECT project_id, COUNT(*) as open_findings
FROM project_qc_findings
WHERE finding_status NOT IN ('closed', 'cancelled')
GROUP BY project_id
LIMIT 1;

-- 2. Try to advance a release note for that project
UPDATE release_notes
SET release_status = 'ready_to_issue'
WHERE project_id = '<project_id_from_step_1>';

-- Expected: ERROR — Release Note gate (R-015): Cannot set Release Note to 'ready_to_issue'...
```

**Test 2 — Gate allows advancement after all findings closed (expected: PASS)**
```sql
-- Close all findings for the project
UPDATE project_qc_findings
SET finding_status = 'closed'
WHERE project_id = '<project_id>' AND finding_status NOT IN ('closed', 'cancelled');

-- Retry the advance
UPDATE release_notes
SET release_status = 'ready_to_issue'
WHERE project_id = '<project_id>';

-- Expected: success
```

**Test 3 — Updating remarks on issued Release Note is not blocked (expected: PASS)**
```sql
UPDATE release_notes
SET remarks = 'updated remarks'
WHERE release_status = 'issued'
LIMIT 1;
-- Expected: success (status unchanged — gate skipped)
```

**Test 4 — Vehicle line release scoping (expected: FAIL only for that vehicle line)**
```sql
-- Advance a vehicle_line_release Release Note when only OTHER vehicle lines have open findings
UPDATE release_notes
SET release_status = 'ready_to_issue'
WHERE release_type = 'vehicle_line_release'
  AND project_vehicle_line_id = '<vehicle_line_with_no_open_findings>';
-- Expected: success if this vehicle line has no open findings
```

---

### Migration 077 Tests — Medical Serial Gate

**Test A — Gate blocks acceptance without serial (expected: FAIL)**
```sql
-- Get a serial_required item
SELECT id, item_name, serial_required, status
FROM store_receipt_items
WHERE serial_required = TRUE AND status = 'pending_qc'
LIMIT 1;

-- Try to accept it without a serial
UPDATE store_receipt_items
SET status = 'accepted_by_qc'
WHERE id = '<item_id_from_above>';

-- Expected: ERROR — Medical Serial gate (R-011): Cannot set status to 'accepted_by_qc'...
```

**Test B — Gate allows acceptance after serial registered (expected: PASS)**
```sql
-- Register a serial number
INSERT INTO medical_serial_numbers (store_receipt_item_id, serial_number, created_by)
VALUES ('<item_id>', 'SN-TEST-001', auth.uid());

-- Retry
UPDATE store_receipt_items SET status = 'accepted_by_qc' WHERE id = '<item_id>';
-- Expected: success
```

**Test C — Non-medical item not blocked (expected: PASS)**
```sql
UPDATE store_receipt_items
SET status = 'accepted_by_qc'
WHERE serial_required = FALSE AND status = 'pending_qc'
LIMIT 1;
-- Expected: success
```

**Test D — Already-accepted item allows column updates (expected: PASS)**
```sql
UPDATE store_receipt_items
SET remarks = 'QC note updated'
WHERE serial_required = TRUE AND status = 'accepted_by_qc'
LIMIT 1;
-- Expected: success (status not changing)
```

---

## Known Assumptions

1. **`serial_required = TRUE` is the medical flag.** The `store_receipt_items.serial_required` boolean is used to identify items that require serial number registration. This is confirmed by `031_medical_serial_numbers.sql`, which references `store_receipt_item_id`, and by the Step 2 audit (R-011). No separate `is_medical` column exists on `store_receipt_items`.

2. **`project_qc_findings` is the authoritative open findings table for the Release Note gate.** The `material_ncrs` table also has `project_id` and an open/closed status cycle, but it relates to material QC inspections, not directly to the release note's project/vehicle line scope. The audit document (R-015) references `project_qc_findings` specifically.

3. **`finding_status NOT IN ('closed', 'cancelled')` is the correct "open" definition.** The `finding_status_enum` values `'open'`, `'assigned'`, `'rework_in_progress'`, and `'pending_reinspection'` are all considered blocking. Only `'closed'` and `'cancelled'` are non-blocking.

4. **`vehicle_line_release` scope uses `project_vehicle_line_id`.** When `release_type = 'vehicle_line_release'` and `project_vehicle_line_id IS NOT NULL`, the gate checks only findings scoped to that vehicle line. For `partial_release`, the gate checks the full project (conservative).

5. **SECURITY DEFINER on both functions.** Both trigger functions use `SECURITY DEFINER` to ensure they run with the function owner's privileges, consistent with the pattern in migration 061.

---

## Known Limitations

### Migration 076 — Release Note Gate

1. **Material NCRs are not checked.** The `material_ncrs` table has its own open/closed lifecycle (`ncr_status_enum`: 'open', 'assigned', 'corrective_action_in_progress', 'pending_evidence', 'closed', 'rejected_closure', 'cancelled'). This migration does NOT check for open NCRs before allowing Release Note issuance. The playbook says "QC findings or rework" — material NCRs are a separate entity type. If NCR blocking is required, a separate migration should extend this gate to also query `material_ncrs WHERE project_id = NEW.project_id AND ncr_status NOT IN ('closed', 'cancelled', 'rejected_closure')`.

2. **`partial_release` uses full-project scope.** The `partial_release` release type is not defined in terms of which sub-set of the project it covers. The trigger conservatively checks all findings for the project. If partial releases should only check a specific vehicle line or batch, the schema and trigger both need extending.

3. **Local Supabase migration was not run.** The Supabase CLI is not available in this remote execution environment. Migration SQL has been reviewed for syntax correctness against the existing schema but has not been applied to a running PostgreSQL instance.

### Migration 077 — Medical Serial Gate

4. **Only `store_receipt_items.status` is guarded.** The `medical_serial_numbers.qc_status` field (values: 'not_checked', 'pending_qc', 'passed', 'failed') has its own status lifecycle but is not guarded by this migration. If the playbook also requires `medical_serial_numbers.qc_status` to be `'passed'` before item acceptance, a separate trigger is needed.

5. **Quantity vs. serial count is not enforced.** If `store_receipt_items.quantity_received = 5` and `serial_required = TRUE`, this gate only checks that at least one serial number exists — it does not check that 5 serial numbers exist. Full quantity-to-serial matching would require a COUNT comparison and is a future enhancement.

---

## Rollback Considerations

Both migrations are additive — they only add new trigger functions and triggers. No schema structures were modified (no ALTER TABLE, no DROP TABLE, no migration file changes).

To roll back either migration:

```sql
-- Roll back migration 076 (Release Note Gate)
DROP TRIGGER IF EXISTS release_note_gate ON public.release_notes;
DROP FUNCTION IF EXISTS public.enforce_release_note_gate();

-- Roll back migration 077 (Medical Serial Gate)
DROP TRIGGER IF EXISTS medical_serial_gate ON public.store_receipt_items;
DROP FUNCTION IF EXISTS public.enforce_medical_serial_gate();
```

Rollback does not affect any existing data — it only removes enforcement. Previously created records remain valid.

---

## Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compile | `npx tsc -b` (via `npm run build`) | ✅ Zero errors |
| Vite production build | `npm run build` | ✅ 1,783 modules, clean |
| ESLint | `npm run lint` | ⚠️ ESLint config not found (pre-existing B-005 gap — not caused by this PR) |
| Supabase local CLI | Not available | ⚠️ Not run — remote execution environment |

**No TypeScript or production build errors were introduced by this PR.**

---

## Unrelated Production Code Changes

**None.** This PR modifies only:
- `supabase/migrations/076_release_note_gate.sql` (new file)
- `supabase/migrations/077_medical_serial_gate.sql` (new file)
- `docs/implementation/step-4a-critical-governance-guardrails.md` (this file)

No files in `src/`, `supabase/functions/`, `public/`, or any existing migration were modified.

---

## Reference Library Consultation

The following reference library files were consulted before implementation:

| File | Consulted For |
|------|--------------|
| `docs/reference-library/05-license-risk-notes.md` | Confirmed all implementation is original SQL — no third-party code copied |
| `docs/reference-library/research-rules.md` | Confirmed pattern transfer rules — Rule 4 (no GPL/AGPL/BSL code) |
| `docs/governance/critical-governance-rules-register.md` | R-011 and R-015 required fix specifications and sign-off tests |
| `docs/governance/step-4-architecture-cleanup-brief.md` | Acceptance criteria, file naming, dual-layer pattern guidance |
| `docs/system-audit/07-governance-rules-gap-analysis.md` | Exact trigger target tables and field names for R-011 and R-015 |

**No external source code was copied.** All SQL in the two migrations is original, written following the conventions of the existing codebase (specifically migration 061).

---

## External Source Code Confirmation

> **Confirmed: No external source code was copied into this PR.**
>
> Both trigger functions (`enforce_release_note_gate`, `enforce_medical_serial_gate`) are original SQL written to match this repository's conventions. The ERPNext serial number tracking and QC concepts were referenced as business-logic inspiration only (consistent with the GPL v3 reference-only policy in `docs/reference-library/05-license-risk-notes.md`). No ERPNext code was used.

---

## Recommended Next Step: Step 4B — Architecture Cleanup

With the two Tier 0 critical guardrails in place, Step 4B can proceed. See `docs/governance/step-4-architecture-cleanup-brief.md` for the full brief.

Step 4B scope (remaining foundation migrations):
1. `078_so_approval_checks.sql` — SO route + medical CHECK constraints (B-010, B-011)
2. `079_customer_master_data.sql` — Customer table + FK + backfill (B-026)
3. `080_unified_audit_trigger.sql` — Generic audit trigger on main entity tables (B-036)

**Step 4B is safe to start** on a new branch (`fix/so-approval-checks` or `phase/1-architecture-cleanup`) as soon as this PR is merged to main.
