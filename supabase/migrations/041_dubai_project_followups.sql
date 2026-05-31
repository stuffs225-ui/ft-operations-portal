-- Phase 9: Dubai Project Follow-ups

CREATE TYPE dubai_status_enum AS ENUM (
  'not_started', 'pending_dubai_po', 'dubai_po_sent', 'under_dubai_production',
  'eta_confirmed', 'in_transit', 'arrived_ksa', 'handed_to_afs',
  'ready_for_pre_delivery', 'completed', 'on_hold', 'cancelled'
);

CREATE TYPE eta_status_enum AS ENUM (
  'not_set', 'on_track', 'delayed', 'changed', 'arrived'
);

CREATE TABLE IF NOT EXISTS dubai_project_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  pn_reference_id uuid REFERENCES project_execution_references(id) ON DELETE SET NULL,
  dubai_po_number text,
  dubai_po_date date,
  dubai_status dubai_status_enum NOT NULL DEFAULT 'not_started',
  eta_date date,
  eta_status eta_status_enum NOT NULL DEFAULT 'not_set',
  last_followup_date timestamptz,
  next_followup_date timestamptz,
  followed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dpf_project ON dubai_project_followups(project_id);
CREATE INDEX idx_dpf_status ON dubai_project_followups(dubai_status);
CREATE INDEX idx_dpf_eta_status ON dubai_project_followups(eta_status);

CREATE OR REPLACE FUNCTION set_updated_at_dpf() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dpf_updated_at BEFORE UPDATE ON dubai_project_followups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_dpf();

ALTER TABLE dubai_project_followups ENABLE ROW LEVEL SECURITY;

-- admin / ops_manager: full access
CREATE POLICY dpf_admin_full ON dubai_project_followups FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'));

-- afs_user: select
CREATE POLICY dpf_afs_select ON dubai_project_followups FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'afs_user');

-- sales_user: select own projects
CREATE POLICY dpf_sales_select ON dubai_project_followups FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'sales_user'
    AND project_id IN (
      SELECT id FROM projects WHERE sales_owner_id = auth.uid()
    )
  );

-- others: select where project is approved/active
CREATE POLICY dpf_others_select ON dubai_project_followups FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'role' NOT IN ('admin', 'operations_manager', 'afs_user', 'sales_user')
    AND project_id IN (
      SELECT id FROM projects
      WHERE project_status IN ('approved', 'active', 'completed')
        AND manufacturing_location = 'dubai'
    )
  );
