# Step 10.5H — UI Consistency Cleanup

**Date:** 2026-06-16
**Branch:** `feature/step-10-5h-ui-consistency-cleanup`
**Scope:** UI consistency audit and targeted EmptyState import path standardisation
**Depends on:** Steps 10.5A–10.5G (all merged into origin/main via PR #84)

---

## Executive Summary

Audited all four target areas (PageHeader, EmptyState, LoadingState, SectionHeader)
and made the one safe code change available within the working mode constraints:
standardised the `EmptyState` import path in 3 low-risk pages from the older
`feedback/empty-state` component to the canonical `ui/EmptyState` component
updated in Step 10.5F with brand styling.

All other areas are thoroughly documented with a clear rationale for deferral.
No business logic, queries, route guards, RLS policies, schemas, or navigation
structure changed.

---

## Part A — Baseline Verification

| Check | Result |
|-------|--------|
| `npm run build` on latest main before changes | ✅ built in 7.16s |
| PR #84 Step 10.5G merged | ✅ Confirmed — commit `7a6db01`, merge `87e36ff` |
| Dashboard uses shared `SectionHeader` (Step 10.5G) | ✅ `import { SectionHeader } from '@/components/common/section-header'` |
| ProjectDetail 9 ad-hoc h2 patterns replaced (Step 10.5G) | ✅ Confirmed |
| ProjectDetail has 6 role-based tabs | ✅ |
| Sidebar active item font-semibold (Step 10.5G) | ✅ |

**Blocking issues found:** None.

---

## Part B — PageHeader Consistency Decision

### Situation

Two PageHeader components exist with **different APIs**:

| Aspect | `common/page-header.tsx` (preferred) | `ui/PageHeader.tsx` (legacy) |
|--------|--------------------------------------|------------------------------|
| Actions prop | `actions=` (plural) | `action=` (singular) |
| Icon prop | ❌ not supported | `icon=` (React.ReactNode) |
| Breadcrumb item | `{ label, href? }` | `{ label, path? }` |
| Title size | `text-2xl font-semibold tracking-tight` | `text-xl font-semibold tracking-tight` |
| Bottom margin | none (controlled by caller) | `mb-6` on wrapper |
| CSS approach | CSS variables (`text-foreground`, `text-muted-foreground`) | hardcoded Tailwind (`text-gray-900`, `text-gray-500`) |
| Total consumers | ~20 | 30 |

### Consumer inventory

**30 pages** import `ui/PageHeader.tsx`. They fall into two groups:

**Group A — uses `icon=` prop (17 pages, migration blocked):**
AdminAccessRequestDetail, CustodyDetail, DubaiAfsProjectDetail, FactoryProjectWorkspace,
FactoryRawMaterialRequestNew, HotProjectDetail, ProcurementPODetail, ProcurementRequestDetail,
ProjectNew, QuotationDetail, QuotationNew, Quotations, Sales, SalesCoordinator,
StoreReceiptDetail, StoreVehicleReceivingDetail, TemplateDetail, TemplateNew

**Group B — no `icon=` prop (13 pages, restricted modules):**
AfterSalesMaintenanceDetail, AfterSalesMaintenanceNew, CustodyNew,
DubaiAfsArrivalReportDetail, DubaiAfsPredeliveryReportDetail,
DubaiAfsProjectDetail*, MaterialNcrDetail, MaterialQcInspectionDetail,
ProjectQcFindingDetail, ProjectQcInspectionDetail, ProjectQcReleaseNoteDetail,
StoreReceiptNew, StoreVehicleReceivingNew

*Note: DubaiAfsProjectDetail appears in both groups — it uses `icon=` as well.

All Group B pages fall in restricted modules (QC, Dubai/AFS, Store).
With 30 consumers and meaningful API differences across both groups,
no safe migration was performed in this step.

### Decision

**Option 1: Document, no migration in this step.**

`common/page-header.tsx` is the preferred future component. A dedicated
migration step should target Group B first (no `icon=`, simpler rename of
`action` → `actions` and `breadcrumb.path` → `breadcrumb.href`), then Group A
after `common/page-header.tsx` gains `icon=` support or consumers drop icon usage.

---

## Part C — EmptyState Consistency

### Situation

Two EmptyState components exist with **identical APIs** but different styling:

| Component | Icon bg | Title size | CSS approach |
|-----------|---------|------------|--------------|
| `ui/EmptyState.tsx` (canonical, Step 10.5F updated) | `bg-brand-50` | `text-sm` | hardcoded brand |
| `feedback/empty-state.tsx` (older neutral) | `bg-muted` + `p-4` | `text-base` | CSS variables |

**37 pages** use `ui/EmptyState.tsx` (canonical).
**5 pages** use `feedback/empty-state.tsx` (older):
- `AuditLog.tsx` ← **migrated in this step**
- `GeneratedDocuments.tsx` ← **migrated in this step**
- `Projects.tsx` ← **migrated in this step**
- `MaterialNcrs.tsx` — QC module, deferred
- `ProcurementSuppliers.tsx` — procurement module, deferred

### Changes made

Switched the import in 3 safe, low-risk list pages from:
```tsx
import { EmptyState } from '@/components/feedback/empty-state';
```
to:
```tsx
import { EmptyState } from '../components/ui/EmptyState';
```

**No other changes** — both components have identical `icon`, `title`,
`description`, `action`, `className` props. The call sites are unchanged.

**Visual effect:** Empty state icon containers in AuditLog, GeneratedDocuments,
and Projects will now show the brand-50 tinted background (`bg-brand-50`) and
brand-400 icon colour introduced in Step 10.5F, instead of the neutral
`bg-muted` background.

---

## Part D — Loading State Consistency

### Situation

`PageLoader` is specifically designed for **Suspense lazy-load fallbacks**
(route chunk fetching). It renders `py-24` with a single brand-400 spinner.

Pages like `Projects.tsx`, `Notifications.tsx`, and others use an inline
loading pattern:
```tsx
<div className="flex items-center justify-center py-16">
  <Loader2 size={24} className="text-brand-500 animate-spin" />
</div>
```

This is semantically different: it's a **data-loading state** (Supabase fetch
in progress), not a route-chunk loading state. The `py-16` vs `py-24` height
difference is intentional — data loading fills less vertical space.

