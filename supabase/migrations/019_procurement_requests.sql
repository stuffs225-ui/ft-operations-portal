-- ── Phase 5: Procurement Requests ────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE pr_status AS ENUM (
    'draft', 'pr_received', 'in_progress',
    'partially_ordered', 'fully_ordered', 'cancelled', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS procurement_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pr_number         text NOT NULL,
  received_date     date,
  requested_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  source_department text,
  status            pr_status NOT NULL DEFAULT 'draft',
  remarks           text,
  created_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, pr_number)
);

CREATE OR REPLACE FUNCTION update_pr_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS pr_updated_at ON procurement_requests;
CREATE TRIGGER pr_updated_at
  BEFORE UPDATE ON procurement_requests
  FOR EACH ROW EXECUTE FUNCTION update_pr_updated_at();

CREATE INDEX IF NOT EXISTS idx_pr_project_id ON procurement_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_pr_status      ON procurement_requests(status);

ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY pr_admin_all ON procurement_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);

CREATE POLICY pr_procurement_all ON procurement_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);

CREATE POLICY pr_sales_select ON procurement_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
  AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE POLICY pr_ops_roles_select ON procurement_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('factory_user','store_user','qc_user','afs_user','viewer'))
  AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.project_status = 'approved')
);
