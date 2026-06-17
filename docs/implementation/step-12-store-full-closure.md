# Step 12 — Store Full Closure

**Date:** 2026-06-17
**Branch:** `feature/step-12-store-full-closure`
**Status:** COMPLETE — awaiting review
**Prerequisites:** PR #96 (Step 12C — Vehicle Receiving live writes + migration 095), PR #97 (Step 12C-2 — real vehicle photo upload) — both merged

---

## Executive Summary

Step 12 Full Closure completes all remaining Store and Custody live-write work, converging every
Store module from mock-only stubs to real Supabase reads and writes.

| Module | Before | After |
|---|---|---|
| `StoreReceiptNew` | Placeholder `handleSave` (navigates away without writing) | Real INSERT into `store_receipts` + `store_receipt_items`; navigates to detail on success |
| `StoreReceiptDetail` | Mock-only (MOCK_STORE_RECEIPTS); no live actions | Live load from Supabase with project join + items + serial numbers; real status UPDATE |
| `CustodyNew` | Placeholder `handleIssue` (navigates away without writing) | Live item load from `store_receipt_items WHERE status='in_store'`; real INSERT into `material_custody_records` |
| `CustodyDetail` | Mock-only (MOCK_CUSTODY_RECORDS); no live actions | Live load with project + item joins; real UPDATE for all 7 custody actions |

Audit trail wired via existing `recordStoreAudit()` on all key actions.
Medical serial number data wired in `StoreReceiptDetail` serials tab (display-only, from `medical_serial_numbers`).
PageLoader + actionError patterns applied consistently across all detail pages.

No DB schema changes. No new migrations. No RLS changes. No route changes.

---

## A. Scope

### A.1 Files Modified

| File | Change |
|---|---|
| `src/pages/StoreReceiptNew.tsx` | Real Supabase INSERT for receipts and items; audit trail call; navigate to detail on success |
| `src/pages/StoreReceiptDetail.tsx` | Full rewrite: live loading with useEffect async IIFE; real status UPDATE; serial numbers tab wired to `medical_serial_numbers`; PageLoader; actionError |
| `src/pages/CustodyNew.tsx` | Live item loading from `store_receipt_items`; real INSERT into `material_custody_records`; navigate to detail on success |
| `src/pages/CustodyDetail.tsx` | Full rewrite: live loading with useEffect async IIFE; real UPDATE for all actions; PageLoader; actionError; CustodyPatch type |

### A.2 Files Created

| File | Purpose |
|---|---|
| `docs/implementation/step-12-store-full-closure.md` | This document |

### A.3 Not Changed

