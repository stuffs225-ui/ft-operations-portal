-- 097_afs_document_tables.sql
-- Adds afs_arrival_documents and afs_missing_item_attachments tables.
-- Uses the existing afs-attachments storage bucket (created in 058_storage_buckets.sql).
-- Both tables share the afs-attachments bucket; path prefixes distinguish content.
-- RLS: admin / operations_manager / afs_user can upload and read

-- Arrival report photos and documents
CREATE TABLE IF NOT EXISTS afs_arrival_documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  arrival_report_id uuid        NOT NULL REFERENCES afs_arrival_reports(id) ON DELETE CASCADE,
  project_id        uuid        REFERENCES projects(id) ON DELETE SET NULL,
  document_type     text        NOT NULL DEFAULT 'arrival_photo',
  file_name         text        NOT NULL,
  storage_path      text,
  file_size         bigint,
  mime_type         text,
  uploaded_by       uuid        REFERENCES profiles(id),
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  status            text        NOT NULL DEFAULT 'uploaded',
  version           text        NOT NULL DEFAULT '1',
  remarks           text
);

CREATE INDEX idx_afs_arrival_doc ON afs_arrival_documents(arrival_report_id);
CREATE INDEX idx_afs_arrival_doc_proj ON afs_arrival_documents(project_id);

ALTER TABLE afs_arrival_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "afs_arrival_docs_select"
  ON afs_arrival_documents FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'afs_user'));

CREATE POLICY "afs_arrival_docs_insert"
  ON afs_arrival_documents FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'afs_user'));

-- Missing item evidence attachments (deferred UI; table created for future wiring)
CREATE TABLE IF NOT EXISTS afs_missing_item_attachments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  missing_item_id  uuid        NOT NULL REFERENCES afs_missing_items(id) ON DELETE CASCADE,
  arrival_report_id uuid       REFERENCES afs_arrival_reports(id) ON DELETE SET NULL,
  project_id       uuid        REFERENCES projects(id) ON DELETE SET NULL,
  document_type    text        NOT NULL DEFAULT 'missing_item_evidence',
  file_name        text        NOT NULL,
  storage_path     text,
  file_size        bigint,
  mime_type        text,
  uploaded_by      uuid        REFERENCES profiles(id),
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  status           text        NOT NULL DEFAULT 'uploaded',
  version          text        NOT NULL DEFAULT '1',
  remarks          text
);

CREATE INDEX idx_afs_missing_attach ON afs_missing_item_attachments(missing_item_id);
CREATE INDEX idx_afs_missing_attach_proj ON afs_missing_item_attachments(project_id);

ALTER TABLE afs_missing_item_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "afs_missing_attach_select"
  ON afs_missing_item_attachments FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'afs_user'));

CREATE POLICY "afs_missing_attach_insert"
  ON afs_missing_item_attachments FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'afs_user'));
