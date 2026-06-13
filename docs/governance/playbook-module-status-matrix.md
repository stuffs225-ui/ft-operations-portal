# Playbook Module Status Matrix

**Document:** Step 3 — Playbook-to-System Mapping  
**Branch:** `audit/playbook-to-system-mapping`  
**Date:** 2026-06-13  
**Source:** `docs/system-audit/06-playbook-module-coverage-matrix.md` + `docs/governance/playbook-to-system-mapping.md`

---

## Purpose

This matrix provides a compact single-page view of all 31 playbook modules, their current implementation status, risk level, and readiness for sign-off. Use it as a quick reference when planning implementation phases or reviewing progress.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Substantially complete — minor gaps only |
| ⚠️ | Partial — core built but key gaps remain |
| 🔴 | Mock or missing — not production-ready |
| 🏗️ | Built but incorrectly — logic errors or policy violations |

## Risk Legend

| Level | Meaning |
|-------|---------|
| CRITICAL | Active data integrity or governance violation today |
| HIGH | Significant compliance gap; must fix before production-scale use |
| MEDIUM | Functional gap; user-visible but not a safety issue |
| LOW | Polish or optimization; does not affect correctness |

---

## Module Status Matrix

| # | Module | Status | Risk | Main Gap | Recommended Phase | Reference Pattern | Sign-off Ready |
|---|--------|--------|------|----------|-------------------|-------------------|----------------|
| 1 | Vision & Control Tower | ⚠️ | HIGH | Control Tower all mock data | Phase 10 | Twenty CRM dashboard | No — B-003 |
| 2 | Governance Principles | ⚠️ | HIGH | Only migration 061 has dual-layer enforcement | Phase 1–2 | ERPNext dual-layer | No — B-001, B-002 |
| 3 | End-to-End Lifecycle | ⚠️ | MEDIUM | No automated status propagation or notifications | Phase 2 | refine workflow | No — B-007 |
| 4 | Data Hierarchy | ✅ | LOW | Customer free-text (no master data) | Phase 1 | refine resource model | Conditional — B-026 |
| 5 | Quotation Management | ⚠️ | MEDIUM | Spec-file gate UI only (R-001) | Phase 3 | ERPNext quotation | No — B-008 |
| 6 | Sales Coordinator Workspace | ⚠️ | MEDIUM | Return gate UI only (R-002) | Phase 3 | refine edit form | No — B-009 |
| 7 | WO/PN Gate | ✅ | MEDIUM | DB-level triggers missing (R-005, R-006) | Phase 4 | ERPNext gate | Conditional — B-024, B-025 |
| 8 | Approval & Routing Engine | ✅ | LOW | DB CHECK constraints missing for route/medical selection | Phase 2 | refine approval | Conditional — B-010, B-011 |
| 9 | Sales Workspace | 🔴 | HIGH | Entirely mock data (R-019) | Phase 2 | refine list + filter | No — B-014 |
| 10 | Procurement & PO Approval | ✅ | LOW | Already dual-layer via migration 061 | Phase 5 | Migration 061 pattern | Yes ✅ |
| 11 | Approved Supplier Management | ⚠️ | MEDIUM | Blacklist gate UI only; no historical pricing | Phase 5 | ERPNext supplier | No — B-016 |
| 12 | Saudi Factory Workspace | ⚠️ | MEDIUM | DB trigger missing; no BOM line tracking | Phase 6 | ERPNext work order | No — B-025, B-029 |
| 13 | Dubai Projects & AFS | ⚠️ | MEDIUM | DB trigger missing; AFS follow-up partial | Phase 6 | ERPNext project | No — B-024 |
| 14 | Store & Warehouse | ⚠️ | MEDIUM | No inventory ledger; receipt flows partial | Phase 7 | ERPNext stock | No — B-027 |
| 15 | Material Custody & Issuance | ⚠️ | HIGH | Custody approval gate UI only (R-013) | Phase 7 | ERPNext custody | No — B-020, B-022 |
| 16 | Vehicle Receiving | ⚠️ | HIGH | Chassis NOT NULL missing; photo trigger missing (R-012) | Phase 7 | ERPNext vehicle | No — B-018, B-019 |
| 17 | Medical Serial Number Tracking | ⚠️ | CRITICAL | No DB constraint on serial number (R-011) | Tier 0 | ERPNext serial | No — B-002 |
| 18 | Raw Material Requests | ⚠️ | MEDIUM | DB gate for WO prerequisite missing (R-007) | Phase 6 | ERPNext material request | No — B-030 |
| 19 | Excel Upload / BOQ / BOM | 🔴 | MEDIUM | Design only; no parser or BOM table | Phase 6 | ERPNext BOM | No — B-028, B-029 |
| 20 | Quality Control & Release Note | 🏗️ | CRITICAL | Release Note gate NOT enforced at DB (R-015) | Tier 0 | ERPNext QC | No — B-001 |
| 21 | AFS Maintenance | ⚠️ | MEDIUM | FK to WO/PN missing; no CAPA lifecycle | Phase 9 | ERPNext maintenance | No — B-033 |
| 22 | Documents & Checklists | ⚠️ | MEDIUM | No document versioning; no required checklist enforcement | Phase 8 | Plane checklist | No — B-034, B-035 |
| 23 | Risks, Issues & CAPA | ⚠️ | MEDIUM | No management pages; audit view only | Phase 8 | Plane issue tracker | No — B-032 |
| 24 | SLA & Escalation Engine | ⚠️ | CRITICAL | Client-side only; no server scheduler (R-018) | Phase 10 | BullMQ pattern | No — B-006 |
| 25 | Reports & KPIs | 🔴 | CRITICAL | All 13 report pages mock data (R-019) | Phase 10 | refine data provider | No — B-004 |
| 26 | Operations Control Tower | 🔴 | HIGH | All 9 tiles mock data (B-003) | Phase 10 | Twenty CRM dashboard | No — B-003 |
| 27 | Data Quality & Master Data | ⚠️ | MEDIUM | Customer is free-text; no master data tables | Phase 1 | ERPNext master data | No — B-026 |
| 28 | Timeline & Audit Log | ⚠️ | MEDIUM | Inconsistent auditLog usage; no field-level diff (R-016, R-017) | Phase 2 | Twenty CRM timeline | No — B-036 |
| 29 | Roles & Permissions | ✅ | LOW | PERMISSION_KEYS defined but not wired | Phase 1 | refine RBAC | Conditional — B-013 |
| 30 | Implementation Roadmap | ⚠️ | LOW | No formal phase gate process documented | Phase 1 | — | No |
| 31 | Permanent Rules (20 Rules) | ⚠️ | CRITICAL | 2 critical rules not DB-enforced (R-011, R-015) | Tier 0 | Migration 061 pattern | No |

