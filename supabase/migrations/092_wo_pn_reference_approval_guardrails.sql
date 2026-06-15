-- ── Migration 092: WO/PN Reference Approval Guardrails (Step 10B) ─────────────
--
-- Closes Step 10A HIGH gaps H-001 and H-002:
--
--   H-001: WO/PN references could be created before project approval at DB level.
--          The UI prevented this (WoPnGateCard early-return, fetchProjectsMissing
--          Reference filters to approved only), but no DB trigger existed.
--          A factory_user or admin with direct API access could INSERT a WO for
--          an unapproved project; migration 089 trg_factory_requires_active_wo
--          would then permit factory_records creation on the unapproved project
--          (project_has_wo() does not check project_status).
--
--   H-002: The "exec_ref: factory_user wo" RLS policy was FOR ALL, granting
--          factory_user UPDATE and DELETE access alongside INSERT and SELECT.
--          A factory_user could call supabase.update({ status: 'confirmed' })
--          directly via API, bypassing the CAN_CONFIRM governance requirement
--          (only admin / operations_manager should confirm references).
--
-- Part A — BEFORE INSERT trigger on project_execution_references:
--   Blocks INSERT unless the parent project has project_status = 'approved'.
--   Applies to both reference_type = 'wo' and reference_type = 'pn'.
--
-- Part B — RLS hardening for factory_user on WO references:
--   Drop "exec_ref: factory_user wo" (FOR ALL).
--   Recreate as two separate policies:
--     "exec_ref: factory_user wo select" — FOR SELECT
--     "exec_ref: factory_user wo insert" — FOR INSERT
--   factory_user retains exactly the same data visibility and INSERT capability
--   but loses UPDATE, DELETE, and the ability to self-confirm a WO.
--
-- No schema changes (no column/enum/table additions).
-- No changes to project_has_wo() / project_has_pn() / can_start_saudi_factory()
--   / can_start_dubai_followup() helper functions.
-- No changes to projects table, factory_records, or dubai_project_followups.
-- No changes to any other RLS policy.
-- No existing rows are modified.
--
-- Design decision (M-001 from Step 10A):
--   WO/PN gate continues to be based on manufacturing_location only.
--   project_department_routing is NOT consulted by the gate.
--   This is intentional: any approved Saudi project requires WO, regardless
--   of which departments were checked in the routing step.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_exec_ref_project_approved
--     ON public.project_execution_references;
--   DROP FUNCTION IF EXISTS public.enforce_exec_ref_project_approved();
--
--   DROP POLICY IF EXISTS "exec_ref: factory_user wo select"
--     ON public.project_execution_references;
--   DROP POLICY IF EXISTS "exec_ref: factory_user wo insert"
--     ON public.project_execution_references;
--
--   -- Restore original broad policy:
--   CREATE POLICY "exec_ref: factory_user wo"
--     ON public.project_execution_references FOR ALL
--     USING (public.current_user_role() = 'factory_user' AND reference_type = 'wo')
--     WITH CHECK (public.current_user_role() = 'factory_user' AND reference_type = 'wo');

-- ─────────────────────────────────────────────────────────────────────────────
-- PART A — TRIGGER: Block WO/PN creation before project approval
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_exec_ref_project_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status      text;
  v_code        text;
BEGIN
  SELECT project_status, project_code
    INTO v_status, v_code
    FROM public.projects
   WHERE id = NEW.project_id;

  IF v_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION
      'WO/PN reference cannot be created before the project is approved. '
      'Project ''%'' has status ''%''. Approve the project first then add the '
      '% reference.',
      COALESCE(v_code, NEW.project_id::text),
      COALESCE(v_status, 'unknown'),
      upper(NEW.reference_type::text)
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exec_ref_project_approved
  ON public.project_execution_references;

