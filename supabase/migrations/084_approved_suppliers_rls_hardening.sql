-- ── Migration 084: Approved Suppliers RLS Hardening (Step 6D) ───────────────
--
-- Reference: docs/security/step-6d0-class-b-rls-owner-decisions.md (Q1)
-- Reference: docs/security/step-6b-rls-hardening-evidence-review.md (§3.8)
-- Classification: Class B → hardened
--
-- Product Owner Decision (Q1):
--   qc_user may update ONLY: qc_status, qc_remarks, quality_rating
--   qc_user must NOT update:
--     supplier master fields (supplier_name, supplier_category, contact_person,
--     email, phone, materials_supplied, payment_terms)
--     procurement approval fields (procurement_status)
--     medical/critical approval flags (approved_for_medical_items,
--     approved_for_critical_items)
--     commercial/audit fields (remarks, procurement_remarks, created_by)
--   procurement_user must NOT self-approve medical/critical supplier eligibility.
--
-- Problem:
--   024_approved_suppliers.sql created:
--     sup_procurement_all — FOR ALL for procurement_user (no WITH CHECK):
--       procurement_user could set approved_for_medical_items = true without
--       QC sign-off, bypassing the medical device approval workflow.
--     sup_qc_update — FOR UPDATE for qc_user (no WITH CHECK):
--       qc_user could overwrite supplier_name, payment_terms, procurement_status,
--       and approved_for_medical_items — all outside their domain.
--
-- Fix A — procurement_user:
--   Drop sup_procurement_all. Replace with INSERT + UPDATE policies.
--   The UPDATE WITH CHECK enforces: approved_for_medical_items = false AND
--   approved_for_critical_items = false. This prevents procurement_user from
--   self-approving a supplier for medical or critical item use — only admin or
--   operations_manager can set these flags to true.
--   A SELECT policy restores the read access that was in sup_procurement_all.
--
-- Fix B — qc_user:
--   Drop sup_qc_update (no WITH CHECK). Replace with WITH CHECK.
--   RLS WITH CHECK applies to the resulting NEW row, not to changed columns.
--   Column-level enforcement (restrict qc_user to qc_status, qc_remarks,
--   quality_rating) requires a BEFORE UPDATE trigger because RLS cannot compare
--   OLD vs NEW column values.
--   A SECURITY DEFINER BEFORE UPDATE trigger is added:
--     enforce_qc_supplier_fields() — raises an exception if qc_user attempts
--     to change any column outside their permitted field list.
--
-- Scope:
--   sup_procurement_all and sup_qc_update are replaced.
--   sup_admin_all, sup_qc_select, sup_other_select are NOT modified.
--   No schema changes.
--   No application code changes.
--
-- Idempotent: DROP IF EXISTS before CREATE. CREATE OR REPLACE for the function.
-- Uses public.current_user_role() (SECURITY DEFINER) per established pattern.
--
-- Rollback: see docs/security/step-6d-class-b-write-policy-hardening.md

-- ── A. procurement_user: split FOR ALL → SELECT + INSERT + UPDATE ─────────────

-- Original: 024_approved_suppliers.sql — sup_procurement_all FOR ALL
-- USING (EXISTS ... role = 'procurement_user')
-- No WITH CHECK. Includes DELETE. No medical/critical approval guard.
DROP POLICY IF EXISTS sup_procurement_all ON public.approved_suppliers;

-- SELECT restored: sup_procurement_all was the only SELECT source for procurement_user.
CREATE POLICY sup_procurement_select ON public.approved_suppliers
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'procurement_user');

CREATE POLICY sup_procurement_insert ON public.approved_suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'procurement_user');

-- UPDATE WITH CHECK: procurement_user cannot self-approve medical/critical eligibility.
-- Only admin or operations_manager (via sup_admin_all) can set these flags to true.
CREATE POLICY sup_procurement_update ON public.approved_suppliers
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'procurement_user')
  WITH CHECK (
    public.current_user_role() = 'procurement_user'
    AND approved_for_medical_items  = false
    AND approved_for_critical_items = false
  );

-- No DELETE policy for procurement_user — blocked by default.

-- ── B. qc_user: replace sup_qc_update with WITH CHECK ────────────────────────

-- Original: 024_approved_suppliers.sql — sup_qc_update FOR UPDATE
-- USING (EXISTS ... role = 'qc_user') — no WITH CHECK.
DROP POLICY IF EXISTS sup_qc_update ON public.approved_suppliers;

-- WITH CHECK added. Column-level restriction enforced by trigger below.
CREATE POLICY sup_qc_update ON public.approved_suppliers
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'qc_user')
  WITH CHECK (public.current_user_role() = 'qc_user');

-- ── B2. BEFORE UPDATE trigger: enforce qc_user column-level restriction ────────
-- RLS WITH CHECK operates on the resulting NEW row and cannot detect which
-- individual columns changed (OLD is not available in WITH CHECK). A SECURITY
-- DEFINER BEFORE UPDATE trigger is the correct PostgreSQL mechanism to enforce
-- per-column restrictions while still allowing qc_status, qc_remarks,
-- quality_rating, and system-managed fields (updated_at) to change.
--
-- Permitted changes for qc_user: qc_status, qc_remarks, quality_rating, updated_at.
-- All other columns must be unchanged from OLD.

CREATE OR REPLACE FUNCTION public.enforce_qc_supplier_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only restrict qc_user; admin/ops/procurement handled by their own policies.
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
  RETURN NEW;
END;
$$;

-- Drop before create to allow safe re-runs.
DROP TRIGGER IF EXISTS trg_enforce_qc_supplier_fields ON public.approved_suppliers;

CREATE TRIGGER trg_enforce_qc_supplier_fields
  BEFORE UPDATE ON public.approved_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_qc_supplier_fields();

-- ── Existing policies: PRESERVED UNCHANGED ─────────────────────────────────────
-- The following policies from 024_approved_suppliers.sql are NOT modified:
--   sup_admin_all   — admin + operations_manager FOR ALL (full control)
--   sup_qc_select   — qc_user SELECT (provides read access for qc_user)
--   sup_other_select — factory_user, store_user, afs_user, viewer, sales_user
--                      SELECT approved/approved_with_conditions only

-- ── Rollback (commented — run in Supabase SQL editor to revert) ───────────────
-- DROP TRIGGER IF EXISTS trg_enforce_qc_supplier_fields ON public.approved_suppliers;
-- DROP FUNCTION IF EXISTS public.enforce_qc_supplier_fields();
--
-- DROP POLICY IF EXISTS sup_procurement_select ON public.approved_suppliers;
-- DROP POLICY IF EXISTS sup_procurement_insert ON public.approved_suppliers;
-- DROP POLICY IF EXISTS sup_procurement_update ON public.approved_suppliers;
-- CREATE POLICY sup_procurement_all ON public.approved_suppliers
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
--   );
--
-- DROP POLICY IF EXISTS sup_qc_update ON public.approved_suppliers;
-- CREATE POLICY sup_qc_update ON public.approved_suppliers
--   FOR UPDATE USING (
--     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'qc_user')
--   );
