-- 098_qc_documents_file_columns.sql
-- Adds file_size and mime_type columns to qc_inspection_documents.
-- DocumentPanel stores these metadata fields on every upload; without them
-- the insert would fail with an unknown column error when Supabase is live.

ALTER TABLE qc_inspection_documents
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text;
