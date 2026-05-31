-- ── Phase 6: Raw Material Requests ────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE raw_material_request_status AS ENUM (
    'draft', 'submitted', 'under_review', 'sent_to_procurement',
    'partially_fulfilled', 'fulfilled', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE raw_material_request_type AS ENUM (
    'project_related', 'stock'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS production_raw_material_requests (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid REFERENCES projects(id) ON DELETE SET NULL,
  project_vehicle_line_id   uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  wo_reference_id           uuid REFERENCES project_execution_references(id) ON DELETE SET NULL,
  request_type              raw_material_request_type NOT NULL,
  request_number            text NOT NULL UNIQUE,
  status                    raw_material_request_status NOT NULL DEFAULT 'draft',
  requested_by              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  requested_at              timestamptz NOT NULL DEFAULT now(),
  reviewed_by               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at               timestamptz,
  sent_to_procurement_at    timestamptz,
  remarks                   text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate request_number: RMR-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_rmr_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  yr  text := to_char(now(), 'YYYY');
  seq int;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
  FROM production_raw_material_requests
  WHERE request_number LIKE 'RMR-' || yr || '-%';
  NEW.request_number := 'RMR-' || yr || '-' || lpad(seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rmr_number_gen ON production_raw_material_requests;
CREATE TRIGGER rmr_number_gen
  BEFORE INSERT ON production_raw_material_requests
  FOR EACH ROW WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
  EXECUTE FUNCTION generate_rmr_number();

CREATE OR REPLACE FUNCTION update_rmr_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS rmr_updated_at ON production_raw_material_requests;
CREATE TRIGGER rmr_updated_at
  BEFORE UPDATE ON production_raw_material_requests
  FOR EACH ROW EXECUTE FUNCTION update_rmr_updated_at();

CREATE INDEX IF NOT EXISTS idx_rmr_project ON production_raw_material_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_rmr_status  ON production_raw_material_requests(status);

ALTER TABLE production_raw_material_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY rmr_admin_all ON production_raw_material_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);
CREATE POLICY rmr_factory_all ON production_raw_material_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'factory_user')
);
CREATE POLICY rmr_procurement_select ON production_raw_material_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);
CREATE POLICY rmr_store_select ON production_raw_material_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'store_user')
);
CREATE POLICY rmr_viewer_select ON production_raw_material_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'viewer')
);
