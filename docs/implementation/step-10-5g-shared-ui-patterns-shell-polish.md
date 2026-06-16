# Step 10.5G — Shared UI Pattern Application and Shell Polish

**Date:** 2026-06-16
**Branch:** `feature/step-10-5g-shared-ui-patterns-shell-polish`
**Scope:** Apply Step 10.5F shared patterns to already-touched surfaces; light shell polish
**Depends on:** Steps 10.5A–10.5F (all merged into origin/main)

---

## Executive Summary

Applies the `SectionHeader` component from Step 10.5F to eliminate ad-hoc
`h2 + span.w-1.h-4` patterns in Dashboard and ProjectDetail. Adds a small
number of targeted shell polish improvements (sidebar active state, tab bar
readability). No business logic, queries, route guards, RLS policies, schemas,
or navigation structure changed.

---

## Part A — Baseline Verification

| Check | Result |
|-------|--------|
| `npm run build` on latest main before changes | ✅ Pass — built in 5.28s |
| PR #83 merged (stabilization fix) | ✅ Confirmed — commits `7a8c704`, `5eb3c72`, `5ebfb02` |
| PR #82 merged (Step 10.5F) | ✅ Confirmed — commit `c6f913a`, merge `d1de28c` |
| Step 10.5F SectionHeader component exists | ✅ `src/components/common/section-header.tsx` |
| Step 10.5F CSS tokens in `src/styles/index.css` | ✅ `--ring`, `--destructive`, `--border`, etc. warmed |
| Dashboard has role-aware sections (Step 10.5D) | ✅ `MY_WORK_CARDS`, `WORK_SECTIONS`, `ROLE_SUBTITLES` present |
| ProjectDetail has 6 tabs (Step 10.5E) | ✅ `TabKey`: overview, commercial, execution, quality, documents, activity |
| ProjectDetail role-based tab gating | ✅ `TAB_ROLES`, `isTabVisible()`, `useEffect` fallback all present |
| sales_user excluded from Execution tab | ✅ `TAB_ROLES.execution` does not include `sales_user` or `sales_coordinator` |
| Audit gated by `canAudit` (admin / ops_manager) | ✅ `const canAudit = role === 'admin' \|\| role === 'operations_manager'` |
| Step 10.5E doc exists | ✅ `docs/implementation/step-10-5e-projectdetail-role-tabs.md` |

**Blocking issues found:** None.
**Non-blocking notes:** Pre-existing `react-hooks/set-state-in-effect` lint errors on ProjectDetail.tsx lines 129, 748, 753 — present before this step, not introduced here.

---

## Part B — Dashboard SectionHeader Migration

### What changed

Dashboard had a **local private `SectionHeader` sub-component** (lines 232–239)
that was an exact duplicate of the new shared component from Step 10.5F:

```tsx
// BEFORE — private local copy in Dashboard.tsx
function SectionHeader({ label, accentClass }: { label: string; accentClass: string }) {
  return (
    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span className={cn('w-1 h-4 rounded-full inline-block', accentClass)} />
      {label}
    </h2>
  );
}
```

Replaced with import of the shared component. All 4 call sites updated
(`label` → `title`, `accentClass` → `accent`):

```tsx
// AFTER — shared component
import { SectionHeader } from '@/components/common/section-header';

<SectionHeader title="My Work" accent="bg-brand-600" />
<SectionHeader title="Critical Operational Indicators" accent="bg-brand-600" />
<SectionHeader title="Dubai / AFS & After Sales" accent="bg-sky-600" />
<SectionHeader title={section.label} accent={section.accentClass} />
```

**Rendered output is identical.** The local `cn` import was not affected (still
used by KpiCardItem and ModuleTileLink).

**Dashboard bundle:** 21.06 kB (was 21.24 kB — reduced by eliminating local
duplicate function).

---

## Part C — ProjectDetail SectionHeader Migration

Nine ad-hoc `h2 + span` blocks in ProjectDetail.tsx replaced with
`SectionHeader` component. The section structure, role gating, business logic,
and approval/WO/PN/document behaviors are entirely unchanged.

| Tab | Section title | Accent |
|-----|--------------|--------|
| Overview | Approval & Routing | `bg-brand-500` (default) |
| Commercial | Sales Order Details | `bg-emerald-500` |
| Commercial | Vehicle Lines | `bg-emerald-500` |
| Execution | Procurement | `bg-amber-500` |
| Execution | Factory Production | `bg-amber-500` |
| Execution | Store & Inventory | `bg-amber-500` |
| Execution | Dubai / AFS | `bg-amber-500` |
| Activity | Timeline | `bg-slate-500` |
| Activity | Audit Log | `bg-slate-500` |

Example replacement:
```tsx
// BEFORE
<h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
  <span className="w-1 h-4 bg-amber-500 rounded-full inline-block" />
  Procurement
</h2>

// AFTER
<SectionHeader title="Procurement" accent="bg-amber-500" />
```

**ProjectDetail bundle:** 68.85 kB (was 70.04 kB).

---

## Part D — PageHeader Consistency Decision

**Decision: Option 1 — leave both APIs as-is, no migration in this step.**

| Component | API | Users |
|-----------|-----|-------|
| `src/components/common/page-header.tsx` | `actions=` (plural) | Dashboard, ProjectDetail, and most pages |
| `src/components/ui/PageHeader.tsx` | `action=` (singular), `icon=` | ~7 detail pages (CustodyDetail, DubaiAfsProjectDetail, etc.) |

