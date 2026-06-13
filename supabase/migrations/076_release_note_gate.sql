-- ── Migration 076: Release Note Gate (R-015) ──────────────────────────────────
--
-- Governance Rule R-015 (Playbook v3.2, Section 20 — Quality Control & Release Note):
-- A Release Note CANNOT be advanced to 'ready_to_issue' or 'issued' while any QC
-- finding for the same project (or vehicle line) is in an open state.
--
-- Problem:
-- release_notes.release_status could be set to 'ready_to_issue' or 'issued' via a
-- direct API PATCH call even when project_qc_findings records exist with
-- finding_status NOT IN ('closed', 'cancelled'). No DB-level enforcement existed.
-- UI validation (blocked status option) was the only guard — trivially bypassed.
--
-- Fix:
--   BEFORE INSERT OR UPDATE trigger on release_notes.
--   When release_status transitions to 'ready_to_issue' or 'issued', count any
--   project_qc_findings with finding_status NOT IN ('closed', 'cancelled').
--   If any exist, RAISE EXCEPTION with a diagnostic message.
--
-- Scope logic:
--   vehicle_line_release with a project_vehicle_line_id set:
--     → checks only findings scoped to that vehicle line
--   project_release or partial_release (or vehicle_line_release without a vehicle line):
--     → checks all findings for the project (safest / most conservative)
--
-- Dual-layer pattern (same as migration 061_po_approval_guard.sql):
--   Layer 1 — RLS: existing rn_insert / rn_update policies already restrict writes
--             to admin / operations_manager / qc_user. No change to those policies.
--   Layer 2 — This trigger: enforces the business-state rule regardless of which
--             authorized role is writing, including any future roles added to RLS.
--
-- References:
--   docs/governance/critical-governance-rules-register.md — Rule R-015
--   docs/system-audit/07-governance-rules-gap-analysis.md — R-015
--   docs/governance/step-4-architecture-cleanup-brief.md — B-001

CREATE OR REPLACE FUNCTION public.enforce_release_note_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  open_finding_count integer;
  scope_description  text;
BEGIN
  -- ── Guard condition 1: Only enforce on transitions TO blocking statuses ────────
  -- 'draft', 'blocked', and 'cancelled' are not constrained by this gate.
  IF NEW.release_status NOT IN ('ready_to_issue', 'issued') THEN
    RETURN NEW;
  END IF;

  -- ── Guard condition 2: Skip if status is not actually changing ────────────────
  -- Allows updating remarks, document_id, etc. on an already-issued Release Note
  -- without re-running the gate check.
  IF TG_OP = 'UPDATE' AND OLD.release_status = NEW.release_status THEN
    RETURN NEW;
  END IF;

  -- ── Scope: vehicle-line vs. full-project ──────────────────────────────────────
  -- vehicle_line_release scoped to a specific vehicle line → only check that line.
  -- All other release types → check all findings for the entire project.
  IF NEW.release_type = 'vehicle_line_release'
     AND NEW.project_vehicle_line_id IS NOT NULL
  THEN
    SELECT COUNT(*)
      INTO open_finding_count
      FROM public.project_qc_findings
     WHERE project_vehicle_line_id = NEW.project_vehicle_line_id
       AND finding_status NOT IN ('closed', 'cancelled');

    scope_description :=
      'vehicle line ' || NEW.project_vehicle_line_id::text;
  ELSE
    SELECT COUNT(*)
      INTO open_finding_count
      FROM public.project_qc_findings
     WHERE project_id = NEW.project_id
       AND finding_status NOT IN ('closed', 'cancelled');

    scope_description := 'project ' || NEW.project_id::text;
  END IF;

  -- ── Enforcement: block if any open findings remain ────────────────────────────
  IF open_finding_count > 0 THEN
    RAISE EXCEPTION
      'Release Note gate (R-015): Cannot set Release Note to ''%'' — '
      '% open QC finding(s) remain for %. '
      'All QC findings must be closed or cancelled before a Release Note can be issued.',
      NEW.release_status,
      open_finding_count,
      scope_description;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger first to make this migration idempotent on re-run.
DROP TRIGGER IF EXISTS release_note_gate ON public.release_notes;

CREATE TRIGGER release_note_gate
  BEFORE INSERT OR UPDATE ON public.release_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_release_note_gate();

-- ── Verification comment ───────────────────────────────────────────────────────
-- To test this gate manually:
--
-- 1. Create a project with at least one project_qc_finding with finding_status = 'open'.
--
-- 2. Attempt to set release_status = 'ready_to_issue' on a release_note for that project:
--      UPDATE release_notes SET release_status = 'ready_to_issue'
--      WHERE project_id = '<project_id>';
--    Expected result: ERROR — Release Note gate (R-015): Cannot set Release Note...
--
-- 3. Close the finding:
--      UPDATE project_qc_findings SET finding_status = 'closed' WHERE id = '<finding_id>';
--
-- 4. Retry the UPDATE — should now succeed.
--
-- 5. Confirm that updating remarks on an already-issued Release Note still works:
--      UPDATE release_notes SET remarks = 'updated' WHERE release_status = 'issued';
--    Expected result: success (status not changing — gate skipped).
