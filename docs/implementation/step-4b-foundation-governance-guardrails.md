# Step 4B — Foundation Governance Guardrails

**Branch:** `fix/foundation-governance-guardrails`  
**Date:** 2026-06-13  
**Status:** Complete  
**Prerequisite:** Step 4A merged (`076_release_note_gate.sql`, `077_medical_serial_gate.sql`)  
**Governance References:** R-003 (B-010), R-004 (B-011), B-026, R-016 (B-036), R-017 (B-036)

---

## Summary

This document records the implementation of three Step 4B database-level foundation migrations. These migrations complete the Tier 0 / Foundation governance layer before broader architecture cleanup (Step 4C) and module-by-module implementation (Phases 1–10) begin.

All migrations are additive and non-destructive. No existing migration files, source code (`src/`), or other production files were modified.

---

## Migrations Created

| Migration | Rule | Table(s) | Type | Status |
|-----------|------|----------|------|--------|
| `078_so_approval_checks.sql` | R-003, R-004 | `projects` | BEFORE INSERT OR UPDATE trigger | ✅ Created |
| `079_customer_master_data.sql` | B-026 | `customers` (new), `projects` | CREATE TABLE + FK + backfill | ✅ Created |
| `080_unified_audit_trigger.sql` | R-016, R-017 | `projects`, `release_notes` | AFTER INSERT OR UPDATE trigger | ✅ Created |

---

## Tables Inspected

| Migration | Tables Read | Purpose |
|-----------|-------------|---------|
| `009_projects.sql` | `projects` | Confirmed `manufacturing_location_enum`, `medical_items_enum`, `project_status` enum values |
| `067_convert_quotation_to_so.sql` | Function | Confirmed `customer_name` is copied from `quotation_requests` to `projects` |
| `073_sales_order_creation_final_fix.sql` | Function | Confirmed `projects.project_code` auto-generation and RLS pattern |
| `015_quotations.sql` | `quotation_requests` | Confirmed `customer_name text NOT NULL` (free text) — FK not added in this migration |
| `068_hot_projects.sql` | `hot_projects` | Confirmed `customer_name text NOT NULL` — FK not added in this migration |
| `006_master_data.sql` | Master data tables | Confirmed `handle_updated_at()` pattern for new tables |
| `004_audit_log.sql` | `audit_log` | Confirmed `before_data jsonb`, `after_data jsonb`, append-only RLS |
| `005_timeline_events.sql` | `timeline_events` | Confirmed separate purpose (UI feed) vs. audit_log (immutable record) |
| `001_profiles.sql` | `profiles` | Confirmed `handle_updated_at()` function origin |
| `061_po_approval_guard.sql` | `purchase_orders_to_supplier` | Gold standard dual-layer pattern (reference) |

---

## Migration 078 — SO Approval Fields Guard (R-003, R-004)

### Objective

Block `projects.project_status` from advancing to `'approved'` unless:
- `manufacturing_location != 'not_set'` (route must be `'saudi'` or `'dubai'`)
- `medical_items != 'not_set'` (flag must be `'yes'` or `'no'`)

### Why a trigger instead of CHECK constraints

The Step 4 brief originally specified CHECK constraints. After schema inspection, a trigger was used instead for two reasons:

1. **Existing data safety:** CHECK constraints fail at `ALTER TABLE` time if any existing row violates the constraint. If any approved project has a `'not_set'` value (possible in legacy data), adding the constraint would abort the migration. A trigger avoids this by only checking at the point of new status transitions.

2. **Consistency with the project pattern:** Migrations 076 and 077 use BEFORE triggers for the same kind of business-state enforcement. Using the same pattern keeps all governance guardrails consistent.

The end result is functionally equivalent to a CHECK constraint for all new writes — direct API calls are blocked — while being safer against historical data.

### Trigger Function

```
Function:  public.enforce_so_approval_fields()
Language:  plpgsql, SECURITY DEFINER
Trigger:   BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW
```

### Logic

