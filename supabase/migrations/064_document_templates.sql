-- ── Migration 064: Template Management + Fillable Templates ────────────────────
-- document_templates : approved/managed templates per department
-- template_fields     : placeholder field definitions for fillable templates
-- generated_documents : saved rendered copies produced from a template

DO $$ BEGIN
  CREATE TYPE public.template_type_enum AS ENUM (
    'letter', 'report', 'form', 'checklist', 'pdf_template',
    'word_template', 'email_template', 'operational', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_format_enum AS ENUM (
    'rich_text', 'plain_text', 'html', 'file', 'pdf', 'docx', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_approval_status AS ENUM (
    'draft', 'submitted_for_approval', 'approved', 'rejected', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_visibility_scope AS ENUM (
    'department', 'all_departments', 'admin_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_field_type AS ENUM (
    'text', 'number', 'date', 'email', 'phone', 'dropdown', 'textarea',
    'project_selector', 'customer_selector', 'vehicle_selector', 'employee_selector'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.generated_document_status AS ENUM (
    'draft', 'generated', 'exported', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── document_templates ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code    text UNIQUE NOT NULL,
  template_name    text NOT NULL,
  template_type    public.template_type_enum NOT NULL DEFAULT 'other',
  department       text,
  description      text,
  file_name        text,
  storage_path     text,
  template_body    text,
  template_format  public.template_format_enum NOT NULL DEFAULT 'plain_text',
  approval_status  public.template_approval_status NOT NULL DEFAULT 'draft',
  submitted_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at     timestamptz,
  approved_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at      timestamptz,
  rejected_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at      timestamptz,
  rejection_reason text,
  version          text NOT NULL DEFAULT 'v1',
  is_active        boolean NOT NULL DEFAULT true,
  visibility_scope public.template_visibility_scope NOT NULL DEFAULT 'department',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_templates_status     ON public.document_templates(approval_status);
CREATE INDEX IF NOT EXISTS idx_doc_templates_department ON public.document_templates(department);
CREATE INDEX IF NOT EXISTS idx_doc_templates_type       ON public.document_templates(template_type);

DROP TRIGGER IF EXISTS doc_templates_updated_at ON public.document_templates;
CREATE TRIGGER doc_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Admin/ops: full access (approve / reject / archive)
DROP POLICY IF EXISTS dt_admin_all ON public.document_templates;
CREATE POLICY dt_admin_all ON public.document_templates
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

-- Any authenticated user may submit a template (draft / submit for approval).
DROP POLICY IF EXISTS dt_user_insert ON public.document_templates;
CREATE POLICY dt_user_insert ON public.document_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND approval_status IN ('draft', 'submitted_for_approval')
  );

-- Submitter may update their own template only while it is not yet approved.
DROP POLICY IF EXISTS dt_user_update_own ON public.document_templates;
CREATE POLICY dt_user_update_own ON public.document_templates
  FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND approval_status IN ('draft', 'submitted_for_approval', 'rejected')
  )
  WITH CHECK (
    submitted_by = auth.uid()
    -- submitter cannot self-approve
    AND approval_status IN ('draft', 'submitted_for_approval')
  );

-- SELECT: submitter sees own; otherwise visibility scope governs.
DROP POLICY IF EXISTS dt_select_scope ON public.document_templates;
CREATE POLICY dt_select_scope ON public.document_templates
  FOR SELECT
  USING (
    submitted_by = auth.uid()
    OR (
      approval_status = 'approved' AND is_active
      AND (
        visibility_scope = 'all_departments'
        OR (visibility_scope = 'admin_only'
            AND public.current_user_role() IN ('admin', 'operations_manager'))
        -- department scope: visible to all authenticated users; the UI filters by
        -- the viewer's department. (No department column on profiles RLS-side join
        -- to avoid recursion; department gating is applied in the application layer.)
        OR visibility_scope = 'department'
      )
    )
  );

-- ── template_fields ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.template_fields (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  field_key     text NOT NULL,
  field_label   text NOT NULL,
  field_type    public.template_field_type NOT NULL DEFAULT 'text',
  is_required   boolean NOT NULL DEFAULT false,
  default_value text,
  help_text     text,
  display_order int NOT NULL DEFAULT 0,
  options_json  jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_template_fields_template ON public.template_fields(template_id);

DROP TRIGGER IF EXISTS template_fields_updated_at ON public.template_fields;
CREATE TRIGGER template_fields_updated_at
  BEFORE UPDATE ON public.template_fields
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.template_fields ENABLE ROW LEVEL SECURITY;

-- Fields follow the parent template's access: admin/ops full, others read.
DROP POLICY IF EXISTS tf_admin_all ON public.template_fields;
CREATE POLICY tf_admin_all ON public.template_fields
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

DROP POLICY IF EXISTS tf_user_manage_own ON public.template_fields;
CREATE POLICY tf_user_manage_own ON public.template_fields
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.document_templates t
            WHERE t.id = template_id AND t.submitted_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.document_templates t
            WHERE t.id = template_id AND t.submitted_by = auth.uid())
  );

DROP POLICY IF EXISTS tf_select_via_template ON public.template_fields;
CREATE POLICY tf_select_via_template ON public.template_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.document_templates t
      WHERE t.id = template_id
        AND (
          t.submitted_by = auth.uid()
          OR (t.approval_status = 'approved' AND t.is_active)
        )
    )
  );

-- ── generated_documents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id              uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  generated_document_number text UNIQUE NOT NULL,
  project_id               uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  related_module           text,
  generated_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at             timestamptz NOT NULL DEFAULT now(),
  output_title             text NOT NULL,
  filled_values_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_content         text,
  exported_file_path       text,
  status                   public.generated_document_status NOT NULL DEFAULT 'generated',
  remarks                  text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gen_docs_template ON public.generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_gen_docs_project  ON public.generated_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_gen_docs_by       ON public.generated_documents(generated_by);

DROP TRIGGER IF EXISTS gen_docs_updated_at ON public.generated_documents;
CREATE TRIGGER gen_docs_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Admin/ops see all generated documents.
DROP POLICY IF EXISTS gd_admin_all ON public.generated_documents;
CREATE POLICY gd_admin_all ON public.generated_documents
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

-- Users may create and read their own generated documents.
DROP POLICY IF EXISTS gd_user_insert ON public.generated_documents;
CREATE POLICY gd_user_insert ON public.generated_documents
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND generated_by = auth.uid());

DROP POLICY IF EXISTS gd_user_select_own ON public.generated_documents;
CREATE POLICY gd_user_select_own ON public.generated_documents
  FOR SELECT
  USING (generated_by = auth.uid());

DROP POLICY IF EXISTS gd_user_update_own ON public.generated_documents;
CREATE POLICY gd_user_update_own ON public.generated_documents
  FOR UPDATE
  USING (generated_by = auth.uid())
  WITH CHECK (generated_by = auth.uid());
