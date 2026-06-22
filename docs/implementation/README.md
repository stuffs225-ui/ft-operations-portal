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

## Phase 19 — Design System and UX Modernization

### Foundation

- **step-19-2-functional-pages-ux-roadmap.md — Functional Pages UX Audit and Improvement Roadmap**

### Commercial and Sales Coordinator (19.3)

- **step-19-3-commercial-sales-coordinator-ux.md — Commercial and Sales Coordinator Pages UX Improvement** ← current

Planned future steps (not yet started):
- step-19-4 — Projects / Sales Orders Experience Improvement
- step-19-4a — ProjectDetail Visual Polish (isolated)
- step-19-5 — Procurement and Store UX Improvement
- step-19-6 — Factory and QC UX Improvement
- step-19-7 — AFS and After Sales UX Improvement
- step-19-8 — Reports, Control Tower, Admin, and Viewer UX Improvement
- step-19-9 — Performance and Data Loading Foundation
- step-19-10 — Functional UX Closure and Regression Audit

Note: Step 19.1 (Design System Foundation and App Shell) was merged as PR #126 (SHA `b4a38a5`)
on branch `claude/naffco-portal-modernization-a8gtg1`. No dedicated doc was created for 19.1;
changes are self-documented in the commit message and PR diff.

---

## Deferred Items

See `step-18-8-final-system-stabilization-go-live-readiness.md` § Deferred Items Consolidated Backlog for the full list of 33 deferred items (DFR-01 through DFR-33). None are go-live blockers.

Phase 1A adds: AFS missing item evidence UI (table created, detail page not yet available).

---

## Schema / Migration Reference

All SQL migrations are in `migrations/` (98 files, `001_profiles.sql` through `098_qc_documents_file_columns.sql`).

Phase 1A migrations (096–098):
- `096_procurement_documents.sql` — `procurement-documents` bucket + `purchase_order_documents` table
- `097_afs_document_tables.sql` — `afs_arrival_documents` + `afs_missing_item_attachments` tables
- `098_qc_documents_file_columns.sql` — `file_size`/`mime_type` columns for `qc_inspection_documents`