1. **Guard 1:** `IF NEW.project_status != 'approved' THEN RETURN NEW` — all other status values pass through.
2. **Guard 2:** `IF TG_OP = 'UPDATE' AND OLD.project_status = NEW.project_status THEN RETURN NEW` — column updates on already-approved projects are not re-validated.
3. **R-003 check:** `IF NEW.manufacturing_location = 'not_set' THEN RAISE EXCEPTION`
4. **R-004 check:** `IF NEW.medical_items = 'not_set' THEN RAISE EXCEPTION`

### Dual-Layer Enforcement

| Layer | Mechanism | What It Covers |
|-------|-----------|----------------|
| Layer 1 (RLS) | Existing `"projects: admin_ops full access"` policy | Only admin / operations_manager can change project_status |
| Layer 2 (Trigger) | New `so_approval_fields` trigger | Blocks approval when required fields are unset, regardless of role |

### Error Messages

```
-- R-003:
SO Approval gate (R-003): Cannot approve project '<code>' —
manufacturing location (Saudi / Dubai) must be selected before approval.

-- R-004:
SO Approval gate (R-004): Cannot approve project '<code>' —
medical items flag (Yes / No) must be selected before approval.
```

---

## Migration 079 — Customer Master Data Foundation (B-026)

### Objective

Create a `customers` master table and add a nullable `customer_id` FK to `projects`, replacing the eventual dependency on the free-text `projects.customer_name` field.

### Schema Created

```sql
CREATE TABLE public.customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,    -- UNIQUE constraint
  country       text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  is_active     boolean NOT NULL DEFAULT true,
  notes         text,
  created_by    uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_name_unique UNIQUE (name)
);
```

### Non-Destructive Design

| Decision | Reason |
|----------|--------|
| `projects.customer_name` NOT dropped | All existing queries and application code use this column; it must remain until Phase 1 UI provides a customer selector |
| `projects.customer_id` is NULLABLE | Rows that don't match the backfill stay valid (NULL FK); no data loss |
| `quotation_requests.customer_name` NOT touched | Low risk deferred — FK linkage is a Phase 1 UI task |
| `hot_projects.customer_name` NOT touched | Same deferral |
| Case-sensitive TRIM() matching for backfill | Safe default — case-variant names create separate records rather than silently merging unrelated customers |

### Backfill Strategy

```sql
-- Step 1: Seed customers from DISTINCT project customer names
INSERT INTO customers (name, created_at)
SELECT DISTINCT TRIM(customer_name), now()
FROM projects WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
ON CONFLICT (name) DO NOTHING;

-- Step 2: Add nullable FK column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);

-- Step 3: Link projects to customers by exact TRIM match
UPDATE projects p
SET customer_id = c.id
FROM customers c
WHERE TRIM(p.customer_name) = c.name AND p.customer_id IS NULL;
```

### RLS Policies Added

| Policy | Roles | Access |
|--------|-------|--------|
| `customers_select` | All authenticated | SELECT |
| `customers_insert` | admin, operations_manager, sales_user, sales_coordinator | INSERT |
| `customers_update` | admin, operations_manager | UPDATE |

### Known Limitations — Customer Migration

1. **Case-variant duplicates:** `"ABC Corp"` and `"abc corp"` become two separate customers. A manual cleanup query can merge them post-deployment.
2. **Quotation and hot_projects linkage deferred:** `quotation_requests.customer_name` and `hot_projects.customer_name` still use free text. This is intentional — linking them requires Phase 1 UI work.
3. **Unlinked projects:** Any project whose customer name had leading/trailing spaces that TRIM() doesn't fully handle will have `customer_id = NULL`. These are safe (nullable FK) but visible with the verification query.
4. **No NOT NULL on `customer_id`:** The FK is nullable. Making it NOT NULL would break all existing projects that don't match. This is enforced at the UI layer in Phase 1 and upgraded to NOT NULL in a later migration after full backfill is confirmed.

---

## Migration 080 — Unified Audit Trigger Foundation (R-016, R-017)

### Objective

Add a reusable DB-level audit function (`append_audit_log`) that captures full before/after row state into the existing `audit_log` table for any write that bypasses the application-layer audit utilities.

