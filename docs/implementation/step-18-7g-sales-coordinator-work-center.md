# Step 18.7G — Sales Coordinator Work Center: Quotation Coordination Hub

## Overview

Rebuilt the `sales_coordinator` experience into a focused Quotation Coordination Work Center. The coordinator processes quotation requests, coordinates with estimation, records quotation outputs, manages clarification cycles, and returns completed quotations to Sales. The role no longer presents general sales, project, receivables, or operations navigation.

**Branch:** `feature/step-18-7g-sales-coordinator-work-center`
**Visual accent:** Teal (`bg-teal-600`, `text-teal-700`, `border-teal-600`, `bg-teal-50/100`)

---

## Files Changed

### `src/data/navigation.ts`

- Removed `sales_coordinator` from `dashboard` (general Dashboard hidden)
- Removed `sales_coordinator` from `hot-projects`
- Removed `sales_coordinator` from shared `quotations` item in SALES & COMMERCIAL
- Removed `sales_coordinator` from `receivables`
- Removed `sales_coordinator` from `reports` hub
- Removed `sales_coordinator` from `templates`
- Added `coordinator-landing` item in MY WORK section (`/sales-coordinator`, icon: ClipboardList)
- Added SALES COORDINATION section with:
  - `coord-quotations` → `/quotations` (Quotation Requests)
  - `coord-queue` → `/coordinator-queue` (Coordinator Queue)
  - `coord-reports` → `/reports/sales` (Coordination Reports)

### `src/lib/roleMatrix.ts`

Replaced generic rules with 8 governance rules specific to quotation coordination workflow:
1. Process all incoming quotation requests within 24 hours — new requests trigger the SLA clock
2. Assign or acknowledge each new request before beginning processing
3. Record sent-to-estimation date when forwarding to the estimation team
4. Request clarification from Sales when scope or customer details are incomplete
5. Upload or record the quotation output (number and value) before returning to Sales
6. Return completed quotations to Sales with the quotation number and coordinator remarks
7. Do not close or cancel a quotation without recording the reason in coordinator remarks
8. Do not bypass the Sales or SO approval workflow — quotation conversion is a Sales action

### `src/pages/SalesCoordinator.tsx` (full rewrite)

Coordinator Dashboard at `/sales-coordinator`. Teal accent throughout.

**KPI tiles (8):** New/Unprocessed, Unassigned, Assigned to Me, Waiting Estimation, Need Clarification, Ready to Return, Total Active, Overdue

**Work queue (2-column layout, 6 sections):**
- Left: New Requests (submitted_by_sales), Unassigned, Need Clarification
- Right: Waiting Estimation, Ready to Return, Assigned to Me

**Bottom:** Quick Access card (4 links with filters) + Coordinator Governance Rules card

`coordinatorNextAction()` maps each status to a coordinator-perspective action string.

### `src/pages/CoordinatorQueue.tsx` (new file)

Full coordinator queue page at `/coordinator-queue`.

**9 workflow tabs:**
`new | unassigned | mine | estimation | clarification | ready | returned | completed | all`

**7 quick filter pills:**
`all | unassigned | overdue | high_priority | clarification | ready | missing_quotation`

**Table columns:**
- Request (code + SLA badge + overdue days + assigned-to-me badge)
- Customer (+ scope summary)
- Sales Owner
- Status badge
- Priority badge
- Days (red if > 7)
- Quotation # (if set)
- Sent to Estimation date
- Next Action (coordinator perspective)
- View button

**Features:**
- URL param support: `?filter=unassigned|clarification|ready|overdue` (from dashboard quick links)
- Row tinting: overdue = `bg-red-50/30`, actionable = `bg-teal-50/20`
- Tab counts with special logic for `unassigned` (no `assigned_coordinator_id`) and `mine` (assigned to current user)
- Per-tab empty states with appropriate messages
- Schema gap notice at bottom of page

### `src/app/App.tsx`

- Added lazy import: `CoordinatorQueue`
- Added route: `/coordinator-queue` behind `RequireRole(['sales_coordinator', 'operations_manager'])`

### `src/pages/Quotations.tsx`

Coordinator-specific improvements to the shared quotation requests page:

- `isCoordinator` flag derived from role
- Default tab: `'submitted'` for coordinator (vs `'action_required'` for sales_user)
- `coordinatorNextAction()` function — coordinator-perspective action text
- Tab active color: teal for coordinator, emerald for sales_user
- Input ring focus: teal for coordinator
- Alert banner: coordinator-specific teal banner showing unprocessed / clarification / ready-to-return counts
- Table header: adds **Sales Owner** column for coordinator (shows `requested_by_profile.full_name`)
- Table rows: row tinting uses teal for coordinator actionable rows; uses coordinator next action text
- Next Action cell: teal font-medium for coordinator actionable items

---

## Routes

| Path | Component | Roles |
|---|---|---|
| `/sales-coordinator` | SalesCoordinator | sales_coordinator, operations_manager |
| `/coordinator-queue` | CoordinatorQueue | sales_coordinator, operations_manager |
| `/quotations` | Quotations | all relevant roles (coordinator UX variant) |
| `/reports/sales` | ReportsSales | operations_manager, viewer, sales_user, sales_coordinator |

---

## Schema Gaps (Documented)

The following coordinator workflow actions are not fully supported by the current schema and are deferred to the individual QuotationDetail page (which has write operations):

1. **No persistent `next_action` field** — next action is derived from `quotation_status` at render time; coordinator cannot override it for a request without changing status
2. **No separate clarification thread table** — clarification communication is recorded as free-text in `coordinator_remarks`; no structured thread history
3. **No Supabase Storage wired for PDF uploads** — `quotation_pdf_url` field exists but PDF upload in the UI is not implemented; coordinator records quotation number + value as text instead
4. **`estimation_contact` is a string, not a FK** — no formal link to a contacts/users table; estimation team contact is free text

---

## What Was NOT Changed

- DB schema, migrations, RLS policies — unchanged
- Quotation conversion logic — unchanged (Sales User action only)
- SO approval/routing logic — unchanged
- Sales User workflow (PR #115) — tab colors, default tabs, next action text unchanged
- Procurement/Store/Factory/QC/AFS workflows — unchanged
- `QuotationDetail.tsx` write operations (assign, status transitions) — unchanged

---

## SLA Constants (from `src/lib/quotationSla.ts`)

- `COORDINATOR_PICKUP_SLA_HOURS = 48` — time for coordinator to acknowledge after Sales submits
- `ESTIMATION_RESPONSE_SLA_HOURS = 120` — time for estimation to respond after coordinator sends
- `CLARIFICATION_RESPONSE_SLA_HOURS = 48` — time for Sales to respond to clarification request
