-- ── Migration 061: PO Self-Approval Guard (GAP-02) ────────────────────────────
--
-- Problem: po_procurement_all was FOR ALL with no WITH CHECK, meaning a
-- procurement_user could set approval_status = 'approved' on their own PO
-- via a direct API PATCH call, bypassing the Admin/Ops approval workflow.
--
-- Fix:
--   1. Replace the single FOR ALL policy with split INSERT / SELECT / UPDATE
--      policies for procurement_user.
--   2. The UPDATE policy carries a WITH CHECK that blocks procurement_user from
--      setting approval_status to 'approved' or 'rejected'.
--   3. Add a BEFORE UPDATE trigger as a belt-and-suspenders enforcement that
--      raises an exception if a non-admin/ops user attempts to approve or reject
--      any PO where approval_required = true.

-- ── 1. Replace po_procurement_all ─────────────────────────────────────────────

DROP POLICY IF EXISTS po_procurement_all ON public.purchase_orders_to_supplier;

-- SELECT: procurement can read all POs
CREATE POLICY po_procurement_select ON public.purchase_orders_to_supplier
  FOR SELECT
  USING (
    public.current_user_role() = 'procurement_user'
  );

-- INSERT: procurement can create POs (approval flags set by trigger)
CREATE POLICY po_procurement_insert ON public.purchase_orders_to_supplier
  FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'procurement_user'
  );

-- UPDATE: procurement can edit POs but CANNOT approve or reject
-- The WITH CHECK references the new row values after the proposed update.
CREATE POLICY po_procurement_update ON public.purchase_orders_to_supplier
  FOR UPDATE
  USING (
    public.current_user_role() = 'procurement_user'
  )
  WITH CHECK (
    public.current_user_role() = 'procurement_user'
    -- Procurement may set approval_status to 'not_required' or 'pending' only.
    -- 'approved' and 'rejected' are reserved for admin / operations_manager.
    AND approval_status NOT IN ('approved', 'rejected')
  );

-- DELETE: procurement can cancel/delete their own PO drafts
-- (Restricted to draft/pending_approval status for safety)
CREATE POLICY po_procurement_delete ON public.purchase_orders_to_supplier
  FOR DELETE
  USING (
    public.current_user_role() = 'procurement_user'
    AND po_status IN ('draft', 'pending_approval')
  );

-- ── 2. Trigger: enforce approval authority regardless of RLS path ──────────────
-- This fires even if someone accesses the DB via a non-PostgREST path or if an
-- RLS policy is misconfigured in the future. It is the authoritative guard.

CREATE OR REPLACE FUNCTION public.enforce_po_approval_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Block any non-admin/ops user from flipping approval_status to approved/rejected
  IF NEW.approval_status IN ('approved', 'rejected')
     AND (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  THEN
    IF public.current_user_role() NOT IN ('admin', 'operations_manager') THEN
      RAISE EXCEPTION
        'Only admin or operations_manager may approve or reject a Purchase Order. '
        'Current role: %', public.current_user_role();
    END IF;
  END IF;

  -- Require admin/ops to supply their user ID when approving
  IF NEW.approval_status = 'approved' AND NEW.approved_by IS NULL THEN
    NEW.approved_by := auth.uid();
    NEW.approved_at  := now();
  END IF;

  IF NEW.approval_status = 'rejected' AND NEW.rejected_by IS NULL THEN
    NEW.rejected_by := auth.uid();
    NEW.rejected_at  := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS po_approval_authority ON public.purchase_orders_to_supplier;
CREATE TRIGGER po_approval_authority
  BEFORE UPDATE ON public.purchase_orders_to_supplier
  FOR EACH ROW EXECUTE FUNCTION public.enforce_po_approval_authority();
