# E2E Full-Workflow — Test Strategy

## Objective

Verify the full portal workflow — **Quotation → SO/Project → Procurement PR/PO →
Store Receiving → Factory → QC → AFS/Delivery → Invoicing/Receivables/Reports** —
with realistic, *tagged and fully removable* scenario data plus a role × route
UI smoke pass. Testing/seeding only: no business logic, DB/RLS, migration,
permission, or guard changes.

## Layers

1. **Scenario seeder** (`tools/e2e/e2e-full-workflow.ts`) — creates coherent
   cross-module records for 10 scenarios; every row tagged and manifest-tracked.
2. **UI role smoke** (`tests/e2e/full-workflow.spec.ts`) — 10 roles × 33 routes;
   expected denial = pass, unexpected access/denial = fail, crash = fail.
3. **SELECT-only SQL validation** (`docs/sql/e2e-full-workflow-validation.sql`)
   — chain integrity, photo-gate counts, approval gates, receivables risk.
4. **Run reports** (`artifacts/e2e-full-workflow/<run_id>.{json,md}`) — the JSON
   manifest is the source of truth for validation and cleanup.

## Safety model

| Guard | Mechanism |
|-------|-----------|
| Default = dry-run | `--mode dry-run` is the default; prints the plan, opens no write connection |
| Write confirmation | `seed` and `cleanup` hard-fail unless `E2E_SEED_CONFIRM=true` |
| Production block | Target host is **treated as production unless allow-listed** in `E2E_NON_PRODUCTION_HOSTS`; production writes additionally require `E2E_ALLOW_PRODUCTION=true` (default-deny) |
| Tagging | Every row: `E2E_SCENARIO_SEED run_id=<id> scenario=<code>` in a remarks/notes column + `E2E-<shortid>` prefix in every number/code column we control |
| Scoped cleanup | `cleanup` requires `--run-id`; deletes **only** the manifest's record ids (children→parents), plus trigger-created invoicing-schedule rows belonging to that run's projects. No pattern-wide deletes, no truncation, no untagged data touched |
| No service role in frontend | The seeder is a backend CLI tool; `SUPABASE_SERVICE_ROLE_KEY` (or anon key + admin sign-in) is read from env at runtime and never bundled into the app |

## Scenario coverage (11)

| # | Scenario | What it proves | Seedable |
|---|----------|----------------|----------|
| S01 | Clean full flow | Whole chain green: quotation → project (+trigger invoicing line) → PR → PO (<10K, no approval) → GRN accepted → item in store → QC accepted → factory record → plan + paid/approved milestones | ✅ |
| S02 | Partial material receiving | `partially_received` PO + receipt; 6/10 received | ✅ |
| S03 | Medical materials pending | `serial_required` item pending QC + serial `pending_qc` + pending inspection | ✅ |
| S04 | High-value PO approval gate | SAR 25,000 PO with `approval_required=true`, `approval_status='pending'`, `po_status='pending_approval'` | ✅ |
| S05 | Vehicle missing photos | Vehicle `received` with **3/5** required photos → acceptance must stay blocked | ✅ |
| S06 | Vehicle complete photos | Vehicle `accepted` with **5/5** required photos | ✅ |
| S07 | Serial / custody gate | QC-passed serial; custody A `pending_approval`, custody B `issued` + `receiver_decision='pending'` | ✅ |
| S08 | QC failure / NCR / rework | Inspection `completed/rejected` + open `high` NCR; item `rejected_by_qc` (issuance blocked) | ✅ (material-level; project-level rework chain documented as not safely seedable) |
| S09 | AFS / delivery pending | Project + `dubai_project_followups` stage | ⚠ partial (arrival/predelivery reports not safely seedable — loose types) |
| S10 | Invoicing / receivables risk | Past-delivery project (trigger line lands overdue) + explicit 30-days-past `admin_manual` schedule line + `overdue` milestone | ✅ |
| S11 | Two full orders — KSA + Dubai | Two complete non-identical orders: KSA ambulance (6 quotation lines, in-production factory record, approved high-value PO, full + **partial** receiving, QC accepted, serial passed, paid/approved milestones) and Dubai/AFS (VIP box ambulance, vehicle receiving with **5/5 photos**, `handed_to_afs`/`arrived` followup, paid/submitted milestones). See `e2e-two-full-orders-scenario.md` | ✅ (AFS reports / PN refs documented as not safely seedable) |

## Role × route smoke

10 roles (admin, operations_manager, viewer, sales_user, sales_coordinator,
procurement_user, store_user, factory_user, qc_user, afs_user) × 33 routes.
Expectations are transcribed from the actual `RequireRole` guards (see the
system map). Detection signals:

- **Denied:** the guard's "Access restricted" panel is rendered.
- **Crash:** any uncaught `pageerror`, or an empty `#root` → fail.
- **Rendered:** the route's expected title/section text is visible.
- Missing credentials → role skipped, unless `E2E_STRICT_AUTH=true` (then fail).

## Explicit non-goals

- No mutation-flow UI tests (create/approve/submit) in this pack — the spec is
  navigation + render + guard assertions only.
- No storage uploads (photo gate is validated via `storage_path` rows).
- No performance/load testing.
- Seeded rows intentionally *bypass app-side workflow ordering* (they are state
  snapshots, not replays); business rules are asserted by checking the app
  *renders the correct queues/gates for those states*, not by driving each
  transition through the UI.

## Success criteria

- Dry-run prints a complete plan with zero writes.
- Seed (on a confirmed non-production target) creates all planned rows, or
  records precise per-step errors in the manifest without aborting the run.
- Validate reports 100% of manifest records present.
- Playwright: all expectations pass for every role with credentials.
- Cleanup removes 100% of manifest records (+ run-scoped trigger rows) and the
  post-cleanup SQL section returns zeros.
