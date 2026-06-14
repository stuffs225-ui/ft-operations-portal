# 08 — Step 8A: Portal UX, IA, and Performance Refresh Foundation

**Step:** 8A — Portal UX Refresh Foundation
**Branch:** `feature/step-8a-portal-ux-refresh-foundation`
**Base:** `claude/audit-production-system-review-5v330i`
**Date:** 2026-06-14
**Status:** Complete

---

## Part 0 — Post-Step-7 Sanity Check

| Check | Result |
|-------|--------|
| Migration 088 present (`qr_sales_insert` draft-only policy) | ✅ |
| Step 7 sign-off doc present | ✅ |
| `QuotationNew.tsx` still INSERTs as `draft` (line 221) | ✅ |
| `QuotationDetail.tsx` has `returnErr` error handling | ✅ |
| `npm run build` clean | ✅ |
| `npx tsc --noEmit` zero errors | ✅ |
| No pre-existing lint errors introduced | ✅ (79 pre-existing, 0 new) |

---

## Part A — UX / IA / Performance Audit

### A1. Information Architecture

**Pages:** 98 pages in a flat `src/pages/` directory. No sub-folder organization.

**Navigation:** 30 items across 6 labeled sections in `src/data/navigation.ts`:

| Section | Items | Notes |
|---------|-------|-------|
| SALES | 6 | Dashboard, My Action Inbox, Quotation Requests, Sales Workspace, Hot Projects, Sales Coordinator |
| PROJECTS | 3 | Projects/SO, Admin Approvals, WO/PN Gate |
| OPERATIONS | 5 | Procurement, Factory/Production, Store/Warehouse, Material Custody, Vehicle Receiving |
| QUALITY | 2 | Material QC, Project/Vehicle QC |
| DUBAI/AFS | 2 | Dubai/AFS, After Sales Maintenance |
| MANAGEMENT | 12 | Receivables, Control Tower, Reports, Document Templates, Notifications, Settings, Admin/Users, Access Requests, Notification Rules, Report Subscriptions, Audit Log |

**IA issues found:**

1. **Duplicate Vehicle Receiving route** — `/vehicle-receiving` and `/store/vehicle-receiving` both exist and point to the same component (`VehicleReceiving.tsx`). The sidebar links to `/vehicle-receiving` under OPERATIONS. No consolidation yet (deferred to Phase 2 per `docs/architecture/01-folder-structure-and-boundaries.md §Duplicate Routes`).

2. **MANAGEMENT section is overloaded** — 12 items in a single section creates cognitive overload for non-admin users who see only 2–3 of them. Role filtering (`buildVisibleNav`) handles visibility correctly, but the section label is misleading for operations users who see Receivables + Control Tower + Reports (these are operational, not administrative tools).

3. **Dashboard is misnamed** — The page title is "Operations Control Tower" but the nav item is "Dashboard". The actual Control Tower is a separate page. This creates confusion: "Dashboard" vs "Control Tower" when both claim operational oversight.

4. **Action Inbox placement** — "My Action Inbox" is the second item in the SALES section but is role-sensitive; procurement_user, factory_user, qc_user also need an inbox. Its placement under SALES implies it is sales-only.

### A2. Component Consistency

**Two PageHeader components exist** with different prop APIs:

| Component | Import path | `actions` prop | `breadcrumb.href` | Used by |
|-----------|------------|---------------|-------------------|---------|
| Legacy `PageHeader` | `../components/ui/PageHeader` | `action` (singular) | `path` key | Most pre-Step-5 pages + Dashboard (fixed in 8A) |
| Step-5 `PageHeader` | `@/components/common/page-header` | `actions` (plural) | `href` key | AuditLog, Reports, PlaceholderPage, Dashboard (after 8A) |

This is a known gap from Step 5B (see `docs/design-system/05-step-5b-adoption-results.md`). Full migration is Step 5C scope.

**Empty state patterns:**

Three different empty state implementations exist in the codebase:
1. `src/components/ui/EmptyState.tsx` — legacy, custom, used by pre-Step-5 pages
2. `src/components/feedback/empty-state.tsx` — Step 5 design system, used by AuditLog
3. Inline empty `<div>` blocks — scattered in many pages (e.g., `Dashboard.tsx` formerly had empty KPI sections in live mode)

