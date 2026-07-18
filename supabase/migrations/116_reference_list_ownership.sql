-- 116_reference_list_ownership.sql
-- Phase 0 of the Runtime Configuration layer.
--
-- Goal: let each DOMAIN role manage the reference lists it owns, instead of
-- forcing every list edit through admin / operations_manager. This adds an
-- extra "owner write" RLS policy per list, ALONGSIDE the existing manager
-- policy — nothing is taken away from admin/ops.
--
-- Deliberately NOT opened (governance-adjacent — they shape the state machine):
--   wo_statuses, pn_statuses, sla_rules, vehicle_types, document_types.
-- Those stay admin/operations_manager only.
--
-- No table or column changes — RLS policies only. Idempotent: each policy is
-- created inside its own block that swallows the duplicate_object error, so the
-- migration is safe to re-run.

-- ── 1) Domain-owner write policies on the 006 master-data lists ────────────────
-- Each entry: (table, owner_role). A role listed here can INSERT/UPDATE/DELETE
-- rows in that table (RLS policies are OR-combined, so this is purely additive).
do $$
declare
  maps text[][] := array[
    ['supplier_categories',   'procurement_user'],
    ['material_categories',   'procurement_user'],
    ['material_categories',   'store_user'],
    ['root_cause_categories', 'qc_user'],
    ['store_locations',       'store_user']
  ];
  i int;
begin
  for i in 1 .. array_length(maps, 1) loop
    begin
      execute format(
        'create policy "reflist_%1$s_%2$s_write"
           on public.%1$s for all
           using (public.current_user_role() = %2$L)
           with check (public.current_user_role() = %2$L)',
        maps[i][1], maps[i][2]
      );
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ── 2) factory_requirement_types (migration 026) had NO RLS policies at all ────
-- Enable RLS and grant: read to any authenticated user; write to factory_user
-- plus admin / operations_manager. This is what makes the factory's requirement
-- checklist (BOQ / BOM / GA / Detail / Manhours …) editable by the factory team.
alter table public.factory_requirement_types enable row level security;

do $$
begin
  begin
    execute 'create policy "frt_authenticated_read"
               on public.factory_requirement_types for select
               using (auth.role() = ''authenticated'')';
  exception when duplicate_object then null;
  end;

  begin
    execute 'create policy "frt_owner_write"
               on public.factory_requirement_types for all
               using (public.current_user_role() in (''admin'', ''operations_manager'', ''factory_user''))
               with check (public.current_user_role() in (''admin'', ''operations_manager'', ''factory_user''))';
  exception when duplicate_object then null;
  end;
end $$;
