# Step 19.4B — SO / Project Creation Wizard UX Upgrade

**Branch:** `feature/step-19-4b-project-creation-wizard-ux`
**Status:** Complete
**Depends on:** Step 19.1 (Design System Foundation, merged PR #126), Step 19.4A (merged PR #130)

---

## Objective

Upgrade `src/pages/ProjectNew.tsx` (the 4-step SO creation wizard) to feel premium, clear, and operationally guided using the Step 19.1 design foundation. Improve the wizard step indicator, loading state, section titles, form input styles, and review table presentation without changing any business logic or the creation workflow.

**No business logic, routes, permissions, DB queries, mutation payloads, validation rules, approval behavior, quotation conversion behavior, role access, or DB/RLS files were changed.**

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/ProjectNew.tsx` | Removed `Loader2`; added `Skeleton`; upgraded `STEPS` to `{ label, subtitle }[]`; upgraded `StepBar` to show subtitles and mobile fallback; `useState(!!fromQuotationId && isSupabaseConfigured)` for `fromQuotationLoading` (lint fix); removed synchronous `setFromQuotationLoading(true)` from effect; replaced spinner loading block with Skeleton form layout; updated `PageHeader` title/subtitle/breadcrumb; `rounded-xl` → `rounded-lg` on `QuotationSourceBanner` and Step 3 quotation reminder; `border-gray-300` → `border-gray-200 bg-white` on all inputs/selects; `border-gray-200` on conditional vehicle/description borders + `bg-white`; `border-dashed border-gray-300` → `border-dashed border-gray-200` on file upload; step section titles updated; `border border-gray-200` and `tabular-nums` on total value strip; `tabular-nums` on per-line total and review table total; review table headers `font-medium text-gray-500 uppercase tracking-[0.04em]`; submit area contextual note added |

---

## Changes by Category

### 1. STEPS Data Structure

**Before:** `const STEPS = ['Basic Info', 'Documents', 'Vehicle Lines', 'Review & Submit']`

**After:**
```tsx
const STEPS: { label: string; subtitle: string }[] = [
  { label: 'Sales Order Details',  subtitle: 'SO number, customer, dates'   },
  { label: 'Supporting Documents', subtitle: 'Customer PO & contracts'       },
  { label: 'Vehicle Lines',        subtitle: 'Products and commercial value' },
  { label: 'Review & Submit',      subtitle: 'Final check before approval'   },
];
```

### 2. StepBar Upgrade

- Indicators enlarged from `w-7 h-7` → `w-8 h-8`
- Step label and subtitle displayed below each indicator on `sm:` and above
- Mobile fallback: current step name and subtitle displayed below the dot row
- Connector line adjusted from `w-12` → `w-10` to accommodate subtitle layout

### 3. Lint — `set-state-in-effect`

`fromQuotationLoading` used a synchronous `setFromQuotationLoading(true)` at the top of a `useEffect`. Fixed by:
- Initializing `useState(!!fromQuotationId && isSupabaseConfigured)` so the state starts `true` when a quotation fetch will occur
- Removing `setFromQuotationLoading(true)` from the effect body entirely

### 4. Loading State

**Before:** `<Loader2 className="animate-spin" /> Loading quotation data…` centered div

**After:** Skeleton form layout matching the Step 1 layout — page header area, step dot row (4 circles + connectors), and a card with field skeletons (2-col grid × 2 rows + full-width row + full-width textarea block)

### 5. PageHeader

- Title: `"New SO / Project"` → `"New Sales Order / Project"`
- Subtitle (default): `'Register a new Sales Order'` → `'Register a new Sales Order and create the project record'`
- Subtitle (from quotation): `'From Quotation …'` → `'Converting from Quotation …'`
- Breadcrumb label: `'New SO / Project'` → `'New Sales Order'`

### 6. Section Titles and Helper Text

| Step | Before | After |
|------|--------|-------|
| Step 0 | `"Basic Information"` (no subtitle) | `"Sales Order Details"` + helper paragraph |
| Step 1 | `"Documents"` | `"Supporting Documents"` |
| Step 2 | `"Vehicle / Item Lines"` | `"Vehicle & Item Lines"` |

Step 0 helper text: *"Enter the core SO information. You can save as draft and complete remaining details later."*

### 7. Input and Select Border/Background

All `border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500` replaced with `border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500` (11 occurrences).

Conditional vehicle type select: `'border-gray-300'` → `'border-gray-200'`, `bg-white` added to static classes.
Conditional description input: same treatment.

### 8. File Upload Border

`border-dashed border-gray-300` → `border-dashed border-gray-200` on the file picker label.

### 9. Corner Radius

`rounded-xl` removed:
- `QuotationSourceBanner` banner div (top of form)
- Step 3 source quotation reminder div

Both replaced with `rounded-lg`.

### 10. Total Value Strip — Step 2

Added `border border-gray-200` wrapper border and `tabular-nums` to the value span. Per-line total span also gets `tabular-nums`.

### 11. Review Table — Step 3

Table headers updated from `text-xs font-semibold text-gray-600` → `text-xs font-medium text-gray-500 uppercase tracking-[0.04em]` (all 5 columns: #, Type, Description, Qty, Total SAR).

Footer total value: added `tabular-nums`.

### 12. Submit Area Contextual Note

Added a short note above the action button row explaining the two actions:
> **Save as Draft** keeps the SO editable. **Submit for Approval** sends it to Operations for routing.

---

## What Was Not Changed

- All business logic, data queries, mutation payloads
- `handleSave` function — creation, vehicle lines insert, documents upload, audit records, quotation linkage
- SO number / project code generation
- Validation rules (`step1Errors`, `step2Errors`, `step3Errors`, `allErrors`)
- Approval and routing behavior
- Quotation conversion behavior (RPC `link_quotation_to_project`)
- Role access — `useAuth`, `profile`, `role`
- Routes and navigation
- DB schema, RLS, migrations
- `App.tsx`, `navigation.ts`, `roleMatrix.ts`, lib files, types

---

## Pre-existing Lint Issues

Three pre-existing issues exist in `ProjectNew.tsx` (in the untouched `handleSave` async function):
- Line 402: `react-hooks/purity` — `Date.now()` inside the mutation path
- Lines 418/428: `@typescript-eslint/no-explicit-any` — `as any` on the document insert call

Global lint baseline: 72 problems (same as Step 19.4A post-merge). Zero new errors introduced.

---

## Validation

- `npm run build` — ✓ zero errors
- `npx tsc --noEmit` — ✓ zero errors
- `npx eslint src/pages/ProjectNew.tsx` — 3 pre-existing issues only (1 error + 2 warnings in untouched `handleSave`)
- Global lint: 72 issues (unchanged from Step 19.4A baseline)

---

## Next Step

Step 19.4C — Procurement and Store UX Improvement (planned, not yet started).
