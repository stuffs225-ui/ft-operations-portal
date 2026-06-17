# Step 12A — Store / Receiving / Custody / Serials Governance Audit

**Date:** 2026-06-17
**Branch:** `docs/step-12a-store-receiving-custody-serials-audit`
**Status:** COMPLETE — Audit only, no code changes
**Prerequisite:** Step 11F merged at `e2585e4`

---

## Executive Summary

The Store / Receiving / Custody / Serials module has been audited for governance compliance, database enforcement, RLS coverage, UI consistency, and audit trail completeness.

**Critical finding:** All Store write pages (`StoreReceiptNew`, `StoreVehicleReceivingNew`, `CustodyNew`) and all detail-page action handlers are placeholder implementations — they do not write to Supabase in live mode. No store data is persisted in production. This is the highest-priority finding in the module.

**Governance:** Two of the six Store-related backlog items (B-019, B-021) remain open at the DB level. The other four (B-002, B-018, B-020, B-022) are closed. Two governance rules (R-006, R-007) are partially enforced: the chassis NOT NULL constraint covers part of R-006, the custody approval trigger covers part of R-007, but both have remaining gaps.

**Scope audited:** 12 Store/Custody pages, 1 redirect page, 14 routes (including reports), 7 migrations (029–034, 077, 082, 085), plus governance backlog items B-002, B-018–B-022.

---

## A. Pages Audited

| Page | File | PageHeader | Write to Supabase |
|---|---|---|---|
| Store Landing | `Store.tsx` | `common/page-header` ✅ | N/A (read only) |
| Store Receipts | `StoreReceipts.tsx` | `common/page-header` ✅ | N/A (read only) |
| Store Receipt New | `StoreReceiptNew.tsx` | `ui/PageHeader` ❌ | ❌ Placeholder — navigates only |
| Store Receipt Detail | `StoreReceiptDetail.tsx` | `ui/PageHeader` ❌ | ❌ Placeholder — stub handler |
| Vehicle Receiving List | `StoreVehicleReceiving.tsx` | `common/page-header` ✅ | N/A (read only) |
| Vehicle Receiving New | `StoreVehicleReceivingNew.tsx` | `ui/PageHeader` ❌ | ❌ Placeholder — navigates only |
| Vehicle Receiving Detail | `StoreVehicleReceivingDetail.tsx` | `ui/PageHeader` ❌ | ❌ Placeholder — stub handler |
| Store Inventory | `StoreInventory.tsx` | `common/page-header` ✅ | N/A (read only) |
| Store Unallocated | `StoreUnallocated.tsx` | `common/page-header` ✅ | ❌ Placeholder — dev mode only |
| Material Custody List | `MaterialCustody.tsx` | `common/page-header` ✅ | N/A (read only) |
| Custody New | `CustodyNew.tsx` | `ui/PageHeader` ❌ | ❌ Placeholder — navigates only |
| Custody Detail | `CustodyDetail.tsx` | `ui/PageHeader` ❌ | ❌ Placeholder — stub handler |
| Vehicle Receiving (legacy alias) | `VehicleReceiving.tsx` | None (redirect) | N/A |

**PageHeader summary:** 6 of 12 pages use `common/page-header`. 6 pages use legacy `ui/PageHeader` — all are the new/detail pages.

---

## B. Route Guard Audit

All routes confirmed guarded by `RequireRole` in `src/app/App.tsx`:

