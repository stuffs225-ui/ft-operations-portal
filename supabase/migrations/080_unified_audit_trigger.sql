-- ── Migration 080: Unified Audit Trigger Foundation (R-016, R-017) ────────────
--
-- Governance Rules R-016 and R-017 (Playbook v3.2, Section 28 — Timeline & Audit Log):
--   R-016: Every significant status change must create a timeline event record.
--   R-017: Changes to key fields must be logged with old value, new value,
--          user, and timestamp.
--
-- Problem:
-- The audit_log table (migration 004) already has before_data/after_data JSONB
-- columns and an append-only RLS policy. However, writes to audit_log depend on
-- application-layer audit utility calls (projectAudit.ts, qcAudit.ts, etc.)
-- which are inconsistently applied across modules. A direct API write that
-- bypasses the React UI will not produce any audit record.
--
-- Fix:
-- A reusable AFTER trigger function (append_audit_log) that:
--   1. Captures OLD.* and NEW.* as JSONB into audit_log.before_data / after_data.
--   2. Derives action (INSERT/UPDATE), entity_type (table name), entity_id
--      (NEW.id or OLD.id), actor_id (auth.uid()), and actor_role automatically.
--   3. Is SECURITY DEFINER so it can always write to audit_log regardless of
--      the caller's RLS permissions on that table.
--
-- Applied to in this migration:
--   - public.projects     (project lifecycle: status, route, medical, approvals)
--   - public.release_notes (release gate transitions — complements migration 076)
--
-- NOT applied to in this migration (financial / high-volume tables):
--   - purchase_orders_to_supplier — financial values; audit is deferred to a
--     dedicated migration that can redact cost fields before logging.
--   - quotation_requests — high volume; deferred to Phase 2 once live wiring
--     connects the quotation module to real data.
--
-- Design decisions:
--   • AFTER trigger (not BEFORE): ensures the row change is definitively in
--     the transaction before the audit record is written. Both share the same
--     transaction — a rollback cancels both.
--   • SECURITY DEFINER: guarantees the audit INSERT succeeds regardless of
--     the calling session's RLS policies on audit_log.
--   • actor_email is omitted from the trigger (requires a profiles JOIN that
--     adds latency per write). The application-layer audit utilities already
--     denormalise actor_email — the trigger covers the gap for API-bypassed writes.
--
-- Dual-layer complementarity:
--   This trigger does NOT replace the existing audit utility calls in the
--   application (projectAudit.ts, qcAudit.ts, etc.). It adds a DB-level safety
--   net that catches writes that bypass those utilities.
--
-- References:
--   docs/governance/critical-governance-rules-register.md — R-016, R-017
--   docs/system-audit/07-governance-rules-gap-analysis.md — R-016, R-017
--   docs/governance/step-4-architecture-cleanup-brief.md — B-036

-- ── 1. Reusable audit log function ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.append_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_id  uuid;
  v_actor_role text;
  v_action    text;
  v_entity_id text;
  v_before    jsonb;
  v_after     jsonb;
BEGIN
  -- Derive actor context
  v_actor_id   := auth.uid();
  v_actor_role := public.current_user_role();

  -- Map TG_OP to audit action vocabulary
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
    ELSE TG_OP
  END;

  -- Capture before/after row state as JSONB
  IF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id::text;
    v_before    := NULL;
    v_after     := row_to_json(NEW)::jsonb;
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id::text;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := row_to_json(NEW)::jsonb;
  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::text;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := NULL;
  END IF;

  -- Insert into audit_log (append-only; no UPDATE/DELETE policy exists on audit_log)
  INSERT INTO public.audit_log (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    description,
    before_data,
    after_data
  ) VALUES (
    v_actor_id,
    v_actor_role,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_action || ' on ' || TG_TABLE_NAME || ' (' || v_entity_id || ')',
    v_before,
    v_after
  );

  -- Return the appropriate row for BEFORE/AFTER trigger compatibility
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Apply to public.projects ───────────────────────────────────────────────
--
-- Logs all INSERT and UPDATE operations on the projects table.
-- This captures: project creation, status transitions, approval, rejection,
-- route changes, medical flag changes, and all other field updates.
-- The full before/after JSONB provides field-level diff capability.

DROP TRIGGER IF EXISTS audit_projects ON public.projects;

CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.append_audit_log();

-- ── 3. Apply to public.release_notes ─────────────────────────────────────────
--
-- Logs all INSERT and UPDATE operations on release_notes.
-- Complements migration 076 (release_note_gate): the gate blocks invalid
-- transitions; this trigger records all transitions that do succeed.
-- Captures: note creation, status transitions (draft→ready_to_issue→issued),
-- and any field updates after issuance.

DROP TRIGGER IF EXISTS audit_release_notes ON public.release_notes;

CREATE TRIGGER audit_release_notes
  AFTER INSERT OR UPDATE ON public.release_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.append_audit_log();

-- ── Verification comment ───────────────────────────────────────────────────────
-- To verify the audit trigger is working:
--
-- 1. Update a project field:
--      UPDATE projects SET notes = 'audit test ' || now() WHERE id = '<project_id>';
--
-- 2. Query the audit log:
--      SELECT action, entity_type, entity_id, actor_role,
--             before_data->>'notes', after_data->>'notes',
--             created_at
--      FROM audit_log
--      WHERE entity_type = 'projects'
--      ORDER BY created_at DESC
--      LIMIT 5;
--    Expected: one row per UPDATE with before_data and after_data populated.
--
-- 3. Verify release note audit:
--      UPDATE release_notes SET remarks = 'audit test' WHERE id = '<rn_id>';
--      SELECT * FROM audit_log WHERE entity_type = 'release_notes'
--      ORDER BY created_at DESC LIMIT 1;
--    Expected: audit row with before_data and after_data.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS audit_projects    ON public.projects;
--   DROP TRIGGER IF EXISTS audit_release_notes ON public.release_notes;
--   DROP FUNCTION IF EXISTS public.append_audit_log();
--
-- EXTENDING TO OTHER TABLES:
-- To add audit coverage to any additional table, apply the function with:
--   CREATE TRIGGER audit_<table_name>
--     AFTER INSERT OR UPDATE ON public.<table_name>
--     FOR EACH ROW EXECUTE FUNCTION public.append_audit_log();
-- No changes to this migration file are needed.
--
-- NOTE ON FINANCIAL DATA:
-- The before_data / after_data for projects includes total_sales_value.
-- The audit_log SELECT policy (migration 004) restricts reads to admin only,
-- so this financial data is not exposed to lower-privilege roles.
