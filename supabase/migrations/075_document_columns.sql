-- ── 075_document_columns.sql ─────────────────────────────────────────────────
-- Adds file_size and mime_type to project_documents and quotation_documents.
-- Both are nullable (backward-compatible with existing rows).
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

alter table public.project_documents
  add column if not exists file_size bigint,
  add column if not exists mime_type text;

alter table public.quotation_documents
  add column if not exists file_size bigint,
  add column if not exists mime_type text;
