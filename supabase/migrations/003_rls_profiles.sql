-- Enable RLS
alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;

-- ── Helper: get current user's role without infinite recursion ──────────────
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer
set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;

-- ── profiles policies ───────────────────────────────────────────────────────

-- Users can always read their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (id = auth.uid());

-- Admins and operations managers can read all profiles
create policy "profiles: manager read"
  on public.profiles for select
  using (public.current_user_role() in ('admin', 'operations_manager'));

-- Users can update their own non-sensitive fields
create policy "profiles: own update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only admins can insert or hard-delete profiles
create policy "profiles: admin insert"
  on public.profiles for insert
  with check (public.current_user_role() = 'admin');

create policy "profiles: admin delete"
  on public.profiles for delete
  using (public.current_user_role() = 'admin');

-- ── user_roles policies ─────────────────────────────────────────────────────

-- Anyone can read their own role
create policy "user_roles: own read"
  on public.user_roles for select
  using (user_id = auth.uid());

-- Admins can read all roles
create policy "user_roles: admin read"
  on public.user_roles for select
  using (public.current_user_role() = 'admin');

-- Only admins can assign or change roles
create policy "user_roles: admin write"
  on public.user_roles for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
