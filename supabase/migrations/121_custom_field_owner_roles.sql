-- 121_custom_field_owner_roles.sql
-- Refines Phase 3: instead of only admin/ops defining custom fields, let each
-- DOMAIN role define fields for the entity it owns:
--   procurement_user            → purchase_order
--   store_user                  → store_receipt
--   sales_user / sales_coordinator → quotation_request
-- 'project' stays admin/ops (cross-cutting). Each policy is scoped to its
-- entity_type so a role can only add columns to its own record type. Additive —
-- the existing cfd_admin_write (admin/ops, all entities) and cfd_read remain.
-- Idempotent.

do $$
declare
  -- (role, entity_type) pairs
  maps text[][] := array[
    ['procurement_user', 'purchase_order'],
    ['store_user',       'store_receipt'],
    ['sales_user',       'quotation_request'],
    ['sales_coordinator','quotation_request']
  ];
  i int;
begin
  for i in 1 .. array_length(maps, 1) loop
    begin
      execute format(
        'create policy "cfd_owner_%1$s_%2$s" on public.custom_field_definitions for all
           using (public.current_user_role() = %1$L and entity_type = %2$L)
           with check (public.current_user_role() = %1$L and entity_type = %2$L)',
        maps[i][1], maps[i][2]);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
