-- ── Phase 7: Store Receipt Items ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM (
    'received', 'pending_qc', 'accepted_by_qc', 'rejected_by_qc',
    'in_store', 'issued', 'in_custody', 'installed',
    'returned', 'consumed', 'lost_or_damaged'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS store_receipt_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_receipt_id          uuid NOT NULL REFERENCES store_receipts(id) ON DELETE CASCADE,
  project_id                uuid REFERENCES projects(id) ON DELETE SET NULL,
  project_vehicle_line_id   uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  purchase_order_item_id    uuid,  -- no FK: PO items may not exist at receipt time
  item_code                 text,
  item_name                 text NOT NULL,
  description               text,
  material_category         text NOT NULL DEFAULT 'general',
  quantity_received         numeric NOT NULL CHECK (quantity_received > 0),
  unit                      text NOT NULL DEFAULT 'unit',
  serial_required           boolean NOT NULL DEFAULT false,
  status                    item_status NOT NULL DEFAULT 'received',
  storage_location          text,
  condition                 text NOT NULL DEFAULT 'good',
  remarks                   text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_receipt_items_receipt_id   ON store_receipt_items(store_receipt_id);
CREATE INDEX IF NOT EXISTS idx_store_receipt_items_project_id   ON store_receipt_items(project_id);
CREATE INDEX IF NOT EXISTS idx_store_receipt_items_status       ON store_receipt_items(status);
CREATE INDEX IF NOT EXISTS idx_store_receipt_items_created_at   ON store_receipt_items(created_at DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_store_receipt_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_store_receipt_items_updated_at ON store_receipt_items;
CREATE TRIGGER trg_store_receipt_items_updated_at
  BEFORE UPDATE ON store_receipt_items
  FOR EACH ROW EXECUTE FUNCTION set_store_receipt_items_updated_at();

-- RLS (mirrors store_receipts)
ALTER TABLE store_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_receipt_items_store_all ON store_receipt_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('store_user', 'admin', 'operations_manager')
    )
  );

CREATE POLICY store_receipt_items_ops_select ON store_receipt_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('procurement_user', 'factory_user', 'afs_user', 'qc_user')
    )
  );

CREATE POLICY store_receipt_items_sales_select ON store_receipt_items
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

CREATE POLICY store_receipt_items_viewer_select ON store_receipt_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role = 'viewer'
    )
  );
