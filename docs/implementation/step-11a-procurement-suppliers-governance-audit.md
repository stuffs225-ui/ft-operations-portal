# Step 11A — Procurement & Suppliers Governance Audit

**Date:** 2026-06-16
**Branch:** `docs/step-11a-procurement-suppliers-governance-audit`
**Status:** AUDIT COMPLETE — no code changes
**Prerequisite:** Step 10.5I (Final UX/IA/Visual Sign-off) merged at `5229600`

---

## A. Baseline

Build state at audit start:

```
✅ npm run build  (tsc -b && vite build)  — 7.94 s, 0 errors, 0 warnings
✅ tsc --noEmit   — 0 errors
✅ npm run lint   — 0 errors
```

No code changes were made during this audit. All findings are documentation only.

---

## B. Module Inventory

### B.1 Pages

| Page | Route | Header Component | Supabase Table(s) | Mode |
|---|---|---|---|---|
| `Procurement.tsx` | `/procurement` | `common/page-header` | `procurement_requests`, `purchase_orders_to_supplier`, `approved_suppliers` | mockOrEmpty |
| `ProcurementRequests.tsx` | `/procurement/requests` | `common/page-header` | `procurement_requests` + project join | Supabase |
| `ProcurementRequestDetail.tsx` | `/procurement/requests/:id` | **LEGACY** `ui/PageHeader` | `procurement_requests`, `procurement_request_items`, `purchase_orders_to_supplier` | Supabase |
| `ProcurementPurchaseOrders.tsx` | `/procurement/purchase-orders` | `common/page-header` | `purchase_orders_to_supplier` + project join | Supabase |
| `ProcurementPODetail.tsx` | `/procurement/purchase-orders/:id` | **LEGACY** `ui/PageHeader` | `purchase_orders_to_supplier`, `purchase_order_items`, `eta_change_history` | Supabase |
| `ProcurementSuppliers.tsx` | `/procurement/suppliers` | `common/page-header` | `approved_suppliers` | Supabase |
| `ProcurementSupplierDetail.tsx` | `/procurement/suppliers/:id` | `common/page-header` | `approved_suppliers` | Supabase |
| `ProcurementEtaHistory.tsx` | `/procurement/eta-history` | `common/page-header` | `eta_change_history` | Supabase |

**Legacy `ui/PageHeader` remaining in procurement module: 2 pages** (`ProcurementRequestDetail`, `ProcurementPODetail`).

### B.2 Shared Libraries

| File | Purpose |
|---|---|
| `src/lib/procurementAudit.ts` | `recordProcurementEvent()`, `recordEtaChange()` — write to `audit_log` and `eta_change_history` |
| `src/data/mockProcurement.ts` | Mock data for dev mode: 6 suppliers, 4 PRs, 6 PR items, 4 POs, 4 PO items, 3 ETA history records |

### B.3 Types

| Type | Values |
|---|---|
| `PRStatus` | `draft \| pr_received \| in_progress \| partially_ordered \| fully_ordered \| cancelled \| closed` |
| `PRItemStatus` | `pending \| waiting_for_po_to_supplier \| po_to_supplier_created \| eta_confirmed \| in_transit \| partially_received \| fully_received \| delayed \| cancelled` |
| `POStatus` | `draft \| pending_approval \| approved \| rejected \| sent_to_supplier \| eta_confirmed \| in_transit \| partially_received \| fully_received \| delayed \| cancelled \| closed` |
| `POApprovalStatus` | `not_required \| pending \| approved \| rejected` |
| `SupplierProcurementStatus` | `draft \| pending_review \| approved \| approved_with_conditions \| suspended \| blacklisted \| inactive` |
| `SupplierQCStatus` | `not_assessed \| assessed \| approved \| approved_with_conditions \| rejected` |

### B.4 Route Guards (from `src/app/App.tsx`)

All 8 procurement routes are guarded by `RequireRole`:

```
/procurement                    → ['procurement_user', 'operations_manager']
/procurement/requests           → ['procurement_user', 'operations_manager']
/procurement/requests/:id       → ['procurement_user', 'operations_manager']
/procurement/purchase-orders    → ['procurement_user', 'operations_manager']
/procurement/purchase-orders/:id → ['procurement_user', 'operations_manager']
/procurement/suppliers          → ['procurement_user', 'operations_manager']
/procurement/suppliers/:id      → ['procurement_user', 'operations_manager']
/procurement/eta-history        → ['procurement_user', 'operations_manager']
```

