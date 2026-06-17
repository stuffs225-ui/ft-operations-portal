-- ── Migration 094: Store Governance Hardening (Step 12B) ─────────────────────
--
-- Reference: docs/implementation/step-12a-store-receiving-custody-serials-audit.md
-- Implements two governance guards identified in the Step 12A audit, plus
-- RLS WITH CHECK hardening for three pre-hardening Store tables:
--
-- Part A — Vehicle Receipt Photo Completion Gate (B-019 / R-006)
--   No DB trigger existed to prevent vehicle_receipts.status from transitioning
--   to 'accepted' without all 5 required photo types present in
--   vehicle_receipt_photos for that receipt.
--   App computes allRequiredUploaded flag but does not gate handleSave() on it.
--   Fix: BEFORE INSERT OR UPDATE trigger that counts DISTINCT required photo
--   types when status transitions to 'accepted'. Raises exception if any of
--   the 5 required types (front, rear, left_side, right_side, chassis_plate)
--   are missing. Chassis NOT NULL enforcement is unchanged (migration 032).
--
-- Part B — Custody Status Lifecycle Gate (B-021)
--   No DB trigger existed to prevent material_custody_records.status from
--   transitioning to 'in_custody' while receiver_decision = 'pending'.
--   Fix: BEFORE INSERT OR UPDATE trigger that raises an exception when
--   status = 'in_custody' AND receiver_decision = 'pending'.
--   Does not affect the existing custody approval trigger (migration 085,
--   enforce_custody_approval_restriction). Both triggers fire independently.
--
-- Part C — RLS WITH CHECK Hardening (K.5 from Step 12A)
--   Three Store tables had pre-hardening FOR ALL policies without WITH CHECK:
--     vehicle_receipts        — vehicle_receipts_store_all  (migration 032)
--     vehicle_receipt_photos  — vehicle_photos_store_all    (migration 033)
--     store_receipt_items     — store_receipt_items_store_all (migration 030)
--   Fix: DROP and recreate each policy with WITH CHECK using the
--   public.current_user_role() pattern (same pattern as migration 085 Part B).
--   Role coverage is UNCHANGED for all three tables.
--   No schema changes. No weakening of existing access.
--
-- Scope:
--   New trigger functions + triggers for Parts A and B.
--   DROP/CREATE for 3 RLS policies in Part C.
--   No schema changes (no new columns, tables, types, or indexes).
--   No application code changes.
--   No weakening of existing RLS policies.
--
-- Idempotent: DROP IF EXISTS before each CREATE. CREATE OR REPLACE for functions.
-- Uses public.current_user_role() (SECURITY DEFINER) per established pattern.
-- Pattern: migration 077 (medical_serial_gate), migration 085 Part B (store_receipts).
--
-- Rollback: see end of file.

-- ── PART A: Vehicle Receipt Photo Completion Gate ──────────────────────────────
--
-- Problem:
--   vehicle_receipts.status can be set to 'accepted' without all 5 required
--   photo types in vehicle_receipt_photos. The UI computes allRequiredUploaded
--   but does not enforce it at the save path. No DB trigger existed.
--
-- Required photo types (R-006 / Playbook v3.2, matches App REQUIRED_PHOTO_TYPES):
--   front, rear, left_side, right_side, chassis_plate
--
-- Guard behavior:
--   Only fires on transitions TO 'accepted' (INSERT or UPDATE).
--   Other status transitions are not constrained by this gate.
--   If status is not changing on UPDATE, the check is skipped.
--   Raises EXCEPTION with count of found vs required if any type is missing.
--   Does not bypass for any role — photo completion is a regulatory requirement
--   per R-006. Admin/ops who need to override must use a different status or
--   upload the missing photos first.
--
-- No change to chassis_number NOT NULL (enforced by migration 032 column constraint).

