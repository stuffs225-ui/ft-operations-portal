# 09 — Step 8B: Portal Shell, Navigation, and Dashboard UX Refresh

**Step:** 8B — Portal Shell, Navigation, and Dashboard UX Refresh
**Branch:** `feature/step-8b-portal-shell-navigation-dashboard-refresh`
**Base:** `claude/audit-production-system-review-5v330i` (includes Steps 1–8A)
**Date:** 2026-06-14
**Status:** Complete

---

## Executive Summary

Step 8B delivers visible UX improvements across the portal's shared shell, navigation structure, and home/dashboard experience. All changes are purely cosmetic, IA/labelling, or static-link additions — no governance logic, Supabase queries, schema, RLS, or workflow pages were modified.

**Key outcomes:**
- Navigation IA improved: Dashboard/Inbox now grouped under "CONTROL CENTER"; SALES renamed to "SALES & QUOTATION"; MANAGEMENT renamed to "REPORTS & ADMIN"
- Sidebar section separators now visually distinguish groups with a subtle rule + tighter spacing
- Header cleaned up: removed non-functional chevron that implied a user dropdown
- Dashboard now shows a role-based module launcher ("Your Modules") in both live and dev modes
- 3 more module overview pages migrated from legacy `PageHeader` to Step-5 `PageHeader`

---

## Part A — Step 8A Baseline Confirmation

| Check | Result |
|-------|--------|
| `docs/design-system/08-step-8a-portal-ux-refresh-foundation.md` exists | ✅ |
| Sidebar desktop brand header (Step 8A) | ✅ (`hidden lg:flex`, h-14, brand link) |
| Header brand is mobile-only (`lg:hidden`) | ✅ |
| Dashboard uses `@/components/common/page-header` with `actions=` | ✅ |
| Migration 086 present | ✅ |
| Migration 087 present | ✅ |
| Migration 088 present | ✅ |
| Step 7 sign-off doc present | ✅ |
| `QuotationNew.tsx` INSERTs as `draft` | ✅ (not touched) |
| `QuotationDetail.tsx` has `returnErr` handling | ✅ (not touched) |

---

## Part B — Portal Shell Visual Refresh

### B1. Sidebar — Section Separator Improvement

**Before:** Section headers used `pt-4 pb-1` with `text-[10px]` uppercase text — all sections were equally spaced with no visual distinction between them, making a long list feel undifferentiated.

**Change:** Added a thin `border-t border-gray-100` rule above each section header (except the first, which gets slightly less top padding) to create a clear visual boundary between groups. Used `tracking-widest` instead of `tracking-wider` for section label letter-spacing.

```tsx
// New section separator rendering:
<div className={cn('px-3 pb-1', isFirst ? 'pt-3' : 'pt-5')}>
  {!isFirst && <div className="border-t border-gray-100 mb-3" />}
  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
    {item.label}
  </span>
</div>
```

Passes `isFirst={idx === 0}` from the `visibleItems.map()` call so the first visible separator (always "CONTROL CENTER" for logged-in users) gets no top rule.

**After:** Each nav section is clearly delineated. Users scanning the sidebar can immediately see where one module group ends and another begins.

**Risk:** Zero — purely visual CSS changes in a layout-only component. Route guards, role filtering, and `buildVisibleNav()` logic untouched.

---

### B2. Sidebar — Footer Cleanup

**Before:** Footer showed `"NAFFCO Fire Trucks — Operations Portal"` in a single line at `text-[10px] text-gray-400`.

**Change:** Footer now shows `"Operations Portal"` on the left and `"v8B"` on the right using `flex items-center justify-between`. Removes the redundant "NAFFCO Fire Trucks" prefix (already shown in the brand header above). Adds a version tag that can be updated with each step.

**Risk:** Zero.

---

### B3. Header — Remove Non-Functional ChevronDown

