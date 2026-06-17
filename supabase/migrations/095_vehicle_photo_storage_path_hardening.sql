-- ── Migration 095: Vehicle Receipt Photo Storage Path Hardening ───────────────
--
-- Problem identified post-Step 12C (PR #96):
--   Migration 094 trigger enforce_vehicle_photo_completion() counts DISTINCT
--   photo_type presence only. Filename-only records (storage_path = null)
--   satisfy the gate, meaning a vehicle can be transitioned to 'accepted'
--   without any real photo files being uploaded to Supabase Storage.
--
-- Example: inserting vehicle_receipt_photos with photo_type = 'front' and
--   storage_path = null is counted by the migration 094 trigger. This allows
--   the acceptance gate to be satisfied by text-input filenames alone, with
--   no actual uploaded file behind them.
--
-- Fix:
--   Update enforce_vehicle_photo_completion() to additionally require
--   storage_path IS NOT NULL AND storage_path <> '' for each required photo type.
--   Records with storage_path = null no longer count toward photo completion.
--   Only photo records with a real Supabase Storage path satisfy the gate.
--
-- Required photo types (R-006, unchanged):
--   front, rear, left_side, right_side, chassis_plate
--
-- Application impact:
--   StoreVehicleReceivingNew.tsx — photo filename insertion removed; Step 2
--     photo section replaced with an informational notice about deferred upload.
--   StoreVehicleReceivingDetail.tsx — Add Photo form removed; app-layer gate
--     updated to check storage_path; Accept Vehicle blocked with a clear message
--     until real file upload is implemented.
--
-- Schema: no changes — no new tables, columns, types, or indexes.
-- Trigger: trg_vehicle_photo_completion (migration 094) is unchanged — it calls
--   enforce_vehicle_photo_completion() by name. Replacing the function in-place
--   is sufficient; no DROP/CREATE of the trigger is required.
-- Idempotent: CREATE OR REPLACE FUNCTION.
--
-- Rollback: see end of file.

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

  -- ── Check: all 5 required photo types must be present with a real uploaded file.
  -- storage_path must be non-null and non-empty.
  -- Filename-only records (storage_path = null) do not satisfy this requirement.
  -- This replaces the migration 094 version which counted photo_type presence only.
  SELECT COUNT(DISTINCT photo_type::text)
    INTO v_found_count
    FROM public.vehicle_receipt_photos
   WHERE vehicle_receipt_id = NEW.id
     AND photo_type::text IN ('front', 'rear', 'left_side', 'right_side', 'chassis_plate')
     AND storage_path IS NOT NULL
     AND storage_path <> '';

  IF v_found_count < 5 THEN
    RAISE EXCEPTION
      'Vehicle Receipt photo gate (R-006): Cannot set status to ''accepted'' — '
      'all 5 required photo types must have real uploaded files '
      '(storage_path must be non-null and non-empty; filename-only records do not qualify). '
      'Required: front, rear, left_side, right_side, chassis_plate. '
      'Found % of 5 required types with uploaded files. Upload the photo files and retry.',
      v_found_count;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger: unchanged — trg_vehicle_photo_completion (migration 094) continues ─
-- to call enforce_vehicle_photo_completion() by name. No DROP/CREATE needed.

-- ── Rollback (run in Supabase SQL editor to revert to migration 094 version) ────
--
-- CREATE OR REPLACE FUNCTION public.enforce_vehicle_photo_completion()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- DECLARE
--   v_found_count integer;
-- BEGIN
--   IF NEW.status != 'accepted' THEN
--     RETURN NEW;
--   END IF;
--   IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
--     RETURN NEW;
--   END IF;
--   SELECT COUNT(DISTINCT photo_type::text)
--     INTO v_found_count
--     FROM public.vehicle_receipt_photos
--    WHERE vehicle_receipt_id = NEW.id
--      AND photo_type::text IN ('front', 'rear', 'left_side', 'right_side', 'chassis_plate');
--   IF v_found_count < 5 THEN
--     RAISE EXCEPTION
--       'Vehicle Receipt photo gate (R-006): Cannot set status to ''accepted'' — '
--       'all 5 required photo types must be uploaded before acceptance '
--       '(front, rear, left_side, right_side, chassis_plate). '
--       'Found % of 5 required types. Upload the missing photos and retry.',
--       v_found_count;
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