CREATE OR REPLACE FUNCTION public.enforce_vehicle_photo_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_found_count integer;
BEGIN
  -- ── Guard condition 1: Only enforce on transitions to 'accepted' ───────────────
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  -- ── Guard condition 2: Skip if status is not actually changing (UPDATE only) ───
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ── Check: all 5 required photo types must be present for this receipt ─────────
  -- Required types are the 5 standard vehicle inspection positions defined in
  -- Playbook v3.2 and mirrored in the app constant REQUIRED_PHOTO_TYPES.
  SELECT COUNT(DISTINCT photo_type::text)
    INTO v_found_count
    FROM public.vehicle_receipt_photos
   WHERE vehicle_receipt_id = NEW.id
     AND photo_type::text IN ('front', 'rear', 'left_side', 'right_side', 'chassis_plate');

  IF v_found_count < 5 THEN
    RAISE EXCEPTION
      'Vehicle Receipt photo gate (R-006): Cannot set status to ''accepted'' — '
      'all 5 required photo types must be uploaded before acceptance '
      '(front, rear, left_side, right_side, chassis_plate). '
      'Found % of 5 required types. Upload the missing photos and retry.',
      v_found_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicle_photo_completion ON public.vehicle_receipts;

CREATE TRIGGER trg_vehicle_photo_completion
  BEFORE INSERT OR UPDATE ON public.vehicle_receipts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_photo_completion();

-- ── PART B: Custody Status Lifecycle Gate ─────────────────────────────────────
--
-- Problem:
--   material_custody_records.status can be set to 'in_custody' while
--   receiver_decision = 'pending' — meaning the recipient has not yet
--   accepted or rejected the transfer. This violates the custody lifecycle:
--   a record should only be considered in_custody once the recipient has
--   formally accepted (receiver_decision = 'accepted').
--
-- Schema references (migration 034):
--   status            custody_status ENUM ('draft', 'pending_approval',
--                     'approved_for_issue', 'issued', 'pending_acceptance',
--                     'in_custody', 'installed', 'returned',
--                     'consumed_by_project', 'lost_or_damaged', 'cancelled')
--   receiver_decision custody_receiver_decision ENUM ('pending', 'accepted', 'rejected')
--
-- Guard behavior:
--   Only fires when status transitions TO 'in_custody'.
--   Raises EXCEPTION if receiver_decision is 'pending' at that point.
--   If receiver_decision is 'accepted' or 'rejected', the check passes
--   (application flow handles rejected cases; this gate targets the unresolved
--   decision state only).
--   Does not modify the existing enforce_custody_approval_restriction trigger
--   (migration 085) — both triggers fire independently on the same table.

CREATE OR REPLACE FUNCTION public.enforce_custody_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- ── Guard condition 1: Only enforce on transitions to 'in_custody' ────────────
  IF NEW.status != 'in_custody' THEN
    RETURN NEW;
  END IF;

  -- ── Guard condition 2: Skip if status is not actually changing (UPDATE only) ───
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ── Check: receiver must have made a decision before record is in_custody ──────
  IF NEW.receiver_decision = 'pending' THEN
    RAISE EXCEPTION
      'Custody lifecycle gate (B-021): Cannot set custody status to ''in_custody'' '
      'while receiver_decision is ''pending''. '
      'The recipient must accept or reject the custody transfer '
      'before the record can be marked as in_custody.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_custody_lifecycle ON public.material_custody_records;

CREATE TRIGGER trg_custody_lifecycle
  BEFORE INSERT OR UPDATE ON public.material_custody_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_custody_lifecycle();

-- ── PART C: RLS WITH CHECK Hardening ──────────────────────────────────────────
--
-- Pattern: migration 085 Part B (store_receipts WITH CHECK hardening).
-- DROP the original FOR ALL policy (no WITH CHECK), recreate with WITH CHECK.
-- Role coverage is UNCHANGED. Uses current_user_role() SECURITY DEFINER pattern.
-- All existing SELECT policies for other roles are PRESERVED UNCHANGED.

-- ── C-1: vehicle_receipts ─────────────────────────────────────────────────────
-- Original: migration 032 — vehicle_receipts_store_all FOR ALL, no WITH CHECK,
--   uses old EXISTS pattern. Roles: store_user, admin, operations_manager.

DROP POLICY IF EXISTS vehicle_receipts_store_all ON public.vehicle_receipts;

CREATE POLICY vehicle_receipts_store_all ON public.vehicle_receipts
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  )
  WITH CHECK (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  );

-- Existing SELECT policies PRESERVED (not modified):
--   vehicle_receipts_ops_select   — procurement/factory/afs/qc SELECT
--   vehicle_receipts_sales_select — sales_user SELECT own project
--   vehicle_receipts_viewer_select — viewer SELECT

-- ── C-2: vehicle_receipt_photos ───────────────────────────────────────────────
-- Original: migration 033 — vehicle_photos_store_all FOR ALL, no WITH CHECK,
--   uses old EXISTS pattern. Roles: store_user, admin, operations_manager.

