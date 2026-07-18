-- 119_custom_fields.sql
-- Phase 3 of the Runtime Configuration layer — the disciplined version of
-- "add any column like my Excel sheet".
--
-- Instead of letting the app run ALTER TABLE (which would break RLS, reporting and
-- governance), custom fields are DATA:
--   • custom_field_definitions — typed field definitions per entity_type
--     (text / number / date / select / boolean). Managed by admin / ops.
--   • custom_field_values      — one value per (definition, entity) row.
-- This keeps every value typed and reportable, and never touches the core schema.
-- Idempotent.

create table if not exists public.custom_field_definitions (
  id          uuid        primary key default gen_random_uuid(),
  entity_type text        not null,                              -- 'project' | 'factory_record' | 'purchase_order' | …
  field_key   text        not null,                              -- stable slug, unique per entity_type
  label       text        not null,
  field_type  text        not null default 'text' check (field_type in ('text', 'number', 'date', 'select', 'boolean')),
  options     jsonb,                                             -- select only: array of string options
  sort_order  int         not null default 0,
  is_active   boolean     not null default true,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (entity_type, field_key)
);
create index if not exists idx_cfd_entity on public.custom_field_definitions(entity_type, is_active);

create table if not exists public.custom_field_values (
  id            uuid        primary key default gen_random_uuid(),
  definition_id uuid        not null references public.custom_field_definitions(id) on delete cascade,
  entity_id     uuid        not null,
  value_text    text,                                            -- all values stored as text; cast in the UI by field_type
  updated_by    uuid        references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (definition_id, entity_id)
);
create index if not exists idx_cfv_entity on public.custom_field_values(entity_id);

-- updated_at touch (shared)
create or replace function public.custom_fields_touch_updated_at()
  returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

do $$
begin
  begin
    create trigger trg_cfd_touch before update on public.custom_field_definitions
      for each row execute function public.custom_fields_touch_updated_at();
  exception when duplicate_object then null; end;
  begin
    create trigger trg_cfv_touch before update on public.custom_field_values
      for each row execute function public.custom_fields_touch_updated_at();
  exception when duplicate_object then null; end;
end $$;

alter table public.custom_field_definitions enable row level security;
alter table public.custom_field_values      enable row level security;

-- Definitions: read to any authenticated; write to admin / operations_manager only
-- (deciding WHICH columns exist is a governance act — kept deliberately narrow).
do $$
begin
  begin
    execute 'create policy "cfd_read" on public.custom_field_definitions for select using (auth.role() = ''authenticated'')';
  exception when duplicate_object then null; end;
  begin
    execute 'create policy "cfd_admin_write" on public.custom_field_definitions for all
               using (public.current_user_role() in (''admin'',''operations_manager''))
               with check (public.current_user_role() in (''admin'',''operations_manager''))';
  exception when duplicate_object then null; end;
end $$;

-- Values: read to any authenticated; write to any authenticated (filling in a
-- defined field on a record you can see is ordinary data entry, not governance).
do $$
begin
  begin
    execute 'create policy "cfv_read" on public.custom_field_values for select using (auth.role() = ''authenticated'')';
  exception when duplicate_object then null; end;
  begin
    execute 'create policy "cfv_write" on public.custom_field_values for all
               using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
  exception when duplicate_object then null; end;
end $$;
