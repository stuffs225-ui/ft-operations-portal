-- ── Migration 082: Medical Serial Numbers RLS Hardening (Step 6D) ────────────
--
-- Reference: docs/security/step-6d0-class-b-rls-owner-decisions.md
-- Reference: docs/security/step-6b-rls-hardening-evidence-review.md (§3.6)
-- Classification: Class B → hardened
--
-- Problem:
--   031_medical_serial_numbers.sql created a single FOR ALL policy
--   (medical_serials_broad_all) granting store_user, admin, operations_manager,
--   AND qc_user FULL access including DELETE on compliance-critical records.
--
--   Medical serial numbers are regulatory audit records (feeding the medical
--   serial gate trigger, migration 077). qc_user must NEVER delete them.
--   store_user must NEVER delete them.
--
-- Fix:
--   Drop the broad FOR ALL policy. Replace with role-split policies:
--     admin / operations_manager : FOR ALL (full administrative control)
--     store_user                 : SELECT + INSERT + UPDATE (no DELETE)
--     qc_user                    : SELECT + UPDATE (no INSERT, no DELETE)
--   Existing SELECT-only policies (factory, sales, viewer) are PRESERVED unchanged.
--
-- Scope:
--   ONLY the medical_serials_broad_all policy is replaced.
--   No schema changes. No trigger changes. No application code changes.
--   Existing SELECT policies for factory_user, afs_user, sales_user, viewer untouched.
--
-- Idempotent: DROP IF EXISTS before CREATE ensures safe re-runs.
-- Uses public.current_user_role() (SECURITY DEFINER) per established pattern.
--
-- Rollback: see docs/security/step-6d-class-b-write-policy-hardening.md

-- ── Drop the broad FOR ALL policy ──────────────────────────────────────────────
-- Original: 031_medical_serial_numbers.sql — medical_serials_broad_all FOR ALL
-- USING (EXISTS ... role IN ('store_user','admin','operations_manager','qc_user'))
-- No WITH CHECK. Includes DELETE for all four roles. Regulatory compliance risk.

DROP POLICY IF EXISTS medical_serials_broad_all ON public.medical_serial_numbers;

-- ── 1. admin / operations_manager: full administrative control ─────────────────
-- Retains the administrative access that was in the broad_all policy.
-- WITH CHECK added for completeness (was absent in the original FOR ALL policy).

CREATE POLICY medical_serials_admin_all ON public.medical_serial_numbers
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'operations_manager')
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'operations_manager')
  );

-- ── 2. store_user: SELECT + INSERT + UPDATE (no DELETE) ───────────────────────
-- store_user registers medical serial numbers when items are received at store.
-- They may correct serial data (UPDATE) but must not delete compliance records.
-- SELECT restored because broad_all provided it and there was no separate policy.

CREATE POLICY medical_serials_store_select ON public.medical_serial_numbers
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'store_user');

CREATE POLICY medical_serials_store_insert ON public.medical_serial_numbers
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'store_user');

CREATE POLICY medical_serials_store_update ON public.medical_serial_numbers
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'store_user')
  WITH CHECK (public.current_user_role() = 'store_user');

-- ── 3. qc_user: SELECT + UPDATE only (no INSERT, no DELETE) ───────────────────
-- qc_user updates qc_status and remarks on existing records during QC inspection.
-- They do NOT create serial records (store_user does on receipt).
-- They must NOT delete serial records — deletion is a regulatory compliance risk.
-- SELECT restored because broad_all provided it and there was no separate policy.

CREATE POLICY medical_serials_qc_select ON public.medical_serial_numbers
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'qc_user');

CREATE POLICY medical_serials_qc_update ON public.medical_serial_numbers
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'qc_user')
  WITH CHECK (public.current_user_role() = 'qc_user');

-- ── Existing SELECT policies: PRESERVED UNCHANGED ──────────────────────────────
-- The following policies from 031_medical_serial_numbers.sql are NOT modified:
--   medical_serials_factory_select  — factory_user + afs_user SELECT
--   medical_serials_sales_select    — sales_user SELECT own project
--   medical_serials_viewer_select   — viewer SELECT

-- ── Rollback (commented — run in Supabase SQL editor to revert) ───────────────
-- DROP POLICY IF EXISTS medical_serials_admin_all    ON public.medical_serial_numbers;
-- DROP POLICY IF EXISTS medical_serials_store_select ON public.medical_serial_numbers;
-- DROP POLICY IF EXISTS medical_serials_store_insert ON public.medical_serial_numbers;
-- DROP POLICY IF EXISTS medical_serials_store_update ON public.medical_serial_numbers;
-- DROP POLICY IF EXISTS medical_serials_qc_select    ON public.medical_serial_numbers;
-- DROP POLICY IF EXISTS medical_serials_qc_update    ON public.medical_serial_numbers;
-- CREATE POLICY medical_serials_broad_all ON public.medical_serial_numbers
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--        WHERE user_id = auth.uid()
--          AND role IN ('store_user', 'admin', 'operations_manager', 'qc_user')
--     )
--   );