**Before:** The user chip in `Header.tsx` included `<ChevronDown size={14} className="text-gray-400 hidden sm:block" />`. No dropdown or popover was attached to this icon. It implied a profile menu that does not exist, potentially confusing users.

**Change:** Removed `ChevronDown` from the import and from the JSX.

**After:** The user chip shows `[avatar] [name + role badge]` with no misleading affordance. When a user profile dropdown is built (a future step), the chevron can be re-added at that point.

**Risk:** Zero — import removal + 1 JSX line removal.

---

## Part C — Navigation IA Improvement

### C1. Changes Implemented

**File changed:** `src/data/navigation.ts`

All changes are label/grouping only. No routes changed. No permission `roles` arrays modified. `id` keys preserved. `path` values unchanged. `buildVisibleNav()` in Sidebar.tsx requires no changes.

| Type | Before | After |
|------|--------|-------|
| Added separator | (none — Dashboard + Inbox had no section) | `sep-0` "CONTROL CENTER" |
| Renamed nav item | "Dashboard" | "Home" |
| Renamed nav item | "My Action Inbox" | "Action Inbox" |
| Renamed separator | "SALES" | "SALES & QUOTATION" |
| Renamed separator | "MANAGEMENT" | "REPORTS & ADMIN" |

### C2. Rationale

**"CONTROL CENTER" section:** Dashboard and Action Inbox were floating with no section header. Adding "CONTROL CENTER" signals to users that this is the entry point and triage area.

**"Home" instead of "Dashboard":** The page title is "Operations Control Tower". Having both a nav item "Dashboard" and a page "Control Tower" (separate route `/control-tower`) created confusion. "Home" is unambiguous.

**"Action Inbox" instead of "My Action Inbox":** The "My" is implied by role-based filtering. Removing it shortens the label and removes the implication that only SALES staff have an inbox.

**"SALES & QUOTATION":** Quotation Requests, Sales Workspace, Hot Projects, Sales Coordinator are all sales-and-quotation-related. The original "SALES" label was too narrow.

**"REPORTS & ADMIN":** The "MANAGEMENT" label was misleading for operational roles (procurement_user, etc.) who see Control Tower and Reports in this section but not the admin-only items. "REPORTS & ADMIN" better describes the mixed content.

### C3. Deferred Navigation Changes (Step 8C)

| Item | Reason deferred |
|------|----------------|
| Duplicate `/vehicle-receiving` route dedup | Cannot confirm `VehicleReceiving.tsx` vs `StoreVehicleReceiving.tsx` are identical without reading both files. Defer to 8C after confirming. |
| Split REPORTS & ADMIN into two sections | Requires reading all 11 items carefully for role impact. Minor benefit — current section is already correct after rename. |
| WO / PN Gate as its own section | Currently 1 item with no sub-items. Separating it creates a section with a single item. Low value; defer to 8C. |

---

## Part D — Dashboard Refresh

### D1. Role-Based Module Launcher ("Your Modules")

**Before:** In live mode, after the Project Summary strip (all zeros) and two hidden KPI sections, the Dashboard showed only: two hard-coded links (Control Tower + Reports Hub) and the Governance Golden Rules banner. Non-admin users with access to only one of those two links saw an under-populated page.

**Change:** Replaced the two-link "Reports & Control Tower" section with a role-filtered "Your Modules" grid. Defined a static `MODULE_TILES` array of 12 module tiles, each with icon, label, path, left-border color, and a `roles` constraint identical to the sidebar role rules. The component filters by role using `useAuth()` then renders a responsive grid.

