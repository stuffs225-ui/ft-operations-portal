-- ── Migration 078: SO Approval Fields Guard (B-010, B-011) ────────────────────
--
-- Governance Rules R-003 and R-004 (Playbook v3.2, Section 08 — Approval & Routing):
--   R-003: A Sales Order cannot be approved unless a manufacturing route
--          (Saudi / Dubai) has been selected. manufacturing_location must not
--          be 'not_set' at the point of approval.
--   R-004: A Sales Order cannot be approved unless the Medical Items flag
--          (Yes / No) has been selected. medical_items must not be 'not_set'
--          at the point of approval.
--
-- Problem:
-- projects.manufacturing_location and projects.medical_items both default to
-- 'not_set'. No DB-level constraint prevented changing project_status to
-- 'approved' while these fields were still 'not_set'. Only the Admin Approvals
-- UI enforced this, which can be bypassed with a direct API PATCH.
--
-- Why a trigger instead of CHECK constraints:
-- A CHECK constraint fires on every INSERT and UPDATE to the table. If any
-- existing rows already have project_status = 'approved' with a field at
-- 'not_set' (possible if data was entered before this migration), adding a
-- CHECK constraint would fail outright. A BEFORE trigger only enforces the
-- rule at the moment of status transition to 'approved', avoiding false
-- failures on historical data and allowing unrelated column updates on
-- already-approved projects without re-validating the fields.
--
-- Dual-layer pattern (same as migration 061_po_approval_guard.sql):
--   Layer 1 — RLS: existing "projects: admin_ops full access" policy already
--             restricts project_status changes to admin / operations_manager.
--   Layer 2 — This trigger: enforces the required field selections before the
--             status can advance to 'approved', regardless of how the write
--             arrives (UI, API, direct DB connection).
--
-- References:
--   docs/governance/critical-governance-rules-register.md — R-003, R-004
--   docs/system-audit/07-governance-rules-gap-analysis.md — R-003, R-004
--   docs/system-audit/11-prioritized-gap-backlog.md — B-010, B-011

CREATE OR REPLACE FUNCTION public.enforce_so_approval_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ── Guard condition 1: Only enforce when transitioning TO 'approved' ──────────
  -- All other status values (draft, submitted_for_approval, active, etc.) pass
  -- through without validation. The governance rule only fires at approval time.
  IF NEW.project_status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- ── Guard condition 2: Skip if status is not actually changing ────────────────
  -- Allows column updates (notes, remarks, sales_owner_id, etc.) on an already-
  -- approved project without re-validating the fields.
  IF TG_OP = 'UPDATE' AND OLD.project_status = NEW.project_status THEN
    RETURN NEW;
  END IF;

  -- ── R-003: manufacturing_location must be 'saudi' or 'dubai' (not 'not_set') ──
  IF NEW.manufacturing_location = 'not_set' THEN
    RAISE EXCEPTION
      'SO Approval gate (R-003): Cannot approve project ''%'' — '
      'manufacturing location (Saudi / Dubai) must be selected before approval. '
      'Set projects.manufacturing_location to ''saudi'' or ''dubai'' and retry.',
      COALESCE(NEW.project_code, NEW.id::text);
  END IF;

  -- ── R-004: medical_items must be 'yes' or 'no' (not 'not_set') ───────────────
  IF NEW.medical_items = 'not_set' THEN
    RAISE EXCEPTION
      'SO Approval gate (R-004): Cannot approve project ''%'' — '
      'medical items flag (Yes / No) must be selected before approval. '
      'Set projects.medical_items to ''yes'' or ''no'' and retry.',
      COALESCE(NEW.project_code, NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger first to make this migration idempotent on re-run.
DROP TRIGGER IF EXISTS so_approval_fields ON public.projects;

CREATE TRIGGER so_approval_fields
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_so_approval_fields();

-- ── Verification comment ───────────────────────────────────────────────────────
-- Manual test scenarios:
--
-- TEST 1 — Gate blocks approval when route not selected (expected: FAIL):
--   UPDATE projects
--   SET project_status = 'approved'
--   WHERE id = '<project_id_with_manufacturing_location_not_set>';
--   Expected: ERROR — SO Approval gate (R-003): Cannot approve project...
--
-- TEST 2 — Gate blocks approval when medical flag not selected (expected: FAIL):
--   UPDATE projects
--   SET project_status = 'approved', manufacturing_location = 'saudi'
--   WHERE id = '<project_id_with_medical_items_not_set>';
--   Expected: ERROR — SO Approval gate (R-004): Cannot approve project...
--
-- TEST 3 — Gate allows approval when both fields are set (expected: PASS):
--   UPDATE projects
--   SET project_status = 'approved',
--       manufacturing_location = 'saudi',
--       medical_items = 'no'
--   WHERE id = '<project_id>';
--   Expected: success.
--
-- TEST 4 — Column update on already-approved project not blocked (expected: PASS):
--   UPDATE projects SET notes = 'updated' WHERE project_status = 'approved' LIMIT 1;
--   Expected: success (status unchanged — guard condition 2 skips check).
--
-- TEST 5 — Transition from approved to active is not blocked (expected: PASS):
--   UPDATE projects SET project_status = 'active' WHERE id = '<approved_project_id>';
--   Expected: success (guard condition 1: 'active' != 'approved' → RETURN NEW).
