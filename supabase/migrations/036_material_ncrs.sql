-- Phase 8: Material NCRs

CREATE TYPE ncr_status_enum AS ENUM ('open', 'assigned', 'corrective_action_in_progress', 'pending_evidence', 'closed', 'rejected_closure', 'cancelled');
CREATE TYPE ncr_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE IF NOT EXISTS material_ncrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  material_qc_inspection_id uuid NOT NULL REFERENCES material_qc_inspections(id) ON DELETE RESTRICT,
  store_receipt_item_id uuid REFERENCES store_receipt_items(id) ON DELETE SET NULL,
  medical_serial_number_id uuid REFERENCES medical_serial_numbers(id) ON DELETE SET NULL,
  ncr_number text UNIQUE NOT NULL,
  ncr_status ncr_status_enum NOT NULL DEFAULT 'open',
  severity ncr_severity_enum NOT NULL DEFAULT 'medium',
  root_cause_category text,
  description text NOT NULL,
  corrective_action text,
  preventive_action text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  closure_evidence_document_id uuid,
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ncr_project ON material_ncrs(project_id);
CREATE INDEX idx_ncr_status ON material_ncrs(ncr_status);
CREATE INDEX idx_ncr_severity ON material_ncrs(severity);

CREATE OR REPLACE FUNCTION generate_ncr_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ncr_number FROM 10) AS int)), 0) + 1
    INTO seq FROM material_ncrs WHERE ncr_number LIKE 'NCR-' || to_char(now(), 'YYYY') || '-%';
  NEW.ncr_number := 'NCR-' || to_char(now(), 'YYYY') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ncr_number BEFORE INSERT ON material_ncrs
  FOR EACH ROW WHEN (NEW.ncr_number IS NULL OR NEW.ncr_number = '')
  EXECUTE FUNCTION generate_ncr_number();

ALTER TABLE material_ncrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ncr_select ON material_ncrs FOR SELECT TO authenticated USING (true);
CREATE POLICY ncr_insert ON material_ncrs FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
CREATE POLICY ncr_update ON material_ncrs FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
