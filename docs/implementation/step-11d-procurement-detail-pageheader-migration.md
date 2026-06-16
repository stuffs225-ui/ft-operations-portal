# Step 11D — Procurement Detail PageHeader Migration

**Date:** 2026-06-16
**Branch:** `feature/step-11d-procurement-detail-pageheader-migration`
**Status:** COMPLETE — both pages migrated, build passing
**Prerequisite:** Step 11C merged at `eb659bb`

---

## Executive Summary

Two procurement detail pages (`ProcurementRequestDetail.tsx`, `ProcurementPODetail.tsx`) were the last in the procurement module still using the legacy `src/components/ui/PageHeader.tsx`. This step migrates both to the canonical `src/components/common/page-header.tsx`, aligning all 8 procurement pages on the same header component.

Changes per file:
1. Import path updated
2. `action=` (singular) renamed to `actions=` (plural)
3. Breadcrumb `path=` renamed to `href=`
4. `className="mb-6"` added to preserve the spacing that `ui/PageHeader` baked in via its own wrapper

No business logic, queries, handlers, or permissions were changed.

---

## A. Baseline Build Result

```
Branch: feature/step-11d-procurement-detail-pageheader-migration (off main @ eb659bb)
npm ci:           ✅ success
npm run build:    ✅ 7.21 s — 0 errors, 0 warnings
tsc --noEmit:     ✅ 0 errors
npm run lint:     ⚠️  80 problems (64 errors, 16 warnings) — all pre-existing
```

---

## B. Files Inspected

- `src/pages/ProcurementRequestDetail.tsx` — target page
- `src/pages/ProcurementPODetail.tsx` — target page
- `src/components/common/page-header.tsx` — canonical component (props, breadcrumb behaviour)
- `src/components/ui/PageHeader.tsx` — legacy component (spacing, prop names)

Docs found:
- `docs/CLAUDE_PROJECT_RULES.md` ✅
- `docs/implementation/step-10-5i-final-ux-ia-visual-signoff.md` ✅
- `docs/implementation/step-10-5h5-ui-consistency-closure.md` ✅
- `docs/implementation/step-11a-procurement-suppliers-governance-audit.md` ✅
- `docs/implementation/step-11b-procurement-governance-hardening.md` ✅
- `docs/implementation/step-11c-supplier-approval-audit-trail.md` ✅

---

## C. Pages Migrated

### C.1 `ProcurementRequestDetail.tsx`

**Before (legacy `ui/PageHeader`):**
```tsx
import { PageHeader } from '../components/ui/PageHeader';

<PageHeader
  title={pr.pr_number}
  subtitle={`${pr.project?.project_code ?? '—'} — ${pr.project?.customer_name ?? '—'}`}
  icon={<FileText size={18} />}
  breadcrumb={[
    { label: 'Procurement', path: '/procurement' },
    { label: 'Purchase Requests', path: '/procurement/requests' },
    { label: pr.pr_number },
  ]}
  action={prStatusBadge(pr.status)}
/>
```

**After (canonical `common/page-header`):**
```tsx
import { PageHeader } from '@/components/common/page-header';

<PageHeader
  title={pr.pr_number}
  subtitle={`${pr.project?.project_code ?? '—'} — ${pr.project?.customer_name ?? '—'}`}
  icon={<FileText size={18} />}
  breadcrumb={[
    { label: 'Procurement', href: '/procurement' },
    { label: 'Purchase Requests', href: '/procurement/requests' },
    { label: pr.pr_number },
  ]}
  actions={prStatusBadge(pr.status)}
  className="mb-6"
/>
```

### C.2 `ProcurementPODetail.tsx`

**Before (legacy `ui/PageHeader`):**
```tsx
import { PageHeader } from '../components/ui/PageHeader';

<PageHeader
  title={po.po_number}
  subtitle={`${po.project?.project_code ?? '—'} — ${po.supplier_name}`}
  icon={<ShoppingCart size={18} />}
  breadcrumb={[
    { label: 'Procurement', path: '/procurement' },
    { label: 'PO to Supplier', path: '/procurement/purchase-orders' },
    { label: po.po_number },
  ]}
  action={poStatusBadge(po.po_status)}
/>
```

**After (canonical `common/page-header`):**
```tsx
import { PageHeader } from '@/components/common/page-header';

<PageHeader
  title={po.po_number}
  subtitle={`${po.project?.project_code ?? '—'} — ${po.supplier_name}`}
  icon={<ShoppingCart size={18} />}
  breadcrumb={[
    { label: 'Procurement', href: '/procurement' },
    { label: 'PO to Supplier', href: '/procurement/purchase-orders' },
    { label: po.po_number },
  ]}
  actions={poStatusBadge(po.po_status)}
  className="mb-6"
/>
```

---

## D. Prop Mapping