Reports access: `reports/procurement` and `reports/suppliers` also require `['operations_manager', 'procurement_user']`.

---

## C. Governance Gap Review

### C.1 Critical Rules Verified

**R-009 — PO value > 10,000 SAR requires approval (TIER-1 DB)**

_DB enforcement (migration 061):_
- `enforce_po_approval_authority()` BEFORE UPDATE trigger fires on `purchase_orders_to_supplier`
- Blocks any non-admin/ops user from flipping `approval_status` to `'approved'` or `'rejected'`
- Covers all DB access paths, not just PostgREST
- Auto-fills `approved_by`/`approved_at` (or `rejected_by`/`rejected_at`) from `auth.uid()` when null

_RLS enforcement (migration 061):_
- `po_procurement_update` WITH CHECK: `approval_status NOT IN ('approved', 'rejected')` for `procurement_user`
- `po_procurement_delete`: restricted to `po_status IN ('draft', 'pending_approval')` only
- Admin/ops have unrestricted UPDATE via their own policy

_Application enforcement (`ProcurementPODetail.tsx`):_
- `CAN_APPROVE = ['admin', 'operations_manager']` — UI approve/reject buttons gated by role check
- `handleApprove()` sets `po_status='approved'`, `approval_status='approved'` + `approved_by` + `approved_at`, then calls `recordProcurementEvent()`
- `handleReject()` requires non-empty `rejectionReason.trim()`, sets rejected fields, calls `recordProcurementEvent()`
- `canUpdateStatus = ['admin', 'operations_manager', 'procurement_user']` — allows status progression, not approval

_Verdict: COMPLIANT. Dual-layer (DB trigger + RLS) plus UI gating. No bypass path identified._

---

**R-010 — No approval self-service (TIER-1 DB)**

_Covered by the same migration 061 mechanism above._
- `procurement_user` cannot set `approval_status = 'approved'` via any path
- `procurement_user` cannot DELETE POs except in `draft` or `pending_approval` state (not after approval)
- The `WITH CHECK` on `po_procurement_update` is evaluated against the **new** row values — cannot be bypassed by crafting multi-field updates

_Verdict: COMPLIANT._

---

**R-085 — procurement_requests terminal-state immutability (migration 085)**

- `pr_procurement_update` USING clause: `status NOT IN ('closed', 'cancelled')`
- `procurement_user` cannot edit PRs once closed or cancelled
- No DELETE policy exists for `procurement_user` — DELETE is blocked by default (audit trail preservation)

_Verdict: COMPLIANT._

---

### C.2 Audit Trail Coverage

| Event | Trigger | Target Table |
|---|---|---|
| PR status update | `ProcurementRequestDetail.handleStatusSave()` | `audit_log` via `recordProcurementEvent()` |
| PO approval | `ProcurementPODetail.handleApprove()` | `audit_log` via `recordProcurementEvent()` |
| PO rejection | `ProcurementPODetail.handleReject()` | `audit_log` via `recordProcurementEvent()` |
| PO status update | `ProcurementPODetail.handleStatusSave()` | `audit_log` via `recordProcurementEvent()` |
| ETA change | `ProcurementPODetail` ETA tab | `eta_change_history` via `recordEtaChange()` (fires BEFORE Supabase update) |

`recordProcurementEvent()` signature: `(entityType, entityId, projectId, eventType, title, _body, actorId, _actorName, metadata?)` → inserts to `audit_log`.

`recordEtaChange()` signature: `(entityType, entityId, projectId, oldEta, newEta, reason, remarks, changedBy)` → inserts to `eta_change_history`.

Both functions no-op in dev mode (`!isSupabaseConfigured`) with `console.debug` — no test data written.

_Verdict: COMPLIANT. All mutating operations fire audit events before or immediately after persistence._

---

### C.3 Cost Visibility Gating

`COST_VISIBLE_ROLES = ['admin', 'operations_manager', 'procurement_user']` defined in `ProcurementPurchaseOrders.tsx`.

`canSeeCost = ['admin', 'operations_manager', 'procurement_user'].includes(role)` defined independently in `ProcurementPODetail.tsx` and `ProcurementRequestDetail.tsx`.

Purchase value columns and `unit_price` / `line_total` in PO items are only rendered when `canSeeCost` is true.

_Verdict: COMPLIANT. sales_coordinator, factory_user, store_user, qc_user, afs_user, viewer cannot see cost data._

