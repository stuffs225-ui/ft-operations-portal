-- ── Phase 5: Purchase Orders to Supplier ─────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE po_supplier_status AS ENUM (
    'draft', 'pending_approval', 'approved', 'rejected',
    'sent_to_supplier', 'eta_confirmed', 'in_transit',
    'partially_received', 'fully_received', 'delayed', 'cancelled', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE po_approval_status AS ENUM (
    'not_required', 'pending', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS purchase_orders_to_supplier (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  procurement_request_id      uuid REFERENCES procurement_requests(id) ON DELETE SET NULL,
  po_number                   text NOT NULL,
  supplier_id                 uuid,   -- FK to approved_suppliers added in migration 024
  supplier_name               text NOT NULL,
  po_date                     date NOT NULL,
  purchase_value              numeric NOT NULL CHECK (purchase_value > 0),
  currency                    text NOT NULL DEFAULT 'SAR',
  eta_date                    date,
  po_status                   po_supplier_status NOT NULL DEFAULT 'draft',
  approval_required           boolean NOT NULL DEFAULT false,
  approval_status             po_approval_status NOT NULL DEFAULT 'not_required',
  submitted_for_approval_at   timestamptz,
  approved_by                 uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at                 timestamptz,
  rejected_by                 uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejected_at                 timestamptz,
  rejection_reason            text,
  remarks                     text,
  created_by                  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Set approval_required=true automatically when purchase_value > 10000
CREATE OR REPLACE FUNCTION set_po_approval_required()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.purchase_value > 10000 THEN
    NEW.approval_required := true;
    IF NEW.approval_status = 'not_required' THEN
      NEW.approval_status := 'not_required';  -- keep until explicitly submitted
    END IF;
  ELSE
    NEW.approval_required := false;
    NEW.approval_status := 'not_required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS po_set_approval ON purchase_orders_to_supplier;
CREATE TRIGGER po_set_approval
  BEFORE INSERT OR UPDATE OF purchase_value ON purchase_orders_to_supplier
  FOR EACH ROW EXECUTE FUNCTION set_po_approval_required();

CREATE OR REPLACE FUNCTION update_po_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS po_updated_at ON purchase_orders_to_supplier;
CREATE TRIGGER po_updated_at
  BEFORE UPDATE ON purchase_orders_to_supplier
  FOR EACH ROW EXECUTE FUNCTION update_po_updated_at();

CREATE INDEX IF NOT EXISTS idx_po_project_id    ON purchase_orders_to_supplier(project_id);
CREATE INDEX IF NOT EXISTS idx_po_pr_id         ON purchase_orders_to_supplier(procurement_request_id);
CREATE INDEX IF NOT EXISTS idx_po_status        ON purchase_orders_to_supplier(po_status);
CREATE INDEX IF NOT EXISTS idx_po_approval      ON purchase_orders_to_supplier(approval_status) WHERE approval_required = true;

ALTER TABLE purchase_orders_to_supplier ENABLE ROW LEVEL SECURITY;

CREATE POLICY po_admin_all ON purchase_orders_to_supplier FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);

CREATE POLICY po_procurement_all ON purchase_orders_to_supplier FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);

-- Factory/store/qc/afs/viewer: SELECT but application layer hides purchase_value
CREATE POLICY po_ops_roles_select ON purchase_orders_to_supplier FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('factory_user','store_user','qc_user','afs_user','viewer','sales_user'))
  AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.project_status = 'approved')
);
