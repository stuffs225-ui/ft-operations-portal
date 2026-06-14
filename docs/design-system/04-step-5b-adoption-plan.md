# 04 — Step 5B Adoption Plan

**Step:** 5A — Design System Foundation  
**Date:** 2026-06-14

---

## Goal of Step 5B

Step 5B migrates existing page-level business components to use the new design system primitives. Step 5B should happen BEFORE Phase 1 feature work begins so that new feature code immediately uses the shared design system.

---

## What Needs to Migrate

### Priority 1 — Remove Casing Collision (Required for Long-Term Health)

Three legacy custom components coexist with shadcn primitives that only differ in filename casing. On case-insensitive filesystems (macOS/Windows), these would conflict. Resolve by:

1. Update all existing page imports from `'../components/ui/Button'` → `'@/components/ui/primitives/button'`
2. Update all existing page imports from `'../components/ui/Badge'` → `'@/components/ui/primitives/badge'`
3. Update all existing page imports from `'../components/ui/Card'` → `'@/components/ui/primitives/card'`
4. Remove the legacy `Button.tsx`, `Badge.tsx`, `Card.tsx` from `src/components/ui/`
5. Move `button.tsx`, `badge.tsx`, `card.tsx` from `src/components/ui/primitives/` to `src/components/ui/`
6. Update all imports to remove the `/primitives` segment
7. Remove `forceConsistentCasingInFileNames: false` from `tsconfig.app.json`

**Pages that import Button:** ~40 pages (all major pages)  
**Pages that import Badge:** ~40 pages (all major pages)  
**Pages that import Card:** ~20 pages

### Priority 2 — Migrate Custom Components to shadcn Equivalents

| Legacy Component | shadcn Replacement | Notes |
|-----------------|-------------------|-------|
| `Button.tsx` | `primitives/button.tsx` | Different variant names — `primary` → `default`, `danger` → `destructive` |
| `Badge.tsx` | `primitives/badge.tsx` | Different variant names — `success` → use StatusBadge |
| `Card.tsx` | `primitives/card.tsx` | Same API structure |
| `Drawer.tsx` | `ui/sheet.tsx` | Same purpose, Radix Sheet is accessible |
| `EmptyState.tsx` | `feedback/empty-state.tsx` | New component has more features |
| `PageHeader.tsx` | `common/page-header.tsx` | New component has breadcrumb |

### Priority 3 — Adopt StatusBadge

Currently, every page that shows a status string (project_status, release note status, etc.) has inline badge color logic like:

```tsx
// Current: scattered per-page logic
const badgeClass = status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
<Badge className={badgeClass}>{status}</Badge>
```

**Target:**
```tsx
// Step 5B: centralized
<StatusBadge status={project.project_status} />
```

---

## Migration Approach (Recommended)

1. Run a global search-replace for each import path change
2. Update variant names in Button usages (`variant="primary"` → `variant="default"`, etc.)
3. Replace inline badge color logic with `<StatusBadge>`
4. Delete legacy components after all callers are migrated
5. Move `primitives/button.tsx`, etc. to `ui/button.tsx` (update components.json)
6. Remove `forceConsistentCasingInFileNames: false`
7. Run `npm run build` + `npx tsc --noEmit` to confirm zero errors

---

## Files to Delete After Step 5B

- `src/components/ui/Button.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Drawer.tsx` (replaced by Sheet)
- `src/components/ui/EmptyState.tsx` (replaced by `feedback/empty-state.tsx`)
- `src/components/ui/PageHeader.tsx` (replaced by `common/page-header.tsx`)

---

## ESLint Pre-Existing Issues (To Fix Separately)

The following lint errors existed before Step 5A. They are documented here for resolution:

| File | Error | Category |
|------|-------|----------|
| `src/context/AuthContext.tsx` | `set-state-in-effect` | Pre-existing |
| `src/types/index.ts` | `no-empty-object-type` (many `{}` types) | Pre-existing |
| `scripts/create-dev-users.ts` | `no-useless-assignment` | Pre-existing |
| Multiple pages | `set-state-in-effect` | Pre-existing (common React pattern) |

The shadcn standard of exporting both components and types from the same file triggers `react-refresh/only-export-components` warnings. These are warnings (not errors) and are standard for shared UI library files.
