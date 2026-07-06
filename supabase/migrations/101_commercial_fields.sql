-- ── 101_commercial_fields.sql ─────────────────────────────────────────────────
-- Commercial fields: Sector, NEG PO, Expected Delay Penalty, Line VAT.
-- ADDITIVE ONLY — no existing column, policy, trigger, or data is modified.
-- All new columns are NULLable (or defaulted) so existing rows and existing
-- app flows are unaffected until the UI starts writing them.
--
-- Apply supervised in the Supabase SQL Editor (pattern of 099/100):
-- see docs/implementation/migration-101-activation.md for pre/post checks.
--
-- NOTE (NEG PO document type): project_documents.document_type is the DB enum
-- project_document_type, which already contains 'customer_po'. The NEG PO PDF
-- is stored as a normal project_documents row with document_type='customer_po';
-- the projects.neg_po_document_id FK below is what identifies THE NEG PO
-- document precisely. No ALTER TYPE is needed (deliberate — avoids the
-- add-enum-value-in-transaction limitation entirely).
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Sector enum (guarded)
do $$ begin
  create type public.sector_enum as enum ('private', 'gov', 'semi_gov');
exception when duplicate_object then null;
end $$;

-- 2. Sector on the three commercial records (nullable — optional everywhere)
alter table public.hot_projects
  add column if not exists sector public.sector_enum null;

alter table public.quotation_requests
  add column if not exists sector public.sector_enum null;

alter table public.projects
  add column if not exists sector public.sector_enum null;

-- 3. NEG PO on projects: optional number + FK to the mandatory PDF document.
--    The number-requires-document rule is enforced at the application layer
--    (the save action is atomic in the UI: upload PDF → insert document row →
--    set both columns). ON DELETE SET NULL keeps the project consistent if a
--    document row is ever removed administratively.
alter table public.projects
  add column if not exists neg_po_number text null;

alter table public.projects
  add column if not exists neg_po_document_id uuid null
    references public.project_documents(id) on delete set null;

-- 4. Expected delay penalty percentage (entered by Operations; 0–100, 2dp)
alter table public.projects
  add column if not exists expected_delay_penalty_percent numeric(5,2) null;

do $$ begin
  alter table public.projects
    add constraint projects_delay_penalty_percent_range
    check (
      expected_delay_penalty_percent is null
      or (expected_delay_penalty_percent >= 0 and expected_delay_penalty_percent <= 100)
    );
exception when duplicate_object then null;
end $$;

-- 5. Per-line VAT applicability. VAT rate (15%) is an application constant;
--    line_total_value stays NET (its existing trigger is untouched) — the UI
--    computes and displays VAT-inclusive totals, and total_sales_value saved
--    from the wizard is VAT-inclusive when VAT lines are used.
alter table public.project_vehicle_lines
  add column if not exists vat_applicable boolean not null default false;

-- 6. Documentation comments
comment on column public.projects.neg_po_number is
  'Customer PO number to NEG (optional; when set, a PDF document row referenced by neg_po_document_id is mandatory — enforced in the app).';
comment on column public.projects.neg_po_document_id is
  'project_documents row holding the NEG PO PDF (file name pattern: PO#<number> To NEG.pdf).';
comment on column public.projects.expected_delay_penalty_percent is
  'Expected delay penalty % applied if delivery slips past the expected delivery date. Entered by Operations/Admin.';
comment on column public.project_vehicle_lines.vat_applicable is
  'When true, 15% VAT applies to this line; VAT amounts are computed in the application (line_total_value remains net).';

-- No RLS changes: existing table policies remain exactly as-is. Penalty editing
-- is UI-gated to operations_manager/admin, which matches the existing
-- can_write_project() rule (only admin/ops can update non-draft projects).
