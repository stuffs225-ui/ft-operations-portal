# PO to Supplier — Approval Security Rules (GAP-02)

**Date:** 2026-05-31  
**Branch:** security-hardening-cost-po-approval  
**Status:** ✅ Implemented  
**Migration:** `061_po_approval_guard.sql`

---

## Problem

`po_procurement_all` (migration 021) was a `FOR ALL` policy with no `WITH CHECK`
clause. In PostgreSQL, a `FOR ALL` policy without `WITH CHECK` defaults the
write check to the same expression as `USING`. This means:

- A `procurement_user` could **approve their own PO** by sending a PATCH to the
  Supabase REST API: `{ "approval_status": "approved", "approved_by": "<self-uuid>" }`.
- There was no server-side guard — the only enforcement was the frontend approval
  queue UI.

This violates the separation-of-duties rule: POs above 10,000 SAR require
Admin or Operations Manager approval.

---

## Fix

### Policy split

`po_procurement_all` is replaced by four targeted policies:

| Policy | Operation | WITH CHECK |
|---|---|---|
| `po_procurement_select` | SELECT | — |
| `po_procurement_insert` | INSERT | role = procurement_user |
| `po_procurement_update` | UPDATE | role = procurement_user AND approval_status NOT IN ('approved','rejected') |
| `po_procurement_delete` | DELETE | role = procurement_user AND po_status IN ('draft','pending_approval') |

The UPDATE policy's `WITH CHECK` allows procurement to:
- Set `approval_status = 'not_required'` (low-value PO, default)
- Set `approval_status = 'pending'` (submitting for approval)

It **blocks** procurement from setting:
- `approval_status = 'approved'`
- `approval_status = 'rejected'`

### Trigger (belt-and-suspenders)

`enforce_po_approval_authority()` is a `SECURITY DEFINER` `BEFORE UPDATE` trigger
that fires regardless of how the update reaches the DB (REST API, direct SQL, or
future admin tools). It raises an exception if a non-admin/ops user attempts to
flip `approval_status` to `'approved'` or `'rejected'`.

The trigger also auto-fills `approved_by = auth.uid()` and `approved_at = now()`
when an admin/ops user approves (if the caller didn't supply those values).

---

## Approval workflow (after this fix)

1. `procurement_user` creates a PO — `set_po_approval_required` trigger fires and
   sets `approval_required = true` if `purchase_value > 10000`.
2. Procurement submits: `approval_status = 'pending'`. This is **allowed** by the
   new UPDATE policy.
3. Admin or Operations Manager sees the PO in the approval queue and sets
   `approval_status = 'approved'` or `'rejected'`. Only their RLS policy
   (`po_admin_all` FOR ALL) can write these values; the trigger also validates.
4. If a procurement user tries to self-approve via API: the `WITH CHECK` on the
   UPDATE policy blocks it at the RLS layer; the trigger provides a second
   rejection with an explicit error message.

---

## Smoke test verification

```sql
-- 1. As procurement_user, attempt to self-approve:
UPDATE purchase_orders_to_supplier
  SET approval_status = 'approved', approved_by = auth.uid(), approved_at = now()
  WHERE id = '<some-po-id>';
-- Expected: RLS WITH CHECK violation → 0 rows updated (Supabase returns empty)
-- OR: trigger fires → "Only admin or operations_manager may approve..."

-- 2. As admin, approve the same PO:
UPDATE purchase_orders_to_supplier
  SET approval_status = 'approved'
  WHERE id = '<some-po-id>';
-- Expected: success; approved_by and approved_at set by trigger if not supplied.

-- 3. As procurement_user, submit for approval (allowed):
UPDATE purchase_orders_to_supplier
  SET approval_status = 'pending', submitted_for_approval_at = now()
  WHERE id = '<some-po-id>';
-- Expected: success.
```

---

## Related policies unchanged

`po_admin_all` (FOR ALL, admin/ops) is untouched — admin and operations_manager
retain full CRUD on the PO table including approval status changes.

`po_procurement_select` (new name, previously part of `po_procurement_all`) gives
procurement users read access to all PO rows without restriction.
