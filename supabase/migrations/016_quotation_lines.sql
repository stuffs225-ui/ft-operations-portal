-- ── Phase 4: Quotation Request Lines ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotation_request_lines (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id        uuid NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  line_number                 int NOT NULL,
  vehicle_type                text NOT NULL,
  description                 text NOT NULL,
  quantity                    int NOT NULL CHECK (quantity > 0),
  estimated_unit_value        numeric,
  final_quotation_unit_value  numeric,
  final_quotation_line_value  numeric GENERATED ALWAYS AS (
    CASE WHEN final_quotation_unit_value IS NOT NULL
         THEN final_quotation_unit_value * quantity
         ELSE NULL END
  ) STORED,
  remarks                     text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_request_id, line_number)
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_qrl_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS qrl_updated_at ON quotation_request_lines;
CREATE TRIGGER qrl_updated_at
  BEFORE UPDATE ON quotation_request_lines
  FOR EACH ROW EXECUTE FUNCTION update_qrl_updated_at();

CREATE INDEX IF NOT EXISTS idx_qrl_quotation_id ON quotation_request_lines(quotation_request_id);

-- RLS
ALTER TABLE quotation_request_lines ENABLE ROW LEVEL SECURITY;

-- Admin / ops: full access
CREATE POLICY qrl_admin_all ON quotation_request_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );

-- Sales user: own quotation lines
CREATE POLICY qrl_sales_all ON quotation_request_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_request_id AND qr.requested_by = auth.uid()
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
    )
  );

-- Coordinator: full on all
CREATE POLICY qrl_coordinator_all ON quotation_request_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  );

-- Viewer: select non-draft
CREATE POLICY qrl_viewer_select ON quotation_request_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_request_id AND qr.quotation_status != 'draft'
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'viewer')
    )
  );
