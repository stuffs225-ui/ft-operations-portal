-- timeline_events: ordered activity feed per project / entity
-- Powers the per-project timeline UI in Phase 2+.
create table if not exists public.timeline_events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  entity_type   text not null,   -- Project | WorkOrder | PartNumber | Quotation | etc.
  entity_id     text not null,
  event_type    text not null,   -- STATUS_CHANGE | COMMENT | DOCUMENT_UPLOADED | APPROVAL | QC_RESULT | etc.
  title         text not null,
  body          text,
  actor_id      uuid references public.profiles(id),
  actor_name    text,            -- denormalised snapshot
  metadata      jsonb,           -- flexible per event_type payload
  is_system     boolean not null default false
);

alter table public.timeline_events enable row level security;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Phase 1: admins and managers can read all; others read in Phase 2 with entity-level policies

create policy "timeline: manager read"
  on public.timeline_events for select
  using (public.current_user_role() in ('admin', 'operations_manager'));

create policy "timeline: authenticated insert"
  on public.timeline_events for insert
  with check (auth.role() = 'authenticated');

-- Indices for timeline queries (most recent first per entity)
create index if not exists timeline_events_entity_idx    on public.timeline_events(entity_type, entity_id);
create index if not exists timeline_events_created_at_idx on public.timeline_events(created_at desc);
create index if not exists timeline_events_actor_idx     on public.timeline_events(actor_id);
