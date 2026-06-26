# Implementation Documentation Index

This directory contains step-by-step implementation and audit records for the FT Operations Portal.

---

## Phase 10 — Foundation, Governance, and Procurement

- step-4a-critical-governance-guardrails.md
- step-4b-foundation-governance-guardrails.md
- step-7-sales-quotation-final-signoff.md
- step-7a-quotation-status-transition-guard.md
- step-7b-quotation-document-gates.md
- step-7c-quotation-new-two-step-submission.md
- step-9-final-signoff.md
- step-9a-so-approval-routing-audit.md
- step-9b-wo-pn-db-guardrails.md
- step-9c-department-routing-persistence.md
- step-9d-routing-cleanup-approval-visibility.md
- step-10-final-signoff.md
- step-10-5-stabilization-deployment-projectdetail.md
- step-10-5a-ux-ia-role-audit.md
- step-10-5b-target-ia-blueprint.md
- step-10-5c-role-based-navigation-restructure.md
- step-10-5d-role-based-dashboard-my-work.md
- step-10-5e-projectdetail-role-tabs.md
- step-10-5f-visual-identity-system-v2.md
- step-10-5g-shared-ui-patterns-shell-polish.md
- step-10-5h-ui-consistency-cleanup.md
- step-10-5h5-ui-consistency-closure.md
- step-10-5i-final-ux-ia-visual-signoff.md
- step-10a-wo-pn-gate-audit.md
- step-10b-wo-pn-guardrails-corrective-actions.md

---

## Phase 11 — Procurement Governance

- step-11a-procurement-suppliers-governance-audit.md
- step-11b-procurement-governance-hardening.md
- step-11c-supplier-approval-audit-trail.md
- step-11d-procurement-detail-pageheader-migration.md
- step-11e-post-merge-safety-check.md
- step-11e-supplier-register-procurement-ux-quick-wins.md
- step-11f-procurement-suppliers-final-signoff.md

---

## Phase 12 — Store / Warehouse Governance

- step-12-store-full-closure.md
- step-12a-store-receiving-custody-serials-audit.md
- step-12b-store-governance-hardening.md
- step-12c-2-vehicle-photo-upload.md
- step-12c-vehicle-receiving-live-write.md
- step-12h-temporary-custody-user-picker.md

---

## Phase 16 — Sales and After Sales

- step-16-5-sales-user-reports.md
- step-16-after-sales-maintenance-full-closure.md

---

## Phase 17 — Operations Reporting

- step-17-control-tower-sla-reports.md

---

## Phase 18 — Role UX/IA Rebuild

### Foundation

- step-18-6a-role-ia-visual-foundation.md
- step-18-6b-cross-role-ux-safety-fixes.md
- step-18-go-live-stabilization.md

### Work Centers (18.7A–18.7K)

- step-18-7a-procurement-workflow-rebuild.md — Procurement Work Center
- step-18-7b-store-warehouse-work-center.md — Store / Warehouse Work Center
- step-18-7c-factory-production-work-center.md — Factory / Production Work Center
- *(step-18-7d QC Work Center — no dedicated doc created)*
- *(step-18-7e AFS / Dubai Work Center — no dedicated doc created)*
- step-18-7f-sales-user-work-center.md — Sales User Work Center
- step-18-7g-sales-coordinator-work-center.md — Sales Coordinator Work Center
- step-18-7g-1-sales-coordinator-lint-stabilization.md — Coordinator lint fix
- step-18-7h-operations-manager-control-tower.md — Operations Manager Control Tower
- step-18-7h-1-operations-manager-route-stabilization.md — Ops Manager route fix
- step-18-7i-admin-work-center.md — Admin Work Center Foundation
- step-18-7j-viewer-management-read-only-work-center.md — Viewer Work Center
- step-18-7k-final-role-ux-closure-audit.md — Final Role UX Closure Audit

### System Stabilization

- step-18-8-final-system-stabilization-go-live-readiness.md — Go-Live Readiness Audit

### Post Go-Live: Storage Uploads

- **phase-1a-storage-uploads-document-evidence.md — Storage-Backed Document Uploads**
- **phase-1a-1-storage-post-merge-verification.md — Phase 1A Post-Merge Verification and Stabilization**

---

