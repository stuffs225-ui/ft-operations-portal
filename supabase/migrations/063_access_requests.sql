-- ── Migration 063: Employee Self-Registration / Access Requests ───────────────
-- Public (pre-login) submission of an account access request. Only admin/ops
-- may review. On approval the admin links/creates the Supabase Auth user
-- manually (documented) — no user/password creation happens in the browser.

DO $$ BEGIN
  CREATE TYPE public.access_request_status AS ENUM (
    'submitted', 'under_review', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number     text,
  joining_date        date,
  job_title           text,
  full_name           text NOT NULL,
  email               text NOT NULL,
  mobile_number       text,
  extension_number    text,
  department          text,
  direct_manager_name text,
  notes               text,
  requested_role      public.user_role,
  request_status      public.access_request_status NOT NULL DEFAULT 'submitted',
  admin_review_notes  text,
  reviewed_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  approved_user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email  ON public.access_requests(email);

DROP TRIGGER IF EXISTS access_requests_updated_at ON public.access_requests;
CREATE TRIGGER access_requests_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors on the public /request-access page)
-- may submit a request. They cannot read or modify any request afterward.
DROP POLICY IF EXISTS ar_public_insert ON public.access_requests;
CREATE POLICY ar_public_insert ON public.access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (request_status = 'submitted');

-- Only admin/ops may read access requests.
DROP POLICY IF EXISTS ar_admin_select ON public.access_requests;
CREATE POLICY ar_admin_select ON public.access_requests
  FOR SELECT
  USING (public.current_user_role() IN ('admin', 'operations_manager'));

-- Only admin/ops may review (update) or delete.
DROP POLICY IF EXISTS ar_admin_update ON public.access_requests;
CREATE POLICY ar_admin_update ON public.access_requests
  FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

DROP POLICY IF EXISTS ar_admin_delete ON public.access_requests;
CREATE POLICY ar_admin_delete ON public.access_requests
  FOR DELETE
  USING (public.current_user_role() = 'admin');
