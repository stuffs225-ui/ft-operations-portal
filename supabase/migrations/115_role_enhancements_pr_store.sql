-- 115_role_enhancements_pr_store.sql
-- Role enhancements: Procurement PR types + Store receipt attachments & WO/PN.
--
-- 1) procurement_requests.pr_type — 'local' (local supplier PR) or 'neg'
--    (inter-company PR from NAFFCO Dubai → Saudi; always accompanied by a
--    NEG PO whose number is stored in neg_po_number).
-- 2) store_receipts.execution_reference_id — WO/PN chosen by Store at receipt
--    time (the same SO can have several WO/PN; Store assigns the receipt to one).
-- 3) store_receipt_documents + store-documents bucket — Supplier Delivery Note,
--    QC report, and SRV attached to a receipt.
--
-- Idempotent: safe to re-run.

-- ── 1. PR type + NEG PO number ────────────────────────────────────────────────

ALTER TABLE procurement_requests
  ADD COLUMN IF NOT EXISTS pr_type text NOT NULL DEFAULT 'local';

ALTER TABLE procurement_requests
  ADD COLUMN IF NOT EXISTS neg_po_number text;

DO $$ BEGIN
  ALTER TABLE procurement_requests
    ADD CONSTRAINT procurement_requests_pr_type_check
    CHECK (pr_type IN ('local', 'neg'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A NEG PR always arrives with its NEG PO — the number is mandatory.
DO $$ BEGIN
  ALTER TABLE procurement_requests
    ADD CONSTRAINT procurement_requests_neg_po_required
    CHECK (pr_type <> 'neg' OR (neg_po_number IS NOT NULL AND neg_po_number <> ''));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pr_pr_type ON procurement_requests(pr_type);

-- ── 2. WO/PN on store receipts ────────────────────────────────────────────────

ALTER TABLE store_receipts
  ADD COLUMN IF NOT EXISTS execution_reference_id uuid
    REFERENCES project_execution_references(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_store_receipts_exec_ref
  ON store_receipts(execution_reference_id);

-- ── 3. Store receipt documents (Supplier DN / QC report / SRV) ────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-documents',
  'store-documents',
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

DROP POLICY IF EXISTS "store_docs_objects_select" ON storage.objects;
CREATE POLICY "store_docs_objects_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'store-documents'
    AND public.current_user_role() IN
      ('admin', 'operations_manager', 'store_user', 'procurement_user', 'qc_user', 'viewer')
  );

DROP POLICY IF EXISTS "store_docs_objects_insert" ON storage.objects;
CREATE POLICY "store_docs_objects_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store-documents'
    AND public.current_user_role() IN ('admin', 'operations_manager', 'store_user')
  );

CREATE TABLE IF NOT EXISTS store_receipt_documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_receipt_id  uuid        NOT NULL REFERENCES store_receipts(id) ON DELETE CASCADE,
  document_type     text        NOT NULL DEFAULT 'other'
                    CHECK (document_type IN ('supplier_dn', 'qc_report', 'srv', 'other')),
  file_name         text        NOT NULL,
  storage_path      text,
  file_size         bigint,
  mime_type         text,
  uploaded_by       uuid        REFERENCES profiles(id),
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  remarks           text
);

CREATE INDEX IF NOT EXISTS idx_srdoc_receipt ON store_receipt_documents(store_receipt_id);

ALTER TABLE store_receipt_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_receipt_docs_select" ON store_receipt_documents;
CREATE POLICY "store_receipt_docs_select"
  ON store_receipt_documents FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN
      ('admin', 'operations_manager', 'store_user', 'procurement_user', 'qc_user', 'viewer')
  );

DROP POLICY IF EXISTS "store_receipt_docs_insert" ON store_receipt_documents;
CREATE POLICY "store_receipt_docs_insert"
  ON store_receipt_documents FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'operations_manager', 'store_user')
  );
