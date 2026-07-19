-- 122_production_plan.sql
-- Production Plan tool + the production dimensions the Master List tracks but the
-- system didn't: chassis, manhours, offline(Dubai)/online(KSA) split, delivery.
--
--   • production_plan_task_templates  — the factory's DEFAULT build tasks (editable,
--     seeded). Engineers generate a project plan from these, then add/remove/reorder.
--   • project_production_plan_tasks    — the per-project plan (tasks with department,
--     duration, planned start, status, assignee, remarks).
--   • project_production_details       — 1:1 project extras: chassis, manhours,
--     offline/online notes, delivery schedule.
-- Factory-owned RLS (write: admin/ops/factory_user; read: authenticated). Idempotent.

-- ── Default task template ──────────────────────────────────────────────────────
create table if not exists public.production_plan_task_templates (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  department           text        not null default 'Assembly',
  default_duration_days int        not null default 1 check (default_duration_days >= 0),
  sort_order           int         not null default 0,
  is_active            boolean     not null default true,
  created_by           uuid        references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_pptt_active on public.production_plan_task_templates(is_active);

-- ── Per-project plan tasks ─────────────────────────────────────────────────────
create table if not exists public.project_production_plan_tasks (
  id                 uuid        primary key default gen_random_uuid(),
  project_id         uuid        not null references public.projects(id) on delete cascade,
  name               text        not null,
  department         text        not null default 'Assembly',
  sort_order         int         not null default 0,
  duration_days      int         not null default 1 check (duration_days >= 0),
  planned_start_date date,
  status             text        not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'blocked', 'skipped')),
  assignee           text,
  remarks            text,
  created_by         uuid        references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_pppt_project on public.project_production_plan_tasks(project_id, sort_order);

-- ── Per-project production details (1:1) ───────────────────────────────────────
create table if not exists public.project_production_details (
  project_id       uuid        primary key references public.projects(id) on delete cascade,
  chassis_status   text,
  chassis_received int         not null default 0,
  chassis_total    int         not null default 0,
  manhours_needed  numeric(10,2) not null default 0,
  offline_notes    text,                                     -- Offline production (Dubai)
  online_notes     text,                                     -- Online production (KSA)
  delivery_schedule text,                                    -- phased delivery (units / month)
  updated_by       uuid        references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── updated_at touch (shared) ──────────────────────────────────────────────────
create or replace function public.production_plan_touch_updated_at()
  returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end; $$;
do $$
declare tbl text;
begin
  foreach tbl in array array['production_plan_task_templates', 'project_production_plan_tasks', 'project_production_details'] loop
    begin
      execute format('create trigger trg_%1$s_touch before update on public.%1$s
                        for each row execute function public.production_plan_touch_updated_at()',
                     left(tbl, 40));
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ── RLS: read authenticated; write admin/ops/factory_user ──────────────────────
alter table public.production_plan_task_templates enable row level security;
alter table public.project_production_plan_tasks  enable row level security;
alter table public.project_production_details     enable row level security;
do $$
declare tbl text;
begin
  foreach tbl in array array['production_plan_task_templates', 'project_production_plan_tasks', 'project_production_details'] loop
    begin
      execute format('create policy "pplan_read" on public.%1$s for select using (auth.role() = ''authenticated'')', tbl);
    exception when duplicate_object then null; end;
    begin
      execute format('create policy "pplan_owner_write" on public.%1$s for all
                        using (public.current_user_role() in (''admin'',''operations_manager'',''factory_user''))
                        with check (public.current_user_role() in (''admin'',''operations_manager'',''factory_user''))', tbl);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ── Seed a realistic ambulance / fire-truck build sequence (only if empty) ─────
insert into public.production_plan_task_templates (name, department, default_duration_days, sort_order)
select v.name, v.department, v.d, v.o
from (values
  ('Chassis inspection & preparation',      'Engineering', 2, 1),
  ('Chassis modification / extension',      'Fabrication', 3, 2),
  ('Body / box mounting',                   'Fabrication', 4, 3),
  ('Electrical wiring & systems',           'Electrical',  4, 4),
  ('AC & climate control',                  'Electrical',  2, 5),
  ('Interior fit-out & cabinetry',          'Assembly',    5, 6),
  ('Medical / firefighting equipment install','Assembly',  4, 7),
  ('Graphics & decals',                     'Finishing',   1, 8),
  ('Painting & finishing',                  'Finishing',   3, 9),
  ('Final assembly',                        'Assembly',    2, 10),
  ('Testing & commissioning',               'QC',          2, 11),
  ('Pre-delivery inspection',               'QC',          1, 12)
) as v(name, department, d, o)
where not exists (select 1 from public.production_plan_task_templates);
