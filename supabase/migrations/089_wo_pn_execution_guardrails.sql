-- ── Migration 089: WO / PN Execution Gate TIER-1 Guardrails (R-005, R-006) ─────
--
-- Governance Rules:
--   R-005: Saudi factory execution must not start until an active WO exists
--          for the project.  "Execution" means any row in factory_records.
--   R-006: Dubai/AFS follow-up must not start until an active PN exists
--          for the project.  "Follow-up" means any row in dubai_project_followups.
--
-- Background:
--   Step 9A (docs/implementation/step-9a-so-approval-routing-audit.md) confirmed
--   that R-005 and R-006 were TIER-2/3 only:
--     • executionGate.ts → getExecutionGateStatus() — client-side pure function
--     • WoPnGateCard — UI display component
--   Direct API INSERTs could create factory or Dubai follow-up records without a
--   WO/PN, bypassing the UI gate entirely.
--
-- Reference tables:
--   factory_records              (migration 025_factory_records.sql)
--   dubai_project_followups      (migration 041_dubai_project_followups.sql)
--   project_execution_references (migration 014_execution_references.sql)
--
-- WO/PN reference model (migration 014):
--   project_execution_references.reference_type: 'wo' (Saudi) | 'pn' (Dubai)
--   project_execution_references.status:
--     'created'   — entered, awaiting confirmation → ACTIVE
--     'confirmed' — confirmed by admin/ops          → ACTIVE
--     'superseded' — replaced by newer reference   → INACTIVE
--     'cancelled'  — voided                        → INACTIVE
--
--   Active WO definition: status IN ('created', 'confirmed') AND reference_type = 'wo'
--   Active PN definition: status IN ('created', 'confirmed') AND reference_type = 'pn'
--
-- Helper functions used (defined in migration 014):
--   public.project_has_wo(uuid) → boolean   SECURITY DEFINER, stable
--   public.project_has_pn(uuid) → boolean   SECURITY DEFINER, stable
--
-- Dual-layer pattern (same as migration 061_po_approval_guard.sql):
--   Layer 1 — RLS: existing factory_records policies restrict INSERT to
--             factory_user / admin / operations_manager.
--             existing dubai_project_followups policies restrict INSERT to
--             admin / operations_manager only (afs_user has SELECT only).
--   Layer 2 — This migration: BEFORE INSERT triggers enforcing the WO/PN
--             business-state rule regardless of which authorized role writes.
--
-- Scope:
--   Only BEFORE INSERT triggers are created.
--   No UPDATE guard — existing rows are not retroactively enforced.
--   No schema changes (no ALTER TABLE, no new columns, no new types).
--   No RLS policy changes.
--   No other tables affected.
--
-- Manufacturing location gate logic:
--   factory_records guard:
--     'saudi'   → WO required → block if none active
--     'dubai'   → factory_records are not used for Dubai projects → pass through
--     'not_set' → route not confirmed yet → pass through (not yet a Saudi project)
--
--   dubai_project_followups guard:
--     'dubai'   → PN required → block if none active
--     'saudi'   → dubai_project_followups not used for Saudi projects → pass through
--     'not_set' → route not confirmed yet → pass through (not yet a Dubai project)
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_factory_requires_active_wo ON public.factory_records;
--   DROP FUNCTION IF EXISTS public.enforce_factory_requires_active_wo();
--   DROP TRIGGER IF EXISTS trg_dubai_followup_requires_active_pn ON public.dubai_project_followups;
--   DROP FUNCTION IF EXISTS public.enforce_dubai_followup_requires_active_pn();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER 1: enforce_factory_requires_active_wo (R-005)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_factory_requires_active_wo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location text;
  v_project_code text;
BEGIN
  -- ── Fetch the project's manufacturing location ───────────────────────────────
  -- project_id is NOT NULL (FK constraint on factory_records), so this will
  -- always find a row (or FK constraint already blocked the INSERT).
  SELECT manufacturing_location, project_code
    INTO v_location, v_project_code
    FROM public.projects
   WHERE id = NEW.project_id;

  -- ── Guard: only applies to Saudi-routed projects ─────────────────────────────
  -- Dubai projects use dubai_project_followups, not factory_records.
  -- 'not_set' projects have not had their route confirmed yet — pass through.
  IF v_location IS DISTINCT FROM 'saudi' THEN
    RETURN NEW;
  END IF;

  -- ── R-005: Saudi project must have an active WO before factory records ────────
  -- public.project_has_wo() is SECURITY DEFINER (migration 014) — bypasses RLS.
  -- Returns true if status IN ('created', 'confirmed') for a 'wo' reference.
  IF NOT public.project_has_wo(NEW.project_id) THEN
    RAISE EXCEPTION
      'Saudi factory execution gate (R-005): Cannot create factory record for '
      'project % — a Work Order (WO) must be entered before factory records can '
      'be created. Add a WO via the WO / PN Gate or Project detail page.',
      COALESCE(v_project_code, NEW.project_id::text)
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger first to make this migration idempotent on re-run.
DROP TRIGGER IF EXISTS trg_factory_requires_active_wo ON public.factory_records;

CREATE TRIGGER trg_factory_requires_active_wo
  BEFORE INSERT ON public.factory_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_factory_requires_active_wo();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER 2: enforce_dubai_followup_requires_active_pn (R-006)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_dubai_followup_requires_active_pn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location text;
  v_project_code text;