## Phase 0 — Stabilization

- **phase-0a-set-state-in-effect-stabilization.md — Phase 0A: set-state-in-effect Lint Stabilization** (main SHA `724a588`; fixed 17 errors across 17 files; 0 set-state-in-effect errors remaining)

---

## Phase 19 — Design System and UX Modernization

### Foundation

- **step-19-2-functional-pages-ux-roadmap.md — Functional Pages UX Audit and Improvement Roadmap**

### Transformation Study

- **../reports/ft-operations-frontend-design-ux-transformation-study.md (.html / .pdf) — Complete Frontend Design System, UI Architecture, UX & Transformation Study** (audited main SHA `1ed145a`; analysis & planning only — defines the A‑to‑Z roadmap, UI-library strategy, and PR-by-PR plan for Phases 0–9)

### Sales Coordinator Module Sprint

- **sales-coordinator-module-sprint.md — Sales Coordinator Module Workspace UX and Workflow Stabilization** (redesigned `SalesCoordinator.tsx`: clickable KPI tiles with deep links, priority-ordered sections ordered by urgency, reload button, removed redundant nav elements; `CoordinatorQueue.tsx`: added `?tab=` URL param support; zero new lint/type errors)

### Commercial and Sales Coordinator (19.3)

- **step-19-3-commercial-sales-coordinator-ux.md — Commercial and Sales Coordinator Pages UX Improvement**

### Projects / Sales Orders (19.4A–19.4B)