### A3. App Shell Audit

| Area | Finding | Severity |
|------|---------|---------|
| Sidebar desktop header | No brand visible on desktop — sidebar starts with nav items directly | Medium |
| Header brand on desktop | Brand shown in header even when sidebar is always visible on desktop | Low |
| Header center | Empty `<div className="flex-1" />` placeholder (future global search) | Low |
| Header user chip | `ChevronDown` shown but no dropdown exists — implies action that isn't available | Low |
| Sidebar footer | Footer text `"NAFFCO Fire Trucks — Operations Portal"` is 10px, barely visible | Low |
| Dashboard KPIs | Empty KPI grids (zero cards) rendered in live mode via `mockOrEmpty()` → `[]` | Medium |

### A4. Performance Audit

**Route-level code splitting:** All 98+ routes in `src/app/App.tsx` are already lazy-loaded with `React.lazy()` + `Suspense`. This is correct. No action needed.

```
// Current pattern — already optimal:
const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
```

**Bundle chunks (production build):**

| Chunk | Size (gzip) | Status |
|-------|------------|--------|
| `index.js` (main bundle) | 138.42 KB | ⚠️ Large — includes all shared deps |
| `ProjectDetail` | 12.13 KB | ⚠️ Largest page chunk |
| `mockReports` | 5.77 KB | 🔴 Mock data shipped in production |
| `mockStore` | 4.61 KB | 🔴 Mock data shipped in production |
| `mockQuotations` | 3.66 KB | 🔴 Mock data shipped in production |
| `mockProjects` | 2.74 KB | 🔴 Mock data shipped in production |

**Mock data in production bundle:** 4 mock data files total ~16.78 KB gzipped are shipped in the production bundle even though `mockOrEmpty()` returns `[]` in live mode. Documented in `docs/architecture/04-mock-data-and-live-data-plan.md §Strategy 2` — fix requires moving mock data to `src/test-fixtures/` and Vite bundle exclusion (deferred to Phase 1 cleanup, B-050).

**No Suspense boundary below route level:** The `<PageLoader />` Suspense fallback only catches the initial route lazy load. Individual data-fetching sections within pages have no Suspense boundary. This is acceptable for now — `LoadingState` components handle the within-page loading UX manually.

---

## Part B — Safe Visual Improvements

### B1. Sidebar — Desktop Brand Header

**Before:** On desktop (lg+ breakpoint), the sidebar (`w-60`, `position: relative`) had no brand or header row. The nav items began at `y=0` directly adjacent to the top of the viewport, while the main `Header` component showed the brand logo at `h-14`. This created visual misalignment: the sidebar column had no visual anchor at the top.

**Change:** Added a `hidden lg:flex` brand header row to the Sidebar:
```tsx
{/* Desktop brand header */}
<Link
  to="/"
  className="hidden lg:flex items-center h-14 px-4 border-b border-gray-200 shrink-0 hover:bg-gray-50 transition-colors"
>
  <BrandLogo size={28} withWordmark tagline="Operations Portal" />
</Link>
```

**After:** On desktop, the sidebar shows a 56px brand header (matching the main `Header` height) with the NAFFCO logo and wordmark. This is the standard SaaS layout (sidebar has its own header row visually aligned with the top bar). The brand link navigates to `/` (home / dashboard).

**Risk:** Zero — purely additive HTML in a layout-only component. No routing, auth, or data logic changed.

**Files changed:** `src/components/layout/Sidebar.tsx` (added `Link` import + 7-line brand header block)

---

### B2. Header — Hide Brand on Desktop

**Before:** `Header.tsx` always rendered `<Link to="/"><BrandLogo .../></Link>` on all screen sizes. On desktop, this duplicated the brand (sidebar shows it, header also showed it) creating visual redundancy in a component that should be dedicated to user identity and utility actions (search, notifications, user menu).

**Change:** Added `lg:hidden` to the brand link:
```tsx
<Link to="/" className="mr-4 shrink-0 lg:hidden">
```

**After:** On mobile (< lg), the header continues to show the brand logo (sidebar is hidden, brand in header is the only visual anchor). On desktop (lg+), the brand is shown only in the sidebar header added in B1. The main header shows: `[hamburger: hidden lg:hidden]` + `[spacer]` + `[dev badge]` + `[bell]` + `[user chip]` + `[logout]`.

