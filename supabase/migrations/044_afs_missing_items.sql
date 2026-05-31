-- Phase 9: AFS Missing Items

CREATE TYPE missing_item_status_enum AS ENUM (
  'open', 'requested', 'received', 'waived', 'cancelled'
);

CREATE TYPE missing_item_severity_enum AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TABLE IF NOT EXISTS afs_missing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arrival_report_id uuid NOT NULL REFERENCES afs_arrival_reports(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_code text,
  quantity_expected int NOT NULL DEFAULT 1,
  quantity_received int NOT NULL DEFAULT 0,
  missing_item_status missing_item_status_enum NOT NULL DEFAULT 'open',
  severity missing_item_severity_enum NOT NULL DEFAULT 'medium',
  store_request_id uuid,
  notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ami_arrival ON afs_missing_items(arrival_report_id);
CREATE INDEX idx_ami_project ON afs_missing_items(project_id);
CREATE INDEX idx_ami_status ON afs_missing_items(missing_item_status);

ALTER TABLE afs_missing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY ami_admin_full ON afs_missing_items FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'));

CREATE POLICY ami_afs_write ON afs_missing_items FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'afs_user')
  WITH CHECK (auth.jwt() ->> 'role' = 'afs_user');

CREATE POLICY ami_store_select ON afs_missing_items FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'store_user');

CREATE POLICY ami_others_select ON afs_missing_items FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' NOT IN ('admin', 'operations_manager', 'afs_user', 'store_user'));
