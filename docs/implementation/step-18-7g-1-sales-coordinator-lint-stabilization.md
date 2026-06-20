# Step 18.7G.1 — Sales Coordinator Lint Stabilization

## Reason for Follow-up PR

PR #116 (Step 18.7G) introduced 5 lint errors across three coordinator pages.
All errors followed pre-existing codebase patterns (`react-hooks/set-state-in-effect`
and `react-hooks/preserve-manual-memoization`) also present in 15+ other files.
This stabilization PR fixes those errors without changing any business behavior.

---

## Exact Lint Errors Fixed

| File | Line | Rule | Description |
|---|---|---|---|
| `CoordinatorQueue.tsx` | 147 | `react-hooks/set-state-in-effect` | `setQuotations` called directly in useEffect body (mock path) |
| `CoordinatorQueue.tsx` | 164 | `react-hooks/preserve-manual-memoization` | `useMemo` dep `profile?.id` inferred as `profile` by React Compiler |
| `CoordinatorQueue.tsx` | 185 | `react-hooks/preserve-manual-memoization` | same — `tabFiltered` useMemo |
| `Quotations.tsx` | 153 | `react-hooks/set-state-in-effect` | `setQuotations` called directly in useEffect body (mock path) |
| `SalesCoordinator.tsx` | 141 | `react-hooks/set-state-in-effect` | `setLoading(false)` called directly in useEffect body (guard path) |

---

## Files Changed

- `src/pages/CoordinatorQueue.tsx` — async load + currentUserId primitive
- `src/pages/Quotations.tsx` — async load pattern
- `src/pages/SalesCoordinator.tsx` — async load pattern

---

## Fix Approach

### `react-hooks/set-state-in-effect`

All three files: wrap the useEffect callback body in `async function load()` with
a `cancelled` boolean guard, then call `void load()`. This moves all `setState`
calls inside the async function rather than directly in the effect body, which is
the pattern the React Compiler lint rule requires.

Added cancellation guard (`let cancelled = false; ... return () => { cancelled = true; }`)
to prevent stale state updates after component unmount — a correctness improvement
alongside the lint fix.

Converted `.then()` Supabase chains to `await` inside the async load function so
the entire data load is unified in one async path.

### `react-hooks/preserve-manual-memoization`

In `CoordinatorQueue.tsx`: extracted `const currentUserId = profile?.id ?? null`
as a stable `string | null` primitive before the `useMemo` blocks. Replaced all
`profile?.id` references in `useMemo` deps and body with `currentUserId`.

The React Compiler was inferring `profile` (the object) as the dependency but the
source specified `profile?.id`. Using a primitive eliminates the mismatch. The
"Assigned to Me" filter behavior is identical — same value, stable reference.

---

## Safety Review

- No business logic changed
- No status transitions added or removed
- No route guards changed
- No DB schema, migrations, or RLS policies changed
- No Supabase queries changed (same tables, same filters, same selects)
- No quotation conversion logic changed
- No SO approval/routing changed
- Sales User workflow in Quotations.tsx: unchanged (role === 'sales_user' path identical)
- No new dependencies introduced
- No new state management added

---

## Deferred Items (unchanged from step 18.7G)

- Quotation Processing Detail write actions
- Clarification thread structured UI
- PDF / quotation output upload
- Coordinator-specific reports tab
- Completed Quotations dedicated management page

---

## Validation Results

- `npm run build`: ✅ PASS — 0 errors, built in 6.10s
- `npx tsc --noEmit`: ✅ PASS — 0 errors
- `npx eslint src/pages/CoordinatorQueue.tsx src/pages/Quotations.tsx src/pages/SalesCoordinator.tsx`: ✅ PASS — 0 errors, 0 warnings

### 0 new lint errors introduced
Pre-existing baseline lint errors in other files (AuthContext.tsx, ProjectDetail.tsx,
ProjectNew.tsx, etc.) are unchanged and unrelated to this PR.
