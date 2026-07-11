# 2026 Sales Plan Import — Salesmen Accounts + One-Shot Importer

Loads the June copy of the 2026 plan workbook into the portal: **41 projects,
63 vehicle lines (248 units, 227,846,819.71 SAR NET)** across the 10 real
salesmen, with sector, expected delay penalty, per-line VAT flags, and the
monthly invoicing schedule. Claude never runs the real import — you do, with
the exact commands below.

## Components

| Piece | Purpose |
|---|---|
| `tools/import/lib.ts` | Shared salesman map + safety guards (same model as `tools/e2e`) |
| `tools/import/create-sales-users.ts` | Idempotent bootstrap of the 10 salesman accounts |
| `tools/import/extract-sales-plan-2026.ts` | Deterministic workbook → dataset transcription |
| `tools/import/data/Trucks_and_Vehicles_2026_June.xlsx` | Committed source workbook |
| `tools/import/data/sales-plan-2026.json` | Committed, reviewed dataset (the ONLY import source) |
| `tools/import/import-sales-plan-2026.ts` | dry-run / run / validate / rollback |
| `tools/import/reports/` | Run reports + manifests (gitignored — stay local) |

## Environment variables

| Var | Used by | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` (or `E2E_SUPABASE_URL`) | all modes | target project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | all DB modes | backend-only; never committed or printed |
| `SALES_USERS_PASSWORD` | users apply | shared initial password; never printed |
| `IMPORT_CONFIRM=true` | users apply, run, rollback | required for ANY write |
| `E2E_NON_PRODUCTION_HOSTS` | all writes | comma-separated allow-list; any other host is treated as production |
| `IMPORT_ALLOW_PRODUCTION=true` | writes to a production-classified host | explicit opt-in (this import IS destined for the real DB — set it deliberately) |

Secrets come from env only. Nothing in this tree, the reports, or the logs
contains a password or key.

## Easiest path — GitHub Actions (no local machine needed)

Two one-click workflows under the **Actions** tab (add the repository secrets
`IMPORT_SUPABASE_URL`, `IMPORT_SUPABASE_SERVICE_ROLE_KEY`, `SALES_USERS_PASSWORD`
first — Settings → Secrets and variables → Actions):

1. **"2026 Plan — 1) Salesmen Accounts"** — mode `dry-run` to preview, then
   mode `apply` with confirm phrase `CREATE-SALES-ACCOUNTS`.
2. **"2026 Plan — 2) Import Projects"** — mode `dry-run` (report renders in the
   job summary + downloadable artifact) → review → mode `run` with confirm
   phrase `IMPORT-2026-PLAN` (note the printed run id) → mode `validate`.
   Emergency undo: mode `rollback` + the run id + the same confirm phrase —
   rollback rebuilds its target set from the run tag, so it works from a fresh
   Actions environment without the original manifest file.

The CLI path below remains available and identical in behavior.

## Run order (you run these — dry-run first)

```bash
# 0. Preconditions: migrations 099 + 100 + 101 applied (Supabase SQL Editor,
#    supervised packs in docs/implementation/). The tool verifies and aborts
#    with the missing piece named.

# 1. Accounts — preview, then create the 10 salesmen (idempotent):
npm run import:plan2026:users                       # dry-run: mapping + actions
IMPORT_CONFIRM=true IMPORT_ALLOW_PRODUCTION=true \
SALES_USERS_PASSWORD='<the shared password>' \
  npx tsx tools/import/create-sales-users.ts --mode apply

# 2. Import preview (read-only; shows every intended insert + report):
npm run import:plan2026:dry-run
#    → review tools/import/reports/dry-run-*.md — especially "Needs review"

# 3. Real import (idempotent by SO number; tagged PLAN2026_IMPORT run_id=…):
IMPORT_CONFIRM=true IMPORT_ALLOW_PRODUCTION=true npm run import:plan2026:run
#    → note the run id + manifest path it prints

# 4. Reconcile the database against the dataset:
npm run import:plan2026:validate

# 5. Emergency undo (deletes ONLY that run's manifest rows):
IMPORT_CONFIRM=true IMPORT_ALLOW_PRODUCTION=true \
  npm run import:plan2026:rollback -- --run-id <run id>