**Risk:** Zero — pure CSS display change. No logic changed. The brand link still exists on mobile.

**Files changed:** `src/components/layout/Header.tsx` (1 line: added `lg:hidden` to className)

---

### B3. Dashboard — PageHeader Migration + Live-Mode Empty Sections

**Before (PageHeader):** `Dashboard.tsx` imported the legacy `PageHeader` from `../components/ui/PageHeader` with the `action` (singular) prop:
```tsx
import { PageHeader } from '../components/ui/PageHeader';
// ...
<PageHeader ... action={<DataSourceBadge />} />
```

This was inconsistent with the Step 5 design system standard (`@/components/common/page-header` with `actions` plural).

**Change (PageHeader):** Migrated to the Step-5 PageHeader:
```tsx
import { PageHeader } from '@/components/common/page-header';
// ...
<PageHeader ... actions={<DataSourceBadge />} />
```

**Risk:** Zero — same rendered output. The Step-5 PageHeader renders identically for single `actions` element. Breadcrumb `[{ label: 'Dashboard' }]` has no `href`, which both versions support.

---

**Before (empty KPI sections):** In live mode (`isSupabaseConfigured = true`), `mockOrEmpty()` returns `[]` for both `DASHBOARD_KPI_CARDS` and `AFS_KPI_CARDS`. The page still rendered the section headers ("Critical Operational Indicators", "Dubai / AFS & After Sales") with their `<div className="grid ...">` wrappers but zero children — empty grids with visible section labels that implied broken or missing data.

**Change:** Wrapped both KPI sections in conditional rendering:
```tsx
{dashboardCards.length > 0 && (
  <div className="mb-6">
    <h2 ...>Critical Operational Indicators</h2>
    <div className="grid ...">
      {dashboardCards.map(...)}
    </div>
  </div>
)}

{afsCards.length > 0 && (
  <div className="mb-6">
    <h2 ...>Dubai / AFS & After Sales</h2>
    <div className="grid ...">
      {afsCards.map(...)}
    </div>
  </div>
)}
```

**After:** In live mode, the Dashboard shows: info banner → Project Summary strip (all zeros, consistent with no live data yet) → Reports & Control Tower quick-access cards → Governance Golden Rules banner. No empty section headings with invisible grids. In dev-mock mode, all KPI cards render as before.

**Risk:** Zero — conditional on `array.length > 0`. In mock mode, the arrays are non-empty and render unchanged. In live mode, the arrays were already empty; we just stop rendering the empty container.

**Files changed:** `src/pages/Dashboard.tsx` (1 import change, 1 prop rename, 2 conditional wrappers)

---

## Part C — Navigation Consolidation Plan

This section documents the recommended navigation consolidation plan. No implementation was done in Step 8A — this is a planning document for Step 8B or Phase 2.

### C1. Current Structure Problems

| Problem | Impact | Priority |
|---------|--------|---------|
| MANAGEMENT section has 12 items — ~6 are admin-only, ~3 are operational | Cognitive overload for non-admin; misleading section label | Medium |
| "My Action Inbox" lives under SALES but is cross-role | Procurement, factory, QC users look in the wrong place for their inbox | High |
| Duplicate route `/vehicle-receiving` ↔ `/store/vehicle-receiving` | Double entry in `App.tsx`; one must be removed | High |
| Dashboard vs Control Tower naming ambiguity | Users cannot tell which is which from nav | Medium |
| QUALITY section has only 2 items (Material QC, Project/Vehicle QC) | Could merge into OPERATIONS or add QC sub-items | Low |

### C2. Recommended Consolidation

**Proposed section structure (6 → 5 sections):**

```
SALES (6 items — unchanged)
  Dashboard, Quotation Requests, Hot Projects, Sales Workspace,
  Sales Coordinator, My Action Inbox [moved from top]

PROJECTS (3 items — unchanged)
  Projects/SO, Admin Approvals, WO/PN Gate

OPERATIONS (7 items — add QC)
  Procurement, Factory/Production, Store/Warehouse,
  Material Custody, Vehicle Receiving [dedup: keep /store/vehicle-receiving],
  Material QC, Project/Vehicle QC [moved from QUALITY]

DUBAI/AFS (2 items — unchanged)
  Dubai/AFS, After Sales Maintenance

MANAGEMENT (11 items — split admin from operational)
  === Operational ===
  Receivables, Control Tower, Reports, Notifications
  === Admin ===
  Document Templates, Settings, Admin/Users, Access Requests,
  Notification Rules, Report Subscriptions, Audit Log
```

