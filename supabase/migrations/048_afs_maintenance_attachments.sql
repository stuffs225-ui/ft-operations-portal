-- Phase 9: AFS Maintenance Attachments

CREATE TYPE maintenance_document_type_enum AS ENUM (
  'photo', 'inspection_report', 'parts_request', 'resolution_report', 'other'
);

CREATE TABLE IF NOT EXISTS afs_maintenance_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id uuid NOT NULL REFERENCES afs_maintenance_requests(id) ON DELETE CASCADE,
  document_type maintenance_document_type_enum NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  storage_path text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  description text
);

CREATE INDEX idx_ama_request ON afs_maintenance_attachments(maintenance_request_id);

ALTER TABLE afs_maintenance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ama_admin_full ON afs_maintenance_attachments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'));

CREATE POLICY ama_afs_write ON afs_maintenance_attachments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'afs_user')
  WITH CHECK (auth.jwt() ->> 'role' = 'afs_user');

CREATE POLICY ama_others_select ON afs_maintenance_attachments FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' NOT IN ('admin', 'operations_manager', 'afs_user'));