DROP POLICY IF EXISTS vehicle_photos_store_all ON public.vehicle_receipt_photos;

CREATE POLICY vehicle_photos_store_all ON public.vehicle_receipt_photos
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  )
  WITH CHECK (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  );

-- Existing SELECT policies PRESERVED (not modified):
--   vehicle_photos_ops_select    — procurement/factory/afs/qc SELECT
--   vehicle_photos_sales_select  — sales_user SELECT own project
--   vehicle_photos_viewer_select — viewer SELECT

-- ── C-3: store_receipt_items ──────────────────────────────────────────────────
-- Original: migration 030 — store_receipt_items_store_all FOR ALL, no WITH CHECK,
--   uses old EXISTS pattern. Roles: store_user, admin, operations_manager.
-- Note: medical_serial_gate trigger (migration 077) fires on this table and
-- protects the critical status transitions for medical items. This WITH CHECK
-- hardens the RLS layer to match the post-085 standard.

DROP POLICY IF EXISTS store_receipt_items_store_all ON public.store_receipt_items;

CREATE POLICY store_receipt_items_store_all ON public.store_receipt_items
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  )
  WITH CHECK (
    public.current_user_role() IN ('store_user', 'admin', 'operations_manager')
  );

-- Existing SELECT policies PRESERVED (not modified):
--   store_receipt_items_ops_select    — procurement/factory/afs/qc SELECT
--   store_receipt_items_sales_select  — sales_user SELECT own project
--   store_receipt_items_viewer_select — viewer SELECT

-- ── Existing policies and triggers: PRESERVED UNCHANGED ───────────────────────
--
-- vehicle_receipts:
--   trg_vehicle_receipts_updated_at   — updated_at maintenance (migration 032)
--   trg_vehicle_photo_completion      — NEW: photo gate (Part A above)
--
-- material_custody_records:
--   trg_enforce_custody_approval      — store_user self-approval guard (migration 085)
--   trg_custody_lifecycle             — NEW: receiver decision gate (Part B above)
--   trg_material_custody_records_updated_at — updated_at (migration 034)
--   trg_custody_auto_number           — CUS-YYYY-NNNN (migration 034)
--
-- store_receipt_items:
--   medical_serial_gate               — R-011 serial gate (migration 077)
--   trg_store_receipt_items_updated_at — updated_at (migration 030)
--
-- Deferred (not in scope for this migration):
--   custody_records_factory_update WITH CHECK — factory/afs UPDATE policy has no
--     WITH CHECK. Deferred pending UX review of the acceptance workflow (noted
--     in migration 085 and Step 12A audit K.9).

-- ── Rollback (run in Supabase SQL editor to revert) ───────────────────────────
--
-- PART A rollback — vehicle receipt photo gate:
-- DROP TRIGGER IF EXISTS trg_vehicle_photo_completion ON public.vehicle_receipts;
-- DROP FUNCTION IF EXISTS public.enforce_vehicle_photo_completion();
--
-- PART B rollback — custody lifecycle gate:
-- DROP TRIGGER IF EXISTS trg_custody_lifecycle ON public.material_custody_records;
-- DROP FUNCTION IF EXISTS public.enforce_custody_lifecycle();
--
-- PART C rollback — RLS WITH CHECK (restore original EXISTS patterns):
--
-- vehicle_receipts:
-- DROP POLICY IF EXISTS vehicle_receipts_store_all ON public.vehicle_receipts;
-- CREATE POLICY vehicle_receipts_store_all ON public.vehicle_receipts
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles
--      WHERE user_id = auth.uid()
--        AND role IN ('store_user', 'admin', 'operations_manager'))
--   );
--
-- vehicle_receipt_photos:
-- DROP POLICY IF EXISTS vehicle_photos_store_all ON public.vehicle_receipt_photos;
-- CREATE POLICY vehicle_photos_store_all ON public.vehicle_receipt_photos
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles
--      WHERE user_id = auth.uid()
--        AND role IN ('store_user', 'admin', 'operations_manager'))
--   );
--
-- store_receipt_items:
-- DROP POLICY IF EXISTS store_receipt_items_store_all ON public.store_receipt_items;
-- CREATE POLICY store_receipt_items_store_all ON public.store_receipt_items
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM user_roles
--      WHERE user_id = auth.uid()
--        AND role IN ('store_user', 'admin', 'operations_manager'))
--   );
