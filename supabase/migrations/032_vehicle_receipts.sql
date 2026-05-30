-- ── Phase 7: Vehicle Receipts ─────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE vehicle_receipt_status AS ENUM (
    'draft', 'received', 'pending_condition_review', 'accepted',
    'damaged', 'assigned_to_production', 'assigned_to_afs', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS vehicle_receipts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid REFERENCES projects(id) ON DELETE SET NULL,
  project_vehicle_line_id   uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  chassis_number            text NOT NULL,
  received_date             date NOT NULL,
  received_by               uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  vehicle_type              text NOT NULL,
  condition_status          text NOT NULL DEFAULT 'good',  -- good | minor_damage | major_damage | total_loss
  mileage                   numeric,
  storage_location          text,
  damage_notes              text,
  status                    vehicle_receipt_status NOT NULL DEFAULT 'draft',
  remarks                   text,
  created_by                uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_vehicle_chassis_number UNIQUE (chassis_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_receipts_project_id  ON vehicle_receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_receipts_status       ON vehicle_receipts(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_receipts_created_at   ON vehicle_receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_receipts_received_date ON vehicle_receipts(received_date DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_vehicle_receipts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_vehicle_receipts_updated_at ON vehicle_receipts;
CREATE TRIGGER trg_vehicle_receipts_updated_at
  BEFORE UPDATE ON vehicle_receipts
  FOR EACH ROW EXECUTE FUNCTION set_vehicle_receipts_updated_at();

-- RLS (mirrors store_receipts)
ALTER TABLE vehicle_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_receipts_store_all ON vehicle_receipts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('store_user', 'admin', 'operations_manager')
    )
  );

CREATE POLICY vehicle_receipts_ops_select ON vehicle_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('procurement_user', 'factory_user', 'afs_user', 'qc_user')
    )
  );

CREATE POLICY vehicle_receipts_sales_select ON vehicle_receipts
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

CREATE POLICY vehicle_receipts_viewer_select ON vehicle_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role = 'viewer'
    )
  );
