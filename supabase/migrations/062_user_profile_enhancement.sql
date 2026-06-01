-- ── Migration 062: User Profile Enhancement (Pre-launch) ──────────────────────
-- Extend profiles with HR / org fields and an account lifecycle status.
-- Additive only — existing columns and RLS from 001/003 are untouched.

DO $$ BEGIN
  CREATE TYPE public.account_status_enum AS ENUM (
    'pending', 'active', 'suspended', 'inactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_number     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS joining_date        date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title           text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS extension_number    text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS direct_manager_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status      public.account_status_enum NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_request_id   uuid;

-- Future detailed-permission foundation. Role remains the live access mechanism;
-- these flags are an optional override layer documented for future enhancement.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_department     ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- Allow admin/ops to update profile lifecycle/org fields for any user
-- (the existing "profiles: own update" policy only covers self-update).
DROP POLICY IF EXISTS "profiles: manager update" ON public.profiles;
CREATE POLICY "profiles: manager update"
  ON public.profiles FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));
