-- ── Migration 086: Procurement Governance Hardening (Step 11B) ────────────────
--
-- Reference: docs/implementation/step-11a-procurement-suppliers-governance-audit.md
-- Implements two governance guards identified in the Step 11A audit:
--
-- Part A — Supplier Approval Authority Guard
--   Extends enforce_qc_supplier_fields() (defined in migration 084) to block
--   procurement_user from setting procurement_status to governance states
--   ('approved', 'approved_with_conditions', 'suspended', 'blacklisted').
--   Adds a self-approval guard: an admin or operations_manager cannot approve
--   (set to 'approved' or 'approved_with_conditions') a supplier they created.
--   Mirrors the pattern from migration 061 (enforce_po_approval_authority).
--
-- Part B — PR Item Terminal-State Guard
--   procurement_request_items has no terminal-state guard. A procurement_user
--   can INSERT or UPDATE items on a parent procurement_request that is in a
--   terminal state ('closed' or 'cancelled'), corrupting the audit trail and
--   PO-to-PR item linkage.
--   Fix: replace pri_procurement_all (FOR ALL) with SELECT + INSERT + UPDATE.
--   Add a BEFORE INSERT OR UPDATE trigger that raises an exception when the
--   parent PR is in a terminal state ('closed', 'cancelled'). Admin and
--   operations_manager are permitted regardless of PR state.
--   Mirrors the pattern from migration 085 (PR header terminal-state guard).
--
-- Scope:
--   Part A: CREATE OR REPLACE FUNCTION (replaces migration 084 version).
--           The existing trigger trg_enforce_qc_supplier_fields is unchanged;
--           it continues to fire and now calls the updated function body.
--   Part B: DROP/CREATE RLS policies. New trigger function + trigger.
--   No schema changes (no new columns, tables, types, or indexes).
--   No weakening of existing RLS policies.
--   No changes to application code.
--
-- Idempotent: DROP IF EXISTS before each CREATE. CREATE OR REPLACE for functions.
-- Uses public.current_user_role() (SECURITY DEFINER) per established pattern.
--
-- Rollback: see end of file.

-- ── PART A: Supplier Approval Authority Guard ─────────────────────────────────
--
-- Problem: after migration 084, procurement_user can still set
--   procurement_status to 'approved', 'approved_with_conditions',
--   'suspended', or 'blacklisted' via direct Supabase API call.
--   The existing trigger checks medical/critical flags and qc_user fields
--   but does NOT restrict procurement_status transitions for procurement_user.
--
-- Also: no self-approval guard exists. An admin who created a supplier record
--   could approve it without a second set of eyes.
--
-- Fix:
--   Extend enforce_qc_supplier_fields() (CREATE OR REPLACE) to add:
--   1. procurement_user cannot transition procurement_status to governance states.
--   2. Self-approval guard: approver cannot approve a supplier they created.
--
-- The existing trigger trg_enforce_qc_supplier_fields (migration 084) does NOT
-- need to be recreated — it already fires BEFORE UPDATE and calls this function.

