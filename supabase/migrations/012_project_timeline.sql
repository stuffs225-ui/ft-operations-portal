-- ── 012_project_timeline.sql ──────────────────────────────────────────────────
-- Project-specific timeline events (separate from global timeline_events).

create table if not exists public.project_timeline_events (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  event_type  text not null,
  title       text not null,
  body        text,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text,
  metadata    jsonb,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists project_timeline_events_project_id_idx
  on public.project_timeline_events (project_id);
create index if not exists project_timeline_events_created_at_idx
  on public.project_timeline_events (created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.project_timeline_events enable row level security;

begin;
  do $$ begin
    create policy "pte: authenticated insert"
      on public.project_timeline_events for insert
      with check (auth.role() = 'authenticated');
  exception when duplicate_object then null;
  end $$;
commit;

begin;
  do $$ begin
    create policy "pte: admin_ops read all"
      on public.project_timeline_events for select
      using (public.current_user_role() in ('admin', 'operations_manager'));
  exception when duplicate_object then null;
  end $$;
commit;

begin;
  do $$ begin
    create policy "pte: sales_user read own projects"
      on public.project_timeline_events for select
      using (
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
    create policy "pte: operational read approved"
      on public.project_timeline_events for select
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
