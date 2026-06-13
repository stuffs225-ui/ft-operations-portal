# Step 4 — Architecture Cleanup Brief

**Document:** Step 3 — Playbook-to-System Mapping  
**Branch:** `audit/playbook-to-system-mapping`  
**Date:** 2026-06-13  
**Status:** Ready for Step 4

---

## What Step 4 Is

Step 4 is **Architecture Cleanup** — the phase between documentation (Steps 1–3) and feature implementation (Phases 1–10). Its goal is to resolve the structural and governance issues identified in Steps 2 and 3 so that the implementation phases can proceed on a stable, compliant foundation.

Step 4 does NOT build new features. It corrects what is wrong and missing at the database and infrastructure level before new development begins.

---

## What Step 4 Covers

### Tier 0 — Immediate DB Governance Fixes (2 migrations)

These are the highest-priority items from the audit. They must be completed before any other work.

**B-001 — Release Note Gate Migration**
- Add a PostgreSQL trigger on the `release_notes` table
- Block INSERT when any `qc_findings` record with `status != 'closed'` exists for the same project
- Follow the dual-layer pattern from `supabase/migrations/061_po_approval_guard.sql`
- Risk if skipped: Release Notes can be issued for units with unresolved QC findings (CRITICAL)

**B-002 — Medical Serial Gate Migration**
- Add a PostgreSQL trigger on `qc_inspections`
- Block INSERT or UPDATE to `status = 'passed'` when `is_medical = TRUE` and `serial_number IS NULL`
- Follow the same dual-layer pattern
- Risk if skipped: Medical items can pass QC without a registered serial number (CRITICAL)

---

### Foundation DB Fixes (Phase 1 preparation)

These migrations prepare the schema for Phase 1 implementation work. They do not break any existing functionality — they add missing constraints that should already exist.

**B-010, B-011 — SO Approval CHECK Constraints**
- `ALTER TABLE sales_orders` — add CHECK: route not null when approved
- `ALTER TABLE sales_orders` — add CHECK: is_medical not null when approved
- These formalize what the UI already enforces at DB level

**B-026 — Customer Master Data Table**
- Currently `customer_name` is a free-text field on `sales_orders`
- Add a `customers` table and `customer_id FK` on `sales_orders`
- Existing records need migration with a one-time backfill
- This is a prerequisite for the refine master data module in Phase 1

**B-036 — Unified Audit Trigger**
- Create a generic audit trigger function that captures `OLD.*` vs `NEW.*` as JSONB
- Apply it to: `sales_orders`, `purchase_orders`, `quotations`, `work_orders`, `release_notes`
- Supplement (not replace) the existing `auditLog()` utility calls

---

### Infrastructure Gaps to Document (Not Fix)

These items are too large for Step 4 but must be formally documented so Phase 1 engineers understand the constraints:

- **No test coverage** — zero unit or integration tests exist; Phase 1 should establish a test baseline
- **ESLint not configured** (B-005) — TypeScript lint issues accumulate silently
- **SLA engine is client-side only** (B-006) — this is deferred to Phase 10 but must not be extended further in client-side code
- **All reports are mock** (B-004) — deferred to Phase 10; no mock should be upgraded to partial-mock in interim phases

---

## What Step 4 Must NOT Do

These constraints are non-negotiable:

- **Do NOT refactor existing React components** — only DB-level changes in Tier 0
- **Do NOT modify existing migration files** — migrations are immutable once applied
- **Do NOT change RLS policies** on tables not listed above — only add new ones
- **Do NOT add new npm dependencies** — architecture cleanup is SQL-only
- **Do NOT change the 10 user roles** or their capabilities
- **Do NOT modify `src/`** — no source code changes unless a Tier 0 fix requires removing a UI gate that now conflicts with a DB trigger (and only then with explicit user approval)
- **Do NOT add external submodules** — reference patterns are already documented in `docs/reference-library/`

---

## How to Use the Reference Library During Step 4

For each migration in Step 4, consult:

1. **`docs/governance/critical-governance-rules-register.md`** — Find the rule, read "Required Fix" and "Sign-off Test" columns
2. **`supabase/migrations/061_po_approval_guard.sql`** — Read this migration in full before writing any trigger; all Step 4 triggers must follow its pattern
3. **`docs/reference-library/ft-ops-playbook-summary.md`** — Verify the exact business rule before implementing it in SQL
4. **`docs/governance/module-signoff-template.md`** — Run the sign-off tests after each migration; create a sign-off record for each completed module

For the customer master data table (B-026):