BEGIN
  -- ── Fetch the project's manufacturing location ───────────────────────────────
  -- project_id is NOT NULL (FK constraint on dubai_project_followups).
  SELECT manufacturing_location, project_code
    INTO v_location, v_project_code
    FROM public.projects
   WHERE id = NEW.project_id;

  -- ── Guard: only applies to Dubai-routed projects ─────────────────────────────
  -- Saudi projects use factory_records; dubai_project_followups is Dubai-only.
  -- 'not_set' projects have not had their route confirmed — pass through.
  IF v_location IS DISTINCT FROM 'dubai' THEN
    RETURN NEW;
  END IF;

  -- ── R-006: Dubai project must have an active PN before follow-up records ──────
  -- public.project_has_pn() is SECURITY DEFINER (migration 014) — bypasses RLS.
  -- Returns true if status IN ('created', 'confirmed') for a 'pn' reference.
  IF NOT public.project_has_pn(NEW.project_id) THEN
    RAISE EXCEPTION
      'Dubai/AFS follow-up gate (R-006): Cannot create follow-up record for '
      'project % — a Production Number (PN) must be entered before Dubai/AFS '
      'follow-up records can be created. Add a PN via the WO / PN Gate or '
      'Project detail page.',
      COALESCE(v_project_code, NEW.project_id::text)
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger first to make this migration idempotent on re-run.
DROP TRIGGER IF EXISTS trg_dubai_followup_requires_active_pn ON public.dubai_project_followups;

CREATE TRIGGER trg_dubai_followup_requires_active_pn
  BEFORE INSERT ON public.dubai_project_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_dubai_followup_requires_active_pn();

-- ── Verification comment ───────────────────────────────────────────────────────
--
-- Manual test scenarios (run in Supabase SQL editor or psql):
--
-- ── R-005: factory_records gate ──────────────────────────────────────────────
--
-- TEST 1 — Saudi approved project with NO active WO → INSERT blocked (expected: FAIL):
--   INSERT INTO factory_records (project_id, production_status)
--   VALUES ('<saudi_approved_project_id_no_wo>', 'not_started');
--   Expected: ERROR — Saudi factory execution gate (R-005): Cannot create factory record...
--
-- TEST 2 — Saudi approved project WITH active WO → INSERT allowed (expected: PASS):
--   -- First verify: SELECT * FROM project_execution_references
--   --   WHERE project_id = '<project_id>' AND reference_type = 'wo'
--   --   AND status IN ('created','confirmed');
--   INSERT INTO factory_records (project_id, production_status)
--   VALUES ('<saudi_approved_project_id_with_wo>', 'not_started');
--   Expected: success
--
-- TEST 3 — Dubai project → factory_records INSERT not affected (expected: PASS):
--   INSERT INTO factory_records (project_id, production_status)
--   VALUES ('<dubai_project_id>', 'not_started');
--   Expected: trigger passes through; INSERT succeeds (RLS may separately block
--   based on role/project status).
--
-- TEST 4 — project with manufacturing_location = 'not_set' → not blocked (expected: PASS):
--   INSERT INTO factory_records (project_id, production_status)
--   VALUES ('<not_set_location_project_id>', 'not_started');
--   Expected: pass through (route not confirmed; guard condition: v_location != 'saudi')
--
-- TEST 5 — After adding WO to a previously blocked project → INSERT now succeeds (expected: PASS):
--   -- Insert WO reference:
--   INSERT INTO project_execution_references
--     (project_id, reference_type, reference_number, manufacturing_location)
--   VALUES ('<project_id>', 'wo', 'WO-2026-0001', 'saudi');
--   -- Now factory_records INSERT should succeed:
--   INSERT INTO factory_records (project_id, production_status)
--   VALUES ('<project_id>', 'not_started');
--   Expected: success
--
-- ── R-006: dubai_project_followups gate ──────────────────────────────────────
--
-- TEST 6 — Dubai approved project with NO active PN → INSERT blocked (expected: FAIL):
--   INSERT INTO dubai_project_followups (project_id, dubai_status)
--   VALUES ('<dubai_approved_project_id_no_pn>', 'not_started');
--   Expected: ERROR — Dubai/AFS follow-up gate (R-006): Cannot create follow-up record...
--
-- TEST 7 — Dubai approved project WITH active PN → INSERT allowed (expected: PASS):
--   INSERT INTO dubai_project_followups (project_id, dubai_status)
--   VALUES ('<dubai_approved_project_id_with_pn>', 'not_started');
--   Expected: success
--
-- TEST 8 — Saudi project → dubai_project_followups INSERT not affected (expected: PASS):
--   INSERT INTO dubai_project_followups (project_id, dubai_status)
--   VALUES ('<saudi_project_id>', 'not_started');
--   Expected: trigger passes through; INSERT succeeds (RLS may separately block
--   since Saudi projects are not expected to use this table).
--
-- TEST 9 — Superseded PN does not satisfy gate (expected: FAIL):
--   -- Given: only PN with status='superseded' exists for the project
--   INSERT INTO dubai_project_followups (project_id, dubai_status)
--   VALUES ('<dubai_project_id_with_superseded_pn_only>', 'not_started');
--   Expected: ERROR (superseded PN is not 'active'; project_has_pn returns false)
--
-- TEST 10 — Cancelled WO does not satisfy gate (expected: FAIL):
--   -- Given: only WO with status='cancelled' exists for the project
--   INSERT INTO factory_records (project_id, production_status)
--   VALUES ('<saudi_project_id_with_cancelled_wo_only>', 'not_started');
--   Expected: ERROR (cancelled WO is not 'active'; project_has_wo returns false)
--
-- ── Existing rows are NOT affected ───────────────────────────────────────────
-- UPDATE on existing factory_records / dubai_project_followups rows: no change.
-- The trigger is BEFORE INSERT only; BEFORE UPDATE is not created.
