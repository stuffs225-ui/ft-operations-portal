-- ── 009_projects.sql ──────────────────────────────────────────────────────────
-- Projects table: core SO registration and lifecycle management.

-- project_status enum
do $$ begin
  create type public.project_status as enum (
    'draft',
    'submitted_for_approval',
    'sent_back_for_revision',
    'approved',
    'rejected',
    'active',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

-- manufacturing_location enum
do $$ begin
  create type public.manufacturing_location_enum as enum ('saudi', 'dubai', 'not_set');
exception when duplicate_object then null;
end $$;

-- medical_items_enum
do $$ begin
  create type public.medical_items_enum as enum ('yes', 'no', 'not_set');
exception when duplicate_object then null;
end $$;

-- ── projects ───────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                      uuid primary key default gen_random_uuid(),
  project_code            text not null,
  so_number               text not null,
  customer_name           text not null,
  sales_owner_id          uuid references public.profiles(id) on delete set null,
  customer_delivery_date  date not null,
  project_status          public.project_status not null default 'draft',
  manufacturing_location  public.manufacturing_location_enum not null default 'not_set',
  medical_items           public.medical_items_enum not null default 'not_set',
  total_sales_value       numeric(15,2) not null default 0,
  submitted_at            timestamptz,
  approved_at             timestamptz,
  approved_by             uuid references public.profiles(id) on delete set null,
  rejected_at             timestamptz,
  rejected_by             uuid references public.profiles(id) on delete set null,
  rejection_reason        text,
  revision_reason         text,
  notes                   text,
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint projects_project_code_unique unique (project_code),
  constraint projects_so_number_unique unique (so_number)
);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- Auto-generate project_code in the format FT-YYYY-NNNN
create or replace function public.generate_project_code()
returns trigger language plpgsql as $$
declare
  year_str text := to_char(now(), 'YYYY');
  seq_num  int;
begin
  select count(*) + 1 into seq_num
  from public.projects
  where project_code like 'FT-' || year_str || '-%';

  new.project_code := 'FT-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  return new;
end;
$$;

create trigger projects_generate_code
  before insert on public.projects
  for each row
  when (new.project_code = '' or new.project_code is null)
  execute function public.generate_project_code();

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.projects enable row level security;

-- admin / operations_manager: full CRUD
begin;
  do $$ begin
    create policy "projects: admin_ops full access"
      on public.projects for all
      using (public.current_user_role() in ('admin', 'operations_manager'))
      with check (public.current_user_role() in ('admin', 'operations_manager'));
  exception when duplicate_object then null;
  end $$;
commit;

-- sales_user: read own + insert + update draft/sent_back
begin;
  do $$ begin
    create policy "projects: sales_user read own"
      on public.projects for select
      using (
        public.current_user_role() = 'sales_user'
        and created_by = auth.uid()
      );
  exception when duplicate_object then null;
  end $$;
commit;

begin;
  do $$ begin
    create policy "projects: sales_user insert"
      on public.projects for insert
      with check (public.current_user_role() = 'sales_user');
  exception when duplicate_object then null;
  end $$;
commit;

begin;
  do $$ begin
    create policy "projects: sales_user update own draft"
      on public.projects for update
      using (
        public.current_user_role() = 'sales_user'
        and created_by = auth.uid()
        and project_status in ('draft', 'sent_back_for_revision')
      )
      with check (
        public.current_user_role() = 'sales_user'
        and created_by = auth.uid()
      );
  exception when duplicate_object then null;
  end $$;
commit;

-- sales_coordinator, operational roles, viewer: read approved only
begin;
  do $$ begin
    create policy "projects: read approved"
      on public.projects for select
      using (
        public.current_user_role() in (
          'sales_coordinator', 'procurement_user', 'factory_user',
          'store_user', 'qc_user', 'afs_user', 'viewer'
        )
        and project_status = 'approved'
      );
  exception when duplicate_object then null;
  end $$;
commit;