5. **`docs/reference-library/02-ft-ops-module-to-reference-mapping.md`** — Module 27 (Data Quality & Master Data) for ERPNext customer pattern reference
6. **`docs/reference-library/05-license-risk-notes.md`** — Confirm any patterns used are from MIT-licensed references only (ERPNext patterns are business-logic reference; no ERPNext code should be copied)

---

## Highest-Risk Areas to Address in Step 4

Ordered by risk:

1. **Release Note Gate** (R-015) — No enforcement exists today. A Release Note can be issued with unresolved QC findings. This is the single highest-priority fix in the entire codebase.

2. **Medical Serial Gate** (R-011) — Medical items can pass QC without serial numbers. Direct regulatory compliance risk.

3. **SO Approval CHECK Constraints** (R-003, R-004) — SO can be approved without route or medical selection via direct API call.

4. **Audit Trail Gap** (R-016, R-017) — Field-level changes are not consistently logged; historical data is being lost every day this is not fixed.

5. **Customer Free-Text** (B-026) — Customer names are free-text strings. Duplicate customers with different spellings already exist in the database. The longer this is deferred, the harder the backfill becomes.

---

## Branch Name

```
phase/1-architecture-cleanup
```

or if doing Tier 0 first:

```
fix/tier-0-governance-triggers
```

**Naming convention:** Use `fix/` for targeted DB fixes, `phase/` for full phase work.

---

## Deliverables from Step 4

When Step 4 is complete, the following must exist:

### Database Migrations

| File | Content |
|------|---------|
| `supabase/migrations/076_release_note_gate.sql` | Release Note trigger + RLS (B-001) |
| `supabase/migrations/077_medical_serial_gate.sql` | Medical serial trigger + RLS (B-002) |
| `supabase/migrations/078_so_approval_checks.sql` | SO route and medical CHECK constraints (B-010, B-011) |
| `supabase/migrations/079_customer_master_data.sql` | Customer table + FK migration + backfill (B-026) |
| `supabase/migrations/080_unified_audit_trigger.sql` | Generic audit trigger on main tables (B-036) |

> Note: Verify the next available migration number by checking `supabase/migrations/` before creating these files. The sequence must be strictly monotonic. As of the Step 3 audit, 075 was the last migration.

### Sign-Off Records

| File | Module |
|------|--------|
| `docs/governance/signoffs/MODULE-20-signoff.md` | Quality Control & Release Note |
| `docs/governance/signoffs/MODULE-17-signoff.md` | Medical Serial Number Tracking |
| `docs/governance/signoffs/MODULE-08-signoff.md` | Approval & Routing Engine |
| `docs/governance/signoffs/MODULE-28-signoff.md` | Timeline & Audit Log |
| `docs/governance/signoffs/MODULE-27-signoff.md` | Data Quality & Master Data |

### Updated Governance Documents

- `docs/governance/playbook-module-status-matrix.md` — update status and sign-off columns for completed modules
- `docs/governance/critical-governance-rules-register.md` — update enforcement tier for each fixed rule
- `docs/system-audit/11-prioritized-gap-backlog.md` — mark B-001, B-002 as complete with date

---

## Acceptance Criteria for Step 4

Step 4 is complete when ALL of the following are true:

- [ ] `INSERT release_notes` with open QC findings fails with DB trigger error (R-015)
- [ ] `INSERT qc_inspections (status='passed', is_medical=TRUE, serial_number=NULL)` fails with DB trigger error (R-011)
- [ ] `UPDATE sales_orders SET status='approved'` with `route=NULL` fails with CHECK constraint (R-003)
- [ ] `UPDATE sales_orders SET status='approved'` with `is_medical=NULL` fails with CHECK constraint (R-004)
- [ ] `customers` table exists with `customer_id` FK on `sales_orders`
- [ ] Audit trigger fires on UPDATE to `sales_orders.status` and creates a row in audit log
- [ ] All sign-off records for the above modules are complete and filed in `docs/governance/signoffs/`
- [ ] No existing tests broken (run TypeScript compiler: `npx tsc --noEmit`)

---

## Copy-Ready Step 4 Prompt

The following is a ready-to-use task brief for the Claude Code session that will execute Step 4. Copy it in full.

---

