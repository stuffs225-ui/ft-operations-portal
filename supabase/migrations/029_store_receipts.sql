-- ── Phase 7: Store Receipts ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE receipt_status AS ENUM (
    'draft', 'received', 'partially_received', 'pending_material_qc',
    'accepted', 'rejected', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE receipt_type AS ENUM (
    'material', 'vehicle', 'mixed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS store_receipts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid REFERENCES projects(id) ON DELETE SET NULL,
  purchase_order_id       uuid REFERENCES purchase_orders_to_supplier(id) ON DELETE SET NULL,
  procurement_request_id  uuid REFERENCES procurement_requests(id) ON DELETE SET NULL,
  receipt_number          text NOT NULL UNIQUE,
  receipt_type            receipt_type NOT NULL DEFAULT 'material',
  received_date           date NOT NULL,
  received_by             uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  supplier_name           text,
  delivery_note_number    text,
  status                  receipt_status NOT NULL DEFAULT 'draft',
  remarks                 text,
  created_by              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_receipts_project_id  ON store_receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_store_receipts_status       ON store_receipts(status);
CREATE INDEX IF NOT EXISTS idx_store_receipts_created_at   ON store_receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_receipts_received_date ON store_receipts(received_date DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_store_receipts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_store_receipts_updated_at ON store_receipts;
CREATE TRIGGER trg_store_receipts_updated_at
  BEFORE UPDATE ON store_receipts
  FOR EACH ROW EXECUTE FUNCTION set_store_receipts_updated_at();

-- Auto-number trigger: RCP-YYYY-NNNN
CREATE OR REPLACE FUNCTION store_receipts_auto_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year  text;
  v_seq   bigint;
  v_num   text;
BEGIN
  IF NEW.receipt_number IS NOT NULL AND NEW.receipt_number <> '' THEN
    RETURN NEW;
  END IF;
  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1
    INTO v_seq
    FROM store_receipts
   WHERE receipt_number LIKE 'RCP-' || v_year || '-%';
  v_num := 'RCP-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
  NEW.receipt_number := v_num;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_store_receipts_auto_number ON store_receipts;
CREATE TRIGGER trg_store_receipts_auto_number
  BEFORE INSERT ON store_receipts
  FOR EACH ROW EXECUTE FUNCTION store_receipts_auto_number();

-- RLS
ALTER TABLE store_receipts ENABLE ROW LEVEL SECURITY;

-- store_user / admin / ops_manager: full access
CREATE POLICY store_receipts_store_all ON store_receipts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('store_user', 'admin', 'operations_manager')
    )
  );

-- procurement_user / factory_user / afs_user / qc_user: SELECT
CREATE POLICY store_receipts_ops_select ON store_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('procurement_user', 'factory_user', 'afs_user', 'qc_user')
    )
  );

-- sales_user: SELECT their own project receipts
CREATE POLICY store_receipts_sales_select ON store_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role = 'sales_user'
    )
    AND project_id IN (
      SELECT id FROM projects WHERE sales_owner_id = auth.uid()
    )
  );

-- viewer: SELECT all
CREATE POLICY store_receipts_viewer_select ON store_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role = 'viewer'
    )
  );
