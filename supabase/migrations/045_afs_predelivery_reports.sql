-- Phase 9: AFS Pre-Delivery Reports

CREATE TABLE IF NOT EXISTS afs_predelivery_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arrival_report_id uuid NOT NULL REFERENCES afs_arrival_reports(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  predelivery_report_number text NOT NULL UNIQUE,
  report_date date NOT NULL,
  chassis_number text,
  readiness_status text NOT NULL DEFAULT 'pending',
  checklist_items_total int NOT NULL DEFAULT 0,
  checklist_items_passed int NOT NULL DEFAULT 0,
  open_missing_items int NOT NULL DEFAULT 0,
  open_ncrs int NOT NULL DEFAULT 0,
  release_note_issued bool NOT NULL DEFAULT false,
  release_note_id uuid REFERENCES release_notes(id) ON DELETE SET NULL,
  inspector_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  remarks text,
  ready_for_delivery bool NOT NULL DEFAULT false,
  delivery_approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  delivery_approved_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apdr_project ON afs_predelivery_reports(project_id);
CREATE INDEX idx_apdr_arrival ON afs_predelivery_reports(arrival_report_id);
CREATE INDEX idx_apdr_ready ON afs_predelivery_reports(ready_for_delivery);

CREATE OR REPLACE FUNCTION set_updated_at_apdr() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_apdr_updated_at BEFORE UPDATE ON afs_predelivery_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_apdr();

ALTER TABLE afs_predelivery_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY apdr_admin_full ON afs_predelivery_reports FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'));

CREATE POLICY apdr_afs_write ON afs_predelivery_reports FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('afs_user', 'qc_user'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('afs_user', 'qc_user'));

CREATE POLICY apdr_others_select ON afs_predelivery_reports FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' NOT IN ('admin', 'operations_manager', 'afs_user', 'qc_user'));