### Why This Approach (Not a New Audit Table)

The `audit_log` table (migration 004) already has:
- `before_data jsonb` and `after_data jsonb` columns for field-level diffs
- Append-only RLS (no UPDATE or DELETE policies)
- Indexes on `actor_id`, `entity_type/entity_id`, `created_at`

Creating a new audit table would duplicate this infrastructure. The new trigger function writes to the existing table, complementing (not replacing) the existing `projectAudit.ts` and other application-layer audit utilities.

### Tables Covered in This Migration

| Table | Trigger Name | Events Logged |
|-------|-------------|---------------|
| `projects` | `audit_projects` | INSERT, UPDATE |
| `release_notes` | `audit_release_notes` | INSERT, UPDATE |

### Tables Intentionally NOT Covered in This Migration

| Table | Reason for Deferral |
|-------|---------------------|
| `purchase_orders_to_supplier` | Contains financial values (`purchase_value`, `total_amount`). Audit coverage deferred to a dedicated migration that can selectively redact sensitive columns before logging. |
| `quotation_requests` | High write volume; deferred to Phase 2 once live data wiring is complete. |
| `store_receipt_items` | Covered by migration 077 trigger; full audit coverage in Phase 7. |

### Trigger Function Design

```
Function:  public.append_audit_log()
Language:  plpgsql, SECURITY DEFINER
Triggers:  AFTER INSERT OR UPDATE ON projects, release_notes FOR EACH ROW
```

Key behaviors:
- `SECURITY DEFINER` — guarantees write to `audit_log` regardless of session RLS
- `TG_TABLE_NAME` — makes the function table-agnostic; one function applies to any table
- `row_to_json(OLD)::jsonb` / `row_to_json(NEW)::jsonb` — full row capture for field-level diff
- Does NOT log `actor_email` from the trigger (avoids a `profiles` JOIN per write; existing application utilities already capture this)
- Financial data in `before_data`/`after_data` is protected by the `audit_log` SELECT RLS policy: only `admin` can read

### Extending to Additional Tables

No changes to migration 080 are needed to add more tables:

```sql
-- To add audit coverage to any new table:
CREATE TRIGGER audit_<table_name>
  AFTER INSERT OR UPDATE ON public.<table_name>
  FOR EACH ROW EXECUTE FUNCTION public.append_audit_log();
```

---

## Manual SQL Test Scenarios

### Migration 078 Tests — SO Approval Guard

**Test 1 — Blocks approval without route (expected: FAIL)**
```sql
UPDATE projects
SET project_status = 'approved'
WHERE manufacturing_location = 'not_set' AND id = '<project_id>';
-- Expected: ERROR — SO Approval gate (R-003): Cannot approve project...
```

**Test 2 — Blocks approval without medical flag (expected: FAIL)**
```sql
UPDATE projects
SET project_status = 'approved', manufacturing_location = 'saudi'
WHERE medical_items = 'not_set' AND id = '<project_id>';
-- Expected: ERROR — SO Approval gate (R-004): Cannot approve project...
```

**Test 3 — Allows approval when both fields set (expected: PASS)**
```sql
UPDATE projects
SET project_status = 'approved',
    manufacturing_location = 'saudi',
    medical_items = 'no'
WHERE id = '<project_id>';
-- Expected: success
```

**Test 4 — Column update on approved project not blocked (expected: PASS)**
```sql
UPDATE projects SET notes = 'updated' WHERE project_status = 'approved' LIMIT 1;
-- Expected: success (guard condition 2: status unchanged → RETURN NEW)
```

**Test 5 — approved → active transition not blocked (expected: PASS)**
```sql
UPDATE projects SET project_status = 'active' WHERE project_status = 'approved' LIMIT 1;
-- Expected: success (guard condition 1: 'active' != 'approved' → RETURN NEW)
```

---

### Migration 079 Tests — Customer Master Data

**Test 1 — Verify customers were seeded**
```sql
SELECT COUNT(*) FROM customers;
-- Expected: count equal to the number of DISTINCT customer names in projects
```

