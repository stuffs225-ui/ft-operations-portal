-- ── Migration 077: Medical Serial Gate (R-011) ────────────────────────────────
--
-- Governance Rule R-011 (Playbook v3.2, Section 17 — Medical Serial Number Tracking):
-- Medical items (store_receipt_items where serial_required = TRUE) CANNOT be
-- accepted by QC or marked as installed unless at least one serial number has been
-- registered for that item in medical_serial_numbers.
--
-- Problem:
-- store_receipt_items.status could be changed to 'accepted_by_qc' or 'installed'
-- via a direct API PATCH call even when serial_required = TRUE and no corresponding
-- medical_serial_numbers record existed. The only guard was UI-level — bypassed by
-- any direct Supabase API call. Medical compliance is at risk.
--
-- Fix:
--   BEFORE INSERT OR UPDATE trigger on store_receipt_items.
--   When status transitions to 'accepted_by_qc' or 'installed' for an item where
--   serial_required = TRUE, count any medical_serial_numbers records linked to
--   this store_receipt_item_id. If zero exist, RAISE EXCEPTION.
--   Items where serial_required = FALSE are not affected.
--
-- Why store_receipt_items (not material_qc_inspections)?
--   store_receipt_items.status is the authoritative item lifecycle status.
--   A medical item can be marked accepted_by_qc then later installed — both
--   transitions must be guarded. Triggering on the item status covers both
--   transitions in one place.
--
-- Dual-layer pattern (same as migration 061_po_approval_guard.sql):
--   Layer 1 — RLS: existing store_receipt_items policies already restrict writes
--             to store_user / admin / operations_manager. No change to those.
--   Layer 2 — This trigger: enforces the registration requirement regardless of
--             which authorized role is writing.
--
-- References:
--   docs/governance/critical-governance-rules-register.md — Rule R-011
--   docs/system-audit/07-governance-rules-gap-analysis.md — R-011
--   docs/governance/step-4-architecture-cleanup-brief.md — B-002

CREATE OR REPLACE FUNCTION public.enforce_medical_serial_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  serial_count integer;
BEGIN
  -- ── Guard condition 1: Only applies to serial-tracked (medical) items ─────────
  -- Items with serial_required = FALSE pass through unconditionally.
  IF NEW.serial_required IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- ── Guard condition 2: Only enforce on transitions to acceptance/installation ──
  -- 'received', 'pending_qc', 'rejected_by_qc', 'in_store', 'issued', etc.
  -- are not constrained by this gate.
  IF NEW.status NOT IN ('accepted_by_qc', 'installed') THEN
    RETURN NEW;
  END IF;

  -- ── Guard condition 3: Skip if status is not actually changing ────────────────
  -- Allows other column updates on an already-accepted/installed item without
  -- re-running the serial check.
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ── Check: at least one serial number must be registered for this item ─────────
  SELECT COUNT(*)
    INTO serial_count
    FROM public.medical_serial_numbers
   WHERE store_receipt_item_id = NEW.id;

  IF serial_count = 0 THEN
    RAISE EXCEPTION
      'Medical Serial gate (R-011): Cannot set status to ''%'' for item ''%'' — '
      'this item requires serial number registration (serial_required = TRUE). '
      'Register at least one serial number in medical_serial_numbers before '
      'accepting or installing this item.',
      NEW.status,
      COALESCE(NEW.item_name, NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger first to make this migration idempotent on re-run.
DROP TRIGGER IF EXISTS medical_serial_gate ON public.store_receipt_items;

CREATE TRIGGER medical_serial_gate
  BEFORE INSERT OR UPDATE ON public.store_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_medical_serial_gate();

-- ── Verification comment ───────────────────────────────────────────────────────
-- To test this gate manually:
--
-- SCENARIO A — Gate blocks acceptance without serial (should fail):
--   INSERT into store_receipt_items with serial_required = TRUE, status = 'received'.
--   Attempt to UPDATE status = 'accepted_by_qc' without a medical_serial_numbers record.
--   Expected result: ERROR — Medical Serial gate (R-011): Cannot set status to 'accepted_by_qc'...
--
-- SCENARIO B — Gate allows acceptance after serial registration (should succeed):
--   INSERT into medical_serial_numbers with store_receipt_item_id = <item_id>.
--   Retry UPDATE status = 'accepted_by_qc' — should now succeed.
--
-- SCENARIO C — Non-medical item is not affected (should succeed):
--   UPDATE a store_receipt_items row where serial_required = FALSE to status = 'accepted_by_qc'.
--   Expected result: success (gate condition skipped).
--
-- SCENARIO D — Already-accepted item allows column updates (should succeed):
--   UPDATE remarks on a store_receipt_items row already at status = 'accepted_by_qc'.
--   Expected result: success (status unchanged — guard condition 3 skips check).