| Route | Allowed Roles | Status |
|---|---|---|
| `/store` | `store_user`, `operations_manager` | ✅ |
| `/store/receipts` | `store_user`, `operations_manager` | ✅ |
| `/store/receipts/new` | `store_user`, `operations_manager` | ✅ |
| `/store/receipts/:id` | `store_user`, `operations_manager` | ✅ |
| `/store/vehicle-receiving` | `store_user`, `operations_manager` | ✅ |
| `/store/vehicle-receiving/new` | `store_user`, `operations_manager` | ✅ |
| `/store/vehicle-receiving/:id` | `store_user`, `operations_manager` | ✅ |
| `/store/inventory` | `store_user`, `operations_manager` | ✅ |
| `/store/unallocated` | `store_user`, `operations_manager` | ✅ |
| `/custody` | `store_user`, `factory_user`, `afs_user`, `operations_manager` | ✅ |
| `/custody/new` | `store_user`, `factory_user`, `afs_user`, `operations_manager` | ✅ (see note) |
| `/custody/:id` | `store_user`, `factory_user`, `afs_user`, `operations_manager` | ✅ |
| `/vehicle-receiving` | `store_user`, `operations_manager` | ✅ (redirect to `/store/vehicle-receiving`) |
| `/reports/store` | `operations_manager`, `store_user` | ✅ |

**Route note — `/custody/new`:** `factory_user` and `afs_user` can navigate to this route but `MaterialCustody.tsx` lists `CAN_CREATE = ['admin', 'operations_manager', 'store_user']`. The "New Custody" button is not shown to `factory_user`/`afs_user`. If they navigate directly, the DB rejects any INSERT (`custody_records_store_all` policy covers only `store_user`, `admin`, `operations_manager`). This is a minor route/UI mismatch — harmless because the DB enforces the restriction, but worth noting for cleanup.

`admin` passes all `RequireRole` checks per framework behavior.

---

## C. Governance Rule Audit

### C.1 R-006 — Vehicle Receipt: Chassis Number + Photos Required

**Governance requirement:** Vehicle receipt is not complete without Chassis Number AND all required photos (front, rear, left_side, right_side, chassis_plate).

#### C.1.a Chassis Number Enforcement

| Layer | Status | Detail |
|---|---|---|
| DB schema | ✅ ENFORCED | `chassis_number text NOT NULL` in `vehicle_receipts` (migration 032) |
| DB unique | ✅ | `CONSTRAINT uq_vehicle_chassis_number UNIQUE (chassis_number)` (migration 032) |
| App UI | Partial | `StoreVehicleReceivingNew.tsx` collects chassis_number in Step 1 of wizard |
| DB trigger | N/A | Column constraint is sufficient; trigger not needed |

**Backlog item B-018:** Addressed at schema level via `NOT NULL` column constraint (migration 032). No trigger required.

#### C.1.b Photo Completion Enforcement

| Layer | Status | Detail |
|---|---|---|
| DB trigger | ❌ MISSING | No trigger prevents `vehicle_receipts.status` transitioning to `'accepted'` without all 5 required photos in `vehicle_receipt_photos` |
| App UI | Partial | `StoreVehicleReceivingNew.tsx` computes `allRequiredUploaded` flag; visual warning shown |
| App enforcement | ❌ MISSING | `handleSave()` does NOT gate on `allRequiredUploaded` — both "Save as Draft" and "Mark as Received" call the same `handleSave()` without checking photo completeness |
| Live write | ❌ Placeholder | `handleSave()` in Supabase mode just calls `navigate('/store/vehicle-receiving')` — no INSERT occurs |

**Backlog item B-019:** OPEN. No DB trigger. App flag exists but is not enforced.

**App code finding — `StoreVehicleReceivingNew.tsx`:**
```
REQUIRED_PHOTO_TYPES = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate']
allRequiredUploaded = REQUIRED_PHOTO_TYPES.every(t => uploadedTypes.has(t))  // computed
handleSave() → if (!isSupabaseConfigured) { dev mode } else { navigate() }   // no INSERT, no gate
```

**`StoreVehicleReceivingDetail.tsx` finding:** Photo completeness banner is shown (visual affordance only). `handleAction()` is dev-mode stub — no Supabase UPDATE in live mode.

### C.2 R-007 — Temporary Custody: Admin or Operations Manager Approval Required

**Governance requirement:** Temporary custody handover requires Admin or Operations Manager approval before issuance.

#### C.2.a Custody Approval Authority (Self-Approval Guard)