- **step-19-4a-projects-so-ux-improvement.md — Projects / Sales Orders UX Improvement**
- **step-19-4b-project-creation-wizard-ux.md — SO / Project Creation Wizard UX Upgrade** (PR #131 — merged)

### Procurement Core (19.5A)

- **step-19-5a-procurement-core-ux-upgrade.md — Procurement Core UX Premium Upgrade** ← current

### Sales Dashboard v2 — Data Availability Study

- **sales-dashboard-v2-data-availability-study.md — Sales Dashboard v2 Data Availability & Implementation Study** (analysis only — maps 19 KPIs against existing schema; identifies missing targets table; proposes 4-PR plan; no code or migrations changed)

### Sales Dashboard v2 — Annual Targets Foundation

- **sales-annual-targets-foundation.md — Sales Annual Targets Foundation** (migration 099; `sales_user_targets` table; RLS — admin CRUD, ops_manager read, sales_user own-read; query helper; no UI; collection target NULL until approved)

### Sales Dashboard v2 — Data Aggregation Hook

- **sales-dashboard-v2-data-hook.md — Sales Dashboard v2 Data Aggregation Hook** (read-only; `getSalesDashboardV2Data()` query helper + `useSalesDashboardV2Data()` React hook; aggregates projects, hot_projects, milestones, targets into `SalesDashboardV2Data` contract; no UI; no migrations; Sales.tsx unchanged)

### Sales Dashboard v2 — Commercial/Invoicing Control UI

- **sales-dashboard-v2-ui.md — Sales Dashboard v2 Commercial/Invoicing Control UI** (Sales.tsx rewritten to use `useSalesDashboardV2Data`; 6 commercial KPI cards; monthly invoicing plan table with sticky first column and soft-green month highlights; three target sections — Invoicing, Sales Orders, Collection; collection target NULL handled as "—" with inline note; old task panels removed from view; no route/nav/roleMatrix/DB changes)

### Project Invoicing Schedule — Delivery-Date Default Foundation

- **project-invoicing-schedule-foundation.md — Project Invoicing Schedule Foundation** (migration 100; `project_invoicing_schedule` + `project_invoicing_schedule_history` tables; `pis_status_enum` / `pis_source_enum` enums; AFTER INSERT trigger auto-creates one default schedule line per project using `customer_delivery_date` and `total_sales_value`; idempotent backfill for existing projects; `reschedule_project_invoicing_schedule()` + `update_project_invoicing_schedule_amount()` SECURITY DEFINER RPCs; `project_invoicing_schedule_alerts_view` for overdue detection; RLS — admin CRUD, ops_manager read, sales_user own-project read; `database.ts` types added; no Admin UI, no Sales Dashboard hook change, no `project_invoice_milestones` changes)

### Sales Dashboard v2 — Project Invoicing Schedule Source

- **sales-dashboard-v2-schedule-source.md — Sales Dashboard v2 Schedule Source Integration** (switches `getSalesDashboardV2Data()` invoicing plan source from `project_invoice_milestones` to `project_invoicing_schedule`; `current_invoice_date` → month column; `invoice_amount` → cell value; same-project same-month values summed; pending = `status IN (scheduled, overdue, rescheduled)`; invoiced = `status = invoiced`; Outstanding Receivables and Collection to Date remain on milestones; adds `overdueInvoicingScheduleExists` warning; no UI changes, no route/nav/DB changes)

### Commercial Admin Controls Sprint

- **commercial-admin-controls-sprint.md — Commercial Admin Controls (Invoicing Schedule + Sales Targets)** (Admin-only pages `AdminInvoicingSchedule` at `/admin/invoicing-schedule` and `AdminSalesTargets` at `/admin/sales-targets`; reschedule + amount-update modals call migration-100 RPCs; change-history drawer; overdue alerts view; split modal disabled pending a dedicated RPC; sales targets add/edit upsert + missing-target list; `deferredMigrationSafety` helper classifies missing-relation/missing-function errors so pages show a calm "migration pending" state instead of crashing; migration-safe `projectInvoicingScheduleQueries` + extended `salesTargetsQueries`; two Admin dashboard cards; type-only `database.ts` additions for the alerts view + 2 RPCs; **no migrations applied, no DB/RLS changes, no Sales Dashboard changes, no `project_invoice_milestones` changes**)

### Master Module Sprint — Phases 7 to 15

- **master-module-sprint-phases-7-to-15.md — Master Module Sprint (Projects→Operations UX Stabilization + Migration Audit Prep)** (Phase 7: read-only KPI strip on the Projects list, computed from loaded data, value card gated by `canViewCosts`, cards click to set status tab; Phase 8: wired the Procurement dashboard's existing `?status=` KPI deep-links to actually filter the PO / PR / Supplier list pages — validated param, falls back to `all`; Phase 15: full migration audit documentation. ProjectDetail/ProjectNew inspected and intentionally unchanged; phases 9–14 deferred as already-mature. **No migrations applied, no DB/RLS/guard/roleMatrix/navigation/workflow changes**)
- **deferred-database-migrations-register.md — Deferred Database Migrations Register** (audit register of all 100 migrations `001`–`100`: purpose, module, runtime dependency, applied-state=Unknown, risk, dependencies; flags migration 100 as a **fatal** runtime dependency for Sales Dashboard v2; documentation only — no migrations applied, no SQL executed)
- **future-safe-migration-application-plan.md — Future Safe Migration Application Plan** (how to compare GitHub↔Supabase, query migration history, verify each object, apply in order, test per batch, rollback/stop criteria, and the features depending on migrations 099/100; plan only — nothing applied)

### Operations Execution Sprint — Store, Factory, QC, Dubai/AFS

- **operations-execution-sprint-store-factory-qc-afs.md — Operations Execution Sprint (Store / Factory / QC / Dubai-AFS UX Stabilization)** (all four execution dashboards inspected and found mature; fixed the cross-cutting integrity gap of fabricated `count: 0` work queues that always showed "Clear": Store now computes "QC Accepted", "QC Rejected", and "Custody Pending Approval" from real data — read-only `material_qc_inspections` cross-module read + custody `approval_status` — and gained a loading state; Factory's uncomputable "Requirements Missing" placeholder removed per the omit-if-unsafe rule; QC and Dubai/AFS already fully real-data, left unchanged. **No migrations, no DB/RLS, no gate/workflow/permission changes; full lint baseline reduced 57→56 by removing one pre-existing `as any` warning**)

### Management and Support Sprint — After Sales, Reports, Control Tower, Admin, Viewer

- **management-support-sprint-after-sales-reports-control-tower-viewer.md — Management and Support Sprint (After Sales / Reports / Control Tower / Admin / Viewer)** (all five management/support surfaces inspected and found mature; fixed the one genuine functional gap — After Sales dashboard KPI cards now deep-link to the matching maintenance tab via a validated `?tab=` param the list now reads, mirroring the Procurement/Coordinator pattern; Reports verified to have no broken links across all 14 `/reports/*` routes; Control Tower, Admin overview, and Viewer/Management dashboard already fully real-data/read-only and left unchanged. **No migrations, no DB/RLS, no guard/roleMatrix/navigation/permission/workflow changes; full lint baseline unchanged at 56**)

### Full System QA and Go-Live Readiness

- **full-route-access-inventory.md — Full Route Access Inventory** (all 98 static + 23 dynamic routes by module: component, intended roles/guard, read-vs-mutating, Supabase + migration dependencies, states, recent-change flag, validation priority; confirms no broken routes; notes the screenshot-manifest fix for the 2 admin commercial-control routes)
- **role-access-audit.md — Role-Based Access Audit** (per-role landing/accessible/forbidden routes, navigation visibility, mutation vs read-only, admin-only exposure check; no mismatches found; no roleMatrix/guard change)
- **full-system-screenshot-baseline-plan.md — Full-System Screenshot Baseline Plan** (workflow `role-screenshot-baseline.yml`, required GitHub secrets, manual trigger, `full-role-page-screenshot-baseline` artifact, 12 real-auth role accounts, 121-route coverage, failure interpretation; live run deferred to GitHub Actions)
- **supabase-migration-gap-audit.md — Supabase Migration Gap Audit (read-only)** (GitHub migration inventory + runtime dependency map; special focus on 099/100, milestones, receivables, hot_projects, storage; **Sales Dashboard v2 migration-100 fatal-dependency documented — severity High, /sales shows a controlled error panel if 100 missing**; no code changed)
- **docs/sql/read-only-migration-verification.sql — Read-Only Migration Verification Script** (SELECT-only existence checks for critical tables/views/functions/trigger/RLS/policies/storage buckets; safe to run in Supabase SQL editor; applies nothing)
- **full-system-smoke-test-checklist.md — Full-System Smoke Test Checklist** (role-by-role, module-by-module pass/fail checklist with expected results)
- **go-live-readiness-checklist.md — Go-Live Readiness Checklist** (code/database/auth/functional/data/security/deployment/sign-off sections; top blocker = verify migration 100)
- **safe-migration-application-runbook.md — Safe Migration Application Runbook** (later-execution runbook: backup, read-only-verify-first, ascending order, batching, 099/100 verification steps, rollback/stop criteria, go/no-go; nothing applied in this sprint)

### Post-QA Verification and Critical Readiness Fixes

- **post-qa-verification-critical-readiness-fixes.md — Post-QA Verification & Critical Readiness Fixes** (verification + safe-fix sprint; baseline, change log, safety confirmation)
- **live-supabase-readonly-verification-results.md — Live Supabase Read-Only Verification Results** (anon-key REST existence probe **attempted but blocked by network egress allowlist**; negative control proved the block is at the proxy, so statuses remain **Unknown**; manual SQL + paste-back format provided)
- **critical-route-link-validation.md — Critical Route & Link Validation** (all critical routes + After Sales `?tab=` / Procurement `?status=` / Coordinator `?tab=`/`?filter=` deep-links validated source→destination; **no broken links**; no fixes needed)
- **screenshot-baseline-execution-status.md — Screenshot Baseline Execution Status** (workflow/secrets/artifact/route-count; local run not possible — egress-blocked; manifest/workflow unchanged)
- **manual-smoke-test-execution-packet.md — Manual Smoke-Test Execution Packet** (15-minute minimum gate + full role packet with severity + pass/fail fields)
- **go-no-go-decision-matrix.md — Go/No-Go Decision Matrix** (GO/NO-GO criteria, Conditional-GO state, required approvals)
- **final-readiness-summary.md — Final Readiness Summary** (executive; **Conditional GO** pending migration-100 verification + smoke test)

**Critical safe fix shipped:** Sales Dashboard v2 (`Sales.tsx` + `salesDashboardV2Queries.ts` + `salesDashboardV2.ts` types) now **degrades gracefully** when migration 100 (`project_invoicing_schedule`) is missing — renders projects/pipeline/SO/collection, shows invoicing-schedule sections as unavailable with a banner (not silent zero, no crash). A genuine non-migration error is still surfaced. No business calculation changed when data is present. (`isMissingRelationError` from `deferredMigrationSafety`.)

### Migration 099 + 100 Activation Pack (supervised)

- **migration-099-100-source-review.md — Migration 099 + 100 Source Review** (objects/deps/idempotency/risk for both files; dependencies verified present; documents the only mechanical adjustment — wrapping the two bare `updated_at` triggers in the existing `duplicate_object` guard for re-runnability)
- **docs/sql/precheck-before-applying-099-100.sql — Pre-check (READ-ONLY)** (confirms 099/100 still missing + all dependency tables/columns/functions/enum present; SELECT-only)
- **docs/sql/apply-migrations-099-100-supervised.sql — Supervised Apply Pack** (faithful concatenation of migrations 099 + 100 for the Supabase SQL Editor; verified 0 source body lines missing; non-destructive; backfill `WHERE NOT EXISTS`-guarded)
- **docs/sql/postcheck-after-applying-099-100.sql — Post-check (READ-ONLY)** (verifies all 099/100 tables/view/functions/trigger/RLS/policies/generated columns/backfill reconciliation; SELECT-only, no RPC calls)
- **post-migration-099-100-ui-smoke-test.md — Post-Migration UI Smoke Test** (Admin sales-targets + invoicing-schedule, Sales dashboard, viewer/ops regression; pass/fail + severity + rollback)
- **live-supabase-verification-final-results.md — Live Supabase Verification Final Results** (068/069/070 + storage Present; 099/100 Missing before activation)

**Live verification result:** 068/069/070 + all storage buckets **present**; **099 and 100 missing**. Go-live decision updated to **🔴 CONDITIONAL HOLD** (`go-no-go-decision-matrix.md`, `final-readiness-summary.md`); the runbook gained a concrete **§16 099/100 activation procedure**. **No migrations were applied by Claude.**

Planned future steps (not yet started):
- step-19-5b — Store / Warehouse UX Upgrade
- step-19-6 — Factory and QC UX Improvement
- step-19-7 — AFS and After Sales UX Improvement
- step-19-8 — Reports, Control Tower, Admin, and Viewer UX Improvement
- step-19-9 — Performance and Data Loading Foundation
- step-19-10 — Functional UX Closure and Regression Audit

Note: Step 19.1 (Design System Foundation and App Shell) was merged as PR #126 (SHA `b4a38a5`)
on branch `claude/naffco-portal-modernization-a8gtg1`. No dedicated doc was created for 19.1;
changes are self-documented in the commit message and PR diff.

---

## Tooling — Screenshot Baseline

- **tooling-full-real-auth-role-page-screenshot-baseline.md — Full Real-Auth Role/Page Screenshot Baseline** (branch `tooling/full-real-auth-role-page-screenshot-baseline`; base `f9e2f5d`; 12 accounts × all pages; real Supabase auth enforced)
- **tooling-github-actions-real-auth-screenshot-baseline.md — GitHub Actions Real-Auth Screenshot Baseline** (branch `tooling/github-actions-real-auth-screenshot-baseline`; base `c668d3f`; manual workflow; uses GitHub Secrets; uploads artifact)

---

## Deferred Items

See `step-18-8-final-system-stabilization-go-live-readiness.md` § Deferred Items Consolidated Backlog for the full list of 33 deferred items (DFR-01 through DFR-33). None are go-live blockers.

Phase 1A adds: AFS missing item evidence UI (table created, detail page not yet available).

---

## Schema / Migration Reference

All SQL migrations are in `migrations/` (100 files, `001_profiles.sql` through `100_project_invoicing_schedule.sql`).

Phase 1A migrations (096–098):
- `096_procurement_documents.sql` — `procurement-documents` bucket + `purchase_order_documents` table
- `097_afs_document_tables.sql` — `afs_arrival_documents` + `afs_missing_item_attachments` tables
- `098_qc_documents_file_columns.sql` — `file_size`/`mime_type` columns for `qc_inspection_documents`

Sales Dashboard v2 / Invoicing Schedule migrations (099–100):
- `099_sales_user_targets.sql` — `sales_user_targets` table; annual invoicing/SO/collection targets per user
- `100_project_invoicing_schedule.sql` — `project_invoicing_schedule` + `project_invoicing_schedule_history` tables; AFTER INSERT trigger; RPCs; overdue alert view
