-- ── 106_quotation_clarifications.sql ──────────────────────────────────────────
-- C1: a real two-way, multi-round, logged clarification thread on a quotation.
--
-- Today the coordinator writes a single `coordinator_remarks` and flips status to
-- 'need_clarification'; the salesman has no structured way to reply with text +
-- an attachment, and there is no history. This adds an append-only thread:
--   • coordinator posts 'coordinator_request' (asking for clarification),
--   • sales posts 'sales_reply' (answering, optionally with a file),
--   • repeat as many rounds as needed — every message is retained.
--
-- Attachments reuse the existing quotation_documents table / quotation-documents
-- bucket (optional document_id per message).
--
-- RLS: a user may read/append thread rows only for a quotation they can already
-- see (delegated to quotation_requests' own RLS via EXISTS). Authors write as
-- themselves. Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.quotation_clarifications (
  id             uuid primary key default gen_random_uuid(),
  quotation_id   uuid not null references public.quotation_requests(id) on delete cascade,
  author_id      uuid references auth.users(id),
  author_name    text,
  author_role    public.user_role,
  direction      text not null check (direction in ('coordinator_request', 'sales_reply')),
  body           text not null check (length(btrim(body)) > 0),
  document_id    uuid references public.quotation_documents(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_quotation_clarifications_quotation
  on public.quotation_clarifications(quotation_id, created_at);

comment on table public.quotation_clarifications is
  'Append-only clarification thread between coordinator and sales on a quotation (C1). Multi-round, attachments via quotation_documents.';

alter table public.quotation_clarifications enable row level security;

-- Read: any user who can see the parent quotation (delegated to its RLS).
drop policy if exists qc_select on public.quotation_clarifications;
create policy qc_select on public.quotation_clarifications
  for select to authenticated
  using (
    exists (select 1 from public.quotation_requests q where q.id = quotation_id)
  );

-- Insert: author writes as themselves, on a quotation they can see.
drop policy if exists qc_insert on public.quotation_clarifications;
create policy qc_insert on public.quotation_clarifications
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.quotation_requests q where q.id = quotation_id)
  );

-- Append-only: no update/delete policies (history is immutable).