| Layer | Status | Detail |
|---|---|---|
| DB trigger | ✅ ENFORCED | `enforce_custody_approval_restriction()` BEFORE INSERT OR UPDATE (migration 085) |
| DB trigger scope | ✅ | Blocks `store_user` from creating a pre-approved record or modifying `approval_status`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason` |
| App UI | ✅ | `CAN_APPROVE = ['admin', 'operations_manager']` in `CustodyDetail.tsx` |
| App action handler | ❌ Stub | `handleAction()` is dev-mode only — no Supabase UPDATE in live mode |

**Backlog item B-020:** Addressed at DB level (migration 085). Trigger fires correctly on INSERT/UPDATE.

#### C.2.b Custody Status Lifecycle Gate

| Layer | Status | Detail |
|---|---|---|
| DB trigger | ❌ MISSING | No trigger prevents setting `custody_status = 'in_custody'` while `receiver_decision = 'pending'` |
| App UI | Partial | Receiver decision section shown in `CustodyDetail.tsx` (UI only) |
| Live write | ❌ Stub | Detail action handlers are dev-mode only |

**Backlog item B-021:** OPEN. No lifecycle trigger at DB level.

#### C.2.c CustodyNew Live Write Gap

`CustodyNew.handleIssue()` does not write to Supabase in live mode:
```
handleIssue() → if (!isSupabaseConfigured) { dev mode } else { navigate('/custody') }
```
`approvalRequired = issueType === 'temporary_custody'` is computed correctly and a warning banner is shown, but the record is never created in production.

### C.3 R-011 — Medical Serial Number Required Before QC Acceptance

**Governance requirement:** Medical items cannot pass QC or be marked as installed without serial number registration.

| Layer | Status | Detail |
|---|---|---|
| DB trigger | ✅ ENFORCED | `enforce_medical_serial_gate()` BEFORE INSERT OR UPDATE on `store_receipt_items` (migration 077) |
| DB trigger scope | ✅ | Blocks `status = 'accepted_by_qc'` or `'installed'` when `serial_required = TRUE` and no `medical_serial_numbers` record exists |
| App UI | ✅ | `StoreReceiptNew.tsx` auto-sets `serial_required = true` when `material_category === 'medical'` |
| App serial tab | ✅ | `StoreReceiptDetail.tsx` shows serial numbers tab when `hasSerials` |
| App write | ❌ Stub | `handleAction()` in `StoreReceiptDetail.tsx` is dev-mode only |

**Backlog item B-002:** CLOSED. DB trigger (migration 077) enforces the gate at the authoritative `store_receipt_items.status` column. The dual-layer pattern matches migration 061.

---

## D. Database — RLS Audit

### D.1 store_receipts

| Policy | For | Status |
|---|---|---|
| `store_receipts_store_all` | store_user, admin, ops (FOR ALL WITH CHECK — migration 085) | ✅ Hardened |
| `store_receipts_ops_select` | procurement_user, factory_user, afs_user, qc_user (SELECT) | ✅ |
| `store_receipts_sales_select` | sales_user SELECT own project | ✅ |
| `store_receipts_viewer_select` | viewer SELECT | ✅ |
| `trg_lock_receipt_number` | Immutability trigger on `receipt_number` (migration 085) | ✅ |

### D.2 store_receipt_items

| Policy | For | Status |
|---|---|---|
| `store_receipt_items_store_all` | store_user, admin, ops (FOR ALL — **no WITH CHECK**) | ⚠️ Pre-hardening pattern |
| `store_receipt_items_ops_select` | procurement/factory/afs/qc SELECT | ✅ |
| `store_receipt_items_sales_select` | sales_user SELECT own project | ✅ |
| `store_receipt_items_viewer_select` | viewer SELECT | ✅ |
| `medical_serial_gate` trigger | BEFORE INSERT OR UPDATE (migration 077) | ✅ Protects medical status transitions |

**Finding:** `store_receipt_items_store_all` is a FOR ALL policy without WITH CHECK (original from migration 030). Migration 085 hardened `store_receipts` and `material_custody_records` but did not touch `store_receipt_items`. The `medical_serial_gate` trigger provides the critical guard for medical items, but non-medical item mutations are unrestricted at the RLS layer.

### D.3 vehicle_receipts

| Policy | For | Status |
|---|---|---|
| `vehicle_receipts_store_all` | store_user, admin, ops (FOR ALL — **no WITH CHECK**) | ⚠️ Pre-hardening pattern |
| No separate SELECT policies | — | — |

**Finding:** `vehicle_receipts_store_all` (migration 032) is a FOR ALL policy without WITH CHECK. No WITH CHECK was added by any subsequent migration. Pre-hardening pattern.

### D.4 vehicle_receipt_photos

| Policy | For | Status |
|---|---|---|
| `vehicle_receipt_photos_store_all` | store_user, admin, ops (FOR ALL — **no WITH CHECK**) | ⚠️ Pre-hardening pattern |

**Finding:** Migration 033 mirrors migration 032 — same FOR ALL without WITH CHECK pattern.

### D.5 material_custody_records

| Policy | For | Status |
|---|---|---|
| `custody_records_store_all` | store_user, admin, ops (FOR ALL WITH CHECK — migration 085) | ✅ Hardened |
| `custody_records_factory_select` | factory_user, afs_user SELECT | ✅ |
| `custody_records_factory_update` | factory/afs UPDATE where `issued_to_user_id = auth.uid()` (**no WITH CHECK**) | ⚠️ Deferred per migration 085 |
| `custody_records_sales_select` | sales_user SELECT own project | ✅ |
| `custody_records_viewer_select` | viewer SELECT | ✅ |
| `trg_enforce_custody_approval` | BEFORE INSERT OR UPDATE (migration 085) | ✅ |

**Deferred item (from migration 085 comment):** `custody_records_factory_update` has no WITH CHECK. `factory_user`/`afs_user` could theoretically change `issued_to_user_id` on their own custody records. Deferred pending UX review of the acceptance workflow.

### D.6 medical_serial_numbers

| Policy | For | Status |
|---|---|---|
| `medical_serials_admin_all` | admin, ops_manager FOR ALL WITH CHECK (migration 082) | ✅ |
| `medical_serials_store_select` | store_user SELECT (migration 082) | ✅ |
| `medical_serials_store_insert` | store_user INSERT (migration 082) | ✅ |
| `medical_serials_store_update` | store_user UPDATE (migration 082) | ✅ |
| `medical_serials_qc_select` | qc_user SELECT (migration 082) | ✅ |
| `medical_serials_qc_update` | qc_user UPDATE (migration 082) | ✅ |
| `medical_serials_factory_select` | factory_user, afs_user SELECT (migration 031) | ✅ |
| `medical_serials_sales_select` | sales_user SELECT own project (migration 031) | ✅ |
| `medical_serials_viewer_select` | viewer SELECT (migration 031) | ✅ |

**Status:** Fully hardened. `qc_user` and `store_user` cannot DELETE. Original broad `medical_serials_broad_all` (migration 031) replaced by role-split policies in migration 082.

---

## E. Database — Trigger Audit

| Trigger | Table | Migration | Purpose | Status |
|---|---|---|---|---|
| `trg_store_receipts_auto_number` | `store_receipts` | 029 | Auto-number RCP-YYYY-NNNN | ✅ |
| `trg_store_receipts_updated_at` | `store_receipts` | 029 | `updated_at` maintenance | ✅ |
| `trg_store_receipt_items_updated_at` | `store_receipt_items` | 030 | `updated_at` maintenance | ✅ |
| `trg_medical_serial_numbers_updated_at` | `medical_serial_numbers` | 031 | `updated_at` maintenance | ✅ |
| `trg_vehicle_receipts_auto_number` | `vehicle_receipts` | 032 | Auto-number VR-YYYY-NNNN | ✅ |
| `trg_vehicle_receipts_updated_at` | `vehicle_receipts` | 032 | `updated_at` maintenance | ✅ |
| `trg_custody_auto_number` | `material_custody_records` | 034 | Auto-number CUS-YYYY-NNNN | ✅ |
| `trg_custody_updated_at` | `material_custody_records` | 034 | `updated_at` maintenance | ✅ |
| `medical_serial_gate` | `store_receipt_items` | 077 | R-011: Medical serial required before accepted_by_qc/installed | ✅ |
| `trg_lock_receipt_number` | `store_receipts` | 085 | Receipt number immutability | ✅ |
| `trg_enforce_custody_approval` | `material_custody_records` | 085 | R-007: Block store_user self-approval | ✅ |
| **Vehicle photo gate** | `vehicle_receipts` | **MISSING** | B-019: Block accepted without 5 photos | ❌ |
| **Custody lifecycle gate** | `material_custody_records` | **MISSING** | B-021: Block in_custody while receiver_decision=pending | ❌ |

---

## F. Store Write Layer — Critical Gap

**All Store write operations are placeholder implementations.** In Supabase (live) mode:

| Operation | Handler | Supabase Behavior |
|---|---|---|
| Create store receipt | `StoreReceiptNew.handleSave()` | `navigate('/store/receipts')` — no INSERT |
| Create vehicle receipt | `StoreVehicleReceivingNew.handleSave()` | `navigate('/store/vehicle-receiving')` — no INSERT |
| Create custody record | `CustodyNew.handleIssue()` | `navigate('/custody')` — no INSERT |
| Update receipt status | `StoreReceiptDetail.handleAction()` | `setDevMsg(...)` — dev mode only, no UPDATE |
| Update vehicle receipt | `StoreVehicleReceivingDetail.handleAction()` | `setDevMsg(...)` — dev mode only, no UPDATE |
| Approve/update custody | `CustodyDetail.handleAction()` | Dev mode stub, no UPDATE |
| Assign unallocated item | `StoreUnallocated.handleAssign()` | `setDevMsgs(...)` — dev mode only, no UPDATE |

**Consequence:** No store receipts, vehicle receipts, or custody records are created in production. The list pages use `mockOrEmpty<T>()` which returns empty arrays in Supabase mode. The module is non-functional in production.

This is a pre-existing condition identified in the system audit. The wire-up of these pages to live Supabase is the primary implementation task for Step 12C.

---

## G. Audit Trail Audit

| Item | Status |
|---|---|
| `recordStoreEvent()` function exists | ❌ Not defined |
| Store receipt creation logged | ❌ No audit call |
| Vehicle receipt acceptance logged | ❌ No audit call |
| Custody issuance logged | ❌ No audit call |
| Custody approval logged | ❌ No audit call |
| Medical serial registration logged | ❌ No audit call |
| Custody receiver acceptance logged | ❌ No audit call |
| `audit_log` table referenced from Store pages | ❌ None |

**No audit trail exists for any Store / Custody operation.** The `audit_log` table (used by `recordProcurementEvent()`) exists and is available, but no equivalent `recordStoreEvent()` function has been defined and no Store page references it.

---

## H. UX Consistency Audit

### H.1 PageHeader

6 of 12 Store/Custody pages use legacy `ui/PageHeader`. These are all the new/detail pages:

| Page | Current | Target |
|---|---|---|
| `StoreReceiptNew.tsx` | `ui/PageHeader` ❌ | `common/page-header` |
| `StoreReceiptDetail.tsx` | `ui/PageHeader` ❌ | `common/page-header` |
| `StoreVehicleReceivingNew.tsx` | `ui/PageHeader` ❌ | `common/page-header` |
| `StoreVehicleReceivingDetail.tsx` | `ui/PageHeader` ❌ | `common/page-header` |
| `CustodyNew.tsx` | `ui/PageHeader` ❌ | `common/page-header` |
| `CustodyDetail.tsx` | `ui/PageHeader` ❌ | `common/page-header` |

The 6 list pages already use the canonical header:
`Store.tsx`, `StoreReceipts.tsx`, `StoreVehicleReceiving.tsx`, `StoreInventory.tsx`, `StoreUnallocated.tsx`, `MaterialCustody.tsx`

### H.2 List Page UX

| Feature | StoreReceipts | StoreVehicleReceiving | MaterialCustody |
|---|---|---|---|
| Result count shown | ❌ | ❌ | ❌ |
| Row-click navigation | ❌ | ❌ | ❌ |

### H.3 Store.tsx — Governance Rules Card

`Store.tsx` displays a "Governance Rules" card with 5 rules including the vehicle receipt chassis/photo requirement and temporary custody approval requirement. The display is correct but reads from mock data.

`REQUIRED_PHOTOS = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate']` defined in `Store.tsx` — matches `REQUIRED_PHOTO_TYPES` in `StoreVehicleReceivingNew.tsx`.

