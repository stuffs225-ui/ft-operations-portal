# Real Sales Users + Sales Plan 2026 Import Tool

**Branch:** `feature/real-sales-users-and-plan-import`
**Status:** Tools written and parse-tested against the real workbook. **No users created, no database
writes performed, nothing deployed.** Part 1 (`sales-users-bootstrap.ts --mode apply`) and Part 2
(`import-sales-plan-2026.ts --mode import`) are both run manually, later, by a human with the
confirmation env vars set.

---

## Part 1 — Real sales user accounts

`tools/import/sales-users-bootstrap.ts` provisions the 10 real sales employees as `sales_user`
accounts, using the exact same create-if-missing / upsert-role / verify-sign-in pattern as
`tools/e2e/e2e-auth-bootstrap.ts` (see that file for the reference pattern this mirrors).

| Email | Full name |
|---|---|
| `nader@ft.com` | Nader |
| `mahmoud@ft.com` | Mahmoud |
| `abdullah.s@ft.com` | Abdullah |
| `abdulhamid@ft.com` | Abdulhamid |
| `essam@ft.com` | ESSAM |
| `obada@ft.com` | Obada |
| `ahmed.qadomi@ft.com` | Ahmed Qadomi |
| `hatem@ft.com` | Hatem |
| `suliman@ft.com` | Suliman |
| `nadeem@ft.com` | Nadeem |

All 10 sign in with one shared password and land on `/sales` with role `sales_user`.

### Running it

```bash
# Dry-run (default) — no connection, no writes, just prints the plan
npx tsx tools/import/sales-users-bootstrap.ts --mode dry-run

# Apply — creates/aligns the 10 real accounts
SALES_IMPORT_SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
VITE_SUPABASE_ANON_KEY=<anon-key> \
REAL_SALES_USER_PASSWORD=<the-agreed-shared-password> \
REAL_SALES_USERS_CONFIRM=true \
npx tsx tools/import/sales-users-bootstrap.ts --mode apply
```

The password is read **only** from `REAL_SALES_USER_PASSWORD` — it is never hardcoded, logged, or
echoed anywhere in the script or its output (only masked emails are printed, e.g. `n***@ft.com`).
An existing account's password is never changed unless `--update-passwords` is also passed.

---

## Part 2 — Sales Plan 2026 Import Tool

`tools/import/import-sales-plan-2026.ts` reads the real "Trucks and Vehicles 2026" workbook
(`Invoicing plan 2026` sheet, cross-referenced with `Under production Orders`) and, once approved,
creates `projects` / `project_vehicle_lines` / `project_invoicing_schedule` rows under the 10 real
sales users above.