---

### C.4 Supplier Governance

Supplier lifecycle enforced at application layer (no dedicated DB trigger):

- `procurement_status`: `draft → pending_review → approved / approved_with_conditions / suspended / blacklisted / inactive`
- `qc_status`: `not_assessed → assessed → approved / approved_with_conditions / rejected`
- `approved_for_medical_items` and `approved_for_critical_items` boolean flags surfaced on supplier list and detail pages

**Gap identified:** No DB-level enforcement prevents `procurement_user` from setting `procurement_status = 'approved'` directly. The approval workflow for suppliers is application-enforced only (no trigger equivalent to `enforce_po_approval_authority`).

This is a **known deferred item** — supplier approval authority is lower-risk than PO approval because suppliers do not directly result in financial commitments. The UX does not surface an inline "approve" button on the supplier list or detail for `procurement_user` — status change is currently only available in the detail tabs. However, a direct Supabase API call could bypass this.

_Verdict: PARTIAL. Application-layer only. DB-level enforcement not present. Deferred item flagged for Step 11B._

---

### C.5 ETA History Integrity

ETA changes use `recordEtaChange()` which writes a new row to `eta_change_history` **before** the UPDATE to the parent entity. This ensures the history record exists even if the Supabase update call fails (best-effort ordering).

The `eta_change_history` table is append-only from the application's perspective — no delete or update operations on this table exist in the procurement pages.

_Verdict: COMPLIANT for audit trail integrity. Row-level immutability not DB-enforced (not required given append-only usage)._

---

### C.6 Approval Queue UX

`Procurement.tsx` displays a KPI strip including `poApprovalPending` count and a dedicated "PO Approval Queue" section — only visible when `canSeeApprovalQueue = admin || operations_manager`. `procurement_user` cannot see the approval queue section, consistent with the role separation requirement.

An amber dot indicator appears on the "Approval" tab in `ProcurementPODetail.tsx` when `po.approval_status === 'pending'`, providing a clear visual cue to approvers.

---

## D. UX Review

### D.1 PageHeader Consistency

| Page | Header | Gap |
|---|---|---|
| `Procurement.tsx` | `common/page-header` | — |
| `ProcurementRequests.tsx` | `common/page-header` | — |
| `ProcurementRequestDetail.tsx` | **`ui/PageHeader`** (legacy) | Uses `path=` breadcrumb (legacy prop), `action=` singular, `icon=` |
| `ProcurementPurchaseOrders.tsx` | `common/page-header` | — |
| `ProcurementPODetail.tsx` | **`ui/PageHeader`** (legacy) | Uses `path=` breadcrumb (legacy prop), `action=` singular, `icon=` |
| `ProcurementSuppliers.tsx` | `common/page-header` | — |
| `ProcurementSupplierDetail.tsx` | `common/page-header` | — |
| `ProcurementEtaHistory.tsx` | `common/page-header` | — |

6 of 8 procurement pages use the canonical `common/page-header`. 2 detail pages remain on the legacy component. Migration is safe but deferred — not a governance blocker.

### D.2 EmptyState Consistency

All EmptyState usages in the procurement module correctly import from `ui/EmptyState` (canonical). No usages of the dead `feedback/empty-state.tsx` remain.

### D.3 Loading States

All procurement pages use `PageLoader` (`ui/PageLoader.tsx`) from a conditional `{loading ? <PageLoader /> : ...}` pattern. No procurement page uses a custom spinner.

### D.4 Status Badge Coverage

All status types (`PRStatus`, `POStatus`, `POApprovalStatus`, `SupplierProcurementStatus`, `SupplierQCStatus`) have corresponding badge mappings in their respective pages. The `StatusBadge` component (`status/status-badge.tsx`) is used for supplier status values; inline `Badge` with explicit variant is used for PR/PO statuses within detail pages.

---

## E. Recommended Plan for Step 11B

The following items are recommended scope for Step 11B. They are ordered by risk and governance priority.

### E.1 (HIGH) DB-level supplier approval authority guard

**Problem:** `procurement_user` can SET `procurement_status = 'approved'` on an `approved_suppliers` row via direct Supabase API call. No DB trigger equivalent to `enforce_po_approval_authority()` exists for the supplier register.

**Recommended fix:** New migration adding a BEFORE UPDATE trigger on `approved_suppliers` that blocks `procurement_user` from setting `procurement_status` to `'approved'`, `'approved_with_conditions'`, `'suspended'`, or `'blacklisted'`. Only `admin` and `operations_manager` should be able to change approval status. The trigger mirrors the pattern in migration 061.

