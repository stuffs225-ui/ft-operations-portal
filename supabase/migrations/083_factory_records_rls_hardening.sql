-- ── Migration 083: Factory Records RLS Hardening (Step 6D) ──────────────────
--
-- Reference: docs/security/step-6d0-class-b-rls-owner-decisions.md (Q2)
-- Reference: docs/security/step-6b-rls-hardening-evidence-review.md (§3.7)
-- Classification: Class B → hardened
--
-- Product Owner Decision (Q2):
--   factory_user must NOT delete factory_records.
--   Factory records should be corrected through UPDATE or controlled status
--   handling. Deletions (if ever necessary) require admin or operations_manager.
--
-- Problem:
--   025_factory_records.sql created factory_user_all as FOR ALL, granting
--   factory_user the ability to DELETE production records. A factory worker
--   could delete a record to hide a missed deadline or failed status progression.
--   No WITH CHECK was present, and no project-status restriction existed.
--
-- Fix:
--   Drop factory_user_all. Replace with INSERT + UPDATE only (no DELETE).
--   A SELECT policy is also created to restore the SELECT access that was
--   implicitly granted by the FOR ALL policy (no standalone SELECT existed).
--
-- Deferred item:
--   factory_viewer_select (from 025) grants viewer and store_user SELECT on ALL
--   factory records regardless of project_status. This is inconsistent with
--   other operational tables that restrict reads to approved projects only.
--   However, restricting this requires verifying that no live pages break.
--   This restriction is documented as deferred to Step 6E. The existing
--   factory_viewer_select policy is NOT modified in this migration.
--
-- Scope:
--   ONLY factory_user_all is replaced.
--   factory_admin_all, factory_qc_select, factory_sales_select, factory_viewer_select
--   are NOT modified.
--   No schema changes. No trigger changes. No application code changes.
--
-- Idempotent: DROP IF EXISTS before CREATE ensures safe re-runs.
-- Uses public.current_user_role() (SECURITY DEFINER) per established pattern.
--
-- Rollback: see docs/security/step-6d-class-b-write-policy-hardening.md

-- ── Drop the broad FOR ALL policy ──────────────────────────────────────────────
-- Original: 025_factory_records.sql — factory_user_all FOR ALL
-- USING (EXISTS ... role = 'factory_user')
-- No WITH CHECK. Includes DELETE. No project_status restriction.

DROP POLICY IF EXISTS factory_user_all ON public.factory_records;

-- ── factory_user: SELECT + INSERT + UPDATE (no DELETE) ────────────────────────
-- SELECT restored because factory_user_all was the only SELECT source for factory_user.
-- No separate factory_user SELECT policy existed before this migration.

CREATE POLICY factory_user_select ON public.factory_records
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'factory_user');

-- factory_user creates factory records when a new WO is created for a project.
CREATE POLICY factory_user_insert ON public.factory_records
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'factory_user');

-- factory_user updates production_status, progress_percentage, dates, remarks.
-- WITH CHECK added (was absent in the original FOR ALL policy).
CREATE POLICY factory_user_update ON public.factory_records
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'factory_user')
  WITH CHECK (public.current_user_role() = 'factory_user');

-- No DELETE policy for factory_user — blocked by default.
-- Deletions require admin or operations_manager (factory_admin_all covers them).

-- ── Existing policies: PRESERVED UNCHANGED ─────────────────────────────────────
-- The following policies from 025_factory_records.sql are NOT modified:
--   factory_admin_all        — admin + operations_manager FOR ALL
--   factory_qc_select        — qc_user SELECT
--   factory_sales_select     — sales_user SELECT own projects
--   factory_viewer_select    — viewer + store_user SELECT ALL (see deferred note)

-- ── Rollback (commented — run in Supabase SQL editor to revert) ───────────────
-- DROP POLICY IF EXISTS factory_user_select ON public.factory_records;
-- DROP POLICY IF EXISTS factory_user_insert ON public.factory_records;
-- DROP POLICY IF EXISTS factory_user_update ON public.factory_records;
-- CREATE POLICY factory_user_all ON public.factory_records
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--        WHERE user_id = auth.uid()
--          AND role = 'factory_user'
--     )
--   );
