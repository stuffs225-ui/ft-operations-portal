-- Phase 9: AFS Condition Reports (post-delivery)

CREATE TYPE condition_report_status_enum AS ENUM (
  'open', 'under_review', 'resolved', 'closed', 'cancelled'
);

CREATE TYPE condition_status_enum AS ENUM (
  'good', 'minor_damage', 'major_damage', 'requires_repair'
);

CREATE TABLE IF NOT EXISTS afs_condition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  condition_report_number text NOT NULL UNIQUE,
  report_date date NOT NULL,
  chassis_number text,
  overall_condition condition_status_enum NOT NULL DEFAULT 'good',
  report_status condition_report_status_enum NOT NULL DEFAULT 'open',
  reported_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text NOT NULL,
  root_cause text,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acr_project ON afs_condition_reports(project_id);
CREATE INDEX idx_acr_status ON afs_condition_reports(report_status);

CREATE OR REPLACE FUNCTION set_updated_at_acr() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_acr_updated_at BEFORE UPDATE ON afs_condition_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_acr();

ALTER TABLE afs_condition_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY acr_admin_full ON afs_condition_reports FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

CREATE POLICY acr_afs_all ON afs_condition_reports FOR ALL TO authenticated
  USING (public.current_user_role() = 'afs_user')
  WITH CHECK (public.current_user_role() = 'afs_user');

CREATE POLICY acr_others_select ON afs_condition_reports FOR SELECT TO authenticated
  USING (public.current_user_role() NOT IN ('admin', 'operations_manager', 'afs_user'));