---

## I. Backlog Item Status Summary

| Item | Description | Before Step 12 | Status |
|---|---|---|---|
| B-002 | Medical serial gate trigger (R-011) | — | ✅ CLOSED (migration 077) |
| B-018 | Vehicle receipt chassis_number NOT NULL | — | ✅ CLOSED (migration 032 column constraint) |
| B-019 | Photo completion gate before status=accepted | — | ❌ OPEN — no DB trigger |
| B-020 | Custody approval trigger (R-007) | — | ✅ CLOSED (migration 085) |
| B-021 | Custody status lifecycle trigger | — | ❌ OPEN — no DB trigger |
| B-022 | Custody RLS hardening | — | ✅ CLOSED (migration 085) |

---

## J. Governance Rule Compliance Summary

| Rule | Requirement | DB Layer | App Layer | Overall |
|---|---|---|---|---|
| R-006 | Vehicle receipt: chassis + photos required | Chassis: ✅ (NOT NULL). Photos: ❌ (no trigger) | Chassis: collected. Photos: flag computed, not enforced | **PARTIAL** |
| R-007 | Temporary custody: admin/ops approval required | ✅ `enforce_custody_approval_restriction()` trigger | ✅ `CAN_APPROVE = ['admin', 'operations_manager']` (but handler stub) | **PARTIAL** |
| R-011 | Medical items: serial required before accepted/installed | ✅ `enforce_medical_serial_gate()` trigger | ✅ UI auto-sets serial_required (but handler stub) | ✅ **COMPLIANT** (DB level) |

