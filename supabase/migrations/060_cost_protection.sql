-- ── Migration 060: DB-Level Cost Column Protection (GAP-01) ───────────────────
--
-- Problem: RLS is row-level only. factory/store/qc/afs/viewer/sales roles can
-- read purchase_value, unit_price, and line_total directly via the Supabase
-- REST API even though the UI hides these values visually.
--
-- Fix: drop the broad SELECT policies for restricted roles on the two cost-
-- bearing tables, then create security-definer views that:
--   a) apply the same row-level visibility rules (approved projects only), and
--   b) mask cost columns to NULL for roles that must not see them.
--
-- Admin / operations_manager / procurement_user continue to use the base tables
-- directly (their existing policies are unchanged).
--
-- All restricted-role queries against purchase order data should use these views.
-- The frontend ProjectDetail page (accessible to all project-participant roles)
-- is updated separately to query purchase_orders_to_supplier_safe.

-- ── 1. Drop restricted SELECT policies from base tables ────────────────────────

DROP POLICY IF EXISTS po_ops_roles_select ON public.purchase_orders_to_supplier;
DROP POLICY IF EXISTS poi_ops_roles_select ON public.purchase_order_items;

-- ── 2. purchase_orders_to_supplier_safe ───────────────────────────────────────
-- Security-definer view: bypasses base-table RLS; row + column security enforced
-- in the view WHERE clause and CASE expression respectively.

CREATE OR REPLACE VIEW public.purchase_orders_to_supplier_safe AS
SELECT
  id,
  project_id,
  procurement_request_id,
  po_number,
  supplier_id,
  supplier_name,
  po_date,
  -- purchase_value is the protected cost column: visible to admin/ops/procurement only
  CASE
    WHEN public.current_user_role() IN ('admin', 'operations_manager', 'procurement_user')
    THEN purchase_value
    ELSE NULL
  END AS purchase_value,
  currency,
  eta_date,
  po_status,
  approval_required,
  approval_status,
  submitted_for_approval_at,
  approved_by,
  approved_at,
  rejected_by,
  rejected_at,
  rejection_reason,
  remarks,
  created_by,
  created_at,
  updated_at
FROM public.purchase_orders_to_supplier
WHERE
  -- Require an authenticated session
  auth.uid() IS NOT NULL
  AND (
    -- Admin and ops managers see all POs
    public.current_user_role() IN ('admin', 'operations_manager')
    OR
    -- Procurement users see all POs they are party to
    public.current_user_role() = 'procurement_user'
    OR
    -- Operational / viewer roles see POs for approved projects only (no cost data)
    (
      public.current_user_role() IN (
        'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer', 'sales_user'
      )
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND p.project_status = 'approved'
      )
    )
  );

GRANT SELECT ON public.purchase_orders_to_supplier_safe TO authenticated;

-- ── 3. purchase_order_items_safe ──────────────────────────────────────────────
-- Masks unit_price and line_total for restricted roles.

CREATE OR REPLACE VIEW public.purchase_order_items_safe AS
SELECT
  poi.id,
  poi.purchase_order_id,
  poi.procurement_request_item_id,
  poi.item_code,
  poi.item_name,
  poi.description,
  poi.quantity_ordered,
  poi.unit,
  -- cost columns: visible to admin/ops/procurement only
  CASE
    WHEN public.current_user_role() IN ('admin', 'operations_manager', 'procurement_user')
    THEN poi.unit_price
    ELSE NULL
  END AS unit_price,
  CASE
    WHEN public.current_user_role() IN ('admin', 'operations_manager', 'procurement_user')
    THEN poi.line_total
    ELSE NULL
  END AS line_total,
  poi.expected_arrival_date,
  poi.status,
  poi.remarks,
  poi.created_at,
  poi.updated_at
FROM public.purchase_order_items poi
JOIN public.purchase_orders_to_supplier pos ON pos.id = poi.purchase_order_id
WHERE
  auth.uid() IS NOT NULL
  AND (
    public.current_user_role() IN ('admin', 'operations_manager')
    OR
    public.current_user_role() = 'procurement_user'
    OR
    (
      public.current_user_role() IN (
        'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer', 'sales_user'
      )
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = pos.project_id
          AND p.project_status = 'approved'
      )
    )
  );

GRANT SELECT ON public.purchase_order_items_safe TO authenticated;

-- ── 4. project_vehicle_lines_safe ─────────────────────────────────────────────
-- unit_sales_value and line_total_value are revenue figures that must be visible
-- only to admin, operations_manager, and the creating sales_user (own project).
-- All other roles see the vehicle specs (type, quantity, etc.) but not the SAR values.

CREATE OR REPLACE VIEW public.project_vehicle_lines_safe AS
SELECT
  pvl.id,
  pvl.project_id,
  pvl.line_number,
  pvl.vehicle_type,
  pvl.description,
  pvl.quantity,
  CASE
    WHEN public.current_user_role() IN ('admin', 'operations_manager')
      OR (
        public.current_user_role() = 'sales_user'
        AND EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = pvl.project_id AND p.created_by = auth.uid()
        )
      )
    THEN pvl.unit_sales_value
    ELSE NULL
  END AS unit_sales_value,
  CASE
    WHEN public.current_user_role() IN ('admin', 'operations_manager')
      OR (
        public.current_user_role() = 'sales_user'
        AND EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = pvl.project_id AND p.created_by = auth.uid()
        )
      )
    THEN pvl.line_total_value
    ELSE NULL
  END AS line_total_value,
  pvl.line_status,
  pvl.notes,
  pvl.created_at,
  pvl.updated_at
FROM public.project_vehicle_lines pvl
WHERE
  auth.uid() IS NOT NULL
  AND (
    public.current_user_role() IN ('admin', 'operations_manager')
    OR
    (
      public.current_user_role() = 'sales_user'
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = pvl.project_id AND p.created_by = auth.uid()
      )
    )
    OR
    (
      public.current_user_role() IN (
        'sales_coordinator', 'procurement_user', 'factory_user',
        'store_user', 'qc_user', 'afs_user', 'viewer'
      )
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = pvl.project_id AND p.project_status = 'approved'
      )
    )
  );

GRANT SELECT ON public.project_vehicle_lines_safe TO authenticated;

-- ── 5. Harden quotation update policies — add WITH CHECK (GAP-10 partial) ──────
-- qr_coordinator_update previously had no WITH CHECK.
-- qr_sales_update previously had no WITH CHECK, allowing sales_user to
-- reassign ownership (change requested_by) or push to unintended statuses.

DROP POLICY IF EXISTS qr_coordinator_update ON public.quotation_requests;
CREATE POLICY qr_coordinator_update ON public.quotation_requests
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  )
  WITH CHECK (
    -- Coordinators remain coordinators after the update (prevents policy bypass)
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  );

-- Prevent sales_user from reassigning quotation ownership via UPDATE
DROP POLICY IF EXISTS qr_sales_update ON public.quotation_requests;
CREATE POLICY qr_sales_update ON public.quotation_requests
  FOR UPDATE
  USING (
    requested_by = auth.uid()
    AND quotation_status IN ('draft', 'need_clarification')
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
  )
  WITH CHECK (
    -- requested_by must remain the current user — cannot hand off ownership
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
  );