It uses a **dependency-free XLSX reader** (`tools/import/lib/xlsx-reader.ts` — ZIP + shared-strings +
merged-cell resolution using only Node's built-in `zlib`) rather than adding a new npm package for a
narrow, internally-controlled input format.

### Modes

| Mode | Connects to DB? | Writes? | Requires |
|---|---|---|---|
| `parse` (default) | No | No | `--file <path.xlsx>` |
| `import` | Yes | Yes | `--file`, `IMPORT_CONFIRM=true`, target host in `SALES_IMPORT_ALLOWED_HOSTS` |
| `validate` | Yes (SELECT only) | No | `--batch-id <id>` |
| `revert` | Yes | Deletes (batch only) | `--batch-id <id>`, `IMPORT_CONFIRM=true` |

### Grouping logic — read this before anything else

`SO number` (plan-sheet column F) is the one true project key: `projects.so_number` is `unique` in
the schema. **`Proj. No` (column E) is a per-line internal reference, not a project identifier** —
one Sales Order routinely has several distinct `Proj. No` values, one per vehicle/JOH type (e.g. SO
`103009` has 5 lines: `1921`, `1923`, `1924`, `1922`, `1920`). Rows are grouped by SO number; each
group becomes **one `projects` row** with **one `project_vehicle_lines` row per line in the group**.
`project_code` is set to the SO number itself (already unique, human-recognizable) rather than any
single `Proj. No` — flag in review if a different source is preferred.

Rows with **no SO number** (6 in the source file) and SO-number cells containing **multiple values**
separated by `|` (1 case: `"103351 | 103243"`) are excluded from import and listed under "Decisions
needed" in the parse report — never silently assigned to one side or split.

### Column mapping — "Invoicing plan 2026" → schema

| Sheet column | Field | Destination |
|---|---|---|
| F — SO number | grouping key | `projects.so_number`, `projects.project_code` |
| G — Customer | customer name (first non-blank in group; flagged if it differs across lines) | `projects.customer_name` |
| B — Done by | sales owner (normalized, matched against the 10 approved users) | `projects.sales_owner_id` (via `profiles.email` lookup) |
| L — Dubai/KSA | `Dubai`→`dubai`, `KSA`→`saudi`, else `not_set` (flagged) | `projects.manufacturing_location` |
| N — Statues | `Completed`→`completed`; `In Progress`/`Pending`/`Delayed`→`active` (note kept) | `projects.project_status` |
| J — Total Value (summed per group) | | `projects.total_sales_value` |
| H — JOH | one line per row in the group | `project_vehicle_lines.vehicle_type` / `.description` |
| I — QTY | `>0` used as-is; `0`/blank defaulted to `1` (flagged — DB requires `quantity > 0`) | `project_vehicle_lines.quantity` |
| J ÷ I (per row) | | `project_vehicle_lines.unit_sales_value` |
| P..AA — JANUARY..DECEMBER (2026) | one schedule row per non-zero month | `project_invoicing_schedule.invoice_amount` / `.current_invoice_date` |
| AC — 2027 | non-zero → one schedule row, month defaulted to January 2027 (flagged) | `project_invoicing_schedule` (`source='migration_backfill'`) |

### Column mapping — "Under production Orders" → enrichment (notes only)

These fields have **no destination column in the current schema**. They are preserved verbatim in a
structured `notes` string (`"PO#: … | Sector: … | Penalty: … | …"`) rather than dropped, and are
documented here as **future schema candidates**:

| Sheet column | Content | Where it goes today |
|---|---|---|
| D — PO# / Customer PO# | free text, often combines PO#/WO#/PN# | `notes` (`PO#: …`) |
| E — Proj. No | per-line internal reference | `notes` (`Proj No: …`), also on the vehicle line's own `notes` |
| K — Pending Value | outstanding amount | `notes` (`Pending Value: …`) |
| M — Delivery based on the contract | free text, sometimes multiple dates | `notes` (`Delivery (contract): …`) |
| O — Remarks | free text | `notes` (`Remarks: …`) |
| J — Sector (Under production Orders only) | Private / Gov. / Semi-Gov. | `notes` (`Sector: …`) — **only merged in when the row's owner is one of the 10 approved users**; see PR #167 (`sector` column added by migration 101, not yet applied — deliberately not used here so this tool has no dependency on an unapplied migration) |
| AI/AJ/AK — Plentily conditions/status/amount | delay penalty tracking | `notes` (`Penalty: …`) |
| AL — Total Value + VAT | VAT-inclusive total per the source | `notes` (`Total incl. VAT (source): …`) |
| S — NO of Delevried | delivered-unit count | `notes` (`Delivered: …`) |
| P/Q/R — Dubai/JED/Purchase Remarks | free text | `notes` (`Production remarks: …`) |

`Under production Orders` also lists many rows owned by people **outside** the 10 approved sales
users (Zohairy, Ayman, Duha, Rahaf, Khaled, Osama, Dam (Soliman Hassan), EXPORT (Huthaifa & Mohamad)
— 31 rows across those 8 people). Per the task instruction, these are **excluded from enrichment and
import entirely** and listed in the parse report as "needs assignment decision" — never guessed at.

### Gap: `customer_delivery_date` has no source column

`projects.customer_delivery_date` is `date not null`. Neither sheet has a single clean "delivery
date" column (only free-text contract schedules and numeric Excel date serials in unrelated
columns). The tool estimates it as **the last month with a scheduled invoicing amount** (or
`2026-12-31` if a project has none at all) and marks it `(estimated)` in the report. This is called
out once, up front, in the parse report rather than repeated as a flag on all 38 projects — treat
every delivery date as provisional and override via the Admin invoicing-schedule UI after import if
a better date is known.

### Known rounding characteristic

`project_vehicle_lines.unit_sales_value` is derived as `total_value ÷ quantity`, rounded to 2
decimal places, and the DB then recomputes `line_total_value = quantity × unit_sales_value` via its
own trigger. When `total_value` is not evenly divisible by `quantity`, the recomputed line total can
differ from the source total by a few cents (e.g. SO `103074`: source total `11,584,300.00` →
recomputed `11,584,300.05` for a 15-unit line). This is a normal floating-point/rounding artifact of
"distribute a total across N units," not a data error — visible directly in the parse report's line
table.

