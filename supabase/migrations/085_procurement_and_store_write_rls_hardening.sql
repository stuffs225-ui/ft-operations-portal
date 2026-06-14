-- ── Migration 085: Procurement and Store Write RLS Hardening (Step 6D) ───────
--
-- Reference: docs/security/step-6d0-class-b-rls-owner-decisions.md (Q3, Q4)
-- Reference: docs/security/step-6b-rls-hardening-evidence-review.md (§3.9–3.12)
-- Classification: Class B → hardened
--
-- This migration covers three related tables in one script:
--
--   Part A — procurement_requests  (Q3 decision)
--   Part B — store_receipts        (Q4 decision)
--   Part C — material_custody_records (custody approval governance, Rule 7)
--
-- ── PART A: procurement_requests ─────────────────────────────────────────────
--
-- Product Owner Decision (Q3):
--   procurement_user must NOT delete procurement_requests.
--   PRs should be cancelled via status = 'cancelled', not deleted.
--   PRs in terminal states (closed, cancelled) must not be retroactively edited.
--
-- Problem:
--   019_procurement_requests.sql: pr_procurement_all is FOR ALL for
--   procurement_user with no WITH CHECK. procurement_user can delete closed/
--   cancelled PRs, removing the audit trail and corrupting the PO-to-PR linkage
--   (purchase_orders_to_supplier.procurement_request_id would become NULL via FK).
--
-- Fix:
--   Drop pr_procurement_all. Replace with SELECT + INSERT + UPDATE.
--   UPDATE USING clause enforces: status NOT IN ('closed', 'cancelled').
--   procurement_user cannot edit terminal-state PRs.
--   No DELETE policy — DELETE blocked by default.
--   SELECT policy restores read access that was in pr_procurement_all.

DROP POLICY IF EXISTS pr_procurement_all ON public.procurement_requests;

CREATE POLICY pr_procurement_select ON public.procurement_requests
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'procurement_user');

CREATE POLICY pr_procurement_insert ON public.procurement_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'procurement_user');

-- Terminal-state guard: procurement_user cannot edit closed or cancelled PRs.
-- To retire a PR, set status = 'cancelled' (allowed while not yet in terminal state).
CREATE POLICY pr_procurement_update ON public.procurement_requests
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'procurement_user'
    AND status NOT IN ('closed', 'cancelled')
  )
  WITH CHECK (public.current_user_role() = 'procurement_user');

-- Existing policies NOT modified:
--   pr_admin_all        — admin + operations_manager FOR ALL
--   pr_sales_select     — sales_user SELECT own projects
--   pr_ops_roles_select — factory/store/qc/afs/viewer SELECT approved projects

-- ── PART B: store_receipts ───────────────────────────────────────────────────
--
-- Product Owner Decision (Q4):
--   store_user must NOT update receipt_number after creation.
--   receipt_number (RCP-YYYY-NNNN) is immutable after INSERT.
--
-- Problem:
--   029_store_receipts.sql: store_receipts_store_all is FOR ALL with no WITH CHECK.
--   store_user (and admin/ops through same policy) can update receipt_number,
--   creating a mismatch between the database record and physical delivery paperwork.
--   The auto-number trigger only fires on INSERT — no protection on UPDATE.
--
-- Fix:
--   Drop store_receipts_store_all. Recreate with WITH CHECK.
--   Add SECURITY DEFINER BEFORE UPDATE trigger (enforce_receipt_number_immutability)
--   that raises an exception if receipt_number changes on any UPDATE.
--   The trigger applies to ALL roles (including admin) to ensure the sequential
--   number scheme is never corrupted. Admin can correct errors by deleting
--   a wrongly-created receipt and re-inserting, which generates a new auto-number.

DROP POLICY IF EXISTS store_receipts_store_all ON public.store_receipts;

-- Recreate with same role coverage AND WITH CHECK.
-- Roles: store_user, admin, operations_manager — unchanged from original.
CREATE POLICY store_receipts_store_all ON public.store_receipts
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  )
  WITH CHECK (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  );

-- BEFORE UPDATE trigger: receipt_number is immutable after creation.
-- Applies to all roles — the auto-number scheme must be preserved.
-- Admin or ops who need to correct a receipt number must delete + re-insert.
CREATE OR REPLACE FUNCTION public.enforce_receipt_number_immutability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.receipt_number IS DISTINCT FROM OLD.receipt_number THEN
    RAISE EXCEPTION
      'receipt_number is immutable after creation (current: %, attempted: %)',
      OLD.receipt_number, NEW.receipt_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_receipt_number ON public.store_receipts;

CREATE TRIGGER trg_lock_receipt_number
  BEFORE UPDATE ON public.store_receipts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_receipt_number_immutability();

-- Existing policies NOT modified:
--   store_receipts_ops_select    — procurement/factory/afs/qc SELECT
--   store_receipts_sales_select  — sales_user SELECT own project
--   store_receipts_viewer_select — viewer SELECT

