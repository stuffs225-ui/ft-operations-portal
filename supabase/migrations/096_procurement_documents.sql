-- 096_procurement_documents.sql
-- Adds procurement-documents storage bucket and purchase_order_documents table.
-- Bucket: procurement-documents (private, signed URLs only, max 10 MB)
-- Table: purchase_order_documents — links uploaded files to purchase_orders_to_supplier
-- RLS: admin / operations_manager / procurement_user can upload and read

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'procurement-documents',
  'procurement-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "procurement_docs_objects_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'procurement-documents'
    AND public.current_user_role() IN ('admin', 'operations_manager', 'procurement_user')
  );

CREATE POLICY "procurement_docs_objects_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'procurement-documents'
    AND public.current_user_role() IN ('admin', 'operations_manager', 'procurement_user')
  );

CREATE TABLE IF NOT EXISTS purchase_order_documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid        NOT NULL REFERENCES purchase_orders_to_supplier(id) ON DELETE CASCADE,
  document_type     text        NOT NULL DEFAULT 'other',
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

CREATE INDEX idx_podoc_purchase_order ON purchase_order_documents(purchase_order_id);

ALTER TABLE purchase_order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_docs_select"
  ON purchase_order_documents FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'procurement_user'));

CREATE POLICY "po_docs_insert"
  ON purchase_order_documents FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'procurement_user'));
