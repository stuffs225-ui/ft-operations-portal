-- Phase 8: Material QC Inspections

CREATE TYPE inspection_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE material_inspection_result_enum AS ENUM ('pending', 'accepted', 'accepted_with_comments', 'rejected', 'pending_supplier_clarification', 'pending_rework');

CREATE TABLE IF NOT EXISTS material_qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  store_receipt_id uuid REFERENCES store_receipts(id) ON DELETE SET NULL,
  store_receipt_item_id uuid NOT NULL REFERENCES store_receipt_items(id) ON DELETE RESTRICT,
  medical_serial_number_id uuid REFERENCES medical_serial_numbers(id) ON DELETE SET NULL,
  inspection_number text UNIQUE NOT NULL,
  inspection_status inspection_status_enum NOT NULL DEFAULT 'pending',
  inspection_result material_inspection_result_enum NOT NULL DEFAULT 'pending',
  inspected_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  rejection_reason text,
  remarks text,
  attachments_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mqc_project ON material_qc_inspections(project_id);
CREATE INDEX idx_mqc_receipt_item ON material_qc_inspections(store_receipt_item_id);
CREATE INDEX idx_mqc_status ON material_qc_inspections(inspection_status);

CREATE OR REPLACE FUNCTION generate_mqc_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(inspection_number FROM 10) AS int)), 0) + 1
    INTO seq FROM material_qc_inspections WHERE inspection_number LIKE 'MQC-' || to_char(now(), 'YYYY') || '-%';
  NEW.inspection_number := 'MQC-' || to_char(now(), 'YYYY') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mqc_number BEFORE INSERT ON material_qc_inspections
  FOR EACH ROW WHEN (NEW.inspection_number IS NULL OR NEW.inspection_number = '')
  EXECUTE FUNCTION generate_mqc_number();

ALTER TABLE material_qc_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY mqc_select ON material_qc_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY mqc_insert ON material_qc_inspections FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager', 'qc_user'));
CREATE POLICY mqc_update ON material_qc_inspections FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'operations_manager', 'qc_user'));
