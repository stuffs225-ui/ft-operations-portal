# Step 12B — Store Governance Hardening

**Date:** 2026-06-17
**Branch:** `feature/step-12b-store-governance-hardening`
**Status:** COMPLETE — awaiting review
**Prerequisite:** Step 12A audit merged at `f13ec00`

---

## Executive Summary

Step 12B implements the two open DB-level governance gaps identified in the Step 12A audit, plus RLS WITH CHECK hardening for three pre-hardening Store tables.

Two trigger functions were added:
- `enforce_vehicle_photo_completion()` — gates `vehicle_receipts.status = 'accepted'` on all 5 required photo types being present (B-019 / R-006).
- `enforce_custody_lifecycle()` — gates `material_custody_records.status = 'in_custody'` on `receiver_decision != 'pending'` (B-021).

Three RLS policies were hardened to the `WITH CHECK` standard (Part C).

No application code, routes, route guards, UI, or business logic was changed. All Store write pages remain as placeholder implementations — that is the scope of Step 12C.

---

## A. Migration File

**Filename:** `supabase/migrations/094_store_governance_hardening.sql`

**Highest existing migration before this PR:** `093_procurement_governance_hardening.sql`

---

## B. Vehicle Receiving Photo Completion Guard (B-019 / R-006)

### B.1 Schema Compatibility Check

| Element | Value | Source |
|---|---|---|
| Table | `vehicle_receipts` | migration 032 |
| Status column | `status vehicle_receipt_status` | migration 032 |
| Acceptance state | `'accepted'` | `vehicle_receipt_status` ENUM |
| Photos table | `vehicle_receipt_photos` | migration 033 |
| FK column | `vehicle_receipt_id uuid NOT NULL REFERENCES vehicle_receipts(id)` | migration 033 |
| Photo type column | `photo_type photo_type NOT NULL` | migration 033 |
| Photo type ENUM | `'front', 'rear', 'left_side', 'right_side', 'chassis_plate', 'damage', 'other'` | migration 033 |
| Required types in app | `REQUIRED_PHOTO_TYPES = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate']` | `StoreVehicleReceivingNew.tsx` |

Schema fully supports the trigger. All required types are valid ENUM values.

### B.2 Implementation

**Function:** `public.enforce_vehicle_photo_completion()`
**Trigger:** `trg_vehicle_photo_completion` BEFORE INSERT OR UPDATE on `vehicle_receipts`
**Pattern:** `enforce_medical_serial_gate()` (migration 077)

**Guard logic:**
1. If `NEW.status != 'accepted'` → pass through (other status transitions not constrained)
2. If UPDATE and `OLD.status = NEW.status` → pass through (non-status UPDATE, no re-check)
3. Count DISTINCT matching `photo_type::text IN ('front', 'rear', 'left_side', 'right_side', 'chassis_plate')` for this `vehicle_receipt_id`
4. If count < 5 → `RAISE EXCEPTION` with count found

**No role bypass:** Photo completeness is a regulatory requirement per R-006. All roles including admin and operations_manager must satisfy the photo gate.

**Chassis number:** Not changed. `chassis_number text NOT NULL` (migration 032 column constraint) remains the B-018 enforcement.

### B.3 Result

**Status: IMPLEMENTED ✅**

---

## C. Custody Status Lifecycle Guard (B-021)

### C.1 Schema Compatibility Check

| Element | Value | Source |
|---|---|---|
| Table | `material_custody_records` | migration 034 |
| Status column | `status custody_status NOT NULL DEFAULT 'draft'` | migration 034 |
| Guarded state | `'in_custody'` | `custody_status` ENUM |
| Decision column | `receiver_decision custody_receiver_decision NOT NULL DEFAULT 'pending'` | migration 034 |
| Decision ENUM | `'pending', 'accepted', 'rejected'` | migration 034 |

Schema fully supports the trigger.

### C.2 Implementation

**Function:** `public.enforce_custody_lifecycle()`
**Trigger:** `trg_custody_lifecycle` BEFORE INSERT OR UPDATE on `material_custody_records`

**Guard logic:**
1. If `NEW.status != 'in_custody'` → pass through
2. If UPDATE and `OLD.status = NEW.status` → pass through
3. If `NEW.receiver_decision = 'pending'` → `RAISE EXCEPTION`

The guard targets the unresolved decision state only. `receiver_decision = 'accepted'` or `'rejected'` passes through. Application logic is responsible for handling the 'rejected' case (not marking status as 'in_custody').

**Coexistence with migration 085:** `trg_enforce_custody_approval` (migration 085) and `trg_custody_lifecycle` (this migration) both fire BEFORE INSERT OR UPDATE on `material_custody_records`. They fire independently in alphabetical order (`trg_custody_lifecycle` before `trg_enforce_custody_approval`). Both check distinct conditions with no overlap.

### C.3 Result

**Status: IMPLEMENTED ✅**

---

## D. RLS WITH CHECK Hardening

### D.1 Tables Hardened

