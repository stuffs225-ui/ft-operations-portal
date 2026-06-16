# Step 10.5F — Visual Identity System v2 Foundation

**Date:** 2026-06-16
**Branch:** `feature/step-10-5f-visual-identity-system-v2`
**Scope:** Shared visual identity improvements — CSS tokens, shared component polish, new SectionHeader utility
**Depends on:** Steps 10.5A–10.5E (all merged into origin/main)

---

## Executive Summary

This step establishes the Visual Identity v2 foundation for the FT Operations Portal. Changes are narrow, additive, and display-layer only. No business logic, queries, route guards, RLS policies, schemas, or navigation structure was changed. The improvements automatically benefit all pages that use the shared components.

Key improvements:
1. **CSS design token alignment** — removed blue cast from borders/surfaces, brand-red focus rings
2. **EmptyState polish** — brand-tinted icon container for on-brand empty states
3. **PageLoader brand presence** — spinner now uses brand color instead of neutral gray
4. **PageHeader typography** — `ui/PageHeader.tsx` refined to match modern variant weight/spacing
5. **SectionHeader component** — new shared component standardizing the accent-bar + title pattern

---

## Part A — Step 10.5E Baseline Verification

| Check | Result |
|-------|--------|
| ProjectDetail has 6 tabs (not 12) | ✅ TabKey: overview, commercial, execution, quality, documents, activity |
| Activity tab contains Timeline and Audit | ✅ Lines 2001+ |
| Audit gated by canAudit (admin / operations_manager) | ✅ `const canAudit = role === 'admin' \|\| role === 'operations_manager'` |
| sales_user does not see Execution tab | ✅ TAB_ROLES.execution excludes sales_user and sales_coordinator |
| Operational roles do not see Commercial tab | ✅ TAB_ROLES.commercial excludes procurement_user, factory_user, store_user, qc_user, afs_user |
| No blank state risk (safe tab fallback) | ✅ useEffect resets to 'overview' if active tab becomes hidden |
| No query/mutation/route/RLS changes needed | ✅ Confirmed |
| BarChart2 icon fix in Sidebar (Step 10.5C) | ✅ Line 5 in Sidebar.tsx |
| Dashboard role-aware content (Step 10.5D) | ✅ MY_WORK_CARDS, WORK_SECTIONS, ROLE_SUBTITLES present |

**Blocking issues found in 10.5E baseline:** None.

**Non-blocking notes:**
- `npm run build` (tsc -b) has pre-existing failures on `ProjectDetail.tsx:1059` and `ProjectDetail.tsx:1114` from JSX comment parsing in build mode. These pre-date Step 10.5F (confirmed by stash test). `npx tsc --noEmit` passes with zero errors.
- Step 10.5B and 10.5C documentation files (`step-10-5b-*` and `step-10-5c-*` and `step-10-5d-*`) were not found under `docs/implementation/` on this branch. These steps are confirmed merged via git log.

---

## Part B — Visual Identity v2 Principles Applied

| Principle | Implementation |
|-----------|----------------|
| Enterprise operations portal aesthetic | Neutral surfaces with controlled brand accent |
| NAFFCO brand red as controlled accent | brand-* palette on icons, borders, focus rings |
| Calm neutral surfaces | CSS muted/border tokens warmed to remove blue cast |
| Strong hierarchy | PageHeader refined: `font-semibold tracking-tight` vs raw `font-bold` |
| Fewer visual distractions | EmptyState icon uses brand-50 tint (subtle, not attention-grabbing) |
| Consistent section headers | New `SectionHeader` component standardizes accent-bar pattern |
| Consistent loading states | PageLoader spinner uses brand-400 (warm, not harsh) |
| Status indicators | Badge unchanged (already good semantic color mapping) |
| No heavy animation | No animations added |
| No new fonts | Inter stays (already loaded via Google Fonts) |
| No new dependencies | None added |

---

## Part C — Design Token / CSS Changes

**File:** `src/styles/index.css`