```tsx
// Static tile config (excerpt):
const MODULE_TILES: ModuleTile[] = [
  { id: 'quotations',    label: 'Quotations',     path: '/quotations',   icon: FileText,  roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'] },
  { id: 'projects',      label: 'Projects / SO',  path: '/projects',     icon: FolderKanban }, // no roles → all
  { id: 'control-tower', label: 'Control Tower',  path: '/control-tower',icon: BarChart3, roles: ['admin','operations_manager','viewer'] },
  // ... 9 more
];

// Filter by role (same logic as sidebar):
const visibleModuleTiles = MODULE_TILES.filter(
  (t) => !t.roles || !role || t.roles.includes(role) || role === 'admin',
);
```

Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6` — compact tiles with icon + label.

**After:** Every role sees a launcher of all their accessible modules on the home page. Admin sees 12 tiles in a compact 2-row grid. factory_user sees ~4 tiles (Projects, Factory, Material QC, Project QC). Sales user sees ~3 tiles (Quotations, Sales Workspace, Projects).

**What was NOT changed:**
- `mockOrEmpty()` / `isLiveMode()` logic — unchanged
- KPI card sections — still conditionally rendered when non-empty
- Project Summary strip — unchanged
- Governance Golden Rules banner — unchanged
- No new Supabase queries added

**Risk:** Zero — static link grid, no data fetching, purely navigational.

### D2. Added Imports

Added to `Dashboard.tsx`:
- Lucide icons: `FolderKanban`, `Warehouse`, `Factory`, `Microscope`, `BarChart3`
- Hook: `useAuth` from `'../hooks/useAuth'`
- Type: `UserRole` from `'../types'`

No new npm packages installed.

---

## Part E — Placeholder / Module Overview Page Cleanup

### E1. PageHeader Migration

Migrated legacy `PageHeader` (from `'../components/ui/PageHeader'`, `action=` singular) to Step-5 `PageHeader` (`@/components/common/page-header`, `actions=` plural) in three module overview pages.

| File | Change | Notes |
|------|--------|-------|
| `src/pages/ActionInbox.tsx` | Import + `action=` → `actions=` | Breadcrumb `[{label:'Inbox'}]` has no path — safe |
| `src/pages/Store.tsx` | Import + `action=` → `actions=` | No breadcrumb — safe |
| `src/pages/AfterSales.tsx` | Import + `action=` → `actions=` | No breadcrumb — safe |

**What was NOT changed in these files:**
- Legacy `Button` (`variant="primary"`, `variant="secondary"`) — still using legacy component
- Legacy `Badge` (`variant="critical"`, `variant="warning"`, etc.) — still using legacy component
- Legacy `Card` — still using legacy component
- Business logic, role checks, mock data patterns — untouched

Full legacy component migration (Button, Badge, Card) is Step 5C scope, not 8B.

---

## Part F — Performance Improvements

### F1. Route-Level Code Splitting (Already Complete)

All 98+ routes in `src/app/App.tsx` already use `React.lazy()` + `Suspense`. No changes needed. Documented in Step 8A §D1.

### F2. No New Dependencies

No npm packages were installed. All icons used in the `MODULE_TILES` grid were already available from `lucide-react` (confirmed via Sidebar.tsx which already imports them).

---

## Part G — Libraries

| Library | License | Usage in Step 8B |
|---------|---------|------------------|
| `lucide-react` | ISC (MIT-compatible) | Additional icon names used in MODULE_TILES: `FolderKanban`, `Warehouse`, `Factory`, `Microscope`, `BarChart3` — all already installed |
| `react-router-dom` | MIT | Link component used in module tiles — already installed |

No new libraries installed. No GPL/AGPL/BSL code introduced.

---

## Part H — Files Changed

| File | Change | Lines Δ |
|------|--------|---------|
| `src/data/navigation.ts` | Add sep-0, rename labels | +8 |
| `src/components/layout/Header.tsx` | Remove ChevronDown | -2 |
| `src/components/layout/Sidebar.tsx` | Section separator visual + footer cleanup | +8 |
| `src/pages/Dashboard.tsx` | Add MODULE_TILES config + role-based launcher | +63 |
| `src/pages/ActionInbox.tsx` | PageHeader import + `action=`→`actions=` | +1 |
| `src/pages/Store.tsx` | PageHeader import + `action=`→`actions=` | +1 |
| `src/pages/AfterSales.tsx` | PageHeader import + `action=`→`actions=` | +1 |
| `docs/design-system/09-step-8b-...md` | This document | new |

---

## Part I — High-Risk Pages Intentionally Not Touched

| File | Reason |
|------|--------|
| `src/pages/QuotationNew.tsx` | Governance-sensitive — two-step submission, R-001 enforcement |
| `src/pages/QuotationDetail.tsx` | Governance-sensitive — R-001/R-002 gates, returnErr handling |
| `src/pages/ProjectDetail.tsx` | 1,829 lines, highest risk page, Phase 2 scope |
| `src/pages/ProjectNew.tsx` | 1,083 lines, complex wizard form |
| `src/pages/WoPnGate.tsx` | WO/PN governance logic, execution gate |
| `src/pages/AdminApprovals.tsx` | Approval workflow — 706 lines |
| `src/pages/ProcurementPODetail.tsx` | PO approval flow — 817 lines |
| `src/pages/FactoryProjectWorkspace.tsx` | Factory workflow — 714 lines |
| `src/pages/Factory.tsx` | 223 lines with useEffect KPI — too complex for 8B PageHeader migration |
| All migrations (086–088) | Immutable |
| All RLS policies | Not modified |
| `src/context/AuthContext.tsx` | Auth — do not touch |
| `src/lib/executionGate.ts` | WO/PN gate — do not touch |

---

## Part J — Routes Removed or Changed

**No routes removed.**

The nav label "Dashboard" became "Home" but path `/` is unchanged. The nav label "My Action Inbox" became "Action Inbox" but path `/inbox` is unchanged. All other routes, `RequireRole` guards, and lazy imports in `App.tsx` are untouched.

---

## Part K — Business Logic Preservation Statement

No business logic was changed in Step 8B:
- No Supabase queries added or removed
- No `mockOrEmpty()` calls changed
- No role permission arrays modified
- No governance rules bypassed or weakened
- No status transitions or approval flows touched
- No RLS policies, triggers, or migrations modified

---

## Part L — Manual UX Review Checklist

| Scenario | Expected | Safe to Ship |
|---------|---------|-------------|
| Desktop: sidebar section groups | Thin gray line + wider gap between sections | ✅ |
| Desktop: sidebar footer | "Operations Portal" left, "v8B" right | ✅ |
| Desktop: "CONTROL CENTER" appears as first sidebar section | ✅ | ✅ |
| Desktop: "SALES & QUOTATION" section label | ✅ | ✅ |
| Desktop: "REPORTS & ADMIN" section label | ✅ | ✅ |
| Desktop: nav item "Home" replaces "Dashboard" | ✅ | ✅ |
| Desktop: nav item "Action Inbox" replaces "My Action Inbox" | ✅ | ✅ |
| Header: no chevron next to user name | ✅ | ✅ |
| Dashboard (live mode): "Your Modules" grid shows role-relevant tiles | ✅ | ✅ |
| Dashboard (dev/mock mode): KPI cards + AFS cards + "Your Modules" grid | ✅ | ✅ |
| Dashboard: clicking a module tile navigates to correct route | ✅ | ✅ |
| Admin: sees all 12 module tiles | ✅ | ✅ |
| factory_user: sees Projects, Factory, Material QC, Project QC tiles | ✅ | ✅ |
| sales_user: sees Quotations, Sales Workspace, Projects tiles | ✅ | ✅ |
| Mobile: sidebar still opens/closes correctly | ✅ | ✅ |
| Mobile: header still shows brand logo and hamburger | ✅ | ✅ |
| ActionInbox: PageHeader renders, counters in actions slot | ✅ | ✅ |
| Store: PageHeader renders with action buttons | ✅ | ✅ |
| AfterSales: PageHeader renders with "New Request" button | ✅ | ✅ |

---

## Part M — Workflow Safety Checklist

| Safety Check | Result |
|-------------|--------|
| Governance logic changed | ❌ No |
| Step 7 Sales & Quotation behavior changed | ❌ No |
| Supabase queries added or removed | ❌ No |
| Schema / migration / RLS / trigger changed | ❌ No |
| Route guards (`RequireRole`) changed | ❌ No |
| Role permission arrays in navigation changed | ❌ No |
| Mock/live data switching logic changed | ❌ No |
| Business calculations added | ❌ No |
| New npm dependencies installed | ❌ No |
| GPL / AGPL / BSL code introduced | ❌ No |

---

## Part N — Known Limitations

1. **Module tiles vs sidebar role arrays are manually synchronized** — if a nav item's `roles` array changes in `navigation.ts`, the `MODULE_TILES` config in `Dashboard.tsx` must be updated separately. A future refactor could extract role definitions to a shared constant.

2. **"v8B" hardcoded in footer** — the sidebar footer version tag is a static string. It will drift if the codebase evolves without updating it. Consider a build-time constant injection in a future step.

3. **Factory.tsx, Procurement.tsx, DubaiAFS.tsx still use legacy PageHeader** — not migrated in this step due to complexity (Factory.tsx has a `useEffect` KPI loop). These remain for Step 5C.

4. **Sidebar first separator detection uses array index** — `isFirst={idx === 0}` assumes the first visible item is always a separator. This is correct given the `buildVisibleNav` logic, but if a role ever has no visible items in "CONTROL CENTER", the index-based approach still works correctly because `buildVisibleNav` suppresses empty separators.

---

## Part O — Deferred to Step 8C

| Item | Description |
|------|-------------|
| Vehicle Receiving route dedup | Audit `VehicleReceiving.tsx` vs `StoreVehicleReceiving.tsx`; add redirect if identical; update nav path |
| Legacy PageHeader migration (remaining ~37 pages) | Step 5C scope; batch rename `action=`→`actions=` |
| User profile dropdown | Re-add ChevronDown only when dropdown is implemented |
| Sidebar width evaluation | Current w-60 (240px) — may benefit from w-56 (224px) to give content more room |
| WO / PN Gate as its own nav section | Evaluate if single-item section is worth the visual weight |
| Dashboard: live-mode Project Summary strip with real counts | Needs Supabase query — Phase 2 scope |
| Notification badge on Action Inbox nav item | Needs live unread count — Phase 10 scope |

---

## Step 8C Recommended Plan

**Focus:** Complete the navigation cleanup, add redirect for duplicate route, begin broader legacy component migration.

```
Part A — Route Dedup
  1. Read VehicleReceiving.tsx and StoreVehicleReceiving.tsx in full
  2. If identical, add <Navigate> redirect in App.tsx and update nav path
  3. If different, document what each does and plan merge

Part B — Broader PageHeader Migration
  1. Remaining pages with legacy PageHeader (~37 files)
  2. Batch rename: action= → actions= and breadcrumb.path → breadcrumb.href
  3. Start with simplest pages (no breadcrumb, single action slot)
  4. Verify build after each batch

Part C — Login Page Review
  1. Read Login.tsx fully
  2. Evaluate if visual improvements (better branding, error states) are safe
  3. Apply only if fully reversible

Part D — Empty State Consistency
  1. Audit pages using inline empty-state <div> blocks
  2. Replace with <EmptyState> from @/components/feedback/empty-state
  3. Start with module overview pages

Part E — Notification Badge
  Plan (not implement): design the live unread count query
  for the Action Inbox nav badge (Phase 10 scope)

Part F — Validation and PR
  npm run build + npx tsc --noEmit + npm run lint
  Create PR: "Step 8C — Navigation Cleanup and Component Consistency"
```

---

## Part P — Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | ✅ Zero errors |
| Production build | `npm run build` | ✅ Built in 5.93s |
| ESLint | `npm run lint` | ✅ 79 pre-existing, **0 new errors** in changed files |
| Lint files changed in 8B | (no output from changed-file filter) | ✅ Clean |
