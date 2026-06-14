-- ── Migration 090: Project Department Routing Persistence (Step 9C) ───────────
--
-- Gap closed: G-9A-01
--   Step 9A audit (docs/implementation/step-9a-so-approval-routing-audit.md §6)
--   found that AdminApprovals.tsx ApproveModal writes 6 department routing
--   checkbox values only into project_timeline_events.metadata.routing.
--   They are not persisted in a structured table, making routing decisions
--   impossible to query, audit, or use for downstream module visibility.
--
-- This migration creates project_department_routing to close G-9A-01.
--
-- Persistence approach — checked-only:
--   Only departments with is_required = true (checked) are inserted.
--   Unchecked departments are not inserted.
--   Rationale: the table is a positive list of active routing destinations.
--   Downstream modules check for row existence rather than checking is_required.
--   The timeline event metadata continues to record all checkbox states
--   (both checked and unchecked) for full backward-compatible audit trail.
--
-- Department values:
--   procurement  — Procurement department
--   factory      — Factory / Production (Saudi route)
--   store        — Store / Warehouse
--   material_qc  — Material QC (auto-checked for medical items)
--   project_qc   — Project QC
--   dubai_afs    — Dubai / AFS (auto-checked for Dubai route)
--
-- Source values:
--   'so_approval' — inserted by AdminApprovals.tsx ApproveModal (this step)
--   Other values reserved for future routing sources (admin edits, re-routing).
--
-- RLS layers:
--   Layer 1: admin / operations_manager FOR ALL
--   Layer 2: viewer SELECT all
--   Layer 3: department operational users SELECT only their own department rows
--             (procurement_user → procurement; factory_user → factory;
--              store_user → store; qc_user → material_qc + project_qc;
--              afs_user → dubai_afs)
--   No department user can INSERT / UPDATE / DELETE.
--
-- No schema changes to existing tables.
-- No changes to existing RLS policies.
-- No changes to existing trigger functions.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.project_department_routing;
--   DROP FUNCTION IF EXISTS public.set_updated_at_pdr();

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_department_routing (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  department  text        NOT NULL,
  is_required boolean     NOT NULL DEFAULT true,
  routed_at   timestamptz NOT NULL DEFAULT now(),
  routed_by   uuid        REFERENCES auth.users(id),
  source      text        NOT NULL DEFAULT 'so_approval',
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pdr_department_valid CHECK (
    department IN ('procurement', 'factory', 'store', 'material_qc', 'project_qc', 'dubai_afs')
  ),

  CONSTRAINT pdr_source_nonempty CHECK (source <> ''),

  CONSTRAINT pdr_project_department_unique UNIQUE (project_id, department)
);

CREATE INDEX idx_pdr_project    ON public.project_department_routing(project_id);
CREATE INDEX idx_pdr_department ON public.project_department_routing(department);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- No shared updated_at function exists in this repo; each table defines its own
-- small function (pattern established in migration 041_dubai_project_followups).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at_pdr()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pdr_updated_at
  BEFORE UPDATE ON public.project_department_routing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_pdr();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_department_routing ENABLE ROW LEVEL SECURITY;

-- admin and operations_manager: full access
CREATE POLICY pdr_admin_all ON public.project_department_routing
  FOR ALL TO authenticated
  USING    (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

-- viewer: read-only, all rows
CREATE POLICY pdr_viewer_select ON public.project_department_routing
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'viewer');

-- procurement_user: read own department rows only
CREATE POLICY pdr_procurement_select ON public.project_department_routing
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'procurement_user'
    AND department = 'procurement'
  );

-- factory_user: read own department rows only
CREATE POLICY pdr_factory_select ON public.project_department_routing
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'factory_user'
    AND department = 'factory'
  );

-- store_user: read own department rows only
CREATE POLICY pdr_store_select ON public.project_department_routing
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'store_user'
    AND department = 'store'
  );

-- qc_user: read material_qc and project_qc rows
CREATE POLICY pdr_qc_select ON public.project_department_routing
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'qc_user'
    AND department IN ('material_qc', 'project_qc')
  );

-- afs_user: read dubai_afs rows only
CREATE POLICY pdr_afs_select ON public.project_department_routing
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'afs_user'
    AND department = 'dubai_afs'
  );

-- ── Verification comment ───────────────────────────────────────────────────────
--
-- Manual test scenarios (run in Supabase SQL editor or psql as the target role):
--
-- SETUP: Create an approved Saudi medical project (project_id = '<proj_id>'):
--   INSERT INTO project_department_routing
--     (project_id, department, routed_by, source, metadata)
--   VALUES
--     ('<proj_id>', 'procurement', '<user_id>', 'so_approval', '{"manufacturing_location":"saudi","medical_items":"yes"}'),
--     ('<proj_id>', 'factory',     '<user_id>', 'so_approval', '{"manufacturing_location":"saudi","medical_items":"yes"}'),
--     ('<proj_id>', 'store',       '<user_id>', 'so_approval', '{"manufacturing_location":"saudi","medical_items":"yes"}'),
--     ('<proj_id>', 'material_qc', '<user_id>', 'so_approval', '{"manufacturing_location":"saudi","medical_items":"yes"}'),
--     ('<proj_id>', 'project_qc',  '<user_id>', 'so_approval', '{"manufacturing_location":"saudi","medical_items":"yes"}');
--
-- TEST 1 — viewer can SELECT all rows:
--   SET ROLE viewer; -- or switch to viewer session
--   SELECT * FROM project_department_routing;
--   Expected: all rows returned
--
-- TEST 2 — procurement_user sees only procurement row:
--   SET ROLE procurement_user;
--   SELECT department FROM project_department_routing WHERE project_id = '<proj_id>';
--   Expected: only 'procurement'
--
-- TEST 3 — factory_user sees only factory row:
--   Expected: only 'factory'
--
-- TEST 4 — store_user sees only store row:
--   Expected: only 'store'
--
-- TEST 5 — qc_user sees material_qc and project_qc:
--   Expected: 'material_qc', 'project_qc'
--
-- TEST 6 — afs_user sees only dubai_afs (insert dubai_afs row first):
--   Expected: only 'dubai_afs'
--
-- TEST 7 — procurement_user cannot INSERT:
--   INSERT INTO project_department_routing (project_id, department)
--   VALUES ('<proj_id>', 'procurement');
--   Expected: ERROR — RLS policy violation
--
-- TEST 8 — admin can SELECT, INSERT, UPDATE, DELETE:
--   Expected: all operations succeed
--
-- TEST 9 — department constraint rejects invalid value:
--   INSERT INTO project_department_routing (project_id, department)
--   VALUES ('<proj_id>', 'shipping');
--   Expected: ERROR — pdr_department_valid constraint violation
--
-- TEST 10 — unique constraint prevents duplicate project+department:
--   INSERT two rows with the same project_id + department:
--   Expected: ERROR on second INSERT (use upsert in application layer)
