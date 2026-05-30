-- ── Phase 5: Approved Suppliers ───────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE supplier_procurement_status AS ENUM (
    'draft', 'pending_review', 'approved', 'approved_with_conditions',
    'suspended', 'blacklisted', 'inactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_qc_status AS ENUM (
    'not_assessed', 'assessed', 'approved', 'approved_with_conditions', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS approved_suppliers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name               text NOT NULL,
  supplier_category           text,
  contact_person              text,
  email                       text,
  phone                       text,
  materials_supplied          text,
  payment_terms               text,
  procurement_status          supplier_procurement_status NOT NULL DEFAULT 'draft',
  qc_status                   supplier_qc_status NOT NULL DEFAULT 'not_assessed',
  quality_rating              int CHECK (quality_rating BETWEEN 1 AND 5),
  approved_for_medical_items  boolean NOT NULL DEFAULT false,
  approved_for_critical_items boolean NOT NULL DEFAULT false,
  remarks                     text,
  procurement_remarks         text,
  qc_remarks                  text,
  created_by                  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_supplier_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS supplier_updated_at ON approved_suppliers;
CREATE TRIGGER supplier_updated_at
  BEFORE UPDATE ON approved_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at();

CREATE INDEX IF NOT EXISTS idx_supplier_name   ON approved_suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_status ON approved_suppliers(procurement_status);

-- Add FK from purchase_orders_to_supplier to approved_suppliers (now that the table exists)
ALTER TABLE purchase_orders_to_supplier
  ADD CONSTRAINT po_supplier_fk
  FOREIGN KEY (supplier_id) REFERENCES approved_suppliers(id) ON DELETE SET NULL;

ALTER TABLE approved_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY sup_admin_all ON approved_suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);

CREATE POLICY sup_procurement_all ON approved_suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);

-- QC: select + update QC fields
CREATE POLICY sup_qc_select ON approved_suppliers FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'qc_user')
);

CREATE POLICY sup_qc_update ON approved_suppliers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'qc_user')
);

-- Other roles: see approved/approved_with_conditions only
CREATE POLICY sup_other_select ON approved_suppliers FOR SELECT USING (
  procurement_status IN ('approved','approved_with_conditions')
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('factory_user','store_user','afs_user','viewer','sales_user'))
);
