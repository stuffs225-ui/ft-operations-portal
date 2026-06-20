# Step 18.7B — Store / Warehouse Work Center Rebuild and UX Redesign

**Branch:** `feature/step-18-7b-store-warehouse-work-center`
**Roles in scope:** `store_user`, `operations_manager`, `admin`
**Constraint:** No schema/migration/RLS changes. All writes go through existing RLS.

---

## Summary

Full rebuild of the `store_user` experience into a coherent Store/Warehouse Work Center. The store module was previously a collection of loosely-connected pages with hardcoded project dropdowns, no serial register, no issuance page, no QC handoff visibility, and a dashboard that showed raw receipt lists. This step delivers a complete control center with KPI monitoring, direct navigation to all sub-workflows, and three new operational pages.

---

## 25-Item Completeness Audit

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Store Sidebar IA (STORE OPERATIONS section) | ✅ Done | 9 nav items, roles: store_user/admin/ops_manager |
| 2 | Store Sidebar IA (QUALITY HANDOFF section) | ✅ Done | 3 items (pending, accepted, rejected) |
| 3 | Store Dashboard — 8 KPI cards | ✅ Done | Parallel Supabase queries; mock fallback |
| 4 | Store Dashboard — Work Queue | ✅ Done | 8 actionable queue items with direct nav links |
| 5 | Store Dashboard — Module Tiles | ✅ Done | 6 quick-access tiles |
| 6 | Store Dashboard — Store Rules Card | ✅ Done | Renders ROLE_MATRIX.store_user.rules |
| 7 | Store Dashboard — Top Action Bar | ✅ Done | 5 primary action buttons |
| 8 | Inventory — Live query + Next Action column | ✅ Done | store_receipt_items joined with store_receipts + projects |
| 9 | Inventory — 4 KPI cards | ✅ Done | In Store / Issued / Pending QC / QC Rejected |
| 10 | Material Receiving — Live query | ✅ Done | store_receipts joined with projects; item_count from mock RECEIPT_ITEMS |
| 11 | Material Receiving — Next Action column + pending QC alert | ✅ Done | Contextual labels, amber banner for pending QC |
| 12 | Vehicle Receiving — Live query + separate photo query | ✅ Done | Two-phase: receipts query + vehicle_receipt_photos grouped client-side |
| 13 | Vehicle Receiving — Photo completeness per vehicle | ✅ Done | photos_complete flag; required 5 photos typed as PhotoType[] |
| 14 | Vehicle Receiving — Missing photos filter + alert banners | ✅ Done | Checkbox filter; red alert (missing) + amber alert (damaged) |
| 15 | Material Issuance (new page) | ✅ Done | /store/issuance — custody-based, 4 tabs, links to /custody/:id |
| 16 | Material Custody — Live query + pending approval alert | ✅ Done | Joined project + item; red banner for pending_approval records |
| 17 | Material Custody — Lifecycle status tabs | ✅ Done | 7 tabs: All/Pending Approval/Issued/Pending Acceptance/In Custody/Returned/Installed |
| 18 | Serial Register (new page) | ✅ Done | /store/serials — read-only, filters, KPI strip, expiry highlighting |
| 19 | Unallocated Materials — Live query + assign | ✅ Done | Assigns at store_receipts.project_id (workaround for schema gap) |
| 20 | QC Handoff (new page) | ✅ Done | /store/qc-handoff — read-only for store_user, 3 tabs, URL param routing |
| 21 | Store Reports — 9 tabs | ✅ Done | Up from 6; added Inventory Snapshot, Custody Overdue, Material Issuance tabs |
| 22 | Store Reports — PhotoType import fix | ✅ Done | Moved import type { PhotoType } to top of file |
| 23 | Dynamic project dropdowns | ✅ Done | StoreReceiptNew + StoreVehicleReceivingNew: live projects query |
| 24 | Project Store View | ⏸ Deferred | ProjectDetail.tsx is multi-role; store-specific view deferred to avoid regression |
| 25 | Role Matrix update | ✅ Done | store_user.rules expanded from 4 → 6 |

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
- Modified EXECUTION section: removed `store_user` from the generic `'store'` and `'custody'` items

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
- **"Next Action" column:** Contextual next step per item status
- **"Serialized only" filter**
- Cyan accent throughout (consistent with store module color)