CREATE OR REPLACE FUNCTION public.enforce_qc_supplier_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- ── qc_user: restricted to qc_status, qc_remarks, quality_rating only ───────
  -- (Original logic from migration 084 — preserved exactly.)
  IF public.current_user_role() = 'qc_user' THEN
    IF (NEW.supplier_name               IS DISTINCT FROM OLD.supplier_name)
       OR (NEW.supplier_category        IS DISTINCT FROM OLD.supplier_category)
       OR (NEW.contact_person           IS DISTINCT FROM OLD.contact_person)
       OR (NEW.email                    IS DISTINCT FROM OLD.email)
       OR (NEW.phone                    IS DISTINCT FROM OLD.phone)
       OR (NEW.materials_supplied       IS DISTINCT FROM OLD.materials_supplied)
       OR (NEW.payment_terms            IS DISTINCT FROM OLD.payment_terms)
       OR (NEW.procurement_status       IS DISTINCT FROM OLD.procurement_status)
       OR (NEW.approved_for_medical_items  IS DISTINCT FROM OLD.approved_for_medical_items)
       OR (NEW.approved_for_critical_items IS DISTINCT FROM OLD.approved_for_critical_items)
       OR (NEW.remarks                  IS DISTINCT FROM OLD.remarks)
       OR (NEW.procurement_remarks      IS DISTINCT FROM OLD.procurement_remarks)
       OR (NEW.created_by               IS DISTINCT FROM OLD.created_by)
    THEN
      RAISE EXCEPTION
        'qc_user may only update qc_status, qc_remarks, and quality_rating on approved_suppliers';
    END IF;
  END IF;

  -- ── procurement_user: medical/critical self-approval guard ───────────────────
  -- (Original logic from migration 084 — preserved exactly.)
  IF public.current_user_role() = 'procurement_user' THEN
    IF (NEW.approved_for_medical_items IS DISTINCT FROM OLD.approved_for_medical_items
        AND NEW.approved_for_medical_items = true)
       OR (NEW.approved_for_critical_items IS DISTINCT FROM OLD.approved_for_critical_items
           AND NEW.approved_for_critical_items = true)
    THEN
      RAISE EXCEPTION
        'procurement_user may not set approved_for_medical_items or approved_for_critical_items to true; requires admin or operations_manager';
    END IF;

    -- ── procurement_user: procurement_status governance states blocked ──────
    -- (New check added in migration 086.)
    -- Only admin / operations_manager may approve, approve_with_conditions,
    -- suspend, or blacklist a supplier. procurement_user may only use:
    -- 'draft', 'pending_review', 'inactive'.
    IF NEW.procurement_status IS DISTINCT FROM OLD.procurement_status
       AND NEW.procurement_status IN ('approved', 'approved_with_conditions', 'suspended', 'blacklisted')
    THEN
      RAISE EXCEPTION
        'procurement_user may not set procurement_status to %; only admin or operations_manager may approve, suspend, or blacklist a supplier',
        NEW.procurement_status::text;
    END IF;
  END IF;

  -- ── Self-approval guard ──────────────────────────────────────────────────────
  -- (New check added in migration 086.)
  -- Applies when procurement_status is being set to an approval state.
  -- Blocks the user who created the supplier record from approving their own entry.
  -- Guard conditions: status is changing to an approval state, created_by is
  -- known (NOT NULL), and auth.uid() matches the creator.
  -- Does not apply to suspension/blacklisting (negative governance actions).
  IF NEW.procurement_status IS DISTINCT FROM OLD.procurement_status
     AND NEW.procurement_status IN ('approved', 'approved_with_conditions')
     AND OLD.created_by IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.created_by
  THEN
    RAISE EXCEPTION
      'Self-approval is not permitted: the current user created this supplier record. A different admin or operations_manager must set the approval status.';
  END IF;

  RETURN NEW;
END;
$$;

-- ── PART B: PR Item Terminal-State Guard ──────────────────────────────────────
--
-- Problem: pri_procurement_all (migration 020) is FOR ALL for procurement_user.
--   procurement_user can INSERT or UPDATE items on a parent PR that is in a
--   terminal state ('closed' or 'cancelled'), bypassing the PR-header
--   immutability already enforced in migration 085.
--
-- Terminal states (pr_status ENUM, migration 019): 'closed', 'cancelled'
--
-- Fix A — RLS: drop pri_procurement_all, replace with SELECT + INSERT + UPDATE.
--   No DELETE policy for procurement_user (consistent with PR header policy
--   from migration 085, which also removed DELETE for procurement_user).
--
-- Fix B — Trigger: BEFORE INSERT OR UPDATE trigger that raises an exception when
--   the parent procurement_request is in a terminal state. Admin and
--   operations_manager bypass the check (consistent with existing patterns).
--   The trigger covers INSERT and UPDATE. DELETE for procurement_user is already
--   blocked by the absence of a DELETE policy.

