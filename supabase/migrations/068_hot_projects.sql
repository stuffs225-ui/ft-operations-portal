-- ── 068_hot_projects.sql ──────────────────────────────────────────────────────
-- Hot Projects: sales opportunity pipeline, pre-quotation or alongside quotation.

do $$ begin
  create type public.hot_project_stage as enum (
    'lead',
    'qualified',
    'proposal_required',
    'quotation_requested',
    'negotiation',
    'won',
    'lost',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.hot_projects (
  id                    uuid primary key default gen_random_uuid(),
  hot_project_code      text not null default '',
  title                 text not null,
  customer_name         text not null,
  customer_contact_name text,
  customer_email        text,
  customer_phone        text,
  opportunity_source    text,
  stage                 public.hot_project_stage not null default 'lead',
  probability           int not null default 50
                          constraint hot_projects_probability_check check (probability >= 0 and probability <= 100),
  estimated_value       numeric(15,2),
  expected_close_date   date,
  linked_quotation_id   uuid references public.quotation_requests(id) on delete set null,
  linked_project_id     uuid references public.projects(id) on delete set null,
  sales_owner_id        uuid references public.profiles(id) on delete set null,
  notes                 text,
  lost_reason           text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint hot_projects_code_unique unique (hot_project_code)
);

create trigger hot_projects_updated_at
  before update on public.hot_projects
  for each row execute function public.handle_updated_at();

-- Auto-generate HP-YYYY-NNNN code
create or replace function public.generate_hot_project_code()
returns trigger language plpgsql as $$
declare
  year_str text := to_char(now(), 'YYYY');
  seq_num  int;
begin
  if new.hot_project_code = '' or new.hot_project_code is null then
    select count(*) + 1 into seq_num
    from public.hot_projects
    where hot_project_code like 'HP-' || year_str || '-%';
    new.hot_project_code := 'HP-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger hot_projects_generate_code
  before insert on public.hot_projects
  for each row execute function public.generate_hot_project_code();

create index if not exists idx_hot_projects_created_by   on public.hot_projects(created_by);
create index if not exists idx_hot_projects_stage        on public.hot_projects(stage);
create index if not exists idx_hot_projects_created_at   on public.hot_projects(created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.hot_projects enable row level security;

do $$ begin
  create policy "hot_projects: admin_ops full"
    on public.hot_projects for all
    using  (public.current_user_role() in ('admin', 'operations_manager'))
    with check (public.current_user_role() in ('admin', 'operations_manager'));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: sales_user select own"
    on public.hot_projects for select
    using (public.current_user_role() = 'sales_user' and created_by = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: sales_user insert"
    on public.hot_projects for insert
    with check (public.current_user_role() = 'sales_user');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: sales_user update own open"
    on public.hot_projects for update
    using (
      public.current_user_role() = 'sales_user'
      and created_by = auth.uid()
      and stage not in ('won', 'lost', 'cancelled')
    )
    with check (
      public.current_user_role() = 'sales_user'
      and created_by = auth.uid()
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: coordinator read all"
    on public.hot_projects for select
    using (public.current_user_role() = 'sales_coordinator');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: viewer read all"
    on public.hot_projects for select
    using (public.current_user_role() = 'viewer');
exception when duplicate_object then null;
end $$;