**Test 2 — Verify backfill coverage**
```sql
SELECT
  COUNT(*) AS total,
  COUNT(customer_id) AS linked,
  COUNT(*) - COUNT(customer_id) AS unlinked
FROM projects;
-- Expected: linked = total (or close to it; unlinked shows data quality gaps)
```

**Test 3 — Verify UNIQUE constraint prevents duplicate names**
```sql
INSERT INTO customers (name) VALUES ('Test Customer');
INSERT INTO customers (name) VALUES ('Test Customer');  -- should fail
-- Expected: second INSERT fails with unique constraint violation
```

**Test 4 — Verify new projects can link to a customer**
```sql
SELECT id FROM customers LIMIT 1;
UPDATE projects SET customer_id = '<customer_uuid>' WHERE id = '<project_id>';
-- Expected: success; customer_id FK resolves
```

---

### Migration 080 Tests — Unified Audit Trigger

**Test 1 — Verify project update is logged**
```sql
UPDATE projects SET notes = 'audit trigger test' WHERE id = '<project_id>';
SELECT action, entity_type, entity_id, actor_role,
       before_data->>'notes', after_data->>'notes', created_at
FROM audit_log
WHERE entity_type = 'projects'
ORDER BY created_at DESC LIMIT 1;
-- Expected: one row with entity_type = 'projects', action = 'UPDATE',
--           before_data->>'notes' = old value, after_data->>'notes' = 'audit trigger test'
```

**Test 2 — Verify release note update is logged**
```sql
UPDATE release_notes SET remarks = 'audit test' WHERE id = '<rn_id>';
SELECT * FROM audit_log WHERE entity_type = 'release_notes'
ORDER BY created_at DESC LIMIT 1;
-- Expected: row with entity_type = 'release_notes', full before/after JSONB
```

**Test 3 — Verify INSERT is logged**
```sql
INSERT INTO projects (so_number, customer_name, customer_delivery_date, project_status, ...)
VALUES ('SO-TEST-001', 'Test Co', now(), 'draft', ...);
SELECT action, entity_type FROM audit_log
WHERE entity_type = 'projects' ORDER BY created_at DESC LIMIT 1;
-- Expected: action = 'CREATE'
```

---

## Rollback Notes

### Migration 078 (SO Approval Guard)
```sql
DROP TRIGGER IF EXISTS so_approval_fields ON public.projects;
DROP FUNCTION IF EXISTS public.enforce_so_approval_fields();
-- Additive only — no data affected. Rollback restores previous (unenforced) state.
```

### Migration 079 (Customer Master Data)
```sql
ALTER TABLE projects DROP COLUMN IF EXISTS customer_id;
DROP TABLE IF EXISTS public.customers;
-- Additive only — customer_name column and existing project data untouched.
```

### Migration 080 (Unified Audit Trigger)
```sql
DROP TRIGGER IF EXISTS audit_projects      ON public.projects;
DROP TRIGGER IF EXISTS audit_release_notes ON public.release_notes;
DROP FUNCTION IF EXISTS public.append_audit_log();
-- Additive only — no data affected. Audit log entries already written are retained.
```

---

## Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compile | `tsc -b` (via `npm run build`) | ✅ Zero errors |
| Vite production build | `npm run build` | ✅ 1,783 modules, clean, 5.42s |
| ESLint | `npm run lint` | ⚠️ ESLint config missing — pre-existing B-005 gap |
| Supabase local CLI | Not available | ⚠️ Not run — remote execution environment |

---

## Known Assumptions

1. **`manufacturing_location_enum` values are `'saudi'`, `'dubai'`, `'not_set'`** — confirmed in migration 009. The trigger checks `= 'not_set'` (not NULL), which matches the actual enum design.

2. **`medical_items_enum` values are `'yes'`, `'no'`, `'not_set'`** — confirmed in migration 009. Same approach.

3. **The `append_audit_log` function uses `NEW.id`** — all tables the trigger is applied to in this migration (`projects`, `release_notes`) have `id uuid PRIMARY KEY`. This assumption must be verified before extending to other tables.