### 5. Material Receiving

**`src/pages/StoreReceipts.tsx`** — Major rewrite (finalization)
- Live Supabase query: `store_receipts` joined with `project:projects(project_code, so_number, customer_name)`
- `interface LiveReceipt extends StoreReceipt { item_count: number }` — item_count from mock; 0 in live (join type not in schema)
- `nextAction(status)` returns `{ label: string; warn?: boolean }` for color-coded Next Action column
- Pending QC alert banner (amber)
- Breadcrumb: Store > Material Receiving
- Tab accent: cyan (was sky)
- DataSourceBadge variant="auto" (was "preview")

### 6. Vehicle Receiving

**`src/pages/StoreVehicleReceiving.tsx`** — Major rewrite (finalization)
- Two-phase async query: vehicle_receipts + separate vehicle_receipt_photos query grouped client-side by vehicle_receipt_id
- `interface LiveVehicle extends VehicleReceipt { photo_count: number; photos_complete: boolean }`
- `REQUIRED_PHOTOS: PhotoType[]` typed correctly
- `nextAction(status, photosComplete)` contextual labels
- "Missing photos only" checkbox filter
- Missing photos alert (red) + damaged vehicles alert (amber)
- Required photos legend at bottom of page
- Breadcrumb: Store > Vehicle Receiving

### 7. Material Issuance (New Page)

**`src/pages/StoreIssuance.tsx`** — Created
- Route: `/store/issuance` (RequireRole: store_user, operations_manager)
- Shows `material_custody_records` with tabs: All / Issued / In Custody / Returned
- Links each record to `/custody/:id` detail page
- "Issue Material" button → `/custody/new`
- Supabase query joins `projects(project_code, customer_name)` and `store_receipt_items(item_name, item_code)`
- Falls back to `MOCK_CUSTODY_RECORDS` in non-Supabase mode

### 8. Material Custody

**`src/pages/MaterialCustody.tsx`** — Major rewrite (finalization)
- Live Supabase query: `material_custody_records` joined with project and item
- `data as unknown as MaterialCustodyRecord[]` cast (join aliases not in generated types)
- Pending approval alert banner (red) when any record has `approval_status === 'pending_approval'`
- 7 lifecycle status tabs: All / Pending Approval / Issued / Pending Acceptance / In Custody / Returned / Installed
- Lifecycle KPI strip: 4 cards (Pending Approval, Pending Acceptance, In Custody, Returned)
- Breadcrumb: Store > Material Custody
- Tab accent: cyan
- DataSourceBadge variant="auto"

### 9. Serial Register (New Page)

