# 05 — Step 5B Adoption Results

**Step:** 5B — Safe Design System Adoption Pilot  
**Date:** 2026-06-14  
**Branch:** `feature/design-system-adoption-pilot`

---

## Objective

Prove the new Design System can be adopted without changing business behaviour by applying
it to **3 low-risk targets only**. No legacy components deleted. No global import replacement.

---

## Target Selection Rationale

### Why only 3 targets?

Pages that use `Button` (~40 pages) or the legacy `Badge` with custom variants
(`success`, `warning`, `critical`, `info`, `neutral`) cannot be migrated without also
renaming every variant prop — a risky bulk change that exceeds this pilot's scope.
The three targets below were chosen because they use **only `PageHeader`** from the legacy
component set, with zero `Button` or `Badge` dependency.

### Target 1 — `src/pages/AuditLog.tsx` ✅

| Property | Value |
|----------|-------|
| Risk | Very low — admin-only, read-only, zero Supabase writes |
| Legacy components removed | `PageHeader` (legacy), inline empty-state `<div>` |
| DS components adopted | `PageHeader` (common), `EmptyState` (feedback), `SectionCard` (common) |

Changes made:
- Switched `PageHeader` import → `@/components/common/page-header`
- Removed unsupported `icon` prop (cosmetic drop only)
- Replaced the filter bar `<div>` with `<SectionCard contentClassName="flex flex-wrap gap-3 items-center p-4">`
- Replaced the table wrapper `<div>` with `<SectionCard noPadding>`
- Replaced inline no-results `<div>` with `<EmptyState icon={<ScrollText>} title="..." description="..." />`
- All imports converted to `@/` path alias

### Target 2 — `src/pages/Reports.tsx` ✅

| Property | Value |
|----------|-------|
| Risk | Very low — pure navigation hub, no data fetching, zero Supabase queries |
| Legacy components removed | `PageHeader` (legacy), manual flex wrapper |
| DS components adopted | `PageHeader` (common) |

Changes made:
- Switched `PageHeader` import → `@/components/common/page-header`
- Moved the "Open Control Tower" `<Link>` out of a manual flex wrapper into the
  `actions` prop of the new `PageHeader` (this is what the `actions` slot is for)
- `Card` kept as legacy — its custom `className="p-5 h-full hover:..."` pattern
  would need individual per-card review before migrating to `SectionCard`
- All imports converted to `@/` path alias

### Target 3 — `src/pages/PlaceholderPage.tsx` ✅

| Property | Value |
|----------|-------|
| Risk | Very low — shared "coming soon" page, no data or writes |
| Legacy components | `PageHeader` removed; `Card` and `Badge` intentionally kept |
| DS components adopted | `PageHeader` (common) |

Changes made:
- Switched `PageHeader` import → `@/components/common/page-header`
- Renamed `action` prop → `actions` (the only API difference between old and new `PageHeader`)
- `Card` kept as legacy — legacy Card has a built-in `padding` prop; new shadcn `Card` has no
  padding by default. Swapping without per-file layout review would shift visual spacing.
- `Badge` kept as legacy — `variant="warning"` and `variant="neutral"` do not exist in
  `@/components/ui/primitives/badge`. These are Phase # and Module labels, not entity
  statuses, so `StatusBadge` is not appropriate here.

---

## StatusBadge Pilot — Deferred

The Step 5B plan called for replacing inline badge/status colour logic with `StatusBadge`
in any selected target that already had such logic.

**Finding:** None of the 3 safe targets contained inline entity-status badge logic.
`AuditLog.tsx` has `ACTION_COLORS` for audit action types (CREATE/UPDATE/DELETE), which
are not entity statuses and are not suitable for `StatusBadge`.

**StatusBadge adoption** is ready for Step 5C. The best candidates are:
- `AdminAccessRequests.tsx` — `submitted`, `under_review`, `approved`, `rejected`,
  `cancelled` all exist in `STATUS_CONFIG`. The exported `statusBadge()` helper also
  serves `AdminAccessRequestDetail.tsx`, so both files must be updated together.
- `Projects.tsx` — has a local `statusBadge(status: ProjectStatus)` function.
- `ReportsProjects.tsx` — has the same local `statusBadge` function.

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npm run build` | ✅ Clean build (5.24 s) |
| `npm run lint` | ✅ Zero NEW errors (all pre-existing errors documented in `04-step-5b-adoption-plan.md`) |

---

## What Was NOT Changed

- Legacy `Button.tsx`, `Badge.tsx`, `Card.tsx` — not deleted, not modified
- `src/components/ui/primitives/` — not collapsed
- No global import replacement (only imports in touched files were updated)
- No Supabase queries, RLS, migrations, or business rules modified
- Forbidden pages (`ProjectDetail`, `ProjectNew`, `QuotationDetail`, `WoPnGate`, etc.)
  — untouched

---

## API Differences Discovered During Pilot

| Component | Legacy prop | DS prop | Notes |
|-----------|------------|---------|-------|
| `PageHeader` | `action` | `actions` | Rename only |
| `PageHeader` | `icon` | — (not supported) | Icon displayed in brand circle in legacy; dropped in DS version |
| `PageHeader` | `breadcrumb[].path` | `breadcrumb[].href` | Key rename; both optional |
| `Card` | `padding` prop | — (not supported) | DS `Card` has no built-in padding; use `SectionCard` or `CardContent` |
| `Badge` | `success/warning/critical/info/neutral` | — | DS badge has `default/secondary/destructive/outline` only |
| `Button` | `primary/danger` | `default/destructive` | Variant rename; `loading` prop also not present in DS button |

---

## Step 5C Recommendation

**Step 5C — Full Migration** should tackle the remaining ~100 pages in three passes:

### Pass 1 — StatusBadge (Priority, Low Risk)
Replace all per-page `statusBadge()` helper functions and inline badge colour classes
with `<StatusBadge status={...} />`. Each page is self-contained; changes are cosmetic.

### Pass 2 — PageHeader (Medium Effort)
- Rename `action` → `actions` across all pages
- Remove `icon` prop usages
- Rename breadcrumb `path` → `href` where used

### Pass 3 — Button + Badge (Highest Effort)
- Rename `variant="primary"` → `variant="default"`, `variant="danger"` → `variant="destructive"`
- Map legacy Badge variants to StatusBadge or new shadcn badge with className overrides
- Delete legacy `Button.tsx`, `Badge.tsx` after all callers migrated

### Pass 4 — Card → SectionCard (Layout-Sensitive)
Do last, page by page, verifying layout visually. The new `SectionCard` wraps content
in `CardContent` with `p-6 pt-0`; legacy `Card` uses `padding="md"` (p-5 all sides).

### After Step 5C
- Remove `forceConsistentCasingInFileNames` exception (already removed in Step 5A safety review)
- Delete `src/components/ui/Button.tsx`, `Badge.tsx`, `Card.tsx`, `Drawer.tsx`,
  `EmptyState.tsx`, `PageHeader.tsx`
- Move `src/components/ui/primitives/button.tsx` → `src/components/ui/button.tsx` etc.
- Update `components.json` aliases accordingly