```

`IMPORT_ALLOW_PRODUCTION=true` is only needed when the target host is not in
`E2E_NON_PRODUCTION_HOSTS` (i.e. your real project — which is the point of this
import; the flag makes that choice explicit rather than accidental).

## Decision table (how workbook values map)

| Workbook | System | Rule |
|---|---|---|
| Sheet "Invoicing plan 2026" rows 2–64 | source of truth | TOTAL row used for reconciliation only (qty 248 / 227,846,819.71 / pending 165,684,460) |
| Consecutive rows, same carried SO/PO/Customer | ONE project | each row = one vehicle line; PO/SO/Customer carry down within a group only |
| Group with no SO number | synthetic `PLAN26-…` so_number | flagged in needs-review (2: SAR, AFRAS-SEAFTY) |
| JOH / QTY / Total Value | vehicle line | `unit_sales_value = round(net/qty, 2)`; NET stays net in DB (`line_total_value` trigger untouched); qty 0 → 1 + flag |
| Statues: Completed / In Progress / Delayed / Pending / blank | `completed` / `active` / `active` / `approved` / `active` | original text always kept in notes; Delayed noted |
| Col 12 Dubai / KSA / blank | `dubai` / `saudi` / `not_set` | — |
| JOH contains "Medical Item" | `medical_items = yes` | else `no` |
| "Delivery based on the contract" | `customer_delivery_date` | latest date in the cell (real date cells + d-Mon-yyyy text); fallback end of last plan month; final fallback 2026-12-31 — every fallback flagged |
| PO# | **notes** (`PO#: …`) | NEVER `neg_po_number` — the NEG PO number requires its PDF (attach manually from the Commercial tab) |
| Proj. No / Remarks / order year | notes, structured | — |
| Under-production Sector (Private/Gov./Semi-Gov.) | `sector` (`private/gov/semi_gov`) | matched by Proj. No, then SO |
| Under-production "Plentily conditions" | `expected_delay_penalty_percent` | parse "up to a maximum of X%" → X; unparseable → null + text in notes |
| Under-production "Total Value + VAT" | `vat_applicable` per line | unit ratio ≈ ×1.15 (±1%) → true; ≈ ×1.0 → false; ambiguous/unmatched → false + flag |
| VAT-inclusive project value | `projects.total_sales_value` | Σ net +15% on VAT lines (matches the app's post-#167 rule); NET reconciles to the sheet |
| JANUARY…DECEMBER cells | `project_invoicing_schedule` | one row per month with money; last day of month 2026; `source = migration_backfill`; the trigger-created default line is replaced by the plan rows (kept when no monthly breakdown exists) |
| 2027 column | NOT imported | listed in needs-review |
| Under-production rows of non-10 salesmen (Zohairy, Ayman, Duha, Rahaf, Khaled, Osama, Soliman, EXPORT) | NOT imported | listed with totals in the report for a later decision |

## Safety & idempotency

- **Dry-run by default**; every write needs `IMPORT_CONFIRM=true` + the host
  guard. Dry-run is read-only (preconditions, profile resolution, existing-SO
  detection, full plan print, report).
- **Idempotent by `so_number`** (DB-unique): an existing SO is skipped and
  reported — never updated. Re-running the import never duplicates anything.
- **Tagging**: every created project/line/schedule row carries
  `PLAN2026_IMPORT run_id=<id>` in its notes/description; a manifest of created
  ids is written per run.
- **Rollback** deletes only that manifest's rows (children first) and
  re-checks the tag on each project row before deleting it.
- **DB guards respected**: `project_code` is trigger-generated; the 078
  approval gate applies to the single sheet-"Pending" project (it carries
  route + medical flags, so it passes); migration 100's default-schedule
  trigger line — created by our own insert — is replaced by the plan months
  (or kept when the project has no monthly breakdown). No trigger, RLS policy,
  or guard is changed or disabled.
- **Checksum**: the importer re-hashes the committed workbook against the
  dataset's recorded sha256 and refuses to run on a mismatch.
- **Reconciliation gates**: dataset↔sheet (extract time) and DB↔dataset
  (validate mode) — qty 248, NET 227,846,819.71, per-salesman subtotals,
  per-project schedule sums. Unit-value rounding can drift a few halalas on
  non-divisible lines (e.g. 11,584,300 / 15) — each case is flagged, tolerance
  ±1 SAR per project.

## After the import (manual follow-ups)

1. Attach the real NEG PO PDFs from each project's **Commercial tab** (the PO
   numbers are in the notes).
2. Review the "needs review" list in the dry-run/run report (blank sectors,
   ambiguous VAT, synthetic SOs, qty-0 line).
3. Decide what to do with the 17 under-production-only rows (other salesmen) —
   they were deliberately not imported.
