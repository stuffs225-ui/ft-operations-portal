# Step 12C — Vehicle Receiving Live Write Implementation

**Date:** 2026-06-17
**Branch:** `feature/step-12c-vehicle-receiving-live-write`
**Status:** COMPLETE — awaiting review
**Prerequisite:** Step 12B governance hardening merged at `ff90668` (migration 094)

---

## Executive Summary

Step 12C converts the two Vehicle Receiving pages from placeholder/mock-only implementations to live Supabase reads and writes:

- **`StoreVehicleReceivingNew.tsx`** — 3-step wizard now INSERTs `vehicle_receipts` and `vehicle_receipt_photos` into Supabase. "Save as Draft" sets `status='draft'`; "Mark as Received" sets `status='received'`.
- **`StoreVehicleReceivingDetail.tsx`** — Detail page now loads live data from Supabase (with project join), and real UPDATE/INSERT handlers for status actions and photo additions.

App-layer validation mirrors the DB trigger `enforce_vehicle_photo_completion()` (migration 094): accepting a vehicle receipt is blocked unless all 5 required photo types are present. The DB trigger remains the final authority.

No DB schema, migrations, RLS policies, routes, route guards, or non-Store modules were changed.

---

## A. Scope

### A.1 Files Modified

| File | Change |
|---|---|
| `src/pages/StoreVehicleReceivingNew.tsx` | Wizard `handleSave()` now INSERTs vehicle receipt + photos into Supabase |
| `src/pages/StoreVehicleReceivingDetail.tsx` | Detail page loads live data; `handleAction()` and `handleAddPhoto()` write to Supabase |

### A.2 Files Created

| File | Purpose |
|---|---|
| `docs/implementation/step-12c-vehicle-receiving-live-write.md` | This document |

### A.3 Not Changed

- DB schema, migrations, RLS policies
- Route paths or route guards
- Custody pages (`CustodyNew.tsx`, `CustodyDetail.tsx`)
- Store receipt pages (`StoreReceiptNew.tsx`, `StoreReceiptDetail.tsx`)
- Any non-Store module
- Visual design or component structure
- Mock data files (still used for dev-mode fallback)

---

## B. StoreVehicleReceivingNew.tsx

### B.1 Change Summary

The 3-step wizard was previously a stub that navigated away without writing anything to Supabase. It now performs a two-step INSERT:

1. INSERT into `vehicle_receipts` — returns the new record `id`
2. INSERT into `vehicle_receipt_photos` — one row per filename entered in the photo UI (filtered to non-empty entries)

The `handleSave` function signature changed from no-argument to `handleSave(targetStatus: 'draft' | 'received')`:
- "Save as Draft" → `targetStatus='draft'`
- "Mark as Received" → `targetStatus='received'`

### B.2 Dev Mode Behaviour (unchanged)

When `isSupabaseConfigured` is false, `handleSave` immediately sets `devSuccess=true` and redirects after 1.5 seconds. No Supabase calls are made.

### B.3 Validation Gates

| Gate | Behaviour |
|---|---|
| Chassis number required | `setSaveError('Chassis number is required.')` before Supabase call |
| Auth guard | `setSaveError('Not authenticated...')` if `user?.id` is falsy |
| Photo completeness advisory | Warning shown in Step 3 UI (not blocking — wizard allows draft without photos) |

Photo completeness does NOT gate "Mark as Received" — only "Accept Vehicle" (in the detail page) requires all 5 photos. The DB trigger `enforce_vehicle_photo_completion()` gates the `status='accepted'` transition, not `status='received'`.

### B.4 Photo Record Insertion

Photos are recorded as `vehicle_receipt_photos` rows with:
- `photo_type`: PhotoType ENUM value
- `file_name`: text entered by the user
- `storage_path`: `null` (text-input UI, not a real Supabase Storage upload — see limitation B.5)
- `uploaded_by`: `user.id`

The DB trigger counts `DISTINCT photo_type` presence, not `storage_path` presence, so filename-only records satisfy the photo completion gate.

### B.5 Photo Storage Limitation

The wizard photo UI uses `<input type="text">` for filename entry — it is NOT a real `<input type="file">` backed by Supabase Storage. Photo records are persisted (filenames recorded in the DB), but no actual file exists in Supabase Storage. `storage_path` is `null` for all photo records created through this UI. This limitation predates Step 12C and is tracked for a future file upload implementation.

---

## C. StoreVehicleReceivingDetail.tsx

### C.1 Change Summary

The detail page was previously static: it loaded from `MOCK_VEHICLE_RECEIPTS` synchronously, and all action buttons were stubs. It now:

1. **Loads live data** from `vehicle_receipts` with project join, plus `vehicle_receipt_photos`
2. **`handleAction()`** performs a real `UPDATE vehicle_receipts SET status = $newStatus WHERE id = $id`
3. **`handleAddPhoto()`** performs a real `INSERT INTO vehicle_receipt_photos`

### C.2 Data Loading

Data loading uses an async IIFE inside `useEffect`:

```tsx
useEffect(() => {
  if (!id) return;
  (async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Dev-mode: load from MOCK_VEHICLE_RECEIPTS / getMockVehiclePhotos
      return;
    }
    const { data, error } = await supabase
      .from('vehicle_receipts')
      .select('*, project:projects(project_code, so_number, customer_name)')
      .eq('id', id)
      .single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setVehicle(data as unknown as VehicleReceipt);
    const { data: photoData } = await supabase
      .from('vehicle_receipt_photos')
      .select('*')
      .eq('vehicle_receipt_id', id);
    setPhotos((photoData as unknown as VehicleReceiptPhoto[]) ?? []);
    setLoading(false);
  })();
}, [id]);
```

The async IIFE pattern ensures all `setState` calls are inside an async context, avoiding the `react-hooks/set-state-in-effect` lint rule.

Initial state uses `useState(Boolean(id))` for `loading` and `useState(!id)` for `notFound` so the `!id` guard does not require synchronous setState in the effect.

### C.3 handleAction() — Status Transitions

| Action | New Status | Photo Gate |
|---|---|---|
| Accept Vehicle | `'accepted'` | App-layer check: all 5 required types must be present (mirrors DB trigger) |
| Mark as Damaged | `'damaged'` | None |
| Assign to Production | `'assigned_to_production'` | None |

The app-layer photo gate for "Accept Vehicle":
- Counts photos where `photo_type` is in `REQUIRED_PHOTO_TYPES`
- If count < 5: sets `actionError` and returns without calling Supabase
- Message: "All 5 required photos must be present before accepting this vehicle receipt. N of 5 recorded — add the missing photos first."
- If the app-layer check is somehow bypassed, the DB trigger `enforce_vehicle_photo_completion()` (migration 094) raises an exception that surfaces as an `actionError`

### C.4 handleAddPhoto()

Inserts a new row into `vehicle_receipt_photos` and appends it to local state:

```tsx
{
  vehicle_receipt_id: vehicle.id,
  photo_type: addPhotoType,
  file_name: addPhotoFile.trim(),
  storage_path: null,
  uploaded_by: user.id,
}
```

Same `storage_path: null` limitation as the wizard (see B.5).

### C.5 Dev Mode Behaviour (unchanged)

When `isSupabaseConfigured` is false:
- `handleAction()` sets `devMsg` indicating the action was recorded but not persisted
- `handleAddPhoto()` sets `devMsg` and clears the form
- Loading uses mock data from `MOCK_VEHICLE_RECEIPTS` and `getMockVehiclePhotos(id)`

---

## D. DB Governance Layer (unchanged)

Migration 094 triggers remain the final authority:

| Trigger | Table | Guards |
|---|---|---|
| `trg_vehicle_photo_completion` | `vehicle_receipts` | `status='accepted'` requires all 5 photo types (R-006) |
| `trg_vehicle_receipts_updated_at` | `vehicle_receipts` | updated_at maintenance |
| `trg_vehicle_receipts_auto_number` | `vehicle_receipts` | VR-YYYY-NNNN auto-number |

RLS policies on `vehicle_receipts` and `vehicle_receipt_photos` (WITH CHECK hardened in migration 094) govern which roles can write. Roles `store_user`, `admin`, `operations_manager` have full access.

---

## E. Deferred Items

| Item | Description | Reason Deferred |
|---|---|---|
| Real file upload | `storage_path` is `null`; photo filenames recorded but no file in Supabase Storage | Requires Storage bucket setup, file picker UI, and upload plumbing — out of scope for Step 12C |
| Store receipt live writes | `StoreReceiptNew`, `StoreReceiptDetail` | Out of scope — Step 12C covers vehicle receiving only |
| Custody live writes | `CustodyNew`, `CustodyDetail` | Out of scope — covered by future step |
| `custody_records_factory_update` WITH CHECK | Deferred from Step 12A/12B audit | Awaiting UX review of acceptance workflow |

---

## F. Validation Results

```
Branch:              feature/step-12c-vehicle-receiving-live-write
Base commit:         ff90668 (Step 12B merge)

npm ci:              ✅ (dependencies unchanged)
npm run build:       ✅ 5.56 s — 0 errors, 0 warnings
npx tsc --noEmit:    ✅ 0 errors
npm run lint:        ✅ 80 problems (64 errors, 16 warnings) — unchanged from Step 12B baseline
```

**Lint note:** No new lint issues introduced. The 80 pre-existing issues are unchanged from the Step 12B baseline.
