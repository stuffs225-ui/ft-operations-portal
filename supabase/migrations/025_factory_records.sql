-- ── Phase 6: Factory Records ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE production_status AS ENUM (
    'not_started', 'details_requested', 'boq_pending', 'boq_uploaded',
    'ga_drawing_pending', 'ga_drawing_uploaded', 'detail_drawings_pending',
    'detail_drawings_uploaded', 'manhours_pending', 'manhours_added',
    'pending_raw_materials', 'in_production', 'monthly_update_required',
    'production_completed', 'sent_to_qc', 'on_hold'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS factory_records (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_vehicle_line_id   uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  wo_reference_id           uuid REFERENCES execution_references(id) ON DELETE SET NULL,
  production_status         production_status NOT NULL DEFAULT 'not_started',
  progress_percentage       int NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  expected_completion_date  date,
  actual_completion_date    date,
  monthly_update_required   boolean NOT NULL DEFAULT false,
  last_updated_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_updated_at           timestamptz NOT NULL DEFAULT now(),
  remarks                   text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_factory_record_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS factory_record_updated_at ON factory_records;
CREATE TRIGGER factory_record_updated_at
  BEFORE UPDATE ON factory_records
  FOR EACH ROW EXECUTE FUNCTION update_factory_record_updated_at();

CREATE INDEX IF NOT EXISTS idx_factory_records_project    ON factory_records(project_id);
CREATE INDEX IF NOT EXISTS idx_factory_records_status     ON factory_records(production_status);
CREATE INDEX IF NOT EXISTS idx_factory_records_line       ON factory_records(project_vehicle_line_id);

ALTER TABLE factory_records ENABLE ROW LEVEL SECURITY;

-- Admin / Ops: full access
CREATE POLICY factory_admin_all ON factory_records FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);

-- Factory user: full access
CREATE POLICY factory_user_all ON factory_records FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'factory_user')
);

-- QC user: read only
CREATE POLICY factory_qc_select ON factory_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'qc_user')
);

-- Sales user: read own projects only
CREATE POLICY factory_sales_select ON factory_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
  AND EXISTS (
    SELECT 1 FROM projects WHERE projects.id = factory_records.project_id
    AND projects.sales_owner_id = auth.uid()
  )
);

-- Viewer / Store: read only
CREATE POLICY factory_viewer_select ON factory_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('viewer','store_user'))
);