**Decision:** No changes. Inline data-loading spinners are contextually
appropriate. Replacing them with `PageLoader` would be semantically incorrect
and would change visual layout.

---

## Part E — Remaining Section Heading Patterns

### Situation

After Steps 10.5G, all `h2 + span.w-1.h-4` accent-bar section heading
patterns in Dashboard and ProjectDetail were replaced with `SectionHeader`.

A search of remaining pages found:
- **No remaining accent-bar patterns** (`w-1 h-4` or `w-1.5 h-4`) in safe areas
- Admin pages (`AdminApprovals`, `AdminAccessRequestDetail`) have plain `h2`
  elements used as modal/drawer section titles — different semantic context,
  not candidates for `SectionHeader`
- `ControlTower.tsx` has `text-xs font-semibold uppercase tracking-wider`
  headings — a deliberately different style (overview/reporting aesthetic)
- `ProjectDetail` quality tab uses `h3` elements inside Cards for
  sub-sections — correct semantic level, not candidates for `SectionHeader`

**Decision:** No remaining safe replacements. `SectionHeader` coverage is
complete for the touched areas.

---

## Part F — Files Changed

| File | Change |
|------|--------|
| `src/pages/AuditLog.tsx` | Import `EmptyState` from `../components/ui/EmptyState` (was `@/components/feedback/empty-state`) |
| `src/pages/GeneratedDocuments.tsx` | Import `EmptyState` from `../components/ui/EmptyState` (was `@/components/feedback/empty-state`) |
| `src/pages/Projects.tsx` | Import `EmptyState` from `../components/ui/EmptyState` (was `@/components/feedback/empty-state`) |
| `docs/implementation/step-10-5h-ui-consistency-cleanup.md` | This file |

---

## Governance Preservation

- No business logic changed
- No Supabase queries changed
- No route guards changed
- No RLS / schema / migration changes
- No route paths changed or deleted
- No navigation structure changed
- No Dashboard logic changed
- No ProjectDetail logic changed
- No procurement / store / factory / Dubai / QC logic changed
- No quotation / SO / WO / PN behavior changed
- No approval logic changed
- No audit / timeline recording logic changed
- No new dependencies added
- Component APIs unchanged (EmptyState props identical across both components)

---

## Remaining UI Debt (Deferred)

| Item | Blocker | Recommended Step |
|------|---------|-----------------|
| `ui/PageHeader` → `common/page-header` migration (Group B, 13 pages) | All in restricted modules (QC/AFS/Store/Dubai) | Step 10.5I Part A |
| `ui/PageHeader` → `common/page-header` migration (Group A, 17 pages) | Requires `icon=` prop support added to `common/page-header.tsx` first | Step 10.5J |
| `MaterialNcrs.tsx` EmptyState import | QC module (restricted in this session) | Step 10.5I Part B |
| `ProcurementSuppliers.tsx` EmptyState import | Procurement module (restricted in this session) | Step 10.5I Part B |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` after changes | ✅ built in 7.50s, zero errors |
| `npx tsc --noEmit` | ✅ zero errors |
| `npm run lint` — changed files (AuditLog, GeneratedDocuments, Projects) | ⚠️ pre-existing `react-hooks/set-state-in-effect` errors (GeneratedDocuments:20, Projects:72) — not introduced by this step |

---

## Manual Test Checklist

- [ ] `npm run build` passes on latest main before changes
- [ ] `npm run build` passes after changes
- [ ] Dashboard renders; role-aware sections work
- [ ] ProjectDetail renders with 6 tabs; role gating works
- [ ] AuditLog renders; audit entries list or "no entries" empty state displays with brand-50 icon container
- [ ] GeneratedDocuments renders; documents list or empty state displays with brand-50 icon container
- [ ] Projects renders; projects list or empty state displays with brand-50 icon container
- [ ] EmptyState icon in affected pages appears with subtle red tint (brand-50 background)
- [ ] No route paths changed
- [ ] No route guards changed
- [ ] No RLS/schema changed
- [ ] No queries changed
- [ ] No business logic changed
- [ ] No new dependencies added
- [ ] TypeScript passes

---

## Recommended Step 10.5I Scope

| Part | Description |
|------|-------------|
| A | PageHeader Group B migration: migrate 13 `ui/PageHeader` consumers (QC, AFS, Store modules) — these use only `title`, `subtitle`, `breadcrumb`, `action`; migration requires renaming `action` → `actions` and `breadcrumb.{path}` → `breadcrumb.{href}` |
| B | Remaining EmptyState standardisation: `MaterialNcrs.tsx` and `ProcurementSuppliers.tsx` |
| C | Add `icon` prop support to `common/page-header.tsx` so Group A migration can proceed in Step 10.5J |
| D | Evaluate `feedback/empty-state.tsx` for deprecation once all consumers are on `ui/EmptyState` |
| E | LoadingState component adoption: define guidelines for when to use `PageLoader` vs inline `Loader2` vs `LoadingState` skeleton |
