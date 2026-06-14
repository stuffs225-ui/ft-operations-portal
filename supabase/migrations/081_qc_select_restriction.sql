-- ── Migration 081: QC SELECT Policy Restriction (Step 6C) ────────────────────
--
-- Reference: docs/security/step-6b-rls-hardening-evidence-review.md
-- Classification: Class A — safe first migration
-- PR: Step 6C — QC SELECT RLS Restriction
--
-- Problem:
--   Five QC/release tables (035–040) were created with a blanket
--   FOR SELECT USING (true) policy, granting every authenticated user
--   read access to all QC inspection results, NCRs, project findings,
--   and release notes regardless of role or project ownership.
--
-- Fix:
--   Replace the single USING (true) SELECT policy on each table with
--   two narrower policies:
--     1. Operational roles (admin, operations_manager, qc_user, factory_user,
--        store_user, afs_user, viewer) get full read access — they all have
--        legitimate operational need to see QC data.
--     2. sales_user gets own-project-only access via a project_id subquery
--        on projects.created_by = auth.uid() (matches projects RLS pattern).
--   Roles with no operational QC need (sales_coordinator, procurement_user)
--   receive no SELECT grant and will see zero rows.
--
-- Scope:
--   ONLY SELECT policies are changed.
--   INSERT, UPDATE, DELETE policies are NOT modified.
--   No schema changes. No trigger changes. No application code changes.
--
-- Idempotent: DROP IF EXISTS before CREATE ensures safe re-runs.
-- All policies use public.current_user_role() (SECURITY DEFINER) per
-- the established pattern from migration 061 onward.
--
-- Rollback: see docs/security/step-6c-qc-select-rls-restriction.md

-- ── 1. material_qc_inspections ─────────────────────────────────────────────────
-- Original broad policy: 035_material_qc_inspections.sql — mqc_select USING (true)
-- Note: project_id is NULLABLE on this table. The sales_user subquery safely
-- excludes NULL-project rows because NULL IN (...) evaluates to false in SQL.
-- created_by is used (not sales_owner_id) because:
--   1. The projects RLS "sales_user read own" policy filters on created_by = auth.uid().
--      A subquery using sales_owner_id would be additionally filtered by that RLS to
--      require created_by = auth.uid() too, silently excluding rows if the two differ.
--   2. Matches the pattern in migrations 010, 011, 012 (project sub-tables).

DROP POLICY IF EXISTS mqc_select ON public.material_qc_inspections;

-- Operational roles: full read access for QC workflow, rework tracking, store ops, AFS
CREATE POLICY mqc_select_operational ON public.material_qc_inspections
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'afs_user', 'viewer'
    )
  );

-- Sales user: own-project-only visibility (created_by matches projects RLS)
CREATE POLICY mqc_select_sales ON public.material_qc_inspections
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'sales_user'
    AND project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- ── 2. material_ncrs ───────────────────────────────────────────────────────────
-- Original broad policy: 036_material_ncrs.sql — ncr_select USING (true)
-- Note: project_id is NULLABLE on this table. Same NULL-safety applies as above.

DROP POLICY IF EXISTS ncr_select ON public.material_ncrs;

-- Operational roles: full read access (NCRs feed corrective action and supplier follow-up)
CREATE POLICY ncr_select_operational ON public.material_ncrs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'afs_user', 'viewer'
    )
  );

-- Sales user: own-project-only (created_by matches projects RLS; nullable rows excluded)
CREATE POLICY ncr_select_sales ON public.material_ncrs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'sales_user'
    AND project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- ── 3. project_qc_inspections ─────────────────────────────────────────────────
-- Original broad policy: 037_project_qc_inspections.sql — pqc_select USING (true)
-- Note: project_id is NOT NULL on this table — subquery is straightforward.

DROP POLICY IF EXISTS pqc_select ON public.project_qc_inspections;

-- Operational roles: full read access (QC, factory rework, AFS post-delivery, management)
CREATE POLICY pqc_select_operational ON public.project_qc_inspections
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'afs_user', 'viewer'
    )
  );

-- Sales user: own-project-only (created_by matches projects RLS; project_id NOT NULL)
CREATE POLICY pqc_select_sales ON public.project_qc_inspections
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'sales_user'
    AND project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- ── 4. project_qc_findings ────────────────────────────────────────────────────
-- Original broad policy: 038_project_qc_findings.sql — fnd_select USING (true)
-- Note: project_id is NOT NULL on this table.
-- Open findings gate release note issuance (trigger 076_release_note_gate.sql).
-- That trigger is SECURITY DEFINER and bypasses RLS — it is not affected by this change.

DROP POLICY IF EXISTS fnd_select ON public.project_qc_findings;

-- Operational roles: full read access (QC findings drive rework and release gate)
CREATE POLICY fnd_select_operational ON public.project_qc_findings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'afs_user', 'viewer'
    )
  );

-- Sales user: own-project-only (created_by matches projects RLS; project_id NOT NULL)
CREATE POLICY fnd_select_sales ON public.project_qc_findings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'sales_user'
    AND project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- ── 5. release_notes ──────────────────────────────────────────────────────────
-- Original broad policy: 040_release_notes.sql — rn_select USING (true)
-- Note: project_id is NOT NULL on this table.
-- Governance: trigger 076_release_note_gate.sql blocks issuance when open findings exist.
-- Audit:      trigger 080_unified_audit_trigger.sql captures before/after into audit_log.
-- Both triggers are SECURITY DEFINER — not affected by this SELECT restriction.

DROP POLICY IF EXISTS rn_select ON public.release_notes;

-- Operational roles: full read access (release notes are visible to all ops roles)
CREATE POLICY rn_select_operational ON public.release_notes
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'afs_user', 'viewer'
    )
  );

-- Sales user: own-project-only (created_by matches projects RLS; project_id NOT NULL)
CREATE POLICY rn_select_sales ON public.release_notes
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'sales_user'
    AND project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- ── Rollback script (commented — do not uncomment here) ───────────────────────
-- To revert this migration, run the following SQL directly in Supabase SQL editor:
--
-- DROP POLICY IF EXISTS mqc_select_operational ON public.material_qc_inspections;
-- DROP POLICY IF EXISTS mqc_select_sales       ON public.material_qc_inspections;
-- CREATE POLICY mqc_select ON public.material_qc_inspections
--   FOR SELECT TO authenticated USING (true);
--
-- DROP POLICY IF EXISTS ncr_select_operational ON public.material_ncrs;
-- DROP POLICY IF EXISTS ncr_select_sales       ON public.material_ncrs;
-- CREATE POLICY ncr_select ON public.material_ncrs
--   FOR SELECT TO authenticated USING (true);
--
-- DROP POLICY IF EXISTS pqc_select_operational ON public.project_qc_inspections;
-- DROP POLICY IF EXISTS pqc_select_sales       ON public.project_qc_inspections;
-- CREATE POLICY pqc_select ON public.project_qc_inspections
--   FOR SELECT TO authenticated USING (true);
--
-- DROP POLICY IF EXISTS fnd_select_operational ON public.project_qc_findings;
-- DROP POLICY IF EXISTS fnd_select_sales       ON public.project_qc_findings;
-- CREATE POLICY fnd_select ON public.project_qc_findings
--   FOR SELECT TO authenticated USING (true);
--
-- DROP POLICY IF EXISTS rn_select_operational  ON public.release_notes;
-- DROP POLICY IF EXISTS rn_select_sales        ON public.release_notes;
-- CREATE POLICY rn_select ON public.release_notes
--   FOR SELECT TO authenticated USING (true);
