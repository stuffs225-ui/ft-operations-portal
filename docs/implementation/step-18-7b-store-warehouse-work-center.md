# Step 18.7B — Store / Warehouse Work Center Rebuild and UX Redesign

**Branch:** `feature/step-18-7b-store-warehouse-work-center`
**Roles in scope:** `store_user`, `operations_manager`, `admin`
**Constraint:** No schema/migration/RLS changes. All writes go through existing RLS.

---

## Summary

Full rebuild of the `store_user` experience into a coherent Store/Warehouse Work Center. The store module was previously a collection of loosely-connected pages with hardcoded project dropdowns, no serial register, no issuance page, no QC handoff visibility, and a dashboard that showed raw receipt lists. This step delivers a complete control center with KPI monitoring, direct navigation to all sub-workflows, and three new operational pages.

---

## Changes

### 1. Sidebar IA — Two New Sections

**`src/components/layout/Sidebar.tsx`**
- Added Lucide icons: `Layers`, `ArrowUpRight`, `Hash`, `RotateCcw`, `CheckCircle2`, `XCircle` to import and `ICON_MAP`

**`src/data/navigation.ts`**
- Added **STORE OPERATIONS** section (store_user, admin, operations_manager only):
  - Store Dashboard → `/store`
  - Inventory → `/store/inventory`
  - Material Receiving → `/store/receipts`
  - Vehicle Receiving → `/store/vehicle-receiving`
  - Material Issuance → `/store/issuance` *(new)*
  - Material Custody → `/custody`
  - Unallocated Materials → `/store/unallocated`
  - Serial Register → `/store/serials` *(new)*
  - Returns / Transfers → `/store/receipts`
- Added **QUALITY HANDOFF** section (store_user, admin, operations_manager only):
  - Pending Material QC → `/store/qc-handoff`
  - QC Accepted Items → `/store/qc-handoff?status=accepted`
  - QC Rejected / NCR → `/store/qc-handoff?status=rejected`
- Modified EXECUTION section: removed `store_user` from the generic `'store'` and `'custody'` items (store_user now uses their dedicated STORE OPERATIONS links)

### 2. Role Matrix

**`src/lib/roleMatrix.ts`**
- Updated `store_user.rules` from 4 → 6 rules:
  - Added: vehicle receiving photo gate (5 required photos)
  - Added: QC acceptance gate before issuance
  - Added: issuance must be logged against a project
  - Added: unallocated materials must be resolved

### 3. Store Dashboard (Control Center)

**`src/pages/Store.tsx`** — Full rewrite
- **KPI Cards (8):** Materials Received, Pending QC, In Store, Issued/In Custody, Missing Serials, Vehicles Missing Photos, Unallocated, Custody Pending Acceptance
- **Work Queue cards:** Each KPI becomes an actionable queue item with critical/warning/clear badge variants and direct navigation links
- **Module Tiles (6):** Quick-access tiles for: Material Receiving, Vehicle Receiving, Material Issuance, Serial Register, Unallocated Materials, QC Handoff
- **Store Rules Card:** Displays `ROLE_MATRIX.store_user.rules`
- **Top action bar:** 5 primary action buttons (Receive Material, Receive Vehicle, Issue Material, Register Serial, Return Material)
- **Supabase mode:** Parallel queries to `store_receipts`, `store_receipt_items`, `material_custody_records`; separate query for vehicle photo counts
- **Mock fallback:** All KPIs derived from mock data via `mockOrEmpty()`

### 4. Inventory

**`src/pages/StoreInventory.tsx`** — Major improvements
- Switched from pure mock/useMemo to `useEffect` with async IIFE Supabase query
- **Live query:** `store_receipt_items` joined with `store_receipts(receipt_number, project:projects(project_code))`
- **4 KPI cards:** In Store, Issued/In Custody, Pending QC, QC Rejected
- **"Next Action" column:** Contextual next step per item status (Awaiting QC / Ready to Issue / Review NCR etc.)
- **"Serialized only" filter:** replaces "Medical only" with clearer label
- Improved empty state: "No materials received yet. Receive Material to start tracking inventory."
- Cyan accent throughout (consistent with store module color)

### 5. Material Issuance (New Page)

**`src/pages/StoreIssuance.tsx`** — Created
- Route: `/store/issuance` (RequireRole: store_user, operations_manager)
- Shows `material_custody_records` with tabs: All / Issued / In Custody / Returned
- Links each record to `/custody/:id` detail page
- "Issue Material" button → `/custody/new`
- Supabase query joins `projects(project_code, customer_name)` and `store_receipt_items(item_name, item_code)`
- Falls back to `MOCK_CUSTODY_RECORDS` in non-Supabase mode

### 6. Serial Register (New Page)