**`src/pages/StoreSerials.tsx`** — Created
- Route: `/store/serials` (RequireRole: store_user, operations_manager)
- Shows `medical_serial_numbers` joined with `store_receipt_items(item_name, store_receipt_id)` and `projects(project_code)`
- Filters: QC status, current status, search (serial #, item, batch, manufacturer)
- KPI strip: Total Serials, Awaiting QC, QC Failed, QC Passed
- Expiry date shown in red if expired
- Alert banner when serials await QC
- Read-only for store_user; links to Material Receiving for registration

### 10. QC Handoff (New Page)

**`src/pages/StoreQCHandoff.tsx`** — Created
- Route: `/store/qc-handoff` (RequireRole: store_user, operations_manager)
- Tab-driven: Pending Material QC / QC Accepted / QC Rejected
- URL param `?status=accepted|rejected` controls initial tab (used by sidebar links)
- Reads `material_qc_inspections` joined with `store_receipt_items(item_name, item_code)` and `projects(project_code)`
- **Read-only** from store_user perspective — no QC actions available
- Info banner: "QC actions happen in the QC module"
- Static mock data for non-Supabase mode

### 11. Store Reports

**`src/pages/ReportsStore.tsx`** — Extended (finalization)
- Fixed misplaced `import type { PhotoType }` (moved to top of file)
- Expanded from 6 tabs to **9 tabs**:
  1. **Inventory Snapshot** (new) — KPI cards by status + first 20 items table, link to `/store/inventory`
  2. **Material Receipts** — existing, with drill-down links to receipt details
  3. **Vehicle Receipts** — existing, with drill-down links
  4. **Missing Photos** — existing, unchanged
  5. **Custody Pending Acceptance** — renamed; shows both pending approval + pending acceptance alerts
  6. **Custody Overdue** — new, shows issued but not accepted records
  7. **Material Issuance** — new, shows issued/in_custody/pending_acceptance records
  8. **Unallocated Materials** — existing, with link to `/store/unallocated`
  9. **Medical Serials** — existing, with link to `/store/serials`
- Active tab indicator changed from `border-brand-600` to `border-cyan-600`

### 12. Dynamic Project Dropdowns (Bug Fix)

**`src/pages/StoreReceiptNew.tsx`**
- Replaced hardcoded `proj-005 / proj-006` options with live Supabase query on mount
- Query: `projects` filtered to `project_status IN ('active', 'approved')`, ordered `created_at DESC`, limit 200
- Falls back to empty dropdown in non-Supabase mode

**`src/pages/StoreVehicleReceivingNew.tsx`**
- Same dynamic project dropdown fix applied

### 13. Unallocated Materials

**`src/pages/StoreUnallocated.tsx`** — Rewrite
- Replaced synchronous mock-only approach with async IIFE Supabase query
- Live query: `store_receipts` with `project_id IS NULL` joined with `store_receipt_items`
- Dynamic project list for "Assign" dropdown
- Assign action updates `store_receipts.project_id` (workaround — see schema gaps)

### 14. App.tsx Routes

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
| `store_receipt_items.Update` does not include `project_id` | Cannot update item-level project assignment via typed Supabase client | StoreUnallocated assigns at `store_receipts` level — all items in the receipt inherit the project |
| `vehicle_receipt_photos` not available via Supabase join from `vehicle_receipts` | Cannot get photo counts in a single join query | Two separate queries; photos grouped client-side by `vehicle_receipt_id` |
| `material_qc_inspections` join aliases for `store_receipt_items` and `projects` not in generated types | Supabase client returns a type mismatch | Cast via `unknown` intermediary |
| `medical_serial_numbers` join aliases not in generated types | Same type mismatch | Cast via `unknown` intermediary |
| No `expected_return_date` field on `material_custody_records` | No predicted return date available | Shows `returned_at` (actual return date) instead |
| `store_receipt_items` item_count not available from `store_receipts` join in generated types | Cannot show item count in live mode | item_count = 0 in live mode; correct count shown in mock mode |

---

## Deferred

| Item | Reason |
|------|--------|
| Project Store View (store_user tab in ProjectDetail) | ProjectDetail.tsx is multi-role; store-specific view risks regression in other roles |
| Store Inventory serial number drill-down | `medical_serial_numbers` linked by `store_receipt_item_id`, not by inventory item directly |
| Bulk assign unallocated items across receipts | Multiple receipt updates required; not in scope |
| Photo upload flow for missing vehicle photos | S3 upload is a separate migration concern; links to existing vehicle detail page |
| Returns / Transfers as separate page | Currently links to `/store/receipts`; dedicated page deferred |
| QC Handoff: store_user-initiated QC submission | QC initiation belongs to QC module; store sees read-only status only |

---

## Safety Review

- No schema changes, no migration changes, no RLS policy changes
- No route guards weakened (all 3 new routes use RequireRole)
- No fake live data introduced
- No workflows presented as complete that are not supported by schema
- All schema gaps documented and worked around with supported paths
- All writes (project assignment in StoreUnallocated) go through existing RLS

---

## Validation

- `npm run build` — ✅ passes (0 errors, 0 TypeScript errors)
- `npx tsc --noEmit` — ✅ passes (0 errors)
- `npm run lint` — ✅ 0 errors in all changed/new files; pre-existing errors in other files unchanged