4. **`auth.uid()` returns the calling user's ID in trigger context** — this is standard Supabase behaviour. In `SECURITY DEFINER` functions, `auth.uid()` still reflects the original caller's JWT, not the function owner. ✅

5. **`handle_updated_at()` exists** — confirmed in migration 001. The `customers` table reuses this existing function.

---

## Known Limitations

### Migration 078
1. **Historical data not validated** — existing projects with `project_status = 'approved'` and `manufacturing_location = 'not_set'` are not changed by this migration. The trigger only enforces future transitions.
2. **Only guards `projects` table** — quotation-to-SO conversion in `convert_quotation_to_so()` (migration 067) creates projects with `project_status = 'draft'` and does not set route/medical flags. Those fields are set at the approval stage, which is now guarded.

### Migration 079
1. **Case-sensitive name matching** — customer names differing only in capitalisation become separate records. Manual cleanup may be required.
2. **`quotation_requests` and `hot_projects` not linked yet** — customer_id FKs for these tables are deferred to Phase 1.
3. **UNIQUE constraint is case-sensitive** — `"ABC Corp"` and `"abc corp"` can coexist. A case-insensitive index (`UNIQUE (LOWER(name))`) is a future Phase 1 enhancement.
4. **`customer_id` is nullable** — no enforcement until the UI is built and all records are confirmed to have customer links.

### Migration 080
1. **`actor_email` not captured by the trigger** — requires a `profiles` JOIN per write which adds latency. Application-layer audit utilities already capture this. The trigger covers only the DB-level safety net gap.
2. **`purchase_orders_to_supplier` not covered** — financial field exposure in `before_data`/`after_data` requires a selective column approach (Phase 5).
3. **No column redaction** — the full row is captured as JSONB. For tables with sensitive fields, a customised function variant should be created instead of using `append_audit_log` directly.

---

## Reference Library Consultation

| File | Consulted For |
|------|--------------|
| `docs/reference-library/05-license-risk-notes.md` | Confirmed customers table schema is original — ERPNext GPL v3 fields used as inspiration only (field names: name, country, contact — not code) |
| `docs/reference-library/research-rules.md` | Rule 4: no GPL/AGPL/BSL code in production |
| `docs/governance/critical-governance-rules-register.md` | R-003, R-004 required fix specifications; R-016, R-017 audit trail requirements |
| `docs/governance/step-4-architecture-cleanup-brief.md` | Migration 078–080 deliverable specifications |
| `docs/system-audit/11-prioritized-gap-backlog.md` | B-010, B-011, B-026 gap details and dependencies |

**No external source code was copied.** All SQL is original. The `customers` table schema was inspired by ERPNext's customer model at the conceptual level only — no ERPNext code was extracted or copied.

---

## Unrelated Production Code Changes

**None.** Only four new files were added:
- `supabase/migrations/078_so_approval_checks.sql`
- `supabase/migrations/079_customer_master_data.sql`
- `supabase/migrations/080_unified_audit_trigger.sql`
- `docs/implementation/step-4b-foundation-governance-guardrails.md`

No files in `src/`, `supabase/functions/`, `public/`, or any existing migration were modified.

---

## Recommended Next Step: Step 4C — Architecture Cleanup / Code Structure Review

Step 4B is the last set of DB-level governance guardrails before implementation phases begin. The recommended next step is Step 4C — a code structure review that:

1. Evaluates the current `src/` folder organization for Phase 1 readiness
2. Identifies any TypeScript type mismatches against the current DB schema
3. Assesses which pages are using `mockOrEmpty()` and need live data wiring
4. Reviews the `src/types/index.ts` for any fields that now need updating (e.g., adding `customer_id` to the Project type)
5. Documents the shadow-copy principle: the `customers` table now exists in the DB; the TypeScript `Project` type should be updated to include `customer_id?: string` before Phase 1 UI begins

Step 4C is documentation and assessment only — no code changes. It produces the Phase 1 implementation brief.
