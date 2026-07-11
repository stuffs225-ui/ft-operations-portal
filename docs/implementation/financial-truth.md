# Financial Truth — One Invoicing Source, Explicit VAT Semantics

Resolves audit findings **H1** (three unreconciled financial sources) and **H2**
(inconsistent VAT semantics) from
`docs/system-audit/13-full-critical-audit-2026-07.md`.

## The single source of truth

**`project_invoicing_schedule` (migration 100) is THE invoicing plan.** It is
what the Sales dashboard, the Admin Invoicing Schedule page, the overdue alerts
view, and (from this change) the per-project Invoicing page all read.

`project_invoicing_plans` + `project_invoice_milestones` (migration 069) are
**read-only legacy** from this change onward:

- The per-project Invoicing page no longer creates plans or milestones and no
  longer advances milestone statuses — existing milestone rows are displayed
  read-only under a "Legacy" banner for historical reference.
- No DB object from 069 is dropped (non-destructive). Once any still-relevant
  milestone data has been re-entered as schedule lines, a reviewed
  down-migration can retire the tables.
- `receivables_aging_view` (070) remains a derived read model; it is not a
  planning source.

## VAT convention (H2)

| Field | Semantics |
|---|---|
| `project_vehicle_lines.line_total_value` | **NET** — trigger-computed, never touched |
| `project_vehicle_lines.vat_applicable` | 15% VAT applies to that line (rate constant: `VAT_RATE` in `src/lib/commercialFields.ts`, mirrored as `0.15` in the 103 views) |
| `projects.total_sales_value` | **GROSS** (VAT-inclusive) since PR #167 for wizard-created projects; equals NET for projects with no VAT lines |
| `project_invoicing_schedule.invoice_amount` | **NET** — the convention going forward |

Why NET for the schedule: the company plans in net (the 2026 workbook's monthly
cells are net — 173,417,428.71 imported as-is); VAT is a pass-through derived
from the flagged lines, not a planned quantity.

**Known systematic exception:** migration 100's AFTER INSERT trigger creates a
default schedule line carrying `total_sales_value` — **gross** for VAT
projects. Rather than rewriting the trigger (it fires before vehicle lines
exist, so net is unknowable at that moment), the reconciliation view classifies
these lines as `matches_gross`, and Admin normalizes the amount explicitly via
the existing audited amount-adjust RPC when it matters.

## The two views (migration 103)

- **`project_financials`** — per project: `lines_net`, `lines_vat`,
  `lines_gross`, `vat_line_count`, `total_sales_value`. Derived live from
  vehicle lines; nothing stored.
- **`project_schedule_reconciliation`** — non-cancelled schedule total + line
  count vs net/gross, classified:
  `matches_net` (follows the convention) · `matches_gross` (trigger default —
  normalize when relevant) · `mismatch` (needs attention) · `no_schedule`.

Both are SECURITY INVOKER with an explicit revenue restriction in the WHERE
clause — **admin / operations_manager / the owning sales_user** only (the same
population migration 060 allows to see revenue figures). Coordinator/viewer/
operational roles get zero rows, by design, without errors.

## What the app shows now

- **Project → Invoicing**: schedule lines are the plan (read-only here; Admin
  manages dates/amounts on the Admin page with mandatory reasons). Net / VAT /
  Gross summary card from `project_financials`. Legacy milestones shown
  read-only only when rows exist.
- **Admin → Invoicing Schedule**: reconciliation strip (counts per
  classification + the attention list with net/VAT/gross/schedule columns).
- Pre-103 both degrade gracefully via the established deferred-migration
  pattern ("apply migration 103" notice); nothing crashes.

## Deliberately out of scope (follow-ups)

- Retiring 069's tables (needs a data-migration decision).
- `receivables_aging_view` alignment to the net convention.
- Base-table money exposure via `project_vehicle_lines` SELECT policy for
  operational roles (060 masked the *views*; the base policy still returns
  value columns — flagged during this work as a hardening follow-up).