Rationale: Both components compile cleanly and have stable consumers. Migrating
all `ui/PageHeader.tsx` usages to `common/page-header.tsx` in this step would
touch ~7 additional pages, none of which were in scope for Step 10.5G. The risk
is not proportional to the benefit. Migration can be targeted in a later step.

**Recommended for Step 10.5H:** Replace `ui/PageHeader.tsx` usages with
`common/page-header.tsx` on the 7 detail pages once confirmed safe.

---

## Part E — Sidebar Polish

**Change:** Added `font-semibold` to the active nav item class string.

```tsx
// BEFORE
isActive ? 'bg-brand-50 text-brand-700' : ...

// AFTER
isActive ? 'bg-brand-50 text-brand-700 font-semibold' : ...
```

The base class is `font-medium` for all nav items. The active item now renders
`font-semibold` for clearer visual distinction. No other structure, data,
role arrays, route paths, or mobile behavior changed.

---

## Part F — ProjectDetail Tab Bar Polish

**Change:** Improved inactive tab readability and hover feedback.

```tsx
// BEFORE
activeTab === tab.key
  ? 'border-brand-600 text-brand-700'
  : 'border-transparent text-gray-500 hover:text-gray-700'

// AFTER
activeTab === tab.key
  ? 'border-brand-600 text-brand-700'
  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
```

- `text-gray-500` → `text-gray-600`: slightly more readable inactive label
- `hover:text-gray-700` → `hover:text-gray-800`: stronger hover contrast
- Added `hover:bg-gray-50`: subtle hover background (standard tab affordance)
- Added `rounded-t-sm`: softens top corners of the hover area

Tab keys, role visibility matrix, active tab fallback logic, and route behavior
are entirely unchanged.

---

## Part G — Files Changed

| File | Change type | Description |
|------|-------------|-------------|
| `src/pages/Dashboard.tsx` | Modified | Import shared SectionHeader; remove local duplicate; update 4 call sites |
| `src/pages/ProjectDetail.tsx` | Modified | Import shared SectionHeader; replace 9 ad-hoc h2 patterns |
| `src/components/layout/Sidebar.tsx` | Modified | Active nav item: add `font-semibold` |
| `docs/implementation/step-10-5g-shared-ui-patterns-shell-polish.md` | Created | This file |

---

## Governance Preservation

- No business logic changed
- No Supabase queries changed
- No route guards changed
- No RLS / schema / migration changes
- No route paths changed or deleted
- No navigation structure changed
- No Dashboard logic changed (data, roles, cards, counts)
- No ProjectDetail logic changed (tabs, gating, approval, WO/PN, docs, audit)
- No procurement / store / factory / Dubai / QC logic changed
- No quotation / SO / WO / PN behavior changed
- No approval logic changed
- No audit / timeline recording logic changed
- No new dependencies added
- Component APIs unchanged (SectionHeader consumed with same rendered output)

---

## Items Intentionally Deferred

| Item | Reason |
|------|--------|
| `ui/PageHeader.tsx` → `common/page-header.tsx` migration | Touches 7 additional pages not in 10.5G scope |
| Header.tsx visual polish | Header is already clean; no debt found |
| Quality tab section headings | Quality tab content is from complex multi-level components; deferred to a targeted step |
| AppLayout main content padding adjustments | No visual debt identified; deferred |

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run build` before changes (baseline) | ✅ built in 5.28s, zero errors |
| `npm run build` after changes | ✅ built in 5.25s, zero errors |
| `npx tsc --noEmit` after changes | ✅ zero errors |
| `npm run lint` — changed files | ✅ zero new issues in Dashboard, Sidebar, section-header |
| `npm run lint` — ProjectDetail | ⚠️ 3 pre-existing `react-hooks/set-state-in-effect` (lines 129, 748, 753) — not introduced by this step |
| `npm run lint` — all other files | ⚠️ pre-existing issues across ~20 unrelated files |

---

## Manual Test Checklist

- [ ] `npm run build` passes on latest main before changes
- [ ] `npm run build` passes after changes
- [ ] Dashboard renders; role-aware sections visible
- [ ] Dashboard section headings display with accent bar (My Work, Critical Operational Indicators, Dubai/AFS, module groups)
- [ ] ProjectDetail renders; all 6 tabs present
- [ ] ProjectDetail role-based tabs still work (commercial hidden from factory_user, execution hidden from sales_user)
- [ ] Audit Log section in Activity tab hidden for non-admin/ops roles
- [ ] ProjectDetail section headings within tabs display with accent bars (Procurement, Factory Production, Store & Inventory, Dubai/AFS, etc.)
- [ ] Approval & Routing section in Overview tab displays with brand accent bar
- [ ] Sidebar active nav item appears visually stronger (font-semibold)
- [ ] Inactive tab labels are readable; hover shows subtle gray-50 background
- [ ] Active tab underline (brand-600) unchanged
- [ ] No route paths changed
- [ ] No route guards changed
- [ ] No RLS/schema changed
- [ ] No queries changed
- [ ] No business logic changed
- [ ] No new dependencies added
- [ ] TypeScript passes

---

## Recommended Step 10.5H Scope

| Area | Description |
|------|-------------|
| PageHeader migration | Replace `ui/PageHeader.tsx` usages (7 detail pages) with `common/page-header.tsx` for API unification |
| Empty state audit | Audit remaining inline empty states (not using `EmptyState` component) across list pages and standardize |
| Quality tab section headers | Replace any remaining ad-hoc h2 patterns inside Quality tab sub-components if safe |
| Loading state audit | Identify pages still using ad-hoc loading divs instead of `PageLoader` |
| DataSourceBadge consistency | Audit pages missing the `DataSourceBadge` indicator |