---

## Summary Counts

| Status | Count | Modules |
|--------|-------|---------|
| ✅ Substantially complete | 4 | 4, 8, 10, 29 |
| ⚠️ Partial | 20 | 2, 3, 5, 6, 7, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 27, 28, 30, 31 |
| 🔴 Mock / Missing | 5 | 1, 9, 19, 25, 26 |
| 🏗️ Built but incorrect | 1 | 20 |
| **Total** | **31** | |

---

## Risk Summary

| Risk Level | Count | Modules |
|-----------|-------|---------|
| CRITICAL | 5 | 17, 20, 24, 25, 31 |
| HIGH | 6 | 1, 2, 9, 15, 16, 26 |
| MEDIUM | 17 | 3, 5, 6, 7, 11, 12, 13, 14, 18, 19, 21, 22, 23, 27, 28, 30 |
| LOW | 3 | 4, 8, 29 |

---

## Sign-off Readiness Summary

| Readiness | Count | Modules |
|-----------|-------|---------|
| Yes ✅ | 1 | 10 (Procurement & PO Approval) |
| Conditional (minor fix only) | 3 | 4, 7, 8, 29 |
| No — backlog items required | 27 | All others |

**Only Module 10 (Procurement & PO Approval) is unconditionally ready for sign-off** due to the dual-layer enforcement established in migration 061.

---

## Phase Allocation Summary

| Phase | Modules Covered | Focus |
|-------|----------------|-------|
| Tier 0 (immediate) | 17, 20, 31 | Medical serial trigger, Release Note trigger |
| Phase 1 — Foundation | 4, 27, 29, 30 | Master data, RBAC wiring, Customer table |
| Phase 2 — Core Workflow | 3, 8, 9, 28 | SO flow, approval CHECK constraints, audit log, Sales Workspace |
| Phase 3 — Quotation | 5, 6 | Spec-file gate, coordinator return gate |
| Phase 4 — WO/PN Gate | 7 | DB triggers for factory/Dubai blocking |
| Phase 5 — Procurement | 10, 11 | Supplier blacklist gate, historical pricing |
| Phase 6 — Factory/Dubai | 12, 13, 18, 19 | BOM tracking, Dubai trigger, raw material gate, Excel/BOQ |
| Phase 7 — Store/Custody | 14, 15, 16 | Inventory ledger, custody approval, vehicle chassis |
| Phase 8 — QC/Documents | 22, 23 | Document versioning, CAPA lifecycle |
| Phase 9 — After Sales | 21 | AFS maintenance FK, CAPA |
| Phase 10 — Excellence | 1, 2, 24, 25, 26 | Control Tower live, SLA scheduler, Reports live |

---

## Notes

- **Migration 061** (`061_po_approval_guard.sql`) is the template for all DB-level enforcement. Every "DB trigger missing" gap should follow its dual-layer pattern (RLS + trigger).
- **Tier 0 items** (B-001, B-002) do not require a full phase — they are targeted DB migrations only. They should be created before any new feature work begins.
- **Mock data modules** (9, 19, 25, 26) require data provider wiring to Supabase, not new UI components. The UI shells exist.
- **Reference:** `docs/governance/playbook-to-system-mapping.md` for per-module detailed analysis.
