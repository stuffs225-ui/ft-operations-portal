# Step 12C — Vehicle Receiving Live Write Implementation

**Date:** 2026-06-17
**Branch:** `feature/step-12c-vehicle-receiving-live-write`
**Status:** COMPLETE (safety-fixed) — awaiting review
**Prerequisite:** Step 12B governance hardening merged at `ff90668` (migration 094)

> **Safety Fix Applied (same branch, commit following initial implementation):**
> Migration 094's `enforce_vehicle_photo_completion()` only checked `photo_type` presence.
> Filename-only records (`storage_path = null`) could satisfy the acceptance gate without any
> real uploaded file. Migration 095 (`095_vehicle_photo_storage_path_hardening.sql`) replaces
> the trigger function to additionally require `storage_path IS NOT NULL AND storage_path <> ''`.
> Application code updated to match: no filename-only photo records are inserted, and
> Accept Vehicle is blocked with a clear message until real file upload is implemented.

---

## Executive Summary

Step 12C converts the two Vehicle Receiving pages from placeholder/mock-only implementations
to live Supabase reads and writes, with a safety fix applied before PR merge to ensure the
photo acceptance gate requires real uploaded files — not just filename references.

- **`StoreVehicleReceivingNew.tsx`** — 3-step wizard INSERTs `vehicle_receipts` into Supabase.
  "Save as Draft" → `status='draft'`; "Mark as Received" → `status='received'`. Photo insertion
  is intentionally omitted — photo file upload is deferred to a future step.
- **`StoreVehicleReceivingDetail.tsx`** — Detail page loads live data from Supabase (with project
  join). `handleAction()` UPDATEs `vehicle_receipts.status`. Accept Vehicle is blocked with a
  clear message until photo file upload is implemented. Add Photo (filename-only form) removed.
- **`095_vehicle_photo_storage_path_hardening.sql`** — Replaces `enforce_vehicle_photo_completion()`
  to require `storage_path IS NOT NULL AND storage_path <> ''` for all 5 required photo types.

No DB schema (beyond the trigger function update), RLS, routes, route guards, or non-Store
modules were changed.

---

## A. Scope

### A.1 Files Modified

| File | Change |
|---|---|
| `src/pages/StoreVehicleReceivingNew.tsx` | Wizard INSERTs vehicle receipt; photo insertion removed; Step 2 photo section replaced with deferred-upload notice |
| `src/pages/StoreVehicleReceivingDetail.tsx` | Detail page loads live data; `handleAction()` writes to Supabase; `uploadedRequired` checks `storage_path`; Add Photo form removed; Accept Vehicle blocked with clear message |

### A.2 Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/095_vehicle_photo_storage_path_hardening.sql` | Replaces `enforce_vehicle_photo_completion()` to require real storage_path |
| `docs/implementation/step-12c-vehicle-receiving-live-write.md` | This document |

### A.3 Not Changed

- DB schema (no new tables, columns, types, indexes)
- RLS policies
- Route paths or route guards
- Custody pages (`CustodyNew.tsx`, `CustodyDetail.tsx`)
- Store receipt pages (`StoreReceiptNew.tsx`, `StoreReceiptDetail.tsx`)
- Any non-Store module
- Visual design or component structure

---

## B. Migration 095 — Photo Storage Path Hardening

### B.1 Problem

Migration 094 `enforce_vehicle_photo_completion()` counted `DISTINCT photo_type` presence only.
The WHERE clause:
```sql
WHERE vehicle_receipt_id = NEW.id
  AND photo_type::text IN ('front', 'rear', 'left_side', 'right_side', 'chassis_plate')
```

A record with `photo_type = 'front'` and `storage_path = null` (filename-only, no real file) was
counted. Inserting five such records — one per required type — would satisfy the gate, allowing
`status='accepted'` with no real photo files on Supabase Storage.

### B.2 Fix

`CREATE OR REPLACE FUNCTION public.enforce_vehicle_photo_completion()` — updated WHERE clause:
```sql
WHERE vehicle_receipt_id = NEW.id
  AND photo_type::text IN ('front', 'rear', 'left_side', 'right_side', 'chassis_plate')
  AND storage_path IS NOT NULL
  AND storage_path <> ''
```

Trigger `trg_vehicle_photo_completion` (migration 094) is unchanged — it calls the function by
name. No DROP/CREATE of the trigger is required. No schema changes.

### B.3 Guard Behaviour

| Condition | Result |
|---|---|
| `status != 'accepted'` | Pass through — no check |
| UPDATE where `OLD.status = NEW.status` | Pass through — non-status update |
| All 5 required types present with `storage_path IS NOT NULL AND storage_path <> ''` | Pass through |
| Any required type missing OR any required type has `storage_path = null` | RAISE EXCEPTION |

---

## C. StoreVehicleReceivingNew.tsx

### C.1 Change Summary

