-- Phase 9: AFS Vehicle Arrival Reports

CREATE TYPE arrival_status_enum AS ENUM (
  'pending', 'arrived', 'partially_arrived', 'delayed'
);

CREATE TABLE IF NOT EXISTS afs_arrival_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dubai_followup_id uuid NOT NULL REFERENCES dubai_project_followups(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  arrival_report_number text NOT NULL UNIQUE,
  arrival_date date NOT NULL,
  arrival_status arrival_status_enum NOT NULL DEFAULT 'arrived',
  received_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  received_quantity int NOT NULL DEFAULT 0,
  expected_quantity int NOT NULL DEFAULT 0,
  storage_location text,
  condition_on_arrival text,
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aar_project ON afs_arrival_reports(project_id);
CREATE INDEX idx_aar_followup ON afs_arrival_reports(dubai_followup_id);
CREATE INDEX idx_aar_status ON afs_arrival_reports(arrival_status);

CREATE OR REPLACE FUNCTION set_updated_at_aar() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_aar_updated_at BEFORE UPDATE ON afs_arrival_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_aar();

ALTER TABLE afs_arrival_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY aar_admin_full ON afs_arrival_reports FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

CREATE POLICY aar_afs_write ON afs_arrival_reports FOR ALL TO authenticated
  USING (public.current_user_role() = 'afs_user')
  WITH CHECK (public.current_user_role() = 'afs_user');

CREATE POLICY aar_others_select ON afs_arrival_reports FOR SELECT TO authenticated
  USING (public.current_user_role() NOT IN ('admin', 'operations_manager', 'afs_user'));
