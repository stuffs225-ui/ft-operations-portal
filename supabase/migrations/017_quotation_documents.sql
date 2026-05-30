-- ── Phase 4: Quotation Documents ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE quotation_document_type AS ENUM (
    'specification_file',
    'quotation_pdf',
    'supporting_document',
    'customer_requirement',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS quotation_documents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id uuid NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  document_type        quotation_document_type NOT NULL DEFAULT 'other',
  file_name            text NOT NULL,
  storage_path         text,
  uploaded_by          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at          timestamptz NOT NULL DEFAULT now(),
  status               text NOT NULL DEFAULT 'uploaded',
  version              text NOT NULL DEFAULT '1.0',
  remarks              text
);

CREATE INDEX IF NOT EXISTS idx_qdoc_quotation_id ON quotation_documents(quotation_request_id);

-- RLS
ALTER TABLE quotation_documents ENABLE ROW LEVEL SECURITY;

-- Admin / ops: full access
CREATE POLICY qdoc_admin_all ON quotation_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );

-- Sales user: own quotation documents
CREATE POLICY qdoc_sales_all ON quotation_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_request_id AND qr.requested_by = auth.uid()
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
    )
  );

-- Coordinator: full access
CREATE POLICY qdoc_coordinator_all ON quotation_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  );

-- Viewer: select non-draft
CREATE POLICY qdoc_viewer_select ON quotation_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_request_id AND qr.quotation_status != 'draft'
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'viewer')
    )
  );
