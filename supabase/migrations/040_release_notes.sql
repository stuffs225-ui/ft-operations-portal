-- Phase 8: Release Notes

CREATE TYPE release_status_enum AS ENUM ('draft', 'blocked', 'ready_to_issue', 'issued', 'cancelled');
CREATE TYPE release_type_enum AS ENUM ('project_release', 'vehicle_line_release', 'partial_release');

CREATE TABLE IF NOT EXISTS release_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  release_note_number text UNIQUE NOT NULL,
  release_status release_status_enum NOT NULL DEFAULT 'draft',
  release_type release_type_enum NOT NULL DEFAULT 'project_release',
  issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  issued_at timestamptz,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  document_id uuid REFERENCES qc_inspection_documents(id) ON DELETE SET NULL,
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rn_project ON release_notes(project_id);
CREATE INDEX idx_rn_status ON release_notes(release_status);

CREATE OR REPLACE FUNCTION generate_rn_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(release_note_number FROM 9) AS int)), 0) + 1
    INTO seq FROM release_notes WHERE release_note_number LIKE 'RN-' || to_char(now(), 'YYYY') || '-%';
  NEW.release_note_number := 'RN-' || to_char(now(), 'YYYY') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rn_number BEFORE INSERT ON release_notes
  FOR EACH ROW WHEN (NEW.release_note_number IS NULL OR NEW.release_note_number = '')
  EXECUTE FUNCTION generate_rn_number();

ALTER TABLE release_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rn_select ON release_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY rn_insert ON release_notes FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
CREATE POLICY rn_update ON release_notes FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