**Risk if deferred:** Low-to-medium. Direct API access to Supabase is required to exploit. No financial transaction is created directly from supplier status. However, an incorrectly approved supplier could be used for POs without the expected QC vetting.

### E.2 (MEDIUM) Migrate ProcurementRequestDetail and ProcurementPODetail to `common/page-header`

**Problem:** 2 procurement detail pages use legacy `ui/PageHeader` with `action=` singular prop and `path=` breadcrumb prop. `common/page-header` uses `actions=` (plural) and `href=` for breadcrumb items.

**Recommended fix:** Migrate both pages. Rename `action=` to `actions=` and `path=` to `href=` in breadcrumb items. Wrap in `<div className="space-y-6">` to match spacing behaviour (replaces legacy `mb-6`).

**Risk:** Cosmetic only. No functionality change. Safe to batch with any other changes in Step 11B.

### E.3 (LOW) Procurement Request creation UI

**Problem:** No "Create PR" button exists on `ProcurementRequests.tsx`. The `mockOrEmpty` pattern returns empty arrays in Supabase mode until a real implementation is wired. Users can view PRs but cannot create them from the UI.

**Note:** This is an intentional placeholder from Step 10.5 — the module was scoped for read/approve operations first. This is a feature gap, not a governance gap.

### E.4 (LOW) `procurement_request_items` terminal-state immutability

**Problem:** Migration 085 locks PR header rows (`procurement_requests`), but `procurement_request_items` rows have no equivalent terminal-state lock. A `procurement_user` could modify item quantities after the PR is fully ordered.

**Recommended fix:** Add a BEFORE UPDATE trigger on `procurement_request_items` that blocks edits when the parent PR status is `'closed'` or `'cancelled'`.

---

## F. Files Inspected

### F.1 Source pages

- `src/pages/Procurement.tsx`
- `src/pages/ProcurementRequests.tsx`
- `src/pages/ProcurementRequestDetail.tsx`
- `src/pages/ProcurementPurchaseOrders.tsx`
- `src/pages/ProcurementPODetail.tsx`
- `src/pages/ProcurementSuppliers.tsx`
- `src/pages/ProcurementSupplierDetail.tsx`
- `src/pages/ProcurementEtaHistory.tsx`

### F.2 Libraries and data

- `src/lib/procurementAudit.ts`
- `src/data/mockProcurement.ts`
- `src/types/index.ts` (procurement-related type definitions: lines 253–393)

### F.3 Route definitions

- `src/app/App.tsx` (procurement section, lines 192–200)

### F.4 Migrations

- `supabase/migrations/019_procurement_requests.sql`
- `supabase/migrations/020_procurement_request_items.sql`
- `supabase/migrations/061_po_approval_guard.sql`
- `supabase/migrations/085_procurement_and_store_write_rls_hardening.sql`

### F.5 Governance documentation

- `docs/CLAUDE_PROJECT_RULES.md`
- `docs/governance/playbook-to-system-mapping.md`
- `docs/governance/critical-governance-rules-register.md`

---

## G. Validation

```
✅ No code changes made — build state unchanged from baseline
✅ All 8 procurement routes confirmed RequireRole-guarded
✅ R-009 (PO > 10K SAR approval) — COMPLIANT (dual-layer DB enforcement)
✅ R-010 (No self-approval) — COMPLIANT (dual-layer DB enforcement)
✅ R-085 (PR terminal-state immutability) — COMPLIANT (RLS WITH CHECK)
✅ Audit trail — COMPLIANT (all mutations fire audit events)
✅ Cost gating — COMPLIANT (non-procurement roles cannot see financial data)
⚠️  Supplier approval authority — PARTIAL (application-layer only; DB trigger absent)
⚠️  ProcurementRequestDetail, ProcurementPODetail — legacy PageHeader (cosmetic, not governance)
```

---

## H. Decision

**Step 11A is COMPLETE.**

The procurement and supplier module is substantially compliant with all critical governance rules (R-009, R-010, R-085). One deferred governance gap has been identified (supplier approval authority, DB layer absent) and three lower-priority items are documented.

**Step 11B may proceed** with the recommended scope from Section E above. Step 11B must not change: Supabase queries or RLS policies outside the new supplier approval trigger, route guards, the `procurementAudit.ts` signatures, or any non-procurement page.