---

## K. Findings — Open Items for Step 12B+

### K.1 CRITICAL — Store Write Layer Not Implemented (Step 12C)

**All Store new/detail write handlers call `navigate()` instead of writing to Supabase.**

Pages requiring Supabase write implementation:
- `StoreReceiptNew.tsx` — `handleSave()` → INSERT `store_receipts` + `store_receipt_items`
- `StoreVehicleReceivingNew.tsx` — `handleSave()` → INSERT `vehicle_receipts` + `vehicle_receipt_photos`
- `CustodyNew.tsx` — `handleIssue()` → INSERT `material_custody_records`
- `StoreReceiptDetail.tsx` — `handleAction()` → UPDATE `store_receipt_items.status`
- `StoreVehicleReceivingDetail.tsx` — `handleAction()` → UPDATE `vehicle_receipts.status`
- `CustodyDetail.tsx` — `handleAction()` → UPDATE `material_custody_records` (approval, receiver decision)

### K.2 HIGH — B-019: Vehicle Receipt Photo Gate Missing (Step 12B)

No DB trigger prevents `vehicle_receipts.status` from transitioning to `'accepted'` without all 5 required photos in `vehicle_receipt_photos`. App computes `allRequiredUploaded` flag but does not gate `handleSave()` on it. DB trigger required.

