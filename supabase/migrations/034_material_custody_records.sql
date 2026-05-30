-- ── Phase 7: Material Custody Records ────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE custody_approval_status AS ENUM (
    'not_required', 'pending_approval', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custody_receiver_decision AS ENUM (
    'pending', 'accepted', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custody_status AS ENUM (
    'draft', 'pending_approval', 'approved_for_issue', 'issued',
    'pending_acceptance', 'in_custody', 'installed', 'returned',
    'consumed_by_project', 'lost_or_damaged', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS material_custody_records (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custody_number            text NOT NULL UNIQUE,
  project_id                uuid REFERENCES projects(id) ON DELETE SET NULL,
  store_receipt_item_id     uuid REFERENCES store_receipt_items(id) ON DELETE SET NULL,
  medical_serial_number_id  uuid REFERENCES medical_serial_numbers(id) ON DELETE SET NULL,
  issued_to_role            text,                -- factory_user | afs_user | store_user | etc.
  issued_to_user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  issued_to_department      text,
  issue_type                text NOT NULL,       -- assign_to_project | temporary_custody
  approval_required         boolean NOT NULL DEFAULT false,
  approval_status           custody_approval_status NOT NULL DEFAULT 'not_required',
  approved_by               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at               timestamptz,
  rejected_by               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejected_at               timestamptz,
  rejection_reason          text,
  issued_by                 uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  issued_at                 timestamptz NOT NULL DEFAULT now(),
  accepted_by               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at               timestamptz,
  receiver_decision         custody_receiver_decision NOT NULL DEFAULT 'pending',
  receiver_rejection_reason text,
  installation_status       text NOT NULL DEFAULT 'not_installed', -- not_installed | installed | returned | consumed
  installed_at              timestamptz,
  returned_at               timestamptz,
  status                    custody_status NOT NULL DEFAULT 'draft',
  remarks                   text,
  created_by                uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custody_records_project_id       ON material_custody_records(project_id);
CREATE INDEX IF NOT EXISTS idx_custody_records_status           ON material_custody_records(status);
CREATE INDEX IF NOT EXISTS idx_custody_records_approval_status  ON material_custody_records(approval_status);
CREATE INDEX IF NOT EXISTS idx_custody_records_issued_to_user   ON material_custody_records(issued_to_user_id);
CREATE INDEX IF NOT EXISTS idx_custody_records_created_at       ON material_custody_records(created_at DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_material_custody_records_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_material_custody_records_updated_at ON material_custody_records;
CREATE TRIGGER trg_material_custody_records_updated_at
  BEFORE UPDATE ON material_custody_records
  FOR EACH ROW EXECUTE FUNCTION set_material_custody_records_updated_at();

-- Auto-number trigger: CUS-YYYY-NNNN
CREATE OR REPLACE FUNCTION custody_auto_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year  text;
  v_seq   bigint;
  v_num   text;
BEGIN
  IF NEW.custody_number IS NOT NULL AND NEW.custody_number <> '' THEN
    RETURN NEW;
  END IF;
  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1
    INTO v_seq
    FROM material_custody_records
   WHERE custody_number LIKE 'CUS-' || v_year || '-%';
  v_num := 'CUS-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
  NEW.custody_number := v_num;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_custody_auto_number ON material_custody_records;
CREATE TRIGGER trg_custody_auto_number
  BEFORE INSERT ON material_custody_records
  FOR EACH ROW EXECUTE FUNCTION custody_auto_number();

-- RLS
ALTER TABLE material_custody_records ENABLE ROW LEVEL SECURITY;

-- store_user / admin / ops_manager: full access
CREATE POLICY custody_records_store_all ON material_custody_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('store_user', 'admin', 'operations_manager')
    )
  );

-- factory_user / afs_user: SELECT + UPDATE for acceptance
CREATE POLICY custody_records_factory_select ON material_custody_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('factory_user', 'afs_user')
    )
  );

CREATE POLICY custody_records_factory_update ON material_custody_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('factory_user', 'afs_user')
    )
    AND issued_to_user_id = auth.uid()
  );

-- sales_user: SELECT own project
CREATE POLICY custody_records_sales_select ON material_custody_records
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
CREATE POLICY custody_records_viewer_select ON material_custody_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role = 'viewer'
    )
  );
