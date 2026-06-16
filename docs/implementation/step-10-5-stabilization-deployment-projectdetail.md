# Step 10.5 Stabilization — ProjectDetail Build Fix

## Summary

Two minimal fixes for a Vercel build failure introduced in Step 10.5E.
Both fixes are in `src/pages/ProjectDetail.tsx` only. No business logic,
Supabase queries, routing, schema, or RLS changes were made.

## Why `tsc --noEmit` missed both issues

The build command is `tsc -b && vite build`. `tsc -b` uses project references
and processes `tsconfig.app.json`, which has `noUnusedLocals: true`.

`tsc --noEmit` (run without `-p`) finds the root `tsconfig.json`, which has
`"files": []` (a project-references config) and checks no source files
directly. This means `tsc --noEmit` silently passes even when `tsc -b` fails.

**Lesson:** always validate against `npm run build`, not `tsc --noEmit`.

---

## Fix 1 — JSX Fragment (commit 51988f3)

### Root cause

The Step 10.5E restructure merged the old `approval` tab into the Overview
panel, resulting in two adjacent sibling elements inside one JSX conditional:

```tsx
// BROKEN
{activeTab === 'overview' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* project info cards */}
  </div>

  <div className="mt-2">
    {/* Approval & Routing section */}
  </div>
)}
```

`tsc -b` reported:
```
src/pages/ProjectDetail.tsx(1059,9): error TS1005: ')' expected.
src/pages/ProjectDetail.tsx(1114,8): error TS1381: Unexpected token.
```

### Fix

```tsx
{activeTab === 'overview' && (
  <>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">...</div>
  <div className="mt-2">...</div>
  </>
)}
```

**Lines changed:** 886 (`<>` added), 1115 (`</>` added)

---

## Fix 2 — Unused imports (commit 21545f4)

### Root cause

`CheckSquare`, `Shield`, `Edit2`, and `Package` were imported from
`lucide-react` but never referenced after the 12-tab → 6-tab restructure.
`tsconfig.app.json` has `"noUnusedLocals": true`, so `tsc -b` reported:

```
src/pages/ProjectDetail.tsx(5,3):  error TS6133: 'CheckSquare' is declared but its value is never read.
src/pages/ProjectDetail.tsx(6,3):  error TS6133: 'Shield' is declared but its value is never read.
src/pages/ProjectDetail.tsx(6,11): error TS6133: 'Edit2' is declared but its value is never read.
src/pages/ProjectDetail.tsx(7,52): error TS6133: 'Package' is declared but its value is never read.
```

### Fix

Removed exactly those 4 identifiers from the import statement. All remaining
imports (`AlertCircle`, `Info`, `Check`, `Truck`, etc.) are still used.

---

## Validation (after both fixes)

| Check | Result |
|---|---|
| `npm ci` | ✅ installs TypeScript 5.9.3 from lockfile (matches Vercel) |
| `npm run build` (`tsc -b && vite build`) | ✅ 1795 modules, zero errors |
| `npx tsc --noEmit` | ✅ zero errors |
| `npm run lint` | ⚠️ pre-existing issues across many files; none introduced by this fix |

## TypeScript version note

The container has TypeScript 6.0.2 installed globally, but `package-lock.json`
pins TypeScript at **5.9.3**. Vercel uses the lockfile (`npm ci`) and installs
5.9.3. TypeScript 6.0 would introduce `TS5101` (baseUrl deprecation as error),
which does NOT appear on Vercel. The JSX and unused-import errors above are
present in both 5.9.x and 6.x.

## Files changed

- `src/pages/ProjectDetail.tsx` — Fragment wrapper + 4 unused imports removed
- `docs/implementation/step-10-5-stabilization-deployment-projectdetail.md` — this file

## Governance notes

- No business logic changes
- No Supabase queries changed
- No database schema or RLS policy changes
- No route guards added or removed
- No new dependencies
- `npm run build` passes with zero errors
