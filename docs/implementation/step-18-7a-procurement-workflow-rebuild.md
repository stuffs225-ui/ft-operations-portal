# Step 18.7A — Procurement Role Workflow Rebuild and UX Redesign

## Objective

Rebuild the `procurement_user` experience into a full Procurement Operating Center. This step adds a dedicated PROCUREMENT sidebar section, redesigns the Procurement hub as an amber-themed operating center with live KPI cards and work queues, adds Register PR / Create PO forms, and introduces a PR Items Without PO queue to surface governance gaps.

No DB schema, migrations, RLS, or business workflow rules were changed.

---

## Scope

**In scope:**
- Sidebar PROCUREMENT section (visible to admin, operations_manager, procurement_user)
- Procurement hub redesign (KPI cards, action bar, work queues, module nav)
- Register PR form (`/procurement/requests/new`)
- Create PO form (`/procurement/purchase-orders/new`) with high-value approval enforcement
- PR Items Without PO queue (`/procurement/pr-items-without-po`)
- New routes in App.tsx (all RequireRole-guarded)
- Updated roleMatrix procurement_user rules
- Register PR / Create PO action buttons on list pages
- Lint fixes for `react-hooks/set-state-in-effect` violations (4 files)

**Out of scope:**
- DB schema / migrations / RLS changes
- Store, Factory, QC, AFS, Sales, Admin, Ops work
- PO Approval Status standalone page (deferred)
- Procurement Reports enhancements (deferred)
- Project Detail Procurement tab (deferred)

---

## Files Changed

### Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Added `Package`, `Clock`, `AlertCircle` to lucide imports and ICON_MAP |
| `src/data/navigation.ts` | Added PROCUREMENT section (6 items); removed procurement_user from EXECUTION Procurement item |
| `src/pages/Procurement.tsx` | Full rewrite — Operating Center with KPI cards, action bar, work queues, module nav, role badge |
| `src/pages/ProcurementRequests.tsx` | Added CAN_CREATE guard, Register PR button, EmptyState CTA; lint fix |
| `src/pages/ProcurementPurchaseOrders.tsx` | Added CAN_CREATE guard, Create PO button, updated subtitle; lint fix |
| `src/app/App.tsx` | Added 3 lazy imports and 3 new routes |
| `src/lib/roleMatrix.ts` | Updated procurement_user rules from 4 to 6 |

### Created

| File | Purpose |
|------|---------|
| `src/pages/ProcurementRequestNew.tsx` | Register PR form — inserts into `procurement_requests` |
| `src/pages/ProcurementPurchaseOrderNew.tsx` | Create PO form — inserts into `purchase_orders_to_supplier` |
| `src/pages/ProcurementPrItemsWithoutPo.tsx` | PR Items Without PO queue — surfaces unlinked items |

---

## Sidebar Navigation (PROCUREMENT section)

New section visible to `['admin', 'operations_manager', 'procurement_user']`:

| Nav Item | Path | Icon |
|----------|------|------|
| Procurement Dashboard | `/procurement` | ShoppingCart |
| Purchase Requests | `/procurement/requests` | FileText |
| PR Items Without PO | `/procurement/pr-items-without-po` | AlertCircle |
| PO to Supplier | `/procurement/purchase-orders` | ShoppingCart |
| ETA Tracking | `/procurement/eta-history` | Clock |
| Approved Suppliers | `/procurement/suppliers` | Users |

The existing EXECUTION section Procurement item now shows only to `['admin', 'operations_manager']` — procurement_user accesses the module via the dedicated PROCUREMENT section.

---

## Procurement Hub (Operating Center)

### KPI Cards (8)

| KPI | Source | Color |
|-----|--------|-------|
| New PRs | procurement_requests WHERE status='pr_received' | Amber |
| Items Without PO | procurement_request_items WHERE status IN (pending, waiting_for_po_to_supplier) | Orange / critical |
| PO Pending Approval | purchase_orders_to_supplier WHERE po_status='pending_approval' | Red / critical |
| Sent to Supplier | po_status='sent_to_supplier' | Sky |
| Delayed ETA | po_status='delayed' | Red / critical |
| In Transit | po_status='in_transit' | Indigo |
| Suppliers for Review | approved_suppliers WHERE procurement_status='pending_review' | Amber |
| Fully Received | po_status='fully_received' | Green |

KPIs are fetched via `Promise.all` for parallel Supabase queries. In dev mode, counts are derived from mock data arrays.

### Top Action Bar

Register PR → `/procurement/requests/new`  
Create PO → `/procurement/purchase-orders/new`  
ETA Tracking → `/procurement/eta-history`  
Suppliers → `/procurement/suppliers`

Visible to: admin, operations_manager, procurement_user (for Register PR / Create PO).

### Work Queues (8)

Each queue shows count, description, and a drill-down action link corresponding to its KPI.

### Module Navigation Grid (6 tiles)

Purchase Requests, PO to Supplier, PR Items Without PO, ETA Tracking, Approved Suppliers, Procurement Reports.

---

## Register PR Form (`ProcurementRequestNew`)

**Route:** `/procurement/requests/new`  
**Guard:** `RequireRole(['procurement_user', 'operations_manager'])`