-- ── B-Fix A: Replace pri_procurement_all ─────────────────────────────────────

DROP POLICY IF EXISTS pri_procurement_all ON public.procurement_request_items;

-- SELECT: procurement_user can read all PR items.
CREATE POLICY pri_procurement_select ON public.procurement_request_items
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'procurement_user');

-- INSERT: procurement_user can add items (terminal-state guard in trigger below).
CREATE POLICY pri_procurement_insert ON public.procurement_request_items
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'procurement_user');

-- UPDATE: procurement_user can edit items (terminal-state guard in trigger below).
CREATE POLICY pri_procurement_update ON public.procurement_request_items
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'procurement_user')
  WITH CHECK (public.current_user_role() = 'procurement_user');

-- No DELETE policy for procurement_user — DELETE blocked by default.
-- Preserves audit trail for PR items and PO-to-PR item linkage.
-- admin / operations_manager can delete via pri_admin_all.

-- ── B-Fix B: BEFORE INSERT OR UPDATE trigger ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_pr_item_terminal_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pr_status text;
BEGIN
  -- admin and operations_manager are permitted to modify items regardless of
  -- parent PR state (consistent with pr_admin_all covering them).
  IF public.current_user_role() IN ('admin', 'operations_manager') THEN
    RETURN NEW;
  END IF;

  -- Retrieve the parent procurement request status.
  SELECT status::text
    INTO v_pr_status
    FROM public.procurement_requests
   WHERE id = NEW.procurement_request_id;

  -- Block mutation if parent PR is in a terminal state.
  IF v_pr_status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION
      'procurement_request_items cannot be modified: parent purchase request is in terminal state (%). '
      'Only admin or operations_manager may modify items on a closed or cancelled request.',
      v_pr_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pr_item_terminal_state ON public.procurement_request_items;

CREATE TRIGGER trg_pr_item_terminal_state
  BEFORE INSERT OR UPDATE ON public.procurement_request_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pr_item_terminal_state();

-- ── Existing policies: PRESERVED UNCHANGED ────────────────────────────────────
--
-- approved_suppliers:
--   sup_admin_all            — admin + operations_manager FOR ALL
--   sup_qc_select            — qc_user SELECT
--   sup_other_select         — factory_user, store_user, afs_user, viewer,
--                              sales_user SELECT approved/approved_with_conditions
--   sup_procurement_select   — procurement_user SELECT (migration 084)
--   sup_procurement_insert   — procurement_user INSERT (migration 084)
--   sup_procurement_update   — procurement_user UPDATE (migration 084)
--   sup_qc_update            — qc_user UPDATE (migration 084)
--   trg_enforce_qc_supplier_fields — BEFORE UPDATE trigger (migration 084,
--                                    function body replaced above)
--
-- procurement_request_items:
--   pri_admin_all            — admin + operations_manager FOR ALL (migration 020)
--   pri_ops_roles_select     — factory_user, store_user, qc_user, afs_user,
--                              viewer, sales_user SELECT (migration 020)
--   (pri_procurement_all replaced with split policies above)

-- ── Rollback (run in Supabase SQL editor to revert) ───────────────────────────
--
-- PART A rollback — restore enforce_qc_supplier_fields to migration 084 version:
-- (Replace function body with the original from migration 084 — removes the
--  procurement_status governance check and self-approval guard.)
--
-- PART B rollback — procurement_request_items:
-- DROP TRIGGER IF EXISTS trg_pr_item_terminal_state ON public.procurement_request_items;
-- DROP FUNCTION IF EXISTS public.enforce_pr_item_terminal_state();
--
-- DROP POLICY IF EXISTS pri_procurement_select ON public.procurement_request_items;
-- DROP POLICY IF EXISTS pri_procurement_insert ON public.procurement_request_items;
-- DROP POLICY IF EXISTS pri_procurement_update ON public.procurement_request_items;
-- CREATE POLICY pri_procurement_all ON public.procurement_request_items
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
--   );
