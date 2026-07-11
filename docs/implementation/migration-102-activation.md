# Migration 102 Activation Pack — Project Lifecycle Visibility

**File:** `supabase/migrations/102_project_lifecycle_visibility.sql`
**Status:** WRITTEN, **NOT APPLIED**. Apply it yourself in the Supabase SQL Editor
(same supervised pattern as 099/100/101). Idempotent — safe to re-run.

**Why:** operational roles could only read projects at `project_status='approved'`;
`active`/`completed` projects (and their lines, documents, timeline, WO/PN refs,
procurement records, masked PO views) disappeared for them. This blocks the 2026
plan import (25 active + 15 completed projects). Details: audit finding **C2** in
`docs/system-audit/13-full-critical-audit-2026-07.md`.

**Order:** apply 102 **BEFORE** running the 2026 plan import. (099/100/101 first
if not yet applied.)

## 1. Pre-check (expect `missing` / `1 row with approved only`)

```sql
SELECT 'is_project_readable_status' AS object,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_project_readable_status')
            THEN 'PRESENT' ELSE 'missing' END AS status;

-- Current policy condition still hard-coded to 'approved' (pre-102):
SELECT polname, pg_get_expr(polqual, polrelid) LIKE '%approved%' AS mentions_approved
FROM pg_policy WHERE polname IN ('projects: read approved', 'pvl: read approved projects');
```

## 2. Apply

Paste the full contents of `supabase/migrations/102_project_lifecycle_visibility.sql`
and run once.

## 3. Post-check (expect all `PRESENT` / `t`)

```sql
SELECT 'helper' AS object,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_project_readable_status')
            THEN 'PRESENT' ELSE 'missing' END AS status
UNION ALL
SELECT 'projects read policy',
       CASE WHEN EXISTS (SELECT 1 FROM pg_policy WHERE polname='projects: read approved')
            THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'exec_ref policy',
       CASE WHEN EXISTS (SELECT 1 FROM pg_policy WHERE polname='exec_ref: operational read')
            THEN 'PRESENT' ELSE 'missing' END;

-- The recreated policies now reference the helper instead of the literal:
SELECT polname, pg_get_expr(polqual, polrelid) LIKE '%is_project_readable_status%' AS uses_helper
FROM pg_policy
WHERE polname IN ('projects: read approved','pvl: read approved projects',
                  'pd: read approved projects','pte: operational read approved',
                  'exec_ref: operational read','pr_ops_roles_select','pri_ops_roles_select');
-- Expect uses_helper = t on all 7 rows.
```

## 4. UI verification

1. As **viewer** (or store/factory/qc): a project with status `active` or
   `completed` appears on `/projects` and opens normally (pre-102 it was hidden).
2. As viewer: money columns are still masked (cost protection unchanged).
3. As **sales_user**: still sees only own projects — unchanged.
4. Draft / submitted / rejected projects remain hidden from operational roles.

## 5. Rollback

Re-run the corresponding blocks from the ORIGINAL migrations (009/010/011/012/
014 §policies, 013 §can_read_project, 060 §views) to restore the `'approved'`-only
condition. No data is touched by 102 either way — it is purely read-rule logic.