### Running it

```bash
# Parse — reads the workbook only, opens no DB connection, writes a report
npx tsx tools/import/import-sales-plan-2026.ts --mode parse --file "/path/to/Trucks_and_Vehicles_2026.xlsx"
# → artifacts/import-sales-plan/parse-report.md  (reviewable, committed)
# → artifacts/import-sales-plan/parse-data.json  (local only, NOT committed)

# Import — only after the parse report has been reviewed and approved
SALES_IMPORT_SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
SALES_IMPORT_ALLOWED_HOSTS=<project>.supabase.co \
IMPORT_CONFIRM=true \
npx tsx tools/import/import-sales-plan-2026.ts --mode import --file "/path/to/Trucks_and_Vehicles_2026.xlsx"
# → artifacts/import-sales-plan/<batch_id>.json  (manifest — every row created, keyed by batch id)
# → artifacts/import-sales-plan/<batch_id>.md    (batch report)

# Validate a batch (SELECT-only — confirms every manifest row still exists)
SALES_IMPORT_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
npx tsx tools/import/import-sales-plan-2026.ts --mode validate --batch-id <batch_id>

# Revert a batch (deletes ONLY that batch's rows, children before parents)
SALES_IMPORT_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
SALES_IMPORT_ALLOWED_HOSTS=<project>.supabase.co IMPORT_CONFIRM=true \
npx tsx tools/import/import-sales-plan-2026.ts --mode revert --batch-id <batch_id>
```

### Safety model

- **Independent of the E2E seeder** — does not use the `E2E_SCENARIO_SEED` tag, is never touched by
  `npm run e2e:workflow:cleanup`, and shares no artifact directory with `tools/e2e/`.
- Every row created carries `IMPORT_BATCH=<batch_id>` in its `notes` / `schedule_description` column,
  and a JSON manifest records `{table, id, so_number, label}` for every row — a batch can be reviewed
  (`validate`) or fully reversed (`revert`) by batch id alone.
- **Never overwrites or deletes existing data.** A group whose `so_number` already exists in
  `projects` is skipped and reported, never updated.
- `import` requires **both** `IMPORT_CONFIRM=true` **and** the target host explicitly listed in
  `SALES_IMPORT_ALLOWED_HOSTS`. This is the same *shape* of guard as `tools/e2e`'s
  `E2E_NON_PRODUCTION_HOSTS` allow-list, deliberately inverted: the E2E guard exists to keep test
  data **out of** production by default; this guard exists to make sure a misconfigured environment
  variable can never silently point real business data at the **wrong** Supabase project — naming the
  real target host is a deliberate, explicit act either way.
- A project group is only import-ready if its owner matched one of the 10 approved users **and** it
  raised no "needs assignment decision" flag; everything else is skipped and reported, never guessed.
- `project_invoicing_schedule` sequence numbers start at `2` — sequence `1` is always the DB
  trigger's own auto-created default schedule line (migration 100, fires on every `projects` insert
  regardless of caller). `revert` deletes that trigger-created row too (scoped strictly to the
  batch's own project ids), mirroring how `tools/e2e/e2e-full-workflow.ts` handles the same trigger.
- Schedule rows use `source = 'migration_backfill'` (the schema's own enum value for "created by a
  migration/import backfill for existing/historical data") — chosen instead of `admin_manual` because
  it precisely matches what this is, no schema invention needed.
- Every schedule line marked `'invoiced'` requires **both** the project's mapped status =
  `completed` **and** the invoicing month being in the past relative to the run date; everything
  else is `'scheduled'` — the same "let the existing overdue view derive risk from a past scheduled
  date" pattern the E2E seeder's S10 scenario already uses. This tool never sets `'overdue'` itself.

### What was and wasn't done this session

- ✅ Both tools written, type-checked (`tsc -p tsconfig.e2e.json`), and lint-checked.
- ✅ `parse` mode run against the real uploaded workbook; the report is committed at
  `artifacts/import-sales-plan/parse-report.md` for review.
- ❌ `sales-users-bootstrap.ts --mode apply` was **not** run — no real accounts were created.
- ❌ `import-sales-plan-2026.ts --mode import` was **not** run — no database writes were made.
- ❌ Nothing was deployed.