| Legacy prop | Canonical prop | Notes |
|---|---|---|
| `import '...ui/PageHeader'` | `import '@/components/common/page-header'` | Absolute alias path |
| `title=` | `title=` | Unchanged |
| `subtitle=` | `subtitle=` | Unchanged |
| `icon=` | `icon=` | Unchanged — `icon?` support added in Step 10.5H.5 |
| `action=` | `actions=` | Singular → plural |
| `breadcrumb[].path` | `breadcrumb[].href` | Legacy `path=` prop → canonical `href=` |
| (implicit `mb-6`) | `className="mb-6"` | Legacy component's outer wrapper included `mb-6`; added as `className` prop |

---

## E. Spacing Note

`ui/PageHeader` wraps its entire output in `<div className={cn('mb-6', className)}>`, providing a guaranteed 1.5rem bottom margin. `common/page-header` has no such implicit margin.

Both detail pages have `<div>` as the outer wrapper (no `space-y-*` class), so the margin is required to prevent the header from sitting flush against the tab bar. `className="mb-6"` was passed directly to `common/page-header`, which applies it to the outermost element via the `cn()` utility.

---

## F. Breadcrumb Behaviour

The legacy `ui/PageHeader` rendered breadcrumb items with `path=` as non-clickable `<span>` elements (the path was accepted as a prop but not used for linking). `common/page-header` renders items with `href=` as native `<a>` tags.

This is a strict improvement: breadcrumbs now navigate to their targets (same destinations as documented). All existing `common/page-header` consumers (6 procurement pages already migrated) use the same `href=` pattern. React Router's `<BrowserRouter>` handles same-origin anchor clicks as SPA navigation.

---

## G. Action Button Preservation

Both pages passed a status badge JSX node as the `action=` prop. This is now passed as `actions=`. The `common/page-header` renders `actions` inside `<div className="mt-2 flex shrink-0 items-center gap-2 sm:mt-0 sm:ml-4">`. Visual position and behaviour are unchanged — the badge still appears at the top-right of the header.

No save, approve, reject, or status-update handlers were touched.

---

## H. Behaviour Preservation Statement

The following were verified unchanged:
- All Supabase queries
- All loading/error/notFound states
- All tab definitions and rendering
- All status save handlers
- All approval/reject handlers (PO detail)
- All ETA update handlers (PO detail)
- All audit event calls
- All permission checks (`canUpdateStatus`, `canApprove`, `canSeeCost`)
- All route navigation (`Link to=`, `useNavigate`)

Only the import path and three prop names were changed per file.

---

## I. Safety Review

| Check | Result |
|---|---|
| Business logic changed | No |
| Supabase queries changed | No |
| RLS/migrations changed | No |
| Route paths changed | No |
| Route guards changed | No |
| Permission checks changed | No |
| Handler functions changed | No |
| New dependencies added | No |
| `tsc -b` (build gate) | ✅ 0 errors |

---

## J. Validation Results

```
npm ci:               ✅ success
npm run build:        ✅ 7.29 s — 0 errors, 0 warnings
npx tsc --noEmit:     ✅ 0 errors
npm run lint:         ⚠️  80 problems (64 errors, 16 warnings) — all pre-existing
                          Both changed files have pre-existing setState-in-useEffect
                          warnings only — no issues introduced by this step
Vercel check:         Not available in this environment
```

---

## K. Remaining Legacy PageHeader Consumers

After this migration, **25 pages** still import from `ui/PageHeader`. These are outside the procurement module and are not in scope for this step.

All 8 procurement pages now use `common/page-header`:
- `Procurement.tsx` ✅
- `ProcurementRequests.tsx` ✅
- `ProcurementRequestDetail.tsx` ✅ (this step)
- `ProcurementPurchaseOrders.tsx` ✅
- `ProcurementPODetail.tsx` ✅ (this step)
- `ProcurementSuppliers.tsx` ✅
- `ProcurementSupplierDetail.tsx` ✅
- `ProcurementEtaHistory.tsx` ✅

---

## L. Recommended Step 11E Scope

The procurement module governance and consistency work is now complete. Step 11E should focus on either:

### L.1 Extend PageHeader migration to the next highest-priority module

The 25 remaining legacy consumers span Admin, AFS/Dubai, Factory, Store, QC, and Quotation pages. A natural next batch would be one of these modules treated as a complete group (all pages in the module migrated together), following the same `action=` → `actions=`, `path=` → `href=`, `className="mb-6"` pattern. Suggested candidates: QuotationDetail + QuotationNew (sales-adjacent, low risk), or all Store pages.

**Constraint:** Only migrate pages with `<div className="space-y-6">` outer wrappers, OR add `className="mb-6"` as done here. Never both.

### L.2 (Alternative) Begin Step 12 — next audit-driven feature area

If the PageHeader migration is deprioritized, Step 12 should target the next item from `docs/system-audit/11-prioritized-gap-backlog.md`.

**Step 11E must NOT change:** RLS, migrations, routes, route guards, business logic, or any non-UI behavior.