The 3-step wizard INSERTs `vehicle_receipts` into Supabase. Photo insertion is intentionally
omitted — no `vehicle_receipt_photos` records are created by the wizard.

### C.2 Photo Section

Step 2 "Photo Documentation" section replaced with an amber informational notice:
> Photo file upload will be available in a future update. Save the receipt now — photos must
> be uploaded as real files (not filenames) before acceptance is possible. Required: front,
> rear, left side, right side, chassis plate.

No photo filename text inputs. No photo DB records inserted. No `storage_path: null` rows created.

### C.3 Status Flow

| Action | Status | Photo Gate |
|---|---|---|
| Save as Draft | `'draft'` | None — DB trigger only guards `'accepted'` |
| Mark as Received | `'received'` | None |

### C.4 Dev Mode Behaviour

When `isSupabaseConfigured` is false: sets `devSuccess=true` and redirects after 1.5 seconds.

---

## D. StoreVehicleReceivingDetail.tsx

### D.1 Change Summary

Detail page loads live from Supabase (vehicle receipt + project join + photos). `handleAction()`
UPDATEs vehicle receipt status. Add Photo form (filename-only) removed. `uploadedRequired` updated
to count only photos with a real `storage_path`.

### D.2 `uploadedRequired` Computation

```tsx
// Only photos with a real storage_path count toward completion (migration 095).
const uploadedRequired = photos.filter(
  p => REQUIRED_PHOTO_TYPES.includes(p.photo_type) && p.storage_path != null && p.storage_path !== ''
).length;
```

### D.3 Accept Vehicle — Blocked

`allRequiredUploaded` will be `false` until real photo file upload is implemented (no photos
currently have `storage_path` set). Clicking "Accept Vehicle" surfaces a clear error:

> Vehicle acceptance requires all 5 required photos to be uploaded as real files (front, rear,
> left side, right side, chassis plate). Photo file upload is not yet implemented — acceptance
> is blocked until file upload functionality is available and all 5 photos are on file.

### D.4 Photo Grid Display

Photo slots now distinguish three states:
- **Green** (`storage_path` non-null/non-empty): truly uploaded — shows filename
- **Amber** (record exists, `storage_path = null`): "Filename recorded — upload pending"
- **Red** (no record, required type): "Missing (Required)"
- **Gray** (no record, optional type): "Not uploaded"

### D.5 Add Photo Form — Removed

The filename-only "Add Photo" form is removed. It inserted `storage_path: null` records which
no longer satisfy the acceptance gate. File upload UI will be implemented in a future step
alongside real Supabase Storage integration.

### D.6 Status Actions

| Action | New Status | Photo Gate |
|---|---|---|
| Accept Vehicle | `'accepted'` | App-layer: `allRequiredUploaded` must be true (requires real storage_path); DB trigger enforces same |
| Mark as Damaged | `'damaged'` | None |
| Assign to Production | `'assigned_to_production'` | None |

---

## E. DB Governance Layer

| Trigger | Table | Guards | Source |
|---|---|---|---|
| `trg_vehicle_photo_completion` | `vehicle_receipts` | `status='accepted'` requires all 5 photo types with `storage_path IS NOT NULL AND storage_path <> ''` (R-006) | migration 094 trigger / migration 095 function |
| `trg_vehicle_receipts_updated_at` | `vehicle_receipts` | updated_at maintenance | migration 032 |
| `trg_vehicle_receipts_auto_number` | `vehicle_receipts` | VR-YYYY-NNNN auto-number | migration 032 |

---

## F. Deferred Items

| Item | Description | Reason Deferred |
|---|---|---|
| Photo file upload | `storage_path` remains `null`; real Supabase Storage upload not yet wired for vehicle photos | Requires Storage bucket setup, `<input type="file">`, upload plumbing (see `DocumentPanel.tsx` for the only existing upload implementation) |
| Accept Vehicle via UI | Permanently blocked until photo upload is implemented | Unblocked once F.1 is complete |
| Add Photo form | Removed — will return as a real file picker backed by Supabase Storage | Deferred with photo upload |
| Store receipt live writes | `StoreReceiptNew`, `StoreReceiptDetail` | Out of scope — Step 12C covers vehicle receiving only |
| Custody live writes | `CustodyNew`, `CustodyDetail` | Out of scope — covered by future step |
| `custody_records_factory_update` WITH CHECK | Deferred from Step 12A/12B audit | Awaiting UX review of acceptance workflow |

---

## G. Validation Results

```
Branch:              feature/step-12c-vehicle-receiving-live-write
Base commit:         ff90668 (Step 12B merge)

npm ci:              ✅ (dependencies unchanged)
npm run build:       ✅ 0 errors, 0 warnings
npx tsc --noEmit:    ✅ 0 errors
npm run lint:        ✅ 80 problems (64 errors, 16 warnings) — unchanged from Step 12B baseline
```
