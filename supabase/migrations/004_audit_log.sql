-- audit_log: immutable record of all system actions
-- Rows are INSERT-only; no UPDATE or DELETE allowed via RLS.
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  actor_id      uuid references public.profiles(id),
  actor_email   text,                          -- denormalised for immutability
  actor_role    text,
  action        text not null,                 -- CREATE | UPDATE | DELETE | APPROVE | REJECT | LOGIN | LOGOUT | ASSIGN_ROLE
  entity_type   text not null,                 -- e.g. WorkOrder, Quotation, User
  entity_id     text,
  description   text,
  before_data   jsonb,
  after_data    jsonb,
  ip_address    inet,
  user_agent    text
);

-- Immutable: no updates or deletes, ever
alter table public.audit_log enable row level security;

create policy "audit_log: admin read"
  on public.audit_log for select
  using (public.current_user_role() = 'admin');

create policy "audit_log: authenticated insert"
  on public.audit_log for insert
  with check (auth.role() = 'authenticated');

-- No UPDATE or DELETE policies = effectively append-only

-- Index for common query patterns
create index if not exists audit_log_actor_id_idx   on public.audit_log(actor_id);
create index if not exists audit_log_entity_idx     on public.audit_log(entity_type, entity_id);
create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);