All three pre-hardening FOR ALL policies identified in Step 12A (K.5) replaced with WITH CHECK using `public.current_user_role()` pattern.

| Table | Old Policy | New Policy | Change |
|---|---|---|---|
| `vehicle_receipts` | `vehicle_receipts_store_all` FOR ALL, no WITH CHECK, old EXISTS pattern | FOR ALL WITH CHECK, `current_user_role()` | ✅ Hardened |
| `vehicle_receipt_photos` | `vehicle_photos_store_all` FOR ALL, no WITH CHECK, old EXISTS pattern | FOR ALL WITH CHECK, `current_user_role()` | ✅ Hardened |
| `store_receipt_items` | `store_receipt_items_store_all` FOR ALL, no WITH CHECK, old EXISTS pattern | FOR ALL WITH CHECK, `current_user_role()` | ✅ Hardened |

**Role coverage unchanged for all three tables:** `store_user`, `admin`, `operations_manager`.

All existing SELECT-only policies for other roles preserved without modification:
- `vehicle_receipts_ops_select`, `vehicle_receipts_sales_select`, `vehicle_receipts_viewer_select`
- `vehicle_photos_ops_select`, `vehicle_photos_sales_select`, `vehicle_photos_viewer_select`
- `store_receipt_items_ops_select`, `store_receipt_items_sales_select`, `store_receipt_items_viewer_select`

### D.2 Result

**Status: IMPLEMENTED ✅**

---

## E. Deferred Items

### E.1 `custody_records_factory_update` — No WITH CHECK (Deferred Again)

This policy (migration 034) was already noted as deferred in migration 085 and Step 12A audit K.9. `factory_user`/`afs_user` can UPDATE any column on their own custody records (`issued_to_user_id = auth.uid()`), including fields they shouldn't modify.

**Classification:** LOW — deferred pending UX review of the receiver acceptance workflow
**Blocking Step 12C:** No
**Recommended path:** Once Step 12C implements the receiver acceptance flow in `CustodyDetail.tsx`, the exact fields factory/afs users should be allowed to update will be clear. Address in Step 12C or a dedicated hardening follow-up.

### E.2 No New Deferred Items

All other items identified in Step 12A remain in their prior state:
- B-002 (medical serial gate): CLOSED by migration 077 — unchanged
- B-018 (chassis NOT NULL): CLOSED by migration 032 — unchanged
- B-020 (custody approval trigger): CLOSED by migration 085 — unchanged
- B-022 (custody RLS): CLOSED by migration 085 — unchanged

---

## F. Full RLS State After Migration 094

### F.1 vehicle_receipts

| Policy | For | Source | Status |
|---|---|---|---|
| `vehicle_receipts_store_all` | store_user, admin, ops FOR ALL WITH CHECK | migration 094 | ✅ Hardened |
| `vehicle_receipts_ops_select` | procurement/factory/afs/qc SELECT | migration 032 | ✅ Unchanged |
| `vehicle_receipts_sales_select` | sales_user SELECT own project | migration 032 | ✅ Unchanged |
| `vehicle_receipts_viewer_select` | viewer SELECT | migration 032 | ✅ Unchanged |

### F.2 vehicle_receipt_photos

| Policy | For | Source | Status |
|---|---|---|---|
| `vehicle_photos_store_all` | store_user, admin, ops FOR ALL WITH CHECK | migration 094 | ✅ Hardened |
| `vehicle_photos_ops_select` | procurement/factory/afs/qc SELECT | migration 033 | ✅ Unchanged |
| `vehicle_photos_sales_select` | sales_user SELECT own project | migration 033 | ✅ Unchanged |
| `vehicle_photos_viewer_select` | viewer SELECT | migration 033 | ✅ Unchanged |

### F.3 store_receipt_items

| Policy | For | Source | Status |
|---|---|---|---|
| `store_receipt_items_store_all` | store_user, admin, ops FOR ALL WITH CHECK | migration 094 | ✅ Hardened |
| `store_receipt_items_ops_select` | procurement/factory/afs/qc SELECT | migration 030 | ✅ Unchanged |
| `store_receipt_items_sales_select` | sales_user SELECT own project | migration 030 | ✅ Unchanged |
| `store_receipt_items_viewer_select` | viewer SELECT | migration 030 | ✅ Unchanged |

---

## G. Full Trigger State After Migration 094

| Trigger | Table | Purpose | Source | Status |
|---|---|---|---|---|
| `trg_vehicle_photo_completion` | `vehicle_receipts` | B-019: block accepted without all 5 photos | migration 094 | ✅ NEW |
| `trg_custody_lifecycle` | `material_custody_records` | B-021: block in_custody while decision pending | migration 094 | ✅ NEW |
| `trg_enforce_custody_approval` | `material_custody_records` | B-020: block store_user self-approval | migration 085 | ✅ Unchanged |
| `trg_lock_receipt_number` | `store_receipts` | Receipt number immutability | migration 085 | ✅ Unchanged |
| `medical_serial_gate` | `store_receipt_items` | R-011: serial required before accepted/installed | migration 077 | ✅ Unchanged |
| `trg_vehicle_receipts_updated_at` | `vehicle_receipts` | updated_at maintenance | migration 032 | ✅ Unchanged |
| `trg_store_receipts_auto_number` | `store_receipts` | RCP-YYYY-NNNN | migration 029 | ✅ Unchanged |
| `trg_vehicle_receipts_auto_number` | `vehicle_receipts` | VR-YYYY-NNNN | migration 032 | ✅ Unchanged |
| `trg_custody_auto_number` | `material_custody_records` | CUS-YYYY-NNNN | migration 034 | ✅ Unchanged |