CREATE TRIGGER trg_exec_ref_project_approved
  BEFORE INSERT ON public.project_execution_references
  FOR EACH ROW EXECUTE FUNCTION public.enforce_exec_ref_project_approved();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART B — RLS HARDENING: factory_user WO policy split
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Before (migration 014):
--   "exec_ref: factory_user wo" FOR ALL
--   USING (role = 'factory_user' AND reference_type = 'wo')
--   WITH CHECK (role = 'factory_user' AND reference_type = 'wo')
--   → granted SELECT + INSERT + UPDATE + DELETE to factory_user on WO rows.
--
-- After (this migration):
--   "exec_ref: factory_user wo select" FOR SELECT only
--   "exec_ref: factory_user wo insert" FOR INSERT only
--   → factory_user retains SELECT and INSERT; loses UPDATE and DELETE.
--   → factory_user can no longer self-confirm, cancel, or supersede a WO.
--
-- admin and operations_manager are covered by "exec_ref: admin_ops full access"
-- (migration 014, FOR ALL, unchanged) and can still UPDATE / DELETE.

DROP POLICY IF EXISTS "exec_ref: factory_user wo" ON public.project_execution_references;

CREATE POLICY "exec_ref: factory_user wo select"
  ON public.project_execution_references
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'factory_user'
    AND reference_type = 'wo'
  );

CREATE POLICY "exec_ref: factory_user wo insert"
  ON public.project_execution_references
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'factory_user'
    AND reference_type = 'wo'
  );

-- ── Verification SQL (run in Supabase SQL editor or psql) ─────────────────────
--
-- SETUP: one approved Saudi project (id = '<approved_id>'),
--        one unapproved Saudi project (id = '<unapproved_id>').
--
-- T-001: INSERT WO for unapproved project → BLOCKED
--   INSERT INTO project_execution_references
--     (project_id, reference_type, reference_number, manufacturing_location)
--   VALUES ('<unapproved_id>', 'wo', 'WO-TEST-001', 'saudi');
--   Expected: ERROR P0001 "WO/PN reference cannot be created before the project
--             is approved."
--
-- T-002: INSERT PN for unapproved Dubai project → BLOCKED
--   INSERT INTO project_execution_references
--     (project_id, reference_type, reference_number, manufacturing_location)
--   VALUES ('<unapproved_dubai_id>', 'pn', 'PN-TEST-001', 'dubai');
--   Expected: ERROR P0001 (same message, "PN reference")
--
-- T-003: INSERT WO for approved Saudi project (as admin) → ALLOWED
--   INSERT INTO project_execution_references
--     (project_id, reference_type, reference_number, manufacturing_location)
--   VALUES ('<approved_id>', 'wo', 'WO-TEST-002', 'saudi');
--   Expected: success
--
-- T-004: factory_user UPDATE WO status → BLOCKED by RLS
--   (Supabase session as factory_user)
--   UPDATE project_execution_references
--   SET status = 'confirmed'
--   WHERE reference_type = 'wo' AND project_id = '<approved_id>';
--   Expected: no rows affected (RLS silently blocks UPDATE — policy not matched)
--
-- T-005: admin UPDATE WO status → ALLOWED
--   UPDATE project_execution_references
--   SET status = 'confirmed'
--   WHERE reference_type = 'wo' AND project_id = '<approved_id>';
--   Expected: 1 row updated
--
-- T-006: cancelled reference → project_has_wo returns false
--   UPDATE project_execution_references
--   SET status = 'cancelled'
--   WHERE reference_type = 'wo' AND project_id = '<approved_id>';
--   SELECT public.project_has_wo('<approved_id>');
--   Expected: false
--
-- T-007: INSERT WO for approved project as factory_user → ALLOWED
--   (Supabase session as factory_user)
--   INSERT INTO project_execution_references
--     (project_id, reference_type, reference_number, manufacturing_location)
--   VALUES ('<approved_id>', 'wo', 'WO-TEST-003', 'saudi');
--   Expected: success
--
-- T-008: project_has_wo / project_has_pn behavior unchanged
--   SELECT public.project_has_wo('<project_with_created_wo>');   -- true
--   SELECT public.project_has_wo('<project_with_confirmed_wo>'); -- true
--   SELECT public.project_has_wo('<project_with_no_wo>');        -- false