- DB schema, migrations, RLS policies
- Route paths or route guards
- Vehicle Receiving pages (StoreVehicleReceivingNew, StoreVehicleReceivingDetail — covered by PR #96 / #97)
- Any non-Store module (Factory, Dubai/AFS, QC, Procurement, Sales, Dashboard, etc.)
- `src/lib/storeAudit.ts` — used as-is

---

## B. Store Receipt Live Writes

### B.1 StoreReceiptNew.tsx

**`handleSave(markReceived: boolean)` — flow:**

1. Guard: `isSupabaseConfigured`, `receivedDate`, `user?.id`
2. INSERT into `store_receipts`: `received_date`, `receipt_type`, `supplier_name`, `delivery_note_number`, `project_id`, `remarks`, `status` (draft or received), `received_by`, `created_by`
3. If `items.length > 0`: INSERT all draft items into `store_receipt_items` with `store_receipt_id` set to new receipt ID
4. Fire-and-forget `recordStoreAudit()` for audit trail (non-blocking)
5. Navigate to `/store/receipts/${id}` (detail page) — user can verify items immediately

**Status values:**
| Action | `status` |
|---|---|
| Save as Draft | `'draft'` |
| Mark as Received | `'received'` |

**Dev mode:** `setDevSuccess(true)` → redirect to list after 1.5 s (unchanged from original)

### B.2 StoreReceiptDetail.tsx

**Live loading (useEffect async IIFE):**

1. Load receipt from `store_receipts` with project join: `.select('*, project:projects(project_code, so_number, customer_name)')`
2. Load items from `store_receipt_items WHERE store_receipt_id = id`
3. For items with `serial_required = true`, load serial numbers from `medical_serial_numbers WHERE store_receipt_item_id IN (serial_item_ids)`
4. Mock fallback when `!isSupabaseConfigured`

**`handleAction(action: string)` — status transitions:**

| Action | New Status |
|---|---|
| `'Mark as Received'` | `'received'` |
| `'Send to QC'` | `'pending_material_qc'` |

**Serials tab:** Shown only when any item has `serial_required = true`. Loads from `medical_serial_numbers` — display-only (serial registration is a separate workflow). Migration 077 gate (`trg_medical_serial_gate`) continues to enforce that medical items cannot be accepted by QC or marked installed without at least one registered serial number.

---

## C. Custody Live Writes

### C.1 CustodyNew.tsx

**Item loading (useEffect):**
- Supabase configured: query `store_receipt_items WHERE status='in_store'`
- Dev mode fallback: mock items from `MOCK_RECEIPT_ITEMS` filtered to `status='in_store'`

**`handleIssue()` — INSERT into `material_custody_records`:**

| Issue Type | `status` | `approval_required` | `approval_status` |
|---|---|---|---|
| `assign_to_project` | `'issued'` | `false` | `'not_required'` |
| `temporary_custody` | `'pending_approval'` | `true` | `'pending_approval'` |

Fields: `store_receipt_item_id`, `project_id`, `issued_to_role`, `issued_to_user_id` (null — no user picker in current UI), `issued_to_department`, `issue_type`, `approval_required`, `approval_status`, `issued_by`, `status`, `remarks`, `created_by`.

After success: navigates to `/custody/${id}` (detail page).

**Deferred:** `issued_to_user_id` is always `null` — no individual user picker in the current wizard UI. Documented below as technical debt.

### C.2 CustodyDetail.tsx

**Live loading (useEffect async IIFE):**
- Load from `material_custody_records` with project + item joins:
  `.select('*, project:projects(project_code, so_number, customer_name), item:store_receipt_items(item_name, item_code, material_category)')`
- Mock fallback when `!isSupabaseConfigured`

**`handleAction(action: string)` — all 7 custody actions:**

| Action | Patch Fields |
|---|---|
| `'Approve'` | `{ approval_status: 'approved', approved_by, approved_at, status: 'issued' }` |
| `'Reject approval'` | `{ approval_status: 'rejected', rejected_by, rejected_at, rejection_reason, status: 'cancelled' }` |
| `'Accept custody'` | `{ status: 'in_custody', receiver_decision: 'accepted', accepted_by, accepted_at }` — B-021 compliant: status + receiver_decision updated in single UPDATE |
| `'Reject custody'` | `{ receiver_decision: 'rejected', receiver_rejection_reason, status: 'cancelled' }` |
| `'Mark as Installed'` | `{ status: 'installed', installation_status: 'installed', installed_at }` |
| `'Return to Store'` | `{ status: 'returned', returned_at }` |
| `'Mark as Consumed'` | `{ status: 'consumed_by_project' }` |

**B-021 Compliance:** `'Accept custody'` updates `status='in_custody'` and `receiver_decision='accepted'` in a **single** UPDATE call. This satisfies the DB trigger `trg_custody_lifecycle` (migration 094) which blocks `status='in_custody'` when `receiver_decision='pending'`.

**`CustodyPatch` type:** Defined locally to provide TypeScript-safe field names for the Supabase update call, avoiding `Record<string, unknown>` incompatibility.

---

## D. Audit Trail

All key actions fire `recordStoreAudit()` from `src/lib/storeAudit.ts` — non-blocking fire-and-forget writes to `audit_log`. Pattern: `void recordStoreAudit(action, entityId, description, actorId)`.

| Page | Action | Audit Entry |
|---|---|---|
| StoreReceiptNew | Save as Draft / Mark as Received | `store_receipt_draft` / `store_receipt_received` |
| StoreReceiptDetail | Mark as Received / Send to QC | `store_receipt_received` / `store_receipt_pending_material_qc` |
| CustodyNew | Issue Custody | `custody_issued` |
| CustodyDetail | All 7 actions | `custody_{action_slug}` |

---

## E. DB Governance (unchanged)

| Trigger | Table | Guards |
|---|---|---|
| `trg_medical_serial_gate` (migration 077) | `store_receipt_items` | `serial_required=true` items cannot be `accepted_by_qc` or `installed` without a `medical_serial_numbers` record |
| `trg_enforce_custody_approval` (migration 085) | `material_custody_records` | `temporary_custody` records require approval before `status='issued'` |
| `trg_custody_lifecycle` (migration 094) | `material_custody_records` | Cannot set `status='in_custody'` while `receiver_decision='pending'` (B-021) |
| `trg_vehicle_photo_completion` (migration 094/095) | `vehicle_receipts` | `status='accepted'` requires all 5 photo types with real `storage_path` (R-006) |

No schema changes. No new migrations. No RLS changes.

---

## F. Technical Debt Documented

| Item | Description | Reason Deferred |
|---|---|---|
| `issued_to_user_id` always null | No individual user picker in CustodyNew wizard | UI feature gap — would require user search/autocomplete; out of scope for Step 12 |
| Signed URL photo viewer in VehicleReceivingDetail | Photos in `vehicle-photos` bucket are private; "View" link would need `createSignedUrl` | Deferred to future UX step (documented in step-12c-2 docs) |
| `StoreReceiptItems` item QC actions | No UI to transition `store_receipt_items.status` through QC lifecycle from Store pages | MaterialQC module handles this; store-side view is display-only |
| Live project picker in StoreReceiptNew / CustodyNew | Project dropdowns are hardcoded mock options | Requires project list query; out of scope for Store full closure |

---

## G. Validation Results

```
Branch:              feature/step-12-store-full-closure
Base commit:         (post PR #97 merge)

npm ci:              ✅ (dependencies unchanged)
npm run build:       ✅ 0 errors, 0 warnings (5.05 s)
npx tsc --noEmit:    ✅ 0 errors
npm run lint:        ✅ 80 problems (64 errors, 16 warnings) — unchanged from Step 12C-2 baseline
```
