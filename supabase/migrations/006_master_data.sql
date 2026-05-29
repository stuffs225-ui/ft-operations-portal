-- Master data tables for Settings page configuration
-- All tables use soft-delete (is_active), track created_at/updated_at,
-- and reuse the handle_updated_at() trigger defined in 001_profiles.sql.
-- RLS: authenticated users SELECT; admin/operations_manager INSERT/UPDATE/DELETE.

-- ── Helper: re-usable updated_at trigger installer ─────────────────────────
-- (handle_updated_at already exists from 001; we just attach it to each table)

-- ── vehicle_types ──────────────────────────────────────────────────────────
create table if not exists public.vehicle_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint vehicle_types_code_unique unique (code)
);

create trigger vehicle_types_updated_at
  before update on public.vehicle_types
  for each row execute function public.handle_updated_at();

-- ── material_categories ────────────────────────────────────────────────────
create table if not exists public.material_categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  requires_serial boolean not null default false,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger material_categories_updated_at
  before update on public.material_categories
  for each row execute function public.handle_updated_at();

-- ── supplier_categories ────────────────────────────────────────────────────
create table if not exists public.supplier_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger supplier_categories_updated_at
  before update on public.supplier_categories
  for each row execute function public.handle_updated_at();

-- ── document_types ─────────────────────────────────────────────────────────
create table if not exists public.document_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  required_at text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger document_types_updated_at
  before update on public.document_types
  for each row execute function public.handle_updated_at();

-- ── sla_rules ──────────────────────────────────────────────────────────────
create table if not exists public.sla_rules (
  id               uuid primary key default gen_random_uuid(),
  trigger_event    text not null,
  required_action  text not null,
  sla_hours        integer not null check (sla_hours > 0),
  escalate_to      text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger sla_rules_updated_at
  before update on public.sla_rules
  for each row execute function public.handle_updated_at();

-- ── root_cause_categories ──────────────────────────────────────────────────
create table if not exists public.root_cause_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger root_cause_categories_updated_at
  before update on public.root_cause_categories
  for each row execute function public.handle_updated_at();

-- ── store_locations ────────────────────────────────────────────────────────
create table if not exists public.store_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null,
  capacity    text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint store_locations_code_unique unique (code)
);

create trigger store_locations_updated_at
  before update on public.store_locations
  for each row execute function public.handle_updated_at();

-- ── wo_statuses ────────────────────────────────────────────────────────────
create table if not exists public.wo_statuses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

-- ── pn_statuses ────────────────────────────────────────────────────────────
create table if not exists public.pn_statuses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.vehicle_types         enable row level security;
alter table public.material_categories   enable row level security;
alter table public.supplier_categories   enable row level security;
alter table public.document_types        enable row level security;
alter table public.sla_rules             enable row level security;
alter table public.root_cause_categories enable row level security;
alter table public.store_locations       enable row level security;
alter table public.wo_statuses           enable row level security;
alter table public.pn_statuses           enable row level security;

-- Macro to apply the same two-policy pattern to every master data table.
-- SELECT: any authenticated user
-- ALL write: admin or operations_manager only

do $$
declare
  tbl text;
  tables text[] := array[
    'vehicle_types', 'material_categories', 'supplier_categories',
    'document_types', 'sla_rules', 'root_cause_categories',
    'store_locations', 'wo_statuses', 'pn_statuses'
  ];
begin
  foreach tbl in array tables loop
    -- Wrap each policy creation in its own BEGIN/EXCEPTION block so
    -- re-running the migration (already-exists error) is a no-op.
    begin
      execute format(
        'create policy "master_data_%1$s: authenticated read"
           on public.%1$s for select
           using (auth.role() = ''authenticated'')',
        tbl
      );
    exception when duplicate_object then null;
    end;

    begin
      execute format(
        'create policy "master_data_%1$s: manager write"
           on public.%1$s for all
           using (public.current_user_role() in (''admin'', ''operations_manager''))
           with check (public.current_user_role() in (''admin'', ''operations_manager''))',
        tbl
      );
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
