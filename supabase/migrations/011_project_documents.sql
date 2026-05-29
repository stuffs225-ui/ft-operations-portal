-- ── 011_project_documents.sql ─────────────────────────────────────────────────
-- Documents attached to a project (PO, contract, specs, etc.)

-- document_type enum
do $$ begin
  create type public.project_document_type as enum (
    'customer_po',
    'customer_contract',
    'sales_order_supporting_document',
    'specification_file',
    'other'
  );
exception when duplicate_object then null;
end $$;

-- document_status enum
do $$ begin
  create type public.document_review_status as enum (
    'uploaded',
    'under_review',
    'approved',
    'rejected',
    'superseded'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.project_documents (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  document_type public.project_document_type not null default 'other',
  file_name     text not null,
  storage_path  text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now(),
  status        public.document_review_status not null default 'uploaded',
  version       text not null default '1.0',
  remarks       text
);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.project_documents enable row level security;

begin;
  do $$ begin
    create policy "pd: admin_ops full access"
      on public.project_documents for all
      using (public.current_user_role() in ('admin', 'operations_manager'))
      with check (public.current_user_role() in ('admin', 'operations_manager'));
  exception when duplicate_object then null;
  end $$;
commit;

begin;
  do $$ begin
    create policy "pd: sales_user own project"
      on public.project_documents for all
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
    create policy "pd: read approved projects"
      on public.project_documents for select
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