**Fields:**
- PR Number (auto-generated `PR-YYMM-NNN`, editable)
- Received Date (defaults to today)
- Source Department (select: Factory, Store, AFS / Dubai, Engineering, Management, Manual / Other)
- Linked Project / SO (select from active/approved projects via Supabase)
- Remarks

**Validation:** `project_id` must be non-empty (DB NOT NULL constraint). Shows error and blocks submit if unset.

**Insert:** `procurement_requests` with `status='pr_received'`  
**On success:** Navigates to PR detail page (`/procurement/requests/:id`)  
**Dev mode:** Navigates back without persisting

---

## Create PO Form (`ProcurementPurchaseOrderNew`)

**Route:** `/procurement/purchase-orders/new`  
**Guard:** `RequireRole(['procurement_user', 'operations_manager'])`

**Fields:**
- PO Number (auto-generated `PO-YYMM-NNN`, editable)
- PO Date (defaults to today)
- Supplier (select from approved/approved_with_conditions approved_suppliers, or text input in dev mode)
- Purchase Value + Currency (SAR, USD, EUR, AED, GBP)
- ETA Date (optional, can be updated later)
- Linked PR (select from open procurement_requests, optional)
- Linked Project (select from active/approved projects)
- Remarks

**High-value approval rule:** If `currency === 'SAR'` and `purchase_value > 10,000`:
- Orange warning banner displayed
- Purchase Value input highlighted amber/orange
- Button label changes to "Create PO (Pending Approval)"
- Insert sets: `approval_required=true`, `approval_status='pending'`, `po_status='pending_approval'`

Otherwise: `approval_required=false`, `approval_status='not_required'`, `po_status='draft'`

**Validation:** `project_id` must be non-empty before insert.

**Insert:** `purchase_orders_to_supplier`  
**On success:** Navigates to PO detail page (`/procurement/purchase-orders/:id`)

---

## PR Items Without PO Queue (`ProcurementPrItemsWithoutPo`)

**Route:** `/procurement/pr-items-without-po`  
**Guard:** `RequireRole(['procurement_user', 'operations_manager'])`

Reads `procurement_request_items` where `status IN ('pending', 'waiting_for_po_to_supplier')` joined with PR number and project code.

**Urgency coding:**
- Red: ≥ 14 days waiting (overdue)
- Amber: ≥ 7 days waiting (urgent)
- Green: < 7 days (normal)

**Actions:** "Create PO" link on each row (visible to CAN_CREATE roles) — links to `/procurement/purchase-orders/new`.

---

## High-Value PO Approval Rule

| Condition | po_status | approval_required | approval_status |
|-----------|-----------|-------------------|-----------------|
| currency=SAR AND value > 10,000 | `pending_approval` | `true` | `pending` |
| All other cases | `draft` | `false` | `not_required` |

Threshold constant: `HIGH_VALUE_THRESHOLD_SAR = 10000` in `ProcurementPurchaseOrderNew.tsx`

---

## Role-Specific Rules (procurement_user)

Updated in `src/lib/roleMatrix.ts`:

1. PR items must be linked to a PO before placing a supplier order
2. PO to Supplier > SAR 10,000 requires Admin or Operations Manager approval
3. Do not mark PO as sent/active before required approval is granted
4. Supplier must be on the approved register before issuing a PO
5. ETA changes require a reason — record all updates in ETA Tracking
6. Received materials must be handed off to Store Receiving promptly

---

## Lint Fixes

Four `react-hooks/set-state-in-effect` violations fixed by wrapping useEffect bodies in async IIFE:

| File | Issue | Fix |
|------|-------|-----|
| `Procurement.tsx` | `setKpiData()` called synchronously | Wrapped in `(async () => { ... })()` |
| `ProcurementPrItemsWithoutPo.tsx` | `setItems()` / `setLoading()` called synchronously | Wrapped in `(async () => { ... })()` |
| `ProcurementPurchaseOrders.tsx` | `setOrders()` called synchronously (pre-existing) | Wrapped in `(async () => { ... })()` |
| `ProcurementRequests.tsx` | `setRequests()` called synchronously (pre-existing) | Wrapped in `(async () => { ... })()` |

The `Promise.all().then()` patterns in the live-mode branches were also converted to `await Promise.all()` inside the async IIFE.

---

## Schema Notes

Schema used (verified against Supabase types before insert):

**`procurement_requests`**: `pr_number`, `project_id` (NOT NULL), `received_date`, `source_department`, `status`, `remarks`, `created_by`

**`purchase_orders_to_supplier`**: `po_number`, `supplier_name`, `project_id` (NOT NULL), `procurement_request_id`, `po_date`, `purchase_value`, `currency`, `eta_date`, `po_status`, `approval_required`, `approval_status`, `remarks`, `created_by`

Schema gaps (not implemented — features not supported by current DB):
- `ProcurementRequest` has no `required_date`, `priority`, `wo_number`, or `pn_number` fields

---

## Validation Results

```
npm run build   ✓ 5.69s  (0 errors)
npx tsc --noEmit  ✓ (0 errors)
npx eslint (changed files)  ✓ (0 errors, 0 warnings)
```

Baseline lint problem count (pre-existing, unchanged): 75 problems (59 errors, 16 warnings) across other files.
