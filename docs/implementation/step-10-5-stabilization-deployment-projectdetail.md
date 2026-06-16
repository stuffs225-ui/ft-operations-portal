# Step 10.5 Stabilization — ProjectDetail JSX Fragment Fix

## Summary

Minimal production fix for a build failure introduced in Step 10.5E.
The Vercel deployment was failing because `tsc -b` (TypeScript build mode)
rejected invalid JSX in `ProjectDetail.tsx`. No business logic, Supabase
queries, routing, or schema changes were made.

## Root cause

The Step 10.5E restructure added an "Approval & Routing" section to the bottom
of the `overview` tab panel. The resulting conditional rendered two sibling
top-level JSX elements without a Fragment wrapper:

```tsx
// BROKEN — two siblings with no Fragment
{activeTab === 'overview' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* project info cards */}
  </div>

  <div className="mt-2">
    {/* Approval & Routing section */}
  </div>
)}
```

TypeScript in `--noEmit` mode (used locally) was lenient and did not surface
this error. Vercel runs `tsc -b` (project references / build mode), which is
stricter and correctly reported:

```
src/pages/ProjectDetail.tsx(1059,9): error TS1005: ')' expected.
src/pages/ProjectDetail.tsx(1114,8): error TS1381: Unexpected token.
```

Because the compile step failed, the Vite build could not complete, and the
deployed bundle was never updated — explaining why the live site still showed
the pre-10.5E version of ProjectDetail.

## Fix applied

Added `<>` / `</>` Fragment tags to wrap the two sibling elements:

```tsx
// FIXED
{activeTab === 'overview' && (
  <>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* project info cards */}
  </div>

  <div className="mt-2">
    {/* Approval & Routing section */}
  </div>
  </>
)}
```

**File changed:** `src/pages/ProjectDetail.tsx` — lines 886 (`<>`) and 1115 (`</>`)

## Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ zero errors |
| `npm run lint` | ⚠️ environment error — `@eslint/js` package missing in container (pre-existing, unrelated to this change) |

## TypeScript version note

The container has TypeScript 6.0.2 installed locally, but `package-lock.json`
pins TypeScript at **5.9.3**. Vercel runs `npm ci` which installs from the
lockfile (5.9.3). TypeScript 6.0 introduces `TS5101` (baseUrl deprecation as
error), so the baseUrl warnings seen in the local container will NOT appear on
Vercel. The JSX fragment error IS present in both 5.9.x and 6.x.

## Files changed

- `src/pages/ProjectDetail.tsx` — Fragment wrapper added to overview panel
- `docs/implementation/step-10-5-stabilization-deployment-projectdetail.md` — this file

## Governance notes

- No business logic changes
- No Supabase queries changed
- No database schema or RLS policy changes
- No route guards added or removed
- No new dependencies
- `npx tsc --noEmit` passes with zero errors
