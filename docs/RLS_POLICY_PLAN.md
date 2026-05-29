# Row Level Security (RLS) Policy Plan

All tables use RLS. The helper function `public.current_user_role()` is used throughout to avoid recursive policy joins.

```sql
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;
```

---

## Phase 1 Tables

### `profiles`

| Operation | Who | Condition |
|-----------|-----|-----------|
| SELECT | Owner | `id = auth.uid()` |
| SELECT | Admin, Ops Manager | role in ('admin', 'operations_manager') |
| UPDATE | Owner | `id = auth.uid()` (non-sensitive fields only) |
| INSERT | Admin | role = 'admin' (trigger-based insert also allowed) |
| DELETE | Admin | role = 'admin' |

### `user_roles`

| Operation | Who | Condition |
|-----------|-----|-----------|
| SELECT | Owner | `user_id = auth.uid()` |
| SELECT | Admin | role = 'admin' |
| INSERT, UPDATE, DELETE | Admin | role = 'admin' |

### `audit_log`

| Operation | Who | Condition |
|-----------|-----|-----------|
| SELECT | Admin | role = 'admin' |
| INSERT | Any authenticated user | `auth.role() = 'authenticated'` |
| UPDATE | Nobody | — (append-only) |
| DELETE | Nobody | — (immutable) |

### `timeline_events`

| Operation | Who | Condition |
|-----------|-----|-----------|
| SELECT | Admin, Ops Manager | role in ('admin', 'operations_manager') |
| INSERT | Any authenticated user | `auth.role() = 'authenticated'` |
| UPDATE, DELETE | Nobody | — |

---

## Phase 2+ Tables (Planned)

### `projects` / `sales_orders`

| Operation | Who |
|-----------|-----|
| SELECT all | admin, operations_manager |
| SELECT own + assigned | sales_user, sales_coordinator |
| INSERT | admin, operations_manager, sales_user |
| UPDATE | admin, operations_manager, assigned sales_user |
| DELETE | admin only |

### `work_orders`

| Operation | Who |
|-----------|-----|
| SELECT | admin, operations_manager, factory_user (assigned WOs), qc_user |
| INSERT | admin, operations_manager |
| UPDATE status | factory_user (limited fields: status, progress), admin, ops_manager |
| DELETE | admin only |

### `part_numbers`

| Operation | Who |
|-----------|-----|
| SELECT | admin, operations_manager, afs_user |
| INSERT | admin, operations_manager |
| UPDATE | admin, operations_manager, afs_user (Dubai status fields only) |

### `purchase_orders` (PO to Supplier)

| Operation | Who |
|-----------|-----|
| SELECT | admin, operations_manager, procurement_user |
| INSERT | procurement_user, admin, operations_manager |
| UPDATE (approve) | admin, operations_manager (only for amounts >10,000 SAR) |
| DELETE | admin only |

### `materials` / `inventory`

| Operation | Who |
|-----------|-----|
| SELECT | admin, operations_manager, store_user, factory_user, qc_user |
| INSERT | store_user (receiving), procurement_user |
| UPDATE (location, qty) | store_user |
| UPDATE (qc_status) | qc_user |
| DELETE | admin only |

### `documents`

| Operation | Who |
|-----------|-----|
| SELECT | admin, operations_manager; role-filtered by entity |
| INSERT | Any user with access to the parent entity |
| UPDATE (status) | admin, operations_manager, qc_user |
| DELETE | admin only |

---

## Implementation Notes

1. Never expose the service role key in client code.
2. All financial amount fields (total_amount, unit_price) must check `financialVisibility` at the application layer for non-manager roles.
3. Soft-delete (is_active = false) is preferred over hard delete for all business entities.
4. The `security definer` attribute on `current_user_role()` prevents privilege escalation via search_path manipulation.
