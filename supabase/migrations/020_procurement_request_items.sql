-- ── Phase 5: Procurement Request Items ───────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE pr_item_status AS ENUM (
    'pending', 'waiting_for_po_to_supplier', 'po_to_supplier_created',
    'eta_confirmed', 'in_transit', 'partially_received', 'fully_received',
    'delayed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS procurement_request_items (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_request_id     uuid NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  project_id                 uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_vehicle_line_id    uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  item_code                  text,
  item_name                  text NOT NULL,
  description                text,
  material_category          text,
  quantity_required          int NOT NULL CHECK (quantity_required > 0),
  unit                       text NOT NULL DEFAULT 'unit',
  quantity_ordered           int NOT NULL DEFAULT 0,
  quantity_received          int NOT NULL DEFAULT 0,
  status                     pr_item_status NOT NULL DEFAULT 'pending',
  expected_arrival_date      date,
  remarks                    text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_pri_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS pri_updated_at ON procurement_request_items;
CREATE TRIGGER pri_updated_at
  BEFORE UPDATE ON procurement_request_items
  FOR EACH ROW EXECUTE FUNCTION update_pri_updated_at();

CREATE INDEX IF NOT EXISTS idx_pri_request_id ON procurement_request_items(procurement_request_id);
CREATE INDEX IF NOT EXISTS idx_pri_project_id  ON procurement_request_items(project_id);
CREATE INDEX IF NOT EXISTS idx_pri_status       ON procurement_request_items(status);

ALTER TABLE procurement_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pri_admin_all ON procurement_request_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);

CREATE POLICY pri_procurement_all ON procurement_request_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);

CREATE POLICY pri_ops_roles_select ON procurement_request_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('factory_user','store_user','qc_user','afs_user','viewer','sales_user'))
  AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.project_status = 'approved')
);
