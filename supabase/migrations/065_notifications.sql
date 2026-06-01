-- ── Migration 065: Notification System Foundation ─────────────────────────────
-- notification_events           : catalog of event types + default channels
-- notification_preferences      : per-user channel opt-in per event
-- notifications                 : delivered/queued notification rows
-- notification_escalation_rules : role escalation ladders per module
--
-- NOTE: No email/SMS is sent from the browser. When no provider is configured,
-- email/sms rows are recorded with delivery_status = 'skipped' or 'pending'.

DO $$ BEGIN
  CREATE TYPE public.notification_severity AS ENUM ('routine', 'important', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_delivery_status AS ENUM (
    'pending', 'sent', 'failed', 'skipped', 'read'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── notification_events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key        text UNIQUE NOT NULL,
  event_name       text NOT NULL,
  module_name      text NOT NULL,
  severity         public.notification_severity NOT NULL DEFAULT 'routine',
  default_channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS notification_events_updated_at ON public.notification_events;
CREATE TRIGGER notification_events_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ne_read_all ON public.notification_events;
CREATE POLICY ne_read_all ON public.notification_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS ne_admin_write ON public.notification_events;
CREATE POLICY ne_admin_write ON public.notification_events
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

-- ── notification_preferences ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key      text NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled  boolean NOT NULL DEFAULT false,
  sms_enabled    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON public.notification_preferences(user_id);

DROP TRIGGER IF EXISTS notif_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS np_user_manage_own ON public.notification_preferences;
CREATE POLICY np_user_manage_own ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               text NOT NULL,
  message             text NOT NULL,
  module_name         text,
  event_key           text,
  related_entity_type text,
  related_entity_id   uuid,
  severity            public.notification_severity NOT NULL DEFAULT 'routine',
  channel             public.notification_channel NOT NULL DEFAULT 'in_app',
  delivery_status     public.notification_delivery_status NOT NULL DEFAULT 'pending',
  read_at             timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users read and update (mark-as-read) their own notifications.
DROP POLICY IF EXISTS notif_user_select_own ON public.notifications;
CREATE POLICY notif_user_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS notif_user_update_own ON public.notifications;
CREATE POLICY notif_user_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin/ops may read all notifications (delivery logs / audit).
DROP POLICY IF EXISTS notif_admin_select ON public.notifications;
CREATE POLICY notif_admin_select ON public.notifications
  FOR SELECT USING (public.current_user_role() IN ('admin', 'operations_manager'));

-- Any authenticated user may create an in-app notification targeted at another
-- user (workflow events). Real email/sms dispatch happens server-side only.
DROP POLICY IF EXISTS notif_authenticated_insert ON public.notifications;
CREATE POLICY notif_authenticated_insert ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── notification_escalation_rules ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_escalation_rules (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key               text UNIQUE NOT NULL,
  module_name            text NOT NULL,
  trigger_condition      text NOT NULL,
  first_level_roles      text[] NOT NULL DEFAULT ARRAY[]::text[],
  second_level_roles     text[] NOT NULL DEFAULT ARRAY[]::text[],
  escalation_after_hours int NOT NULL DEFAULT 24,
  channels               text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  is_active              boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS notif_escalation_updated_at ON public.notification_escalation_rules;
CREATE TRIGGER notif_escalation_updated_at
  BEFORE UPDATE ON public.notification_escalation_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notification_escalation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ner_read_all ON public.notification_escalation_rules;
CREATE POLICY ner_read_all ON public.notification_escalation_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS ner_admin_write ON public.notification_escalation_rules;
CREATE POLICY ner_admin_write ON public.notification_escalation_rules
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

-- ── Seed notification_events ──────────────────────────────────────────────────
INSERT INTO public.notification_events (event_key, event_name, module_name, severity, default_channels) VALUES
  ('so_submitted',          'SO Submitted for Approval',        'projects',    'important', ARRAY['in_app','email']),
  ('so_approved',           'SO Approved',                      'projects',    'important', ARRAY['in_app','email']),
  ('so_rejected',           'SO Rejected',                      'projects',    'important', ARRAY['in_app','email']),
  ('project_missing_wo',    'Project Missing WO',               'projects',    'important', ARRAY['in_app','email']),
  ('project_missing_pn',    'Project Missing PN',               'projects',    'important', ARRAY['in_app','email']),
  ('po_pending_approval',   'PO Above 10,000 Pending Approval', 'procurement', 'critical',  ARRAY['in_app','email','sms']),
  ('po_approved',           'PO Approved',                      'procurement', 'important', ARRAY['in_app','email']),
  ('po_rejected',           'PO Rejected',                      'procurement', 'important', ARRAY['in_app','email']),
  ('eta_delayed',           'ETA Delayed',                      'procurement', 'important', ARRAY['in_app','email']),
  ('material_received',     'Material Received',                'store',       'routine',   ARRAY['in_app']),
  ('material_pending_qc',   'Material Pending QC',              'qc',          'routine',   ARRAY['in_app']),
  ('ncr_created',           'NCR Created',                      'qc',          'important', ARRAY['in_app','email']),
  ('rework_required',       'Rework Required',                  'qc',          'important', ARRAY['in_app','email']),
  ('release_note_issued',   'Release Note Issued',              'qc',          'important', ARRAY['in_app','email']),
  ('custody_pending_approval', 'Temporary Custody Pending Approval', 'store', 'important', ARRAY['in_app','email']),
  ('custody_pending_acceptance', 'Custody Pending Receiver Acceptance', 'store', 'routine', ARRAY['in_app']),
  ('dubai_eta_delayed',     'Dubai ETA Delayed',                'afs',         'important', ARRAY['in_app','email']),
  ('afs_missing_item_critical', 'AFS Missing Item Critical',    'afs',         'critical',  ARRAY['in_app','email','sms']),
  ('maintenance_critical',  'Maintenance Critical Request',     'afs',         'critical',  ARRAY['in_app','email','sms']),
  ('sla_breached',          'SLA Breached',                     'sla',         'critical',  ARRAY['in_app','email','sms']),
  ('capa_due',              'CAPA Due',                         'capa',        'important', ARRAY['in_app','email']),
  ('data_quality_critical', 'Data Quality Issue Critical',      'data_quality','important', ARRAY['in_app','email'])
ON CONFLICT (event_key) DO NOTHING;
