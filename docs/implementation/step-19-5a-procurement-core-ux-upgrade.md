# Step 19.5A — Procurement Core UX Premium Upgrade

**Branch:** `feature/step-19-5a-procurement-core-ux-upgrade`
**Status:** Complete
**Latest main SHA at branch point:** `435c5ea`
**Depends on:** Step 19.1 (Design System Foundation, merged PR #126), Step 19.4A (merged PR #130)

---

## Summary

Applies the Step 19.1 design token system to the 6 core Procurement pages:
- `Procurement.tsx` — dashboard/landing
- `ProcurementRequests.tsx` — PR list
- `ProcurementRequestNew.tsx` — new PR form
- `ProcurementPurchaseOrders.tsx` — PO list
- `ProcurementPurchaseOrderNew.tsx` — new PO form
- `ProcurementPODetail.tsx` — PO detail with tabs

No business logic, Supabase queries, mutation payloads, validation rules, approval flows, routes, roles, DB schema, or RLS were changed.

---

## Target Files Changed

| File | Changes |
|------|---------|
| `src/pages/Procurement.tsx` | `rounded-xl` → `rounded-lg border-gray-200/80` on governance banner, KPI cards, work queue cards, module nav cards; `tabular-nums` on KPI values and work queue counts; `border-gray-300` → `border-gray-200` on ghost action buttons; module badge `rounded-full` → `rounded-md` |
| `src/pages/ProcurementRequests.tsx` | Replaced `PageLoader` with Skeleton table (6 cols × 5 rows); removed `PageLoader` import, added `Skeleton`; table headers `font-medium text-gray-500 uppercase tracking-[0.04em]`; search input `border-gray-300` → `border-gray-200` |
| `src/pages/ProcurementRequestNew.tsx` | All inputs/selects/textareas: `border-gray-300` → `border-gray-200 bg-white` (replace_all, 5 occurrences) |
| `src/pages/ProcurementPurchaseOrders.tsx` | Replaced `PageLoader` with Skeleton table (8 cols × 5 rows); removed `PageLoader` import, added `Skeleton`; table headers `font-medium text-gray-500 uppercase tracking-[0.04em]`; Value cell `tabular-nums`; search input `border-gray-300` → `border-gray-200` |
| `src/pages/ProcurementPurchaseOrderNew.tsx` | All inputs/selects/textareas: `border-gray-300` → `border-gray-200 bg-white` (replace_all, 8 occurrences); conditional purchase value: `'border-gray-300'` → `'border-gray-200'`, `bg-white` added to static class |
| `src/pages/ProcurementPODetail.tsx` | Removed `Loader2` import; added `Skeleton` import; replaced `Loader2` spinner loading block with structured Skeleton layout (header + tabs strip + 2-card overview grid); table headers on Items and ETA History tables: `font-medium text-gray-500 uppercase tracking-[0.04em]`; Items table `tabular-nums` on unit price, line total, and footer total; Overview `purchase_value` `tabular-nums`; items footer border `border-gray-300` → `border-gray-200`; all form inputs/selects/textareas (ETA form, status select, rejection textarea): `border-gray-300` → `border-gray-200 bg-white`; Timeline empty card: copy improved |

---

## UX Improvements by Page

### Procurement Dashboard (`Procurement.tsx`)
- All cards now use `rounded-lg` (6px) instead of `rounded-xl` (12px) — consistent with the design system
- `border-gray-200/80` on all card wrappers gives a lighter, more premium surface separation
- KPI values and work queue counts use `tabular-nums` for stable number rendering
- Ghost action buttons use `border-gray-200` instead of `border-gray-300`
- Module count badge uses `rounded-md` instead of `rounded-full` (enterprise look)

### Purchase Requests List (`ProcurementRequests.tsx`)
- Loading state replaced: `PageLoader` (centered spinner) → Skeleton table matching real column layout — users see the table structure immediately while data loads
- Table headers have uppercase letter-spaced labels with muted gray (premium data table look)
- Search input border lightened to `border-gray-200`

### New Purchase Request (`ProcurementRequestNew.tsx`)
- All form inputs, selects, and textareas use `border-gray-200 bg-white` — cleaner against the off-white page background
- No structural changes; form hierarchy preserved

### PO to Supplier List (`ProcurementPurchaseOrders.tsx`)
- Loading state replaced: `PageLoader` → Skeleton table (8 cols including approval, ETA)
- Table headers uppercase with muted gray
- Purchase value column uses `tabular-nums` for stable numeric alignment
- Search input border lightened

### New Purchase Order (`ProcurementPurchaseOrderNew.tsx`)
- All form inputs, selects, and textareas: `border-gray-200 bg-white`
- Conditional purchase value border: `amber-400` when approval required, `gray-200` otherwise (same logic, lighter base)

### PO Detail (`ProcurementPODetail.tsx`)
- Loading state: `Loader2` centered spinner → structured Skeleton (page header + tabs + 2-card overview grid) so users see the page shape while data loads
- Items table and ETA History table headers: uppercase + `font-medium text-gray-500 tracking-[0.04em]`
- Financial values (`unit_price`, `line_total`, items total footer, overview purchase value): `tabular-nums`
- All form inputs (ETA date, ETA reason, ETA remarks, status select, rejection reason textarea): `border-gray-200 bg-white`
- Footer separator in Items table: `border-gray-300` → `border-gray-200`
- Timeline empty card: copy updated from "Timeline events will appear here." to "No timeline events recorded for this PO yet."

---

## Business Logic Protected

- PR creation logic (`ProcurementRequestNew.handleSubmit`) — unchanged
- PO creation logic (`ProcurementPurchaseOrderNew.handleSubmit`) — unchanged
- High-value PO approval logic — `HIGH_VALUE_THRESHOLD_SAR = 10000`, `requiresApproval`, `po_status: requiresApproval ? 'pending_approval' : 'draft'` — unchanged
- PO status transitions (`handleStatusSave`, `handleApprove`, `handleReject`) — unchanged
- Supplier selection filter (`in('procurement_status', ['approved', 'approved_with_conditions'])`) — unchanged
- Mutation payloads — all `insert({...})` and `update({...})` calls — unchanged
- Validation rules — all `if (!projectId)` guards and form `required` attributes — unchanged
- All Supabase query filters — `.eq()`, `.in()`, `.not()`, `.order()`, `.limit()` — unchanged
- Document upload behavior (`DocumentPanel`, `upload` prop) — unchanged
- ETA change recording (`recordEtaChange`, `recordProcurementEvent`) — unchanged

## PO Approval Safety Statement

The high-value PO approval flow is fully preserved:
- `HIGH_VALUE_THRESHOLD_SAR` constant (10,000 SAR) — not touched
- `requiresApproval` computed value — not touched
- `po_status: requiresApproval ? 'pending_approval' : 'draft'` insert logic — not touched
- `handleApprove()` and `handleReject()` functions — not touched
- `CAN_APPROVE: UserRole[] = ['admin', 'operations_manager']` — not touched
- Approval tab visibility and approval action rendering — not touched

## DB/RLS/Migration Safety Statement

No DB columns, tables, views, functions, triggers, or RLS policies were added, modified, or removed. No migration files were created. No Supabase client or config files were touched.

---

## Validation Results

- `npm run build` — ✓ zero errors (only pre-existing chunk size warning)
- `npx tsc --noEmit` — ✓ zero errors
- `npx eslint src/pages/Procurement.tsx src/pages/ProcurementRequests.tsx src/pages/ProcurementRequestNew.tsx src/pages/ProcurementPurchaseOrders.tsx src/pages/ProcurementPurchaseOrderNew.tsx src/pages/ProcurementPODetail.tsx` — ✓ zero errors, zero warnings

---

## Known Risks

| Risk | Assessment |
|------|-----------|
| Skeleton column count mismatch | Skeleton tables show 6 cols (PRs) and 8 cols (POs); actual column count varies by `canSeeCost` role. Mismatch is cosmetic only — skeleton is a loading placeholder, not a data row. |
| `bg-white` on `bg-orange-50` conditional input | Purchase value field shows `bg-orange-50` when approval required (class wins via specificity). `bg-white` added to static class but overridden by conditional — orange highlight preserved. |
| Off-white page background | `--background: 0 0% 97.5%` from Step 19.1 means all inputs with `bg-white` now contrast correctly against the page. |

---

## Recommended Next Step

Step 19.5B — Store / Warehouse UX Upgrade (planned, not yet started).
