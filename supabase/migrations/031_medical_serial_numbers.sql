-- ── Phase 7: Medical Serial Numbers ───────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE serial_qc_status AS ENUM (
    'not_checked', 'pending_qc', 'passed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE serial_current_status AS ENUM (
    'in_store', 'in_custody', 'installed', 'returned', 'consumed', 'lost_or_damaged'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS medical_serial_numbers (
  id                                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_receipt_item_id               uuid NOT NULL REFERENCES store_receipt_items(id) ON DELETE RESTRICT,
  project_id                          uuid REFERENCES projects(id) ON DELETE SET NULL,
  serial_number                       text NOT NULL,
  batch_number                        text,
  expiry_date                         date,
  manufacturer                        text,
  supplier_name                       text,
  qc_status                           serial_qc_status NOT NULL DEFAULT 'not_checked',
  current_status                      serial_current_status NOT NULL DEFAULT 'in_store',
  current_holder_type                 text,   -- 'user' | 'department' | 'project'
  current_holder_id                   text,
  installed_on_project_vehicle_line_id uuid,   -- nullable, no FK to keep flexible
  installed_at                        timestamptz,
  remarks                             text,
  created_by                          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                          timestamptz NOT NULL DEFAULT now(),
  updated_at                          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_medical_serial_number UNIQUE (serial_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_medical_serials_item_id     ON medical_serial_numbers(store_receipt_item_id);
CREATE INDEX IF NOT EXISTS idx_medical_serials_project_id  ON medical_serial_numbers(project_id);
CREATE INDEX IF NOT EXISTS idx_medical_serials_qc_status   ON medical_serial_numbers(qc_status);
CREATE INDEX IF NOT EXISTS idx_medical_serials_cur_status  ON medical_serial_numbers(current_status);
CREATE INDEX IF NOT EXISTS idx_medical_serials_created_at  ON medical_serial_numbers(created_at DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_medical_serial_numbers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_medical_serial_numbers_updated_at ON medical_serial_numbers;
CREATE TRIGGER trg_medical_serial_numbers_updated_at
  BEFORE UPDATE ON medical_serial_numbers
  FOR EACH ROW EXECUTE FUNCTION set_medical_serial_numbers_updated_at();

-- RLS
ALTER TABLE medical_serial_numbers ENABLE ROW LEVEL SECURITY;

-- store_user / admin / ops_manager / qc_user: full access
CREATE POLICY medical_serials_broad_all ON medical_serial_numbers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('store_user', 'admin', 'operations_manager', 'qc_user')
    )
  );

-- factory_user / afs_user: SELECT
CREATE POLICY medical_serials_factory_select ON medical_serial_numbers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('factory_user', 'afs_user')
    )
  );

-- sales_user: SELECT own project
CREATE POLICY medical_serials_sales_select ON medical_serial_numbers
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

-- viewer: SELECT
CREATE POLICY medical_serials_viewer_select ON medical_serial_numbers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role = 'viewer'
    )
  );
