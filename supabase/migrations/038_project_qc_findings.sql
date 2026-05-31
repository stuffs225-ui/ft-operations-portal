-- Phase 8: Project QC Findings

CREATE TYPE finding_status_enum AS ENUM ('open', 'assigned', 'rework_in_progress', 'pending_reinspection', 'closed', 'cancelled');
CREATE TYPE finding_type_enum AS ENUM ('dimensional', 'surface_finish', 'functional', 'documentation', 'safety', 'other');

CREATE TABLE IF NOT EXISTS project_qc_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_qc_inspection_id uuid NOT NULL REFERENCES project_qc_inspections(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  finding_number text UNIQUE NOT NULL,
  finding_type finding_type_enum NOT NULL DEFAULT 'other',
  severity ncr_severity_enum NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  required_action text NOT NULL,
  owner_role text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  finding_status finding_status_enum NOT NULL DEFAULT 'open',
  rework_required boolean NOT NULL DEFAULT false,
  rework_completed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rework_completed_at timestamptz,
  closure_notes text,
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fnd_project ON project_qc_findings(project_id);
CREATE INDEX idx_fnd_inspection ON project_qc_findings(project_qc_inspection_id);
CREATE INDEX idx_fnd_status ON project_qc_findings(finding_status);

CREATE OR REPLACE FUNCTION generate_fnd_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(finding_number FROM 10) AS int)), 0) + 1
    INTO seq FROM project_qc_findings WHERE finding_number LIKE 'FND-' || to_char(now(), 'YYYY') || '-%';
  NEW.finding_number := 'FND-' || to_char(now(), 'YYYY') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fnd_number BEFORE INSERT ON project_qc_findings
  FOR EACH ROW WHEN (NEW.finding_number IS NULL OR NEW.finding_number = '')
  EXECUTE FUNCTION generate_fnd_number();

ALTER TABLE project_qc_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY fnd_select ON project_qc_findings FOR SELECT TO authenticated USING (true);
CREATE POLICY fnd_insert ON project_qc_findings FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
CREATE POLICY fnd_update ON project_qc_findings FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user', 'factory_user'));
