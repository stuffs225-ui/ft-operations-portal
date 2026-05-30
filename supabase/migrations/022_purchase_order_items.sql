-- ── Phase 5: Purchase Order Items ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id              uuid NOT NULL REFERENCES purchase_orders_to_supplier(id) ON DELETE CASCADE,
  procurement_request_item_id    uuid REFERENCES procurement_request_items(id) ON DELETE SET NULL,
  item_code                      text,
  item_name                      text NOT NULL,
  description                    text,
  quantity_ordered               int NOT NULL CHECK (quantity_ordered > 0),
  unit                           text NOT NULL DEFAULT 'unit',
  unit_price                     numeric NOT NULL CHECK (unit_price >= 0),
  line_total                     numeric GENERATED ALWAYS AS (unit_price * quantity_ordered) STORED,
  expected_arrival_date          date,
  status                         text NOT NULL DEFAULT 'pending',
  remarks                        text,
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_poi_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS poi_updated_at ON purchase_order_items;
CREATE TRIGGER poi_updated_at
  BEFORE UPDATE ON purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_poi_updated_at();

CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(purchase_order_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY poi_admin_all ON purchase_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);

CREATE POLICY poi_procurement_all ON purchase_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);

CREATE POLICY poi_ops_roles_select ON purchase_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('factory_user','store_user','qc_user','afs_user','viewer','sales_user'))
);
