-- ── 010_project_vehicle_lines.sql ─────────────────────────────────────────────
-- Vehicle/item lines belonging to a project.

create table if not exists public.project_vehicle_lines (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  line_number      integer not null,
  vehicle_type     text not null,
  description      text not null,
  quantity         integer not null check (quantity > 0),
  unit_sales_value numeric(15,2) not null default 0 check (unit_sales_value >= 0),
  line_total_value numeric(15,2) not null default 0,
  line_status      text not null default 'pending',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint project_vehicle_lines_unique_line unique (project_id, line_number)
);

-- Auto-compute line_total_value on insert/update
create or replace function public.compute_line_total()
returns trigger language plpgsql as $$
begin
  new.line_total_value := new.quantity * new.unit_sales_value;
  return new;
end;
$$;

create trigger project_vehicle_lines_compute_total
  before insert or update on public.project_vehicle_lines
  for each row execute function public.compute_line_total();

create trigger project_vehicle_lines_updated_at
  before update on public.project_vehicle_lines
  for each row execute function public.handle_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.project_vehicle_lines enable row level security;

begin;
  do $$ begin
    create policy "pvl: admin_ops full access"
      on public.project_vehicle_lines for all
      using (public.current_user_role() in ('admin', 'operations_manager'))
      with check (public.current_user_role() in ('admin', 'operations_manager'));
  exception when duplicate_object then null;
  end $$;
commit;

begin;
  do $$ begin
    create policy "pvl: sales_user own project"
      on public.project_vehicle_lines for all
      using (
        public.current_user_role() = 'sales_user'
        and exists (
          select 1 from public.projects p
          where p.id = project_id and p.created_by = auth.uid()
        )
      )
      with check (
        public.current_user_role() = 'sales_user'
        and exists (
          select 1 from public.projects p
          where p.id = project_id and p.created_by = auth.uid()
        )
      );
  exception when duplicate_object then null;
  end $$;
commit;

begin;
  do $$ begin
    create policy "pvl: read approved projects"
      on public.project_vehicle_lines for select
      using (
        public.current_user_role() in (
          'sales_coordinator', 'procurement_user', 'factory_user',
          'store_user', 'qc_user', 'afs_user', 'viewer'
        )
        and exists (
          select 1 from public.projects p
          where p.id = project_id and p.project_status = 'approved'
        )
      );
  exception when duplicate_object then null;
  end $$;
commit;
