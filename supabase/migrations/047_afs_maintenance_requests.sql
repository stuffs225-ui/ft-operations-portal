-- Phase 9: After Sales Maintenance Requests

CREATE TYPE maintenance_issue_type_enum AS ENUM (
  'mechanical', 'electrical', 'body_damage', 'software', 'upholstery', 'other'
);

CREATE TYPE maintenance_priority_enum AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE maintenance_status_enum AS ENUM (
  'open', 'assigned', 'under_inspection', 'parts_waiting',
  'in_repair', 'completed', 'closed', 'cancelled'
);

CREATE TABLE IF NOT EXISTS afs_maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  maintenance_request_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  chassis_number text,
  issue_type maintenance_issue_type_enum NOT NULL DEFAULT 'other',
  priority maintenance_priority_enum NOT NULL DEFAULT 'medium',
  maintenance_status maintenance_status_enum NOT NULL DEFAULT 'open',
  title text NOT NULL,
  description text NOT NULL,
  reported_date date NOT NULL,
  wo_reference text,
  pn_reference text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  inspection_notes text,
  parts_required bool NOT NULL DEFAULT false,
  parts_notes text,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_amr_project ON afs_maintenance_requests(project_id);
CREATE INDEX idx_amr_status ON afs_maintenance_requests(maintenance_status);
CREATE INDEX idx_amr_priority ON afs_maintenance_requests(priority);
CREATE INDEX idx_amr_customer ON afs_maintenance_requests(customer_name);

CREATE OR REPLACE FUNCTION set_updated_at_amr() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_amr_updated_at BEFORE UPDATE ON afs_maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_amr();

ALTER TABLE afs_maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY amr_admin_full ON afs_maintenance_requests FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'));

CREATE POLICY amr_afs_write ON afs_maintenance_requests FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'afs_user')
  WITH CHECK (auth.jwt() ->> 'role' = 'afs_user');

CREATE POLICY amr_sales_select ON afs_maintenance_requests FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'sales_user');

CREATE POLICY amr_others_select ON afs_maintenance_requests FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' NOT IN ('admin', 'operations_manager', 'afs_user', 'sales_user'));
