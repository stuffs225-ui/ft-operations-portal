-- ── Phase 7: Vehicle Receipt Photos ──────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE photo_type AS ENUM (
    'front', 'rear', 'left_side', 'right_side', 'chassis_plate', 'damage', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS vehicle_receipt_photos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_receipt_id  uuid NOT NULL REFERENCES vehicle_receipts(id) ON DELETE CASCADE,
  photo_type          photo_type NOT NULL,
  file_name           text NOT NULL,
  storage_path        text,
  uploaded_by         uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  uploaded_at         timestamptz NOT NULL DEFAULT now(),
  remarks             text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_receipt_id  ON vehicle_receipt_photos(vehicle_receipt_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_uploaded_at ON vehicle_receipt_photos(uploaded_at DESC);

-- RLS (mirrors store_receipts — no updated_at column so no trigger needed)
ALTER TABLE vehicle_receipt_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_photos_store_all ON vehicle_receipt_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('store_user', 'admin', 'operations_manager')
    )
  );

CREATE POLICY vehicle_photos_ops_select ON vehicle_receipt_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('procurement_user', 'factory_user', 'afs_user', 'qc_user')
    )
  );

CREATE POLICY vehicle_photos_sales_select ON vehicle_receipt_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role = 'sales_user'
    )
    AND vehicle_receipt_id IN (
      SELECT vr.id FROM vehicle_receipts vr
       WHERE vr.project_id IN (
         SELECT id FROM projects WHERE sales_owner_id = auth.uid()
       )
    )
  );

CREATE POLICY vehicle_photos_viewer_select ON vehicle_receipt_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role = 'viewer'
    )
  );