Or alternatively, split MANAGEMENT into REPORTING (5) and ADMIN (6) for better role-based visibility.

### C3. Deduplication Action Items

| Action | File | Risk |
|--------|------|------|
| Remove `/vehicle-receiving` route | `src/app/App.tsx` | Low — 1 line removal, update `navigation.ts` path |
| Change OPERATIONS "Vehicle Receiving" nav path to `/store/vehicle-receiving` | `src/data/navigation.ts` | Low |
| Add redirect from `/vehicle-receiving` → `/store/vehicle-receiving` | `src/app/App.tsx` | Low |

### C4. Renaming Recommendations

| Current | Recommended | Reason |
|---------|-------------|--------|
| "Dashboard" (nav) | "Home" | The page is a high-level launcher, not a live KPI dashboard; rename avoids confusion with "Control Tower" |
| "Operations Control Tower" (page title) | Keep — this is the correct name for the page | |
| "Control Tower" (nav) | Keep | |
| "My Action Inbox" | "Action Inbox" | The "My" is implied by role-based filtering |

---

## Part D — Performance Foundation

### D1. What's Already Done (No Action Needed)

All route-level code splitting is in place. From `src/app/App.tsx`:

```tsx
// Every route uses this pattern — all 98+ pages are already lazy:
const ProjectDetail = lazy(() =>
  import('../pages/ProjectDetail').then(m => ({ default: m.ProjectDetail }))
);
```

This means:
- Initial page load downloads only the main bundle + the current route chunk
- Navigating to a new route lazy-loads that chunk on demand
- The `<Suspense fallback={<PageLoader />}>` boundary shows a loading spinner during chunk fetch

**Performance baseline (production build):**

| Metric | Value |
|--------|-------|
| Build time | 7.63s |
| Main bundle (gzip) | 138.42 KB |
| Largest page chunk (ProjectDetail, gzip) | 12.13 KB |
| Total chunks | ~110 |
| Mock data in bundle (gzip total) | ~16.78 KB |

### D2. Performance Gaps (Deferred)

| Gap | Impact | Phase to Fix |
|-----|--------|-------------|
| Mock data files shipped in production bundle (~16.78 KB gzip) | Minor network overhead; no runtime cost (`mockOrEmpty` returns `[]`) | Phase 1 cleanup (B-050) |
| Main bundle 138 KB gzip — no tree-shaking gaps identified | Acceptable for a SPA of this size | Monitor |
| No within-page Suspense boundaries | Users see full-page `PageLoader` during route transition, not per-section skeletons | Phase 2+ (add per-section `<LoadingState>` components) |
| No HTTP caching headers config (Vite defaults) | Not a code issue — deployment config responsibility | DevOps |
| No service worker / offline support | Not in scope | Never (B2B portal, always-online requirement) |

### D3. Recommended Next Performance Step

When Phase 2 begins wiring mock pages to live Supabase queries, adopt the `LoadingState` component from `src/components/feedback/loading-state.tsx` for per-section skeletons:

```tsx
// Pattern to adopt in Phase 2:
if (loading) return <LoadingState rows={8} />;
if (error) return <ErrorState message={error.message} onRetry={refetch} />;
if (!data.length) return <EmptyState icon={...} title="No records yet" />;
```

This is already the recommended pattern in `docs/design-system/03-page-layout-standards.md §Loading/Empty/Error Patterns`.

---

## Part E — Design System Inventory Update

### E1. Design System Status After Step 8A