**`src/pages/StoreSerials.tsx`** — Created
- Route: `/store/serials` (RequireRole: store_user, operations_manager)
- Shows `medical_serial_numbers` joined with `store_receipt_items(item_name, store_receipt_id)` and `projects(project_code)`
- Filters: QC status, current status, search (serial #, item, batch, manufacturer)
- KPI strip: Total Serials, Awaiting QC, QC Failed, QC Passed
- Expiry date shown in red if expired
- Alert banner when serials await QC
- Rule reminder: links to Material Receiving for serial registration

### 7. QC Handoff (New Page)

**`src/pages/StoreQCHandoff.tsx`** — Created
- Route: `/store/qc-handoff` (RequireRole: store_user, operations_manager)
- Tab-driven: Pending Material QC / QC Accepted / QC Rejected
- URL param `?status=accepted|rejected` controls initial tab (used by sidebar links)
- Reads `material_qc_inspections` joined with `store_receipt_items(item_name, item_code)` and `projects(project_code)`
- **Read-only** from store_user perspective — no QC actions available
- Info banner: "QC actions happen in the QC module"
- Static mock data for non-Supabase mode (3 representative inspection records)

### 8. Dynamic Project Dropdowns (Bug Fix)

**`src/pages/StoreReceiptNew.tsx`**
- Replaced hardcoded `proj-005 / proj-006` options with live Supabase query on mount
- Query: `projects` table filtered to `project_status IN ('active', 'approved')`, ordered by `created_at DESC`, limit 200
- Falls back to empty dropdown in non-Supabase mode (unallocated is still selectable)

**`src/pages/StoreVehicleReceivingNew.tsx`**
- Same dynamic project dropdown fix applied

### 9. Unallocated Materials

**`src/pages/StoreUnallocated.tsx`** — Rewrite
- Replaced synchronous mock-only approach with async IIFE Supabase query
- Live query: `store_receipts` with `project_id IS NULL` joined with `store_receipt_items`
- Dynamic project list for "Assign" dropdown (same query as above)
- Assign action updates `store_receipts.project_id` (the update type that Supabase schema exposes)
- Dev mode: shows friendly message with project code instead of silent no-op
- PageHeader breadcrumb: Store → Unallocated Materials

### 10. Store Reports

**`src/pages/ReportsStore.tsx`** — Extended
- Added "Missing Photos" tab (Tab 3, between Vehicle Receipts and Custody Pending)
- Shows vehicles with incomplete 5-photo requirement (front, rear, left_side, right_side, chassis_plate)
- Each row shows which specific photos are missing and links to the vehicle receiving detail for upload
- Uses `MOCK_VEHICLE_PHOTOS` in mock mode; `PhotoType[]` correctly typed

### 11. App.tsx Routes

**`src/app/App.tsx`**
- Added 3 lazy-loaded imports: `StoreIssuance`, `StoreSerials`, `StoreQCHandoff`
- Added 3 routes:
  - `store/issuance` — RequireRole: store_user, operations_manager
  - `store/serials` — RequireRole: store_user, operations_manager
  - `store/qc-handoff` — RequireRole: store_user, operations_manager

---

## Schema Gaps

| Gap | Impact | Workaround |
|-----|--------|-----------|
| `store_receipt_items.Update` does not include `project_id` | Cannot update item-level project assignment via typed Supabase client | StoreUnallocated assigns at `store_receipts` level instead — all items in the receipt inherit the project |
| `vehicle_receipt_photos` not available via Supabase join from `vehicle_receipts` | Cannot get photo counts in a single join query | Store KPI uses a fallback counting approach; vehicle photo detail is on the individual receipt page |
| `material_qc_inspections` join aliases for `store_receipt_items` and `projects` not in generated types | Supabase client returns a type mismatch | Cast via `unknown` intermediary cast |
| No `expected_return_date` field on `material_custody_records` | No predicted return date available in issuance view | Shows `returned_at` (actual return date) instead |

---

## Validation

- `npm run build` — passes (0 errors, 0 warnings beyond chunk size)
- `npx tsc --noEmit` — passes (0 errors)
- `npm run lint` — no errors in changed/new files; existing `any` warnings in Supabase join casts are acceptable

---

## Deferred

| Item | Reason |
|------|--------|
| Store Inventory serial number drill-down | Schema: `medical_serial_numbers` linked by `store_receipt_item_id`, not by inventory item directly |
| Bulk assign unallocated items across receipts | Multiple receipt updates required; not in scope for this step |
| Photo upload flow for missing vehicle photos | S3 upload is a separate migration concern; links to existing vehicle detail page |
| Returns / Transfers as separate page | Currently links to `/store/receipts`; dedicated page deferred |
| QC Handoff: store_user-initiated QC submission | QC initiation belongs to QC module; store sees read-only status only |
