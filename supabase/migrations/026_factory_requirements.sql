-- ── Phase 6: Factory Requirements ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE factory_req_status AS ENUM (
    'pending', 'in_progress', 'uploaded', 'approved', 'rejected', 'not_applicable'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS factory_requirement_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

INSERT INTO factory_requirement_types (name, description, sort_order) VALUES
  ('BOQ',                  'Bill of Quantities',                                 1),
  ('BOM',                  'Bill of Materials',                                  2),
  ('GA Drawing',           'General Arrangement Drawing',                        3),
  ('Detail Drawings',      'Detailed Engineering Drawings',                      4),
  ('Required Manhours',    'Estimated manhours for production',                  5),
  ('Pending Raw Materials','List of materials pending procurement or delivery',  6),
  ('Production Plan',      'Production schedule and milestones',                 7),
  ('Other',                'Other factory requirement',                          8)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS factory_item_requirements (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_vehicle_line_id   uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  requirement_type_id       uuid NOT NULL REFERENCES factory_requirement_types(id),
  status                    factory_req_status NOT NULL DEFAULT 'pending',
  document_id               text,
  value_text                text,
  value_number              numeric,
  uploaded_by               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at               timestamptz,
  remarks                   text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_factory_req_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS factory_req_updated_at ON factory_item_requirements;
CREATE TRIGGER factory_req_updated_at
  BEFORE UPDATE ON factory_item_requirements
  FOR EACH ROW EXECUTE FUNCTION update_factory_req_updated_at();

CREATE INDEX IF NOT EXISTS idx_factory_req_project ON factory_item_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_factory_req_line    ON factory_item_requirements(project_vehicle_line_id);

ALTER TABLE factory_item_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY factory_req_admin_all ON factory_item_requirements FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);
CREATE POLICY factory_req_factory_all ON factory_item_requirements FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'factory_user')
);
CREATE POLICY factory_req_read ON factory_item_requirements FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('qc_user','store_user','viewer'))
);