**Required trigger:** BEFORE UPDATE on `vehicle_receipts` — when `status` transitions to `'accepted'`, count `vehicle_receipt_photos` records for this `vehicle_receipt_id` covering all 5 required `photo_type` values. If count < 5, raise exception.

### K.3 MEDIUM — B-021: Custody Status Lifecycle Gate Missing (Step 12B)

No DB trigger prevents `custody_status = 'in_custody'` being set while `receiver_decision = 'pending'`. A custody record could be marked as in-custody before the receiver has formally accepted.

**Required trigger:** BEFORE INSERT OR UPDATE on `material_custody_records` — if `custody_status = 'in_custody'` and `receiver_decision = 'pending'`, raise exception.

### K.4 MEDIUM — No Store Audit Trail (Step 12D)

No `recordStoreEvent()` equivalent exists. No Store/Custody operation is recorded in `audit_log`. Required events:
- Store receipt creation / status change
- Vehicle receipt creation / acceptance
- Custody record creation / approval / receiver decision

### K.5 LOW — RLS Pre-Hardening on Three Tables (Step 12B)

The following tables have FOR ALL policies without WITH CHECK — consistent with the pre-migration-085 pattern:
- `vehicle_receipts` — `vehicle_receipts_store_all` (migration 032, no WITH CHECK)
- `vehicle_receipt_photos` — `vehicle_receipt_photos_store_all` (migration 033, no WITH CHECK)
- `store_receipt_items` — `store_receipt_items_store_all` (migration 030, no WITH CHECK)