| Layer | Status | Notes |
|-------|--------|-------|
| shadcn/ui primitives (`src/components/ui/`) | ✅ Complete (Step 5A) | 18 primitive components available |
| Status components (`src/components/status/`) | ✅ Complete (Step 5A + 5C) | StatusBadge, PriorityBadge, RoleBadge |
| Common layout (`src/components/common/`) | ✅ Complete (Step 5A) | 7 components (PageHeader, SectionCard, etc.) |
| Feedback states (`src/components/feedback/`) | ✅ Complete (Step 5A) | EmptyState, LoadingState, ErrorState |
| Data display (`src/components/data-display/`) | ✅ Complete (Step 5A) | DataTable, FilterBar |
| Documents (`src/components/documents/`) | ✅ Complete (Step 5A) | DocumentCard |
| App shell (Sidebar, Header) | ✅ Refreshed (Step 8A) | Desktop brand header added |
| Dashboard | ✅ Migrated (Step 8A) | Uses Step-5 PageHeader |

### E2. Remaining Legacy Component Migration (Step 5C Scope)

The following components remain as legacy and should be migrated in Step 5C:

| Legacy | Replacement | Effort | Risk |
|--------|------------|--------|------|
| `src/components/ui/PageHeader.tsx` | `@/components/common/page-header` | Medium (~40 pages: rename `action`→`actions`, `path`→`href`) | Low |
| `src/components/ui/Button.tsx` | `@/components/ui/primitives/button` | High (~40 pages: rename `primary`→`default`, `danger`→`destructive`) | Medium |
| `src/components/ui/Badge.tsx` | `@/components/ui/primitives/badge` + `StatusBadge` | High (~40 pages: custom variants differ) | Medium |
| `src/components/ui/Card.tsx` | `@/components/ui/primitives/card` + `SectionCard` | Medium-High (~20 pages: padding model differs) | Medium |
| `src/components/ui/Drawer.tsx` | `@/components/ui/sheet` | Low (~5 pages) | Low |
| `src/components/ui/EmptyState.tsx` | `@/components/feedback/empty-state` | Low (~10 pages) | Low |

---

## Part F — Validation

### F1. Build Validation

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | ✅ Zero errors |
| Production build | `npm run build` | ✅ Built in 7.63s, zero warnings |
| ESLint | `npm run lint` | ✅ 79 pre-existing errors, 0 new errors introduced |

### F2. Files Modified

| File | Change | Lines Δ |
|------|--------|---------|
| `src/components/layout/Sidebar.tsx` | Added `Link` import + desktop brand header block | +9 |
| `src/components/layout/Header.tsx` | Added `lg:hidden` to brand link | +1 |
| `src/pages/Dashboard.tsx` | Migrated PageHeader, conditionally hide empty KPI sections | +5 |

### F3. Files Created

| File | Purpose |
|------|---------|
| `docs/design-system/08-step-8a-portal-ux-refresh-foundation.md` | This document |

### F4. Files NOT Changed

| File | Reason |
|------|--------|
| All governance migrations (086–088) | No governance changes |
| `src/pages/QuotationNew.tsx` | Governance-sensitive, do not touch |
| `src/pages/QuotationDetail.tsx` | Governance-sensitive, do not touch |
| `src/pages/ProjectDetail.tsx` | High-risk, 1,829 lines |
| `src/pages/ProjectNew.tsx` | High-risk, 1,083 lines |
| `src/pages/WoPnGate.tsx` | Governance-sensitive |
| All other page components | Out of scope for Step 8A |
| `src/data/navigation.ts` | Consolidation plan documented (Part C), not implemented |
| `supabase/migrations/` | No migrations in Step 8A |

### F5. Safety Review

| Criterion | Pass |
|-----------|------|
| No RLS/schema changes | ✅ |
| No governance logic changed | ✅ |
| No migration created | ✅ |
| No SO/WO/PN module touched | ✅ |
| No GPL/AGPL/BSL code introduced | ✅ |
| No mock pages wired to Supabase | ✅ |
| All changes reversible | ✅ |
| Build passes with zero new errors | ✅ |

---

## Step 8B Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Implement nav consolidation (Part C) — remove duplicate `/vehicle-receiving`, split MANAGEMENT | Low |
| 2 | Rename "Dashboard" nav item to "Home" | Trivial |
| 3 | Remove non-functional `ChevronDown` from Header user chip | Trivial |
| 4 | Begin Step 5C legacy component migration (PageHeader → all pages) | Medium |
| 5 | Add per-section `LoadingState` skeletons to wired pages as Phase 2 data-fetching lands | Medium |
