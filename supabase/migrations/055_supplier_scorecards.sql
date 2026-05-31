-- Phase 10: Supplier Scorecards

CREATE TABLE supplier_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid,
  supplier_name text NOT NULL,
  score integer NOT NULL,
  quality_score integer NOT NULL DEFAULT 100,
  delivery_score integer NOT NULL DEFAULT 100,
  responsiveness_score integer NOT NULL DEFAULT 100,
  ncr_count integer NOT NULL DEFAULT 0,
  delayed_po_count integer NOT NULL DEFAULT 0,
  total_po_count integer NOT NULL DEFAULT 0,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE supplier_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_scorecards_read" ON supplier_scorecards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "supplier_scorecards_write" ON supplier_scorecards
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'operations_manager', 'procurement_user'))
  );
