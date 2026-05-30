-- ── Phase 6: RMR Files and Items ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE raw_material_parsing_status AS ENUM (
    'not_parsed', 'pending_future_parser', 'parsed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS production_raw_material_request_files (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_request_id uuid NOT NULL REFERENCES production_raw_material_requests(id) ON DELETE CASCADE,
  file_name               text NOT NULL,
  storage_path            text,
  file_type               text NOT NULL,
  uploaded_by             uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at             timestamptz NOT NULL DEFAULT now(),
  parsing_status          raw_material_parsing_status NOT NULL DEFAULT 'not_parsed',
  remarks                 text
);

CREATE TABLE IF NOT EXISTS production_raw_material_request_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_request_id uuid NOT NULL REFERENCES production_raw_material_requests(id) ON DELETE CASCADE,
  item_code               text,
  item_name               text,
  description             text,
  quantity                numeric,
  unit                    text,
  material_category       text,
  required_for            text,
  vehicle_line_id         uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  remarks                 text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rmr_files_request ON production_raw_material_request_files(raw_material_request_id);
CREATE INDEX IF NOT EXISTS idx_rmr_items_request ON production_raw_material_request_items(raw_material_request_id);

ALTER TABLE production_raw_material_request_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_raw_material_request_items ENABLE ROW LEVEL SECURITY;

-- Files
CREATE POLICY rmr_files_admin_all ON production_raw_material_request_files FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);
CREATE POLICY rmr_files_factory_all ON production_raw_material_request_files FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'factory_user')
);
CREATE POLICY rmr_files_read ON production_raw_material_request_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('procurement_user','store_user','qc_user','viewer'))
);

-- Items
CREATE POLICY rmr_items_admin_all ON production_raw_material_request_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);
CREATE POLICY rmr_items_factory_all ON production_raw_material_request_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'factory_user')
);
CREATE POLICY rmr_items_read ON production_raw_material_request_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('procurement_user','store_user','qc_user','viewer'))
);
