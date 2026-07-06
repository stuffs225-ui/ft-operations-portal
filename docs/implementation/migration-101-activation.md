# Migration 101 Activation Pack — Commercial Fields

**File:** `supabase/migrations/101_commercial_fields.sql`
**Status:** WRITTEN, **NOT APPLIED**. Apply it yourself in the Supabase SQL
Editor (same supervised pattern as 099/100). Claude never applies migrations.

Adds (additive only, no existing data touched):
`sector_enum` + `sector` on `hot_projects` / `quotation_requests` / `projects` ·
`projects.neg_po_number` · `projects.neg_po_document_id` (FK →
`project_documents`, ON DELETE SET NULL) ·
`projects.expected_delay_penalty_percent` (0–100 CHECK) ·
`project_vehicle_lines.vat_applicable` (default false).

Deliberate decision: **no `ALTER TYPE` on `project_document_type`** — the NEG PO
PDF uses the existing `'customer_po'` document type; the FK identifies the exact
NEG PO document. This avoids the Postgres add-enum-value transaction limitation.

## 1. Pre-check (run first — expect all `missing`)

```sql
SELECT 'sector_enum' AS object,
       CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname='sector_enum') THEN 'PRESENT' ELSE 'missing' END AS status
UNION ALL
SELECT 'projects.sector',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='sector') THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'quotation_requests.sector',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotation_requests' AND column_name='sector') THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'hot_projects.sector',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hot_projects' AND column_name='sector') THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'projects.neg_po_number',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='neg_po_number') THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'projects.neg_po_document_id',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='neg_po_document_id') THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'projects.expected_delay_penalty_percent',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='expected_delay_penalty_percent') THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'project_vehicle_lines.vat_applicable',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_vehicle_lines' AND column_name='vat_applicable') THEN 'PRESENT' ELSE 'missing' END;
```

## 2. Apply

Paste the full contents of `supabase/migrations/101_commercial_fields.sql`
into the SQL Editor and run it once. It is idempotent (guarded `do $$` blocks
and `IF NOT EXISTS`), so re-running is safe.

## 3. Post-check (expect all `PRESENT`, plus the two extras below)

Re-run the pre-check — every row must now say `PRESENT`. Then:

```sql
-- FK exists and points at project_documents
SELECT conname, confrelid::regclass AS references_table
FROM pg_constraint
WHERE conrelid = 'public.projects'::regclass AND conname LIKE '%neg_po_document%';

-- CHECK constraint exists
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.projects'::regclass
  AND conname = 'projects_delay_penalty_percent_range';

-- Existing data untouched: all new columns NULL/false everywhere
SELECT
  (SELECT count(*) FROM projects WHERE sector IS NOT NULL)                          AS projects_with_sector,
  (SELECT count(*) FROM projects WHERE neg_po_number IS NOT NULL)                   AS projects_with_neg_po,
  (SELECT count(*) FROM projects WHERE expected_delay_penalty_percent IS NOT NULL)  AS projects_with_penalty,
  (SELECT count(*) FROM project_vehicle_lines WHERE vat_applicable)                 AS lines_with_vat;
-- Expect: 0, 0, 0, 0 immediately after applying.
```

## 4. UI verification after applying

1. `/projects/new` — Sector select saves; a vehicle line with "Apply VAT (15%)"
   shows live VAT + total, and the saved project's Total Sales Value includes it.
2. Any project detail → Commercial tab — add a NEG PO (number + PDF): the PDF
   uploads as `PO#<number> To NEG.pdf`, and the card shows number + view link.
3. As operations_manager or admin — set a Delay Penalty (e.g. 2.5) on a
   project; as sales/viewer confirm it is read-only.
4. `/quotations/new` and `/hot-projects/new` — Sector select saves and the
   badge appears on the detail/list.

## 5. Pre-application behavior (why the app is safe before you apply)

All new fields are sent to the database **only when the user actually fills
them** (conditional insert/update payloads) and are read tolerantly (`?? null`).
Every existing flow — creating projects/quotations/hot projects without the new
fields — works identically before the migration. If someone fills a new field
before 101 is applied, the form shows the normal Supabase error message (no
crash, nothing partially saved for that field).

## 6. Rollback notes

Columns are additive and nullable; the safe rollback is simply to stop using
them. Do **not** drop columns/types ad-hoc in production — if removal is ever
required, do it via a reviewed down-migration after confirming no rows carry
values.