```
You are working on the FT Operations Portal repository (stuffs225-ui/ft-operations-portal).
Read docs/CLAUDE_PROJECT_RULES.md first before making any changes.

TASK: Step 4 — Architecture Cleanup

Your job is to implement the Tier 0 governance fixes and foundation schema changes
identified in the Step 3 Playbook-to-System Mapping audit. This is pure database
migration work — no React component changes, no new features, no UI modifications.

REQUIRED READING BEFORE STARTING:
1. docs/CLAUDE_PROJECT_RULES.md — standing rules for all sessions
2. docs/governance/critical-governance-rules-register.md — rules R-001 to R-019, enforcement requirements
3. docs/governance/step-4-architecture-cleanup-brief.md — this brief (you have it)
4. supabase/migrations/061_po_approval_guard.sql — the dual-layer trigger pattern you must follow
5. docs/governance/module-signoff-template.md — sign-off process

WORK TO DO (in order):

1. TIER 0 — Create migration: Release Note Gate (B-001)
   - File: supabase/migrations/076_release_note_gate.sql
   - Block INSERT into release_notes when open qc_findings exist for same project
   - Dual-layer: RLS policy + BEFORE INSERT trigger
   - Test: direct INSERT with open finding must fail

2. TIER 0 — Create migration: Medical Serial Gate (B-002)
   - File: supabase/migrations/077_medical_serial_gate.sql
   - Block qc_inspections status='passed' when is_medical=TRUE and serial_number IS NULL
   - Dual-layer: RLS policy + BEFORE INSERT/UPDATE trigger
   - Test: direct INSERT with is_medical=TRUE and serial_number=NULL must fail

3. FOUNDATION — Create migration: SO Approval CHECK constraints (B-010, B-011)
   - File: supabase/migrations/078_so_approval_checks.sql
   - CHECK: status != 'approved' OR route IS NOT NULL
   - CHECK: status != 'approved' OR is_medical IS NOT NULL
   - Test: UPDATE to status='approved' without route must fail

4. FOUNDATION — Create migration: Customer master data table (B-026)
   - File: supabase/migrations/079_customer_master_data.sql
   - Create customers table with id, name, contact, country, created_at
   - Add customer_id FK on sales_orders
   - Backfill: INSERT DISTINCT customer_name values into customers, then set FK
   - Test: customers table exists; sales_orders.customer_id is not null after backfill

5. FOUNDATION — Create migration: Unified audit trigger (B-036)
   - File: supabase/migrations/080_unified_audit_trigger.sql
   - Generic function capturing OLD.*, NEW.* as JSONB into audit_log table
   - Apply to: sales_orders, purchase_orders, quotations, work_orders, release_notes
   - Test: UPDATE sales_orders.status and verify audit_log row created

6. SIGN-OFF — For each completed module, create a sign-off record in docs/governance/signoffs/
   - Use the template in docs/governance/module-signoff-template.md
   - Update docs/governance/playbook-module-status-matrix.md after each sign-off

7. COMMIT AND PUSH to branch: phase/1-architecture-cleanup (create if it doesn't exist)

CONSTRAINTS — DO NOT:
- Modify any file in src/ (React source code)
- Modify any existing migration file (migrations are immutable)
- Change any RLS policy not listed above
- Add any npm dependencies
- Create documentation files (only create migration SQL files and sign-off records)
- Push to main directly — create a PR titled "Step 4 — Architecture Cleanup"

VERIFY before pushing:
- Run: npx tsc --noEmit (must produce zero errors)
- Verify migration files are sequential and follow existing naming convention
- Verify each trigger produces a clear error message when it fires
```

---

## Connection to Implementation Phases

After Step 4 is complete, the implementation phases can begin in order:

| Phase | Focus | Prerequisite |
|-------|-------|-------------|
| Phase 1 — Foundation | shadcn/ui setup, refine setup, RBAC wiring, customer master data UI | Step 4 complete |
| Phase 2 — Core Workflow | SO registration, approval flow, audit log UI, sales workspace | Phase 1 complete |
| Phase 3 — Quotation | Quotation workflow, coordinator workspace | Phase 2 complete |
| Phase 4 — WO/PN Gate | DB triggers for factory/Dubai blocking | Phase 3 complete |
| Phase 5 — Procurement | Supplier registry, PO flow polish | Phase 4 complete |
| Phase 6 — Factory/Dubai | BOM tracking, raw material gate, Excel/BOQ | Phase 5 complete |
| Phase 7 — Store/Custody | Inventory ledger, custody approval, vehicle receipt | Phase 6 complete |
| Phase 8 — QC/Documents | Document versioning, CAPA lifecycle | Phase 7 complete |
| Phase 9 — After Sales | AFS maintenance, CAPA completion | Phase 8 complete |
| Phase 10 — Excellence | Control Tower live, SLA scheduler, reports | Phase 9 complete |

For each phase, consult:
- `docs/reference-library/04-implementation-opportunities-backlog.md` — the implementation opportunity for that phase
- `docs/reference-library/02-ft-ops-module-to-reference-mapping.md` — which reference pattern to use
- `docs/reference-library/03-design-system-recommendation.md` — UI standards
- `docs/governance/playbook-module-status-matrix.md` — current status of modules in scope