-- ── PART C: material_custody_records ─────────────────────────────────────────
--
-- Governance rule (CLAUDE_PROJECT_RULES.md Rule 7):
--   "Temporary Custody: Requires Admin or Operations Manager approval before
--   handover."
--
-- Problem:
--   034_material_custody_records.sql: custody_records_store_all is FOR ALL
--   for store_user + admin + operations_manager with no WITH CHECK.
--   store_user can update approval_status to 'approved' and set approved_by,
--   effectively self-approving custody without admin/ops sign-off.
--   The auto-number trigger generates CUS-YYYY-NNNN on INSERT — store_user
--   could also INSERT a pre-approved record.
--
-- Fix:
--   Drop custody_records_store_all. Recreate with WITH CHECK.
--   Add SECURITY DEFINER BEFORE INSERT OR UPDATE trigger:
--     enforce_custody_approval_restriction() — prevents store_user from:
--       - creating records with approval_status = 'approved' (INSERT)
--       - modifying any approval-related field (UPDATE):
--         approval_status, approved_by, approved_at,
--         rejected_by, rejected_at, rejection_reason
--   admin and operations_manager pass through the trigger without restriction.
--
-- Deferred items (Step 6E):
--   custody_records_factory_update has no WITH CHECK. factory_user/afs_user
--   can theoretically change issued_to_user_id on their own custody records.
--   This is deferred to Step 6E pending UX review of the acceptance workflow.

DROP POLICY IF EXISTS custody_records_store_all ON public.material_custody_records;

-- Recreate with same role coverage AND WITH CHECK.
-- Roles: store_user, admin, operations_manager — unchanged from original.
CREATE POLICY custody_records_store_all ON public.material_custody_records
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  )
  WITH CHECK (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  );

-- BEFORE INSERT OR UPDATE trigger: prevent store_user from self-approving custody.
-- admin and operations_manager are not restricted by this trigger.
CREATE OR REPLACE FUNCTION public.enforce_custody_approval_restriction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_user_role() = 'store_user' THEN
    IF TG_OP = 'INSERT' THEN
      -- store_user cannot create a pre-approved custody record
      IF NEW.approval_status = 'approved'
         OR NEW.approved_by IS NOT NULL
      THEN
        RAISE EXCEPTION
          'store_user may not create custody records with approval pre-set; use admin approval workflow';
      END IF;

    ELSIF TG_OP = 'UPDATE' THEN
      -- store_user cannot modify approval-related fields
      IF (NEW.approval_status  IS DISTINCT FROM OLD.approval_status)
         OR (NEW.approved_by   IS DISTINCT FROM OLD.approved_by)
         OR (NEW.approved_at   IS DISTINCT FROM OLD.approved_at)
         OR (NEW.rejected_by   IS DISTINCT FROM OLD.rejected_by)
         OR (NEW.rejected_at   IS DISTINCT FROM OLD.rejected_at)
         OR (NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason)
      THEN
        RAISE EXCEPTION
          'store_user may not modify custody approval fields; approval requires admin or operations_manager';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_custody_approval ON public.material_custody_records;

CREATE TRIGGER trg_enforce_custody_approval
  BEFORE INSERT OR UPDATE ON public.material_custody_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_custody_approval_restriction();

-- Existing policies NOT modified:
--   custody_records_factory_select — factory_user + afs_user SELECT
--   custody_records_factory_update — factory/afs UPDATE own records (issued_to_user_id)
--   custody_records_sales_select   — sales_user SELECT own project
--   custody_records_viewer_select  — viewer SELECT

-- ── Rollback for all three parts (run in Supabase SQL editor to revert) ───────
--
-- PART A rollback — procurement_requests:
-- DROP POLICY IF EXISTS pr_procurement_select ON public.procurement_requests;
-- DROP POLICY IF EXISTS pr_procurement_insert ON public.procurement_requests;
-- DROP POLICY IF EXISTS pr_procurement_update ON public.procurement_requests;
-- CREATE POLICY pr_procurement_all ON public.procurement_requests
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
--   );
--
-- PART B rollback — store_receipts:
-- DROP TRIGGER IF EXISTS trg_lock_receipt_number ON public.store_receipts;
-- DROP FUNCTION IF EXISTS public.enforce_receipt_number_immutability();
-- DROP POLICY IF EXISTS store_receipts_store_all ON public.store_receipts;
-- CREATE POLICY store_receipts_store_all ON public.store_receipts
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
--       AND role IN ('store_user', 'admin', 'operations_manager'))
--   );
--
-- PART C rollback — material_custody_records:
-- DROP TRIGGER IF EXISTS trg_enforce_custody_approval ON public.material_custody_records;
-- DROP FUNCTION IF EXISTS public.enforce_custody_approval_restriction();
-- DROP POLICY IF EXISTS custody_records_store_all ON public.material_custody_records;
-- CREATE POLICY custody_records_store_all ON public.material_custody_records
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
--       AND role IN ('store_user', 'admin', 'operations_manager'))
--   );
