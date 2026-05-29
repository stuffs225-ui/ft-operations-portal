-- enum for all 10 roles
do $$ begin
  create type public.user_role as enum (
    'admin',
    'operations_manager',
    'sales_user',
    'sales_coordinator',
    'procurement_user',
    'factory_user',
    'store_user',
    'qc_user',
    'afs_user',
    'viewer'
  );
exception when duplicate_object then null;
end $$;

-- user_roles: one active role per user (single-role model for Phase 1)
create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        public.user_role not null,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  constraint user_roles_user_id_unique unique (user_id)
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