---

## H. SQL Body Safety Review

| Check | Result |
|---|---|
| `enforce_vehicle_photo_completion()` uses `SECURITY DEFINER SET search_path = public` | ✅ |
| `enforce_custody_lifecycle()` uses `SECURITY DEFINER SET search_path = public` | ✅ |
| Both triggers declared BEFORE INSERT OR UPDATE FOR EACH ROW | ✅ |
| Guard condition 1 (status check) exits early — minimal overhead on non-targeted writes | ✅ |
| Guard condition 2 (UPDATE-only skip when status unchanged) prevents spurious re-checks | ✅ |
| Photo count query uses `COUNT(DISTINCT photo_type::text)` — correct aggregation for multi-upload scenarios | ✅ |
| Photo type comparison uses `photo_type::text IN (...)` — safe cast for ENUM comparison | ✅ |
| Custody guard targets only `receiver_decision = 'pending'` — accepted and rejected pass through | ✅ |
| `enforce_custody_lifecycle` trigger name: `trg_custody_lifecycle` — distinct from `trg_enforce_custody_approval` | ✅ |
| Both triggers fire independently — no ordering dependency | ✅ |
| RLS DROP IF EXISTS before CREATE — idempotent | ✅ |
| Role coverage unchanged for all 3 hardened policies | ✅ |
| No existing RLS weakened | ✅ |
| No schema changes (no new columns, tables, types, or indexes) | ✅ |
| No application code changes | ✅ |
| Rollback instructions included | ✅ |

---

## I. Safety Review

| Check | Result |
|---|---|
| Application code changed | No |
| Store UI changed | No |
| Route paths changed | No |
| Route guards changed | No |
| Business logic changed | No |
| Supabase queries changed | No |
| RLS weakened | No — WITH CHECK added, role coverage unchanged |
| New schema objects added | Trigger functions and triggers only |
| New dependencies added | No |
| Existing triggers modified | No — only new triggers added |
| Existing RLS policies modified | Three policies replaced (same roles, WITH CHECK added) |
| Procurement module affected | No |

---

## J. Validation Results

```
Branch:              feature/step-12b-store-governance-hardening
Base commit:         f13ec00 (Step 12A merge)

npm ci:              ✅ success
npm run build:       ✅ 5.10 s — 0 errors, 0 warnings
npx tsc --noEmit:    ✅ 0 errors
npm run lint:        ⚠️  80 problems (64 errors, 16 warnings) — all pre-existing, count unchanged
```

**Lint note:** No new lint issues introduced. The 80 pre-existing issues are unchanged from the Step 12A baseline.

---

## K. Recommended Step 12C Scope

Step 12C should implement live Supabase writes for all Store write pages. The DB governance layer is now complete (migrations 085, 094). Step 12C writes will be correctly guarded by:

- `trg_vehicle_photo_completion` — blocks accepting a vehicle receipt without photos
- `trg_enforce_custody_approval` — blocks store_user from pre-approving custody
- `trg_custody_lifecycle` — blocks marking in_custody before receiver decides
- `medical_serial_gate` — blocks accepting/installing medical items without serial
- `trg_lock_receipt_number` — protects receipt number immutability
- `enforce_qc_supplier_fields()` — supplier field restrictions (procurement, unchanged)

**Step 12C recommended scope:**

1. **`StoreReceiptNew.handleSave()`** — INSERT `store_receipts` + `store_receipt_items`; respect `serial_required = true` for medical categories
2. **`StoreVehicleReceivingNew.handleSave()`** — INSERT `vehicle_receipts`; INSERT `vehicle_receipt_photos` per uploaded photo; gate "Mark as Received" on `allRequiredUploaded` (app-layer mirror of DB trigger)
3. **`CustodyNew.handleIssue()`** — INSERT `material_custody_records`; set `approval_required = true` when `issue_type = 'temporary_custody'`; set `approval_status = 'pending_approval'` when required
4. **`StoreReceiptDetail.handleAction()`** — UPDATE `store_receipt_items.status`
5. **`StoreVehicleReceivingDetail.handleAction()`** — UPDATE `vehicle_receipts.status`; surface photo completion error from DB trigger if photos are missing at acceptance time
6. **`CustodyDetail.handleAction()`** — UPDATE `material_custody_records` for approval decision (admin/ops only) and receiver decision (factory/afs own records)

**Step 12C must NOT change:** DB schema, migrations, RLS policies, routes, route guards, or any non-Store module.