| Token | Before | After | Rationale |
|-------|--------|-------|-----------|
| `--secondary` | `210 40% 96.1%` (blue-gray) | `215 20% 95%` | Warmer, less blue cast |
| `--muted` | `210 40% 96.1%` (blue-gray) | `215 20% 95%` | Warmer muted surface |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `220 9% 46%` | Warmer medium gray |
| `--accent` | `210 40% 96.1%` (blue-gray) | `215 20% 95%` | Consistent with muted |
| `--destructive` | `0 84.2% 60.2%` (generic red) | `357 73% 46%` | Matches brand-600 (#cf1f29) |
| `--border` | `214.3 31.8% 91.4%` (blue-gray) | `220 13% 91%` | Warmer, more neutral |
| `--input` | `214.3 31.8% 91.4%` (blue-gray) | `220 13% 91%` | Consistent with border |
| `--ring` | `222.2 84% 4.9%` (near-black) | `357 73% 46%` | Brand-red focus rings |

**Unchanged (intentionally):**
- `--background`, `--foreground` — no layout risk desired
- `--card`, `--card-foreground` — white cards stay white
- `--primary`, `--primary-foreground` — dark navy kept (shadcn Badge default depends on it)
- `--popover`, `--popover-foreground` — unchanged

**Impact:** Components using CSS variable tokens (`bg-muted`, `text-muted-foreground`, `border`, `ring`, `focus:ring-*`, `text-destructive`) will automatically reflect these improvements. Components using hardcoded `gray-*` classes are unaffected.

---

## Part D — Shared Components Changed

### `src/components/ui/EmptyState.tsx`
| Aspect | Before | After |
|--------|--------|-------|
| Icon container bg | `bg-gray-100` | `bg-brand-50` |
| Icon container text | `text-gray-400` | `text-brand-400` |
| Title color | `text-gray-700` | `text-gray-900` |
| API | unchanged | unchanged |

**Impact:** All ~30+ pages using EmptyState (HotProjects, Quotations, ProcurementRequests, etc.) will show brand-tinted empty state icons and slightly stronger titles automatically.

### `src/components/ui/PageLoader.tsx`
| Aspect | Before | After |
|--------|--------|-------|
| Spinner color | `text-gray-400` (neutral) | `text-brand-400` (brand) |
| API | unchanged | unchanged |

**Impact:** All lazy-loaded routes using PageLoader as Suspense fallback will show brand-colored spinner. App-wide consistency.

### `src/components/ui/PageHeader.tsx` (older API: `action=`)
| Aspect | Before | After |
|--------|--------|-------|
| Title font weight | `font-bold` | `font-semibold` |
| Title tracking | none | `tracking-tight` |
| Breadcrumb separator color | `text-gray-500` | `text-gray-300` (subtler) |
| Breadcrumb last item | `text-gray-800` | `text-gray-700` |
| Icon container size | `w-8 h-8` | `w-9 h-9` |
| Icon text color | `text-brand-700` | `text-brand-600` |
| Subtitle margin | `mt-1` | `mt-0.5` |
| API | unchanged (`action=`) | unchanged (`action=`) |

**Impact:** 7 pages using `../components/ui/PageHeader` (MaterialNcrDetail, CustodyDetail, DubaiAfsProjectDetail, etc.) will show more refined typography automatically.

---

## Part E — New Component Created

### `src/components/common/section-header.tsx`

A standardized section header for use inside tab panels and page sections.

```tsx
<SectionHeader title="Procurement" accent="bg-amber-500" />
<SectionHeader title="Approval & Routing" />  // defaults to bg-brand-500
<SectionHeader title="Timeline" accent="bg-slate-500" action={<Button>...</Button>} />
```

**Props:**
- `title: string` — section title text
- `accent?: string` — Tailwind bg class for accent bar (default: `bg-brand-500`)
- `action?: React.ReactNode` — optional right-side action slot
- `className?: string` — wrapper override

**Replaces:** The ad-hoc `h2` + `<span className="w-1 h-4 bg-* rounded-full inline-block" />` pattern used in ProjectDetail tabs (introduced in Steps 10.5D and 10.5E).

**Note:** This step introduces the component but does NOT migrate existing ad-hoc patterns — that is deferred to Step 10.5G as low-risk incremental cleanup.

---

## Part F — Components Intentionally Not Changed

| Component | Reason not changed |
|-----------|-------------------|
| `src/components/ui/Badge.tsx` | Already has good semantic variants; rounded-full pill shape is standard for status |
| `src/components/ui/Card.tsx` | Already clean (`rounded-xl border border-gray-200 shadow-sm`) |
| `src/components/ui/Button.tsx` | Already uses `brand-600/700` correctly |
| `src/components/common/page-header.tsx` (newer) | Already uses `text-2xl font-semibold tracking-tight`; used by Dashboard and ProjectDetail |
| `src/components/common/section-card.tsx` | Uses `bg-card text-card-foreground` — will benefit from CSS token changes automatically |
| `src/components/common/metric-card.tsx` | Uses `bg-muted`, `text-muted-foreground` — will benefit from CSS token changes |
| `src/components/feedback/empty-state.tsx` | Uses `bg-muted` — will benefit from CSS token changes automatically |
| `src/components/layout/Header.tsx` | No visual debt; part of app shell |
| `src/components/layout/Sidebar.tsx` | No visual debt; clean after Step 10.5C |
| All module pages | Task restriction; only shared components updated |

---

## Part G — Before/After UX Summary

| Area | Before | After |
|------|--------|-------|
| Focus rings | Near-black (hard to distinguish from border) | Brand red (clear, on-brand) |
| Muted surfaces | Blue-gray cast (generic shadcn default) | Warm neutral (more enterprise) |
| Empty states | Gray icon on gray bg; medium-weight title | Brand-tinted icon; stronger title |
| Loading spinner | Neutral gray | Brand red (subtle, consistent) |
| Detail page headers | `font-bold` (heavy); small breadcrumb gap | `font-semibold tracking-tight` (refined) |
| Destructive borders/text | Generic bright red | NAFFCO brand red consistency |
| Section headers (ProjectDetail) | Ad-hoc per-file h2 pattern | Shared `SectionHeader` component available |

---

## Files Changed

| File | Change |
|------|--------|
| `src/styles/index.css` | CSS variable token alignment (--border, --muted, --ring, --destructive) |
| `src/components/ui/EmptyState.tsx` | Brand-tinted icon container; stronger title |
| `src/components/ui/PageLoader.tsx` | Brand-colored spinner |
| `src/components/ui/PageHeader.tsx` | Typography refinement (font-semibold, tracking-tight, spacing) |
| `src/components/common/section-header.tsx` | **New** — standardized section header component |
| `docs/implementation/step-10-5f-visual-identity-system-v2.md` | This file |

---

## Safety Confirmations

| Check | Result |
|-------|--------|
| Business logic changed | ❌ No |
| Database / schema / RLS changed | ❌ No |
| Route guards changed | ❌ No |
| Permissions changed | ❌ No |
| Route paths changed | ❌ No |
| Pages deleted | ❌ No |
| Navigation structure changed | ❌ No |
| Dashboard logic changed | ❌ No |
| ProjectDetail logic changed | ❌ No |
| Procurement/store/factory/Dubai/QC logic changed | ❌ No |
| Quotation/SO/WO/PN behavior changed | ❌ No |
| Approval logic changed | ❌ No |
| Audit/timeline recording logic changed | ❌ No |
| Supabase queries changed | ❌ No |
| New dependencies added | ❌ No |
| Component APIs changed (props) | ❌ No (all changes are internal implementation only) |

---

## Build / Typecheck / Lint Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npm run build` | ⚠️ Pre-existing failures (vite.config.ts env issue, ProjectDetail JSX in tsc -b mode) — confirmed pre-existing by stash test |
| `npm run lint` | ⚠️ Pre-existing failure (`@eslint/js` missing in container) |

The `npm run build` and `npm run lint` failures are environment-level pre-existing issues not introduced by this step.

---

## Manual Test Checklist

1. [ ] Dashboard still renders; MY WORK cards and WORK_SECTIONS visible by role
2. [ ] ProjectDetail still renders; all 6 tabs present
3. [ ] ProjectDetail role-based tabs still work (commercial hidden from factory_user)
4. [ ] sales_user still does not see detailed Execution tab
5. [ ] Audit section in Activity tab only visible to admin/operations_manager
6. [ ] Empty state icon appears with brand-50 tint (subtle red) not gray
7. [ ] Loading spinner appears with brand-400 color (warm red) not gray
8. [ ] PageHeader on detail pages shows `font-semibold tracking-tight` (compare: CustodyDetail, DubaiAfsProjectDetail)
9. [ ] Focus rings on buttons/inputs appear in brand red
10. [ ] Border colors throughout appear slightly warmer (no blue cast)
11. [ ] No route paths changed
12. [ ] No route guards changed
13. [ ] No RLS / schema changed
14. [ ] No queries changed
15. [ ] No business logic changed
16. [ ] Page remains responsive on mobile
17. [ ] `npx tsc --noEmit` passes zero errors

---

## Deferred Visual Debt

| Item | Deferred To |
|------|-------------|
| Migrate ad-hoc `h2` + accent-bar patterns in ProjectDetail to `SectionHeader` component | Step 10.5G |
| Consolidate `ui/PageHeader.tsx` and `common/page-header.tsx` into single component | Step 10.5G |
| Apply `SectionHeader` component in Dashboard section labels | Step 10.5G |
| Improve `Card.tsx` with optional accent variants | Step 10.5H |
| Improve `Badge.tsx` — evaluate rounded-md vs rounded-full for table vs pill contexts | Step 10.5H |
| Apply `charcoal-*` palette tokens to Header/Sidebar backgrounds | Step 10.5G |
| Dark mode CSS variable set | Longer term |

---

## Recommended Step 10.5G Scope

Step 10.5G should apply the visual identity foundation to page-level surfaces:

1. **Migrate ProjectDetail section headers** — replace ad-hoc `h2 + accent-bar` blocks with the new `SectionHeader` component (purely mechanical, zero logic risk)
2. **Migrate Dashboard section labels** — use `SectionHeader` for MY WORK, WORK_SECTIONS headings
3. **PageHeader consolidation** — merge `ui/PageHeader.tsx` (action=) into `common/page-header.tsx` (actions=) with backward-compatible prop alias; update the 7 pages still using the old one
4. **Sidebar visual improvement** — apply `charcoal-*` tones to sidebar header/bg; active state improvement
5. **Header polish** — role badge styling improvement using charcoal tokens
6. **ProjectDetail tab bar** — improve tab active state (underline weight, spacing) for cleaner tab presentation
