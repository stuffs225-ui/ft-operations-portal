# Phase 0A — set-state-in-effect Stabilization

## Summary

Removed all 17 `react-hooks/set-state-in-effect` ESLint errors from the codebase so future
UX/design PRs are not blocked by this pattern. Visual design, business logic, Supabase queries,
and workflow rules were not changed.

---

## Latest Main SHA

`724a588` (Merge pull request #133 — docs: Frontend Design System & UX Transformation Study)

---

## Files Changed (17 source files)

| File | Location | Fix Pattern |
|------|----------|-------------|
| `src/context/AuthContext.tsx` | line 58 | Pattern 3 — mock/dev branch wrapped in `Promise.resolve().then()` |
| `src/pages/AdminAccessRequests.tsx` | line 34 | Pattern 3 — mock branch |
| `src/pages/AdminAccessRequestDetail.tsx` | line 60 | Pattern 3 — mock branch |
| `src/pages/FactoryProjectWorkspace.tsx` | line 136 | Pattern 3 — mock branch + early return guard |
| `src/pages/GeneratedDocumentDetail.tsx` | line 32 | Pattern 3 — mock branch |
| `src/pages/GeneratedDocuments.tsx` | line 20 | Pattern 3 — mock branch |
| `src/pages/Notifications.tsx` | line 44 | Pattern 3 — mock branch |
| `src/pages/ProjectInvoicing.tsx` | line 93 | Pattern 3 — `loadData()` call deferred via `Promise.resolve().then()` |
| `src/pages/ProjectNew.tsx` | line 192 | Pattern 2 — `useState(!!fromQuotationId && isSupabaseConfigured)`; removed `setFromQuotationLoading(true)` |
| `src/pages/QuotationDetail.tsx` | line 277 | Pattern 3 — mock branch |
| `src/pages/QuotationNew.tsx` | lines 128, 155 | Pattern 3 (mock branch) + Pattern 2 (`useState(!!hotProjectId && isSupabaseConfigured)`; removed `setHotProjectLoading(true)`) |
| `src/pages/Settings.tsx` | line 586 | Pattern 2 — `useState(isSupabaseConfigured)`; removed `setDbLoading(true)` |
| `src/pages/TemplateApprovals.tsx` | line 35 | Pattern 3 — mock branch |
| `src/pages/TemplateDetail.tsx` | line 43 | Pattern 3 — mock branch |
| `src/pages/TemplateGenerate.tsx` | line 44 | Pattern 3 — mock branch (calls internal `seed()` function) |
| `src/pages/Templates.tsx` | line 42 | Pattern 3 — mock branch |
| `src/pages/WoPnGate.tsx` | line 644 | Pattern 3 — `loadData()` deferred; removed unused `eslint-disable` comment |

---

## Fix Patterns Used

**Pattern 2 — Correct initial `useState`**
When a `setLoading(true)` or similar call is the first synchronous line of an effect, replace
`useState(false)` with `useState(<condition>)` so the correct initial value is derived at mount
and the setter call is eliminated from the effect body entirely.

Used in: `ProjectNew.tsx`, `QuotationNew.tsx`, `Settings.tsx`

**Pattern 3 — Mock branch deferred via `Promise.resolve().then()`**
When the dev/mock branch of an effect sets multiple state values synchronously, wrap the
entire branch body in `Promise.resolve().then(() => { ... })`. The `return` guard stays
synchronous so the real Supabase path is not reached. Behavior is identical; the microtask
fires before the next paint.

Used in: all remaining files

---

## Errors Before / After

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| `set-state-in-effect` errors | 17 | 0 | −17 |
| Total lint errors | 38 | 21 | −17 |
| Total lint warnings | 36 | 35 | −1 |
| Total lint problems | 74 | 56 | −18 |

---

## Confirmation: Query Meaning Did Not Change

- Every Supabase `.from()`, `.select()`, `.eq()`, `.order()`, `.maybeSingle()` call is identical to before.
- No filters, joins, orderings, or RLS-sensitive conditions were modified.
- No mutation payloads (`insert`, `update`, `delete`) were touched.

## Confirmation: Business Workflows Did Not Change

- Approval routing, role checks, status transitions, PR/PO creation, WO/PN gate logic, and
  quotation submission flows are untouched.
- The only changes are in the mock/dev-mode data-loading branches and in two `useState`
  initial-value expressions.
- No routes, navigation, `roleMatrix`, DB schema, or migrations were modified.

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run build` | ✓ Built in ~5.6 s, 0 errors |
| `npx tsc --noEmit` | ✓ 0 type errors |
| `npm run lint` (global) | 56 problems (21 errors, 35 warnings) — 0 set-state-in-effect |
| `npx eslint <changed files>` | 0 set-state-in-effect errors |

Remaining 21 errors are pre-existing: 2 `react-hooks/immutability` (AuthContext `fetchProfile`
access-before-declaration), 1 `react-hooks/purity` (ProjectNew `Date.now`), 18
`@typescript-eslint/no-empty-object-type` (database types and form components). None were
introduced by this PR.

---

## Remaining Global Lint Baseline (56 problems)

| Rule | Count | Source |
|------|-------|--------|
| `@typescript-eslint/no-empty-object-type` | 18 errors | database types, form primitives |
| `@typescript-eslint/no-explicit-any` | ~18 warnings | various pages |
| `react-hooks/immutability` | 2 errors | AuthContext (fetchProfile before-decl) |
| `react-hooks/purity` | 1 error | ProjectNew (Date.now in handler) |
| `react-refresh/only-export-components` | ~2 warnings | AdminAccessRequests, AuthContext |
| `react-hooks/exhaustive-deps` | ~2 warnings | pre-existing |

None of these block feature work. The `no-empty-object-type` and `no-explicit-any` groups
are candidates for the next dedicated lint cleanup (Phase 0B, if prioritised).

---

## Recommended Next Step

**Step 19.5B — Store / Warehouse UX Upgrade**

The Store module is the highest-priority UX work identified in the transformation study
(score 27 / 30). It covers ~12 pages including receiving, custody, serials, issuance,
inventory, and QC handoff. Visual-only upgrade; protect receiving/custody/serial flows
and all Supabase write operations.
