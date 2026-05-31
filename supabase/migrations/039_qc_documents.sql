-- Phase 8: QC Inspection Documents

CREATE TYPE qc_inspection_type_enum AS ENUM ('material_qc', 'project_qc', 'release_note', 'ncr');
CREATE TYPE qc_document_type_enum AS ENUM ('material_inspection_report', 'material_photo', 'ncr_evidence', 'vehicle_inspection_report', 'rework_evidence', 'release_note', 'other');

CREATE TABLE IF NOT EXISTS qc_inspection_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_type qc_inspection_type_enum NOT NULL,
  inspection_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  document_type qc_document_type_enum NOT NULL,
  file_name text NOT NULL,
  storage_path text,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'uploaded',
  version text NOT NULL DEFAULT '1',
  remarks text
);

CREATE INDEX idx_qcdoc_inspection ON qc_inspection_documents(inspection_id);
CREATE INDEX idx_qcdoc_project ON qc_inspection_documents(project_id);

ALTER TABLE qc_inspection_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY qcdoc_select ON qc_inspection_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY qcdoc_insert ON qc_inspection_documents FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager', 'qc_user'));