These should receive WITH CHECK guards (same pattern as migration 085 Part B for store_receipts).

### K.6 LOW — UX: 6 Pages on Legacy PageHeader (Step 12E)

`StoreReceiptNew`, `StoreReceiptDetail`, `StoreVehicleReceivingNew`, `StoreVehicleReceivingDetail`, `CustodyNew`, `CustodyDetail` — all use `ui/PageHeader`.

### K.7 LOW — UX: Missing Result Counts and Row-Click (Step 12E)

`StoreReceipts`, `StoreVehicleReceiving`, and `MaterialCustody` list pages have no result count and no row-click navigation (pattern established in Step 11E for procurement).

### K.8 LOW — Route/UI Mismatch on `/custody/new` (Step 12E)

`factory_user` and `afs_user` can navigate to `/custody/new` but cannot create records (DB enforced, `CAN_CREATE` gates the button). Route guard should match `CAN_CREATE = ['admin', 'operations_manager', 'store_user']` for consistency.

### K.9 LOW — `custody_records_factory_update` Has No WITH CHECK

Deferred from migration 085. `factory_user`/`afs_user` can modify `issued_to_user_id` on their own custody records via UPDATE. Pending UX review of the acceptance workflow.

---

## L. Recommended Step 12 Sub-Steps

### Step 12B — Store Governance Hardening (migrations only)

Priority order:

1. **B-019 — Vehicle receipt photo completion gate**
   - BEFORE UPDATE trigger on `vehicle_receipts`
   - When `status` transitions to `'accepted'`, verify all 5 required `photo_type` values exist in `vehicle_receipt_photos` for this `vehicle_receipt_id`
   - Admin and operations_manager bypass
   - Pattern: migration 077 (`enforce_medical_serial_gate`)

2. **B-021 — Custody status lifecycle gate**
   - BEFORE INSERT OR UPDATE trigger on `material_custody_records`
   - Block `custody_status = 'in_custody'` when `receiver_decision = 'pending'`
   - Admin and operations_manager bypass
   - Pattern: migration 093 (`enforce_pr_item_terminal_state`)

3. **RLS WITH CHECK hardening** (lower priority)
   - Add WITH CHECK to `vehicle_receipts_store_all`, `vehicle_receipt_photos_store_all`, `store_receipt_items_store_all`
   - Pattern: migration 085 Part B (store_receipts)

4. **`custody_records_factory_update` WITH CHECK**
   - Add WITH CHECK limiting factory/afs to updating only receiver decision fields
   - Deferred from migration 085

