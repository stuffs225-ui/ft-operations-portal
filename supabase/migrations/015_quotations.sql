-- ── Phase 4: Quotation Requests ──────────────────────────────────────────────

-- Enums
DO $$ BEGIN
  CREATE TYPE quotation_status AS ENUM (
    'draft',
    'submitted_by_sales',
    'received_by_coordinator',
    'sent_to_estimation',
    'waiting_for_estimation',
    'need_clarification',
    'quotation_received',
    'returned_to_sales',
    'converted_to_hot_project',
    'converted_to_so',
    'cancelled',
    'closed_lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quotation_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main table
CREATE TABLE IF NOT EXISTS quotation_requests (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_code              text UNIQUE NOT NULL,
  customer_name               text NOT NULL,
  customer_contact_name       text,
  customer_email              text,
  customer_phone              text,
  opportunity_source          text,
  linked_hot_project_id       uuid,
  requested_by                uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_coordinator_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  quotation_status            quotation_status NOT NULL DEFAULT 'draft',
  priority                    quotation_priority NOT NULL DEFAULT 'medium',
  required_delivery_expectation date,
  scope_summary               text,
  sales_remarks               text,
  coordinator_remarks         text,
  quotation_number            text,
  quotation_total_value       numeric,
  submitted_at                timestamptz,
  sent_to_estimation_at       timestamptz,
  estimation_contact          text,
  quotation_received_at       timestamptz,
  returned_to_sales_at        timestamptz,
  converted_to_project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  converted_to_hot_project_id uuid,
  created_by                  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Auto-code trigger
CREATE SEQUENCE IF NOT EXISTS quotation_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_quotation_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quotation_code IS NULL OR NEW.quotation_code = '' THEN
    NEW.quotation_code := 'QTN-' || to_char(now(), 'YYYY') || '-' ||
                          lpad(nextval('quotation_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_quotation_code ON quotation_requests;
CREATE TRIGGER set_quotation_code
  BEFORE INSERT ON quotation_requests
  FOR EACH ROW EXECUTE FUNCTION generate_quotation_code();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_quotation_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS quotation_updated_at ON quotation_requests;
CREATE TRIGGER quotation_updated_at
  BEFORE UPDATE ON quotation_requests
  FOR EACH ROW EXECUTE FUNCTION update_quotation_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotation_requests_requested_by    ON quotation_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_coordinator      ON quotation_requests(assigned_coordinator_id);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_status           ON quotation_requests(quotation_status);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_created_at       ON quotation_requests(created_at DESC);

-- RLS
ALTER TABLE quotation_requests ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY qr_admin_all ON quotation_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );

-- Sales user: own records + INSERT + UPDATE own draft/clarification
CREATE POLICY qr_sales_select ON quotation_requests
  FOR SELECT USING (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
  );

CREATE POLICY qr_sales_insert ON quotation_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
  );

CREATE POLICY qr_sales_update ON quotation_requests
  FOR UPDATE USING (
    requested_by = auth.uid()
    AND quotation_status IN ('draft', 'need_clarification')
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
  );

-- Sales coordinator: select all + update
CREATE POLICY qr_coordinator_select ON quotation_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  );

CREATE POLICY qr_coordinator_update ON quotation_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  );

-- Viewer: non-draft records
CREATE POLICY qr_viewer_select ON quotation_requests
  FOR SELECT USING (
    quotation_status != 'draft'
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'viewer')
  );
