# Step 12C-2 — Vehicle Receiving Real Photo Upload

**Date:** 2026-06-17
**Branch:** `feature/step-12c-2-vehicle-photo-upload`
**Status:** COMPLETE — awaiting review
**Prerequisite:** PR #96 merged (Step 12C + safety fix — migration 095, storage_path gate)

---

## Executive Summary

Step 12C-2 wires real Supabase Storage upload for vehicle receiving photos, unblocking the
`Accept Vehicle` action under migration 095's `enforce_vehicle_photo_completion()` trigger.

The `vehicle-photos` storage bucket already existed (migration 058). No new DB objects were
required. The upload pattern follows the established `DocumentPanel.tsx` / `ProjectNew.tsx`
convention used in the rest of the app.

- **`StoreVehicleReceivingDetail.tsx`** — "Add Photo" form re-added as a real file picker.
  Uploads to the `vehicle-photos` bucket, saves `storage_path` in `vehicle_receipt_photos`.
  `Accept Vehicle` unblocked once all 5 required types have real `storage_path`.
- **`StoreVehicleReceivingNew.tsx`** — Wizard restored to `.select('id').single()` after
  INSERT; redirects to the detail page on save so the user can immediately upload photos.

---

## A. Storage Bucket

### A.1 Existing Bucket

**Bucket:** `vehicle-photos`
**Migration:** `058_storage_buckets.sql`
**Visibility:** Private (`public: false`) — all reads require signed URLs
**Write roles:** `admin`, `operations_manager`, `store_user`
**Read:** universal for authenticated users via signed URL

No new migration was required. The bucket and its RLS policies were already in place.

### A.2 Upload Path Convention

```
{vehicle_receipt_id}/{photo_type}/{Date.now()}_{safeName}
```

Example: `a1b2c3d4-…/front/1718950000000_front_photo.jpg`

- `vehicle_receipt_id` as top-level folder — isolates each receipt's photos
- `photo_type` as subfolder — groups by type
- `Date.now()` prefix — prevents filename collisions on re-upload of same type
- `safeName` — `file.name` with all non-`[a-zA-Z0-9._-]` characters replaced by `_`

Pattern matches `ProjectNew.tsx` and `DocumentPanel.tsx` conventions.

### A.3 Error Handling

Unlike `DocumentPanel.tsx` (which inserts a metadata record even when storage upload fails),
the vehicle photo upload is **all-or-nothing**: if `supabase.storage.upload()` throws, no
`vehicle_receipt_photos` row is inserted. This ensures `storage_path` in the DB is always a
real, successful upload path — never null from a failed upload — which is required by
migration 095's acceptance gate.

---

## B. StoreVehicleReceivingDetail.tsx

### B.1 Changes

| Change | Description |
|---|---|
| Re-added `user` from `useAuth()` | Required for `uploaded_by` in INSERT |
| Added `addPhotoType`, `addPhotoFile`, `showPhotoForm`, `fileInputKey` state | Upload form state |
| Added `handleAddPhoto()` | Real Storage upload → DB INSERT |
| Re-added "Add Photo" button | Visible when `canAct` |
| Re-added upload form card | File picker (`<input type="file" accept=".jpg,.jpeg,.png">`), type select, Cancel/Upload buttons |
| Updated photo completeness banner | Changed amber ("not yet implemented") → red ("N missing") now that upload is available |
| Updated Accept Vehicle error message | References "Add Photo" button instead of "not yet implemented" |

### B.2 handleAddPhoto() Flow

1. Guard: `isSupabaseConfigured`, `vehicle`, `addPhotoFile`, `user?.id`
2. File size check: `addPhotoFile.size > 10 MB` → `setActionError`
3. Sanitise filename: `/[^a-zA-Z0-9._-]/g → '_'`
4. Construct upload path: `${vehicle.id}/${addPhotoType}/${Date.now()}_${safeName}`
5. `supabase.storage.from('vehicle-photos').upload(path, file, { upsert: false })`
   → on error: `throw storageErr` (no DB record inserted)
6. `supabase.from('vehicle_receipt_photos').insert({ ..., storage_path: storageData.path })`
   → on error: `throw dbErr`
7. Append new photo to local `photos` state → photo grid updates immediately
8. Reset form: `setShowPhotoForm(false)`, `setAddPhotoFile(null)`, `setFileInputKey(k => k+1)`
   (key increment forces `<input type="file">` to remount and clear)

### B.3 Dev Mode

When `isSupabaseConfigured` is false, `handleAddPhoto()` sets `devMsg` and returns without
calling storage. The upload form is still shown; clicking "Upload Photo" surfaces the dev mode
message.

### B.4 Accept Vehicle — Now Unblockable

`allRequiredUploaded` becomes `true` once all 5 required photo types have rows in
`vehicle_receipt_photos` with `storage_path IS NOT NULL AND storage_path <> ''`.
The button is enabled; clicking it calls `handleAction('Accept Vehicle')` which passes the
app-layer gate and proceeds to UPDATE `vehicle_receipts.status = 'accepted'`.
DB trigger `trg_vehicle_photo_completion` (migration 095 function) confirms `storage_path`
non-null/non-empty independently as the final authority.

---

## C. StoreVehicleReceivingNew.tsx

### C.1 Changes

After the vehicle receipt INSERT, the wizard now:
1. Fetches the new record ID via `.select('id').single()`
2. Navigates to the detail page: `navigate(\`/store/vehicle-receiving/${vrData.id}\`)`

The user lands immediately on the detail page where they can upload the 5 required photos and
then accept the vehicle receipt.

Fallback: if `vrData?.id` is falsy (should not happen in normal operation), navigates to the
list page `/store/vehicle-receiving`.

---

## D. DB Governance (unchanged)

| Trigger | Table | Guards | Source |
|---|---|---|---|
| `trg_vehicle_photo_completion` | `vehicle_receipts` | `status='accepted'` requires all 5 photo types with `storage_path IS NOT NULL AND storage_path <> ''` (R-006) | migration 095 function |

No schema changes. No RLS changes. No new migrations.

---

## E. What Remains Deferred

| Item | Description |
|---|---|
| Signed URL photo viewer | Photos in `vehicle-photos` bucket are private. A "View" link would need `supabase.storage.from('vehicle-photos').createSignedUrl(path, 60)`. Not required for acceptance governance — deferred to a future UX step. |
| Optional photo types (damage, other) | Upload form allows all `ALL_PHOTO_TYPES` including optional. No changes needed. |
| Store receipt live writes | `StoreReceiptNew`, `StoreReceiptDetail` — out of scope |
| Custody live writes | `CustodyNew`, `CustodyDetail` — out of scope |

---

## F. Validation Results

```
Branch:              feature/step-12c-2-vehicle-photo-upload
Base commit:         18b47a9 (PR #96 merge)

npm ci:              ✅ (dependencies unchanged)
npm run build:       ✅ 0 errors, 0 warnings (5.68 s)
npx tsc --noEmit:    ✅ 0 errors
npm run lint:        ✅ 80 problems (64 errors, 16 warnings) — unchanged from Step 12B/12C baseline
```