**Step 12B must NOT change:** Application code, routes, route guards, UI behavior, or any migration already applied.

### Step 12C — Store Write Layer Implementation (application code)

Wire all placeholder write handlers to live Supabase:

1. `StoreReceiptNew.handleSave()` → INSERT `store_receipts` + `store_receipt_items`
2. `StoreVehicleReceivingNew.handleSave()` → INSERT `vehicle_receipts` + `vehicle_receipt_photos`; gate on `allRequiredUploaded` before `status='accepted'`
3. `CustodyNew.handleIssue()` → INSERT `material_custody_records`; set `approval_required` based on `issue_type`
4. `StoreReceiptDetail.handleAction()` → UPDATE `store_receipt_items.status`
5. `StoreVehicleReceivingDetail.handleAction()` → UPDATE `vehicle_receipts.status`
6. `CustodyDetail.handleAction()` → UPDATE custody `approval_status` / `receiver_decision`

**Step 12C must NOT change:** Database schema, migrations, RLS policies, routes, or route guards.

### Step 12D — Store Audit Trail (application code)

1. Define `recordStoreEvent()` in `src/lib/storeAudit.ts` (pattern: `src/lib/procurementAudit.ts`)
2. Add audit calls to all write handlers implemented in Step 12C:
   - Receipt creation, receipt status change
   - Vehicle receipt creation, acceptance
   - Custody issuance, approval decision, receiver acceptance/rejection

### Step 12E — Store UX Consistency (application code)

1. Migrate 6 pages from `ui/PageHeader` to `common/page-header`
2. Add result counts to `StoreReceipts`, `StoreVehicleReceiving`, `MaterialCustody`
3. Add row-click navigation to list pages (anchor guard pattern from Step 11E)
4. Fix route guard on `/custody/new` to remove `factory_user`, `afs_user`

**Step 12E must NOT change:** Business logic, queries, governance rules, RLS, or migrations.

---

## M. Migrations Audited

| Migration | Purpose | Status |
|---|---|---|
| 029 — Store Receipts | Schema + RLS + auto-number | ✅ Reviewed |
| 030 — Store Receipt Items | Schema + RLS | ✅ Reviewed — FOR ALL without WITH CHECK |
| 031 — Medical Serial Numbers | Schema + RLS | ✅ Reviewed — superseded by migration 082 |
| 032 — Vehicle Receipts | Schema + RLS — chassis NOT NULL | ✅ Reviewed — FOR ALL without WITH CHECK |
| 033 — Vehicle Receipt Photos | Schema + RLS | ✅ Reviewed — FOR ALL without WITH CHECK |
| 034 — Material Custody Records | Schema + RLS + triggers | ✅ Reviewed |
| 077 — Medical Serial Gate | `enforce_medical_serial_gate()` trigger (B-002) | ✅ Reviewed — CLOSES B-002 |
| 082 — Medical Serial RLS Hardening | Role-split policies replacing broad_all | ✅ Reviewed — fully hardened |
| 085 — Store Write RLS Hardening | Part B: store_receipts + receipt_number immutability; Part C: custody approval guard | ✅ Reviewed — CLOSES B-020, B-022 |

---

## N. Safety Review

| Check | Result |
|---|---|
| Application code changed | No |
| Supabase migrations added or modified | No |
| RLS policies changed | No |
| Routes added or modified | No |
| Route guards changed | No |
| Business logic changed | No |
| Dependencies added | No |
| Build status | Not re-run — docs-only commit, no code change |

---

## O. Validation Results

```
Branch:               docs/step-12a-store-receiving-custody-serials-audit
Base commit:          e2585e4 (Step 11F merge — main baseline)
Changes in this step: docs/implementation/step-12a-store-receiving-custody-serials-audit.md (this file)
```

No code changes — validation suite (npm ci, npm run build, npx tsc --noEmit) will be run in Step 12B when code changes are introduced. The baseline from Step 11F (e2585e4) is clean: 0 build errors, 0 tsc errors.
