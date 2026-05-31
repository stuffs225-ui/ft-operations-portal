-- Phase 8: Project/Vehicle QC Inspections

CREATE TYPE project_qc_result_enum AS ENUM ('pending', 'passed', 'passed_with_comments', 'failed', 'rework_required');
CREATE TYPE readiness_status_enum AS ENUM ('not_ready', 'pending_rework', 'ready_for_release', 'released');

CREATE TABLE IF NOT EXISTS project_qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  factory_record_id uuid REFERENCES factory_records(id) ON DELETE SET NULL,
  inspection_number text UNIQUE NOT NULL,
  inspection_status inspection_status_enum NOT NULL DEFAULT 'pending',
  inspection_result project_qc_result_enum NOT NULL DEFAULT 'pending',
  inspected_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  readiness_status readiness_status_enum NOT NULL DEFAULT 'not_ready',
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pqc_project ON project_qc_inspections(project_id);
CREATE INDEX idx_pqc_status ON project_qc_inspections(inspection_status);
CREATE INDEX idx_pqc_readiness ON project_qc_inspections(readiness_status);

CREATE OR REPLACE FUNCTION generate_pqc_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(inspection_number FROM 10) AS int)), 0) + 1
    INTO seq FROM project_qc_inspections WHERE inspection_number LIKE 'PQC-' || to_char(now(), 'YYYY') || '-%';
  NEW.inspection_number := 'PQC-' || to_char(now(), 'YYYY') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pqc_number BEFORE INSERT ON project_qc_inspections
  FOR EACH ROW WHEN (NEW.inspection_number IS NULL OR NEW.inspection_number = '')
  EXECUTE FUNCTION generate_pqc_number();

ALTER TABLE project_qc_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY pqc_select ON project_qc_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY pqc_insert ON project_qc_inspections FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
CREATE POLICY pqc_update ON project_qc_inspections FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user', 'factory_user'));
