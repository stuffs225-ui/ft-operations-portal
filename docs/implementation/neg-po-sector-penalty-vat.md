# NEG PO · Sector · Delay Penalty · Line VAT — Implementation Spec

**Branch:** `feature/neg-po-sector-penalty-vat`
**Migration:** `supabase/migrations/101_commercial_fields.sql` — **written, NOT
applied** (see `migration-101-activation.md` for the supervised activation
pack). No RLS, permission, guard, or business-calculation changes.

---

## Discovery findings (Part A)

- **Projects write access (RLS):** `can_write_project()` (013) — admin/ops
  always; sales_user only on own projects in `draft`/`sent_back_for_revision`.
  The Delay-Penalty UI gate (ops/admin) therefore *matches* the DB rule rather
  than merely decorating it; NEG PO editing mirrors the same rule.
- **Documents:** `project_documents` + storage bucket `project-documents`,
  upload path `<projectId>/<type>/<ts>_<name>`; `document_type` is the DB enum
  `project_document_type` which already includes **`customer_po`** — reused for
  the NEG PO PDF (no `ALTER TYPE` needed; the `neg_po_document_id` FK is what
  identifies THE NEG PO document). `openSignedUrl()` (src/lib/documents.ts) is
  the established view-file pattern.
- **Totals:** ProjectNew computes `totalValue = Σ qty × unit` →
  `projects.total_sales_value`; `project_vehicle_lines.line_total_value` is
  **trigger-computed as NET** (010) — deliberately untouched.
- Downstream consumers (Sales dashboard, receivables, invoicing schedule) read
  `total_sales_value` as an opaque amount — unchanged semantics; for new
  projects using VAT lines it simply arrives VAT-inclusive.

## Field-by-field spec

### 1. NEG PO (projects)
- `neg_po_number text NULL` + `neg_po_document_id uuid NULL → project_documents
  (ON DELETE SET NULL)`.
- **Hard rule:** the number is never persisted without its PDF. Enforced at the
  application layer — the save action is atomic: upload PDF → insert
  `project_documents` row (`document_type='customer_po'`, remarks `NEG PO`) →
  update both project columns; any failure persists nothing (wizard) / shows an
  error and persists nothing (detail card).
- **File name (auto):** `PO#<number> To NEG.pdf` (PDF only; 10 MB max).
- **Where:** ProjectNew step 1 (optional) + ProjectDetail → Commercial tab NEG
  PO card, available at **any stage** for admin/ops (sales_user on own
  draft/sent-back projects — mirrors `can_write_project`).
- **Replace:** uploads a new document row and repoints the FK; the previous
  file remains in the Documents tab (never hard-deleted).

### 2. Sector (hot_projects, quotation_requests, projects)
- `sector_enum ('private','gov','semi_gov')`, nullable everywhere; labels
  Private / Gov. / Semi-Gov. (matches the 2026 plan's values).
- Selects (optional) in HotProjectNew, QuotationNew, ProjectNew; neutral badge
  next to the customer name on the Projects / Hot Projects / Quotations lists
  and a Sector row in ProjectDetail SO Details.
- **Carry-forward:** hot project → quotation (prefill) and quotation → SO
  (ProjectNew prefill) both copy `sector`, following the existing prefill code
  paths — no new conversion logic.

### 3. Expected Delay Penalty (projects)
- `expected_delay_penalty_percent numeric(5,2) NULL`, CHECK 0–100.
- ProjectDetail → Commercial tab card: value + explainer ("expected penalty if
  delivery slips past the expected delivery date"). **Edit: operations_manager
  + admin only** (UI gate that matches `can_write_project`); clearable to null;
  changes recorded via `recordProjectEvent`.

### 4. Line VAT (project_vehicle_lines)
- `vat_applicable boolean NOT NULL DEFAULT false`.
- **`VAT_RATE = 0.15`** — single source of truth in
  `src/lib/commercialFields.ts` (with `lineVatAmount` / `lineTotalWithVat`).
- ProjectNew step 3: per-line "Apply VAT (15%)" checkbox → live VAT amount +
  VAT-inclusive line total; wizard breakdown (Subtotal / VAT / Total) and
  **`total_sales_value` is saved VAT-inclusive**. Review step shows a VAT
  column and VAT-inclusive totals.
- ProjectDetail lines table: VAT column (`15% · amount`), VAT-inclusive line
  totals, footer breakdown. **`line_total_value` stays NET in the DB** (its
  trigger untouched) — all VAT math is derived in the UI from the flag.

**Worked example:** line qty 2 × 22,000 with VAT → VAT = 6,600; line total =
50,600. Second line qty 1 × 10,000 without VAT → 10,000. Subtotal 54,000, VAT
6,600, **Total Sales Value saved = 60,600**.

### Example rule (existing data)
Every existing row has `sector/neg_po_* /penalty = NULL` and
`vat_applicable = false` → **all existing totals and displays are unchanged**.

## Role gating matrix

| Field | View | Edit |
|---|---|---|
| NEG PO | anyone who can view the project | admin, ops; sales_user on own draft/sent-back |
| Sector | all lists/details where the record is visible | creation forms (all creators); carried on conversion |
| Delay Penalty | anyone who can view the project (Commercial tab) | **operations_manager, admin only** |
| VAT flag / amounts | amounts follow the existing `canSeeMoney` gate (admin/ops) in ProjectDetail; flags set in the wizard | line editing = wizard (creation) |

## Pre-application behavior (before migration 101)

- All new fields are **conditionally included** in insert/update payloads —
  sent only when the user actually sets them. Every existing flow (create
  project/quotation/hot project without the new fields) is byte-identical to
  before.
- Reads are tolerant (`?? null` / optional types) — missing columns simply
  render as "not set" / no badge / no VAT.
- If a user fills a new field before 101 is applied: the NEG PO / penalty cards
  show a clear "migration 101 pending" message; forms surface the normal
  Supabase error. No crash, no partial state.

## Part G — tooling alignment decision

`tools/import/import-sales-plan-2026.ts` does **not** exist on main yet. When
the import task runs, its mapping must write `Customer PO#` →
`projects.neg_po_number`… **but** import cannot upload PDFs, which would break
the number-requires-document hard rule. **Decision:** the importer must keep
PO# in `notes` (structured `PO#: …`) and list NEG PO attachment as a manual
post-import step per project — keeping the feature rule airtight. Sector →
`sector` column and penalty % → `expected_delay_penalty_percent` map directly.
E2E seeder/specs are unaffected (new columns optional; dry-run re-verified).

## Files changed

- `supabase/migrations/101_commercial_fields.sql` (new — NOT applied)
- `docs/implementation/migration-101-activation.md` (new)
- `src/lib/commercialFields.ts` (new)
- `src/types/database.ts`, `src/types/index.ts`
- `src/pages/ProjectNew.tsx`, `src/pages/ProjectDetail.tsx`,
  `src/pages/QuotationNew.tsx`, `src/pages/HotProjectNew.tsx`,
  `src/pages/Projects.tsx`, `src/pages/HotProjects.tsx`,
  `src/pages/Quotations.tsx`
- `docs/implementation/neg-po-sector-penalty-vat.md` (this file)

## Open questions (non-blocking)

- VAT rate is fixed at 15% by constant; make it configurable only if the rate
  ever changes (single-line change in `commercialFields.ts`).
- Sector editing on already-created records currently follows the creation
  forms + detail displays; add detail-page sector editors later if needed.
- `manufacturing_location` still lacks JED / Dubai-JED variants from the 2026
  plan — out of scope here, noted for a future enum extension.
