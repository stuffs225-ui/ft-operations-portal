# Critical Governance Rules Register

**Document:** Step 3 — Playbook-to-System Mapping  
**Branch:** `audit/playbook-to-system-mapping`  
**Date:** 2026-06-13  
**Sources:**
- `docs/system-audit/07-governance-rules-gap-analysis.md` — Rules R-001 to R-019
- `docs/reference-library/ft-ops-playbook-summary.md` — 20 Permanent Rules
- `docs/CLAUDE_PROJECT_RULES.md` — Rule 7 (Critical Governance Rules)

---

## Purpose

This register is the authoritative list of every governance rule from the FT Operations Portal Playbook v3.2 that has an enforcement gap. It is used:

1. To track which rules are DB-enforced vs. UI-only vs. not enforced
2. To guide migration work (each "required fix" column maps to a migration)
3. To define sign-off tests that prove enforcement before a module can be closed
4. To prevent future implementations from accidentally bypassing a rule

---

## Enforcement Tier Definitions

| Tier | Meaning |
|------|---------|
| **TIER-1 (DB)** | Enforced at PostgreSQL level — RLS policy AND/OR trigger AND/OR CHECK constraint. Cannot be bypassed by any client. |
| **TIER-2 (API)** | Enforced at Supabase Edge Function or server-side logic. Cannot be bypassed from the UI but could be bypassed if calling the API directly. |
| **TIER-3 (UI)** | Enforced only in React components — disabled buttons, hidden screens. Can be bypassed by modifying or ignoring the UI. |
| **NONE** | No enforcement — rule exists in playbook only; system does not enforce it. |

---

## Risk Level Definitions

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Rule currently not enforced; a user can violate it today through normal use |
| **HIGH** | Rule enforced at UI tier only; bypass possible through direct API calls |
| **MEDIUM** | Rule partially enforced; some paths covered, others not |
| **LOW** | Rule enforced at DB level; gap is cosmetic or reporting only |

---

## Section 1 — Governance Rules from Step 2 Audit (R-001 to R-019)

### R-001 — Quotation Specification File Gate

| Field | Value |
|-------|-------|
| **Rule ID** | R-001 |
| **Description** | A quotation cannot be submitted for processing unless at least one Specification File is attached. |
| **Playbook Source** | Section 05 — Quotation Management |
| **Current Enforcement** | TIER-3 (UI) — submit button disabled; no DB trigger |
| **Required Enforcement** | TIER-1 (DB) — trigger on `quotations` table: reject INSERT with status='submitted' when no spec file exists in `project_documents` |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration: `CREATE TRIGGER` on `quotations` checking `project_documents` count before status change |
| **Backlog Item** | B-008 |
| **Phase** | Phase 3 |
| **Sign-off Test** | Attempt to set `quotation.status = 'submitted'` via direct Supabase call without uploading a spec file — must be rejected by trigger |

---

### R-002 — Sales Coordinator Return Gate (PDF + Values)

| Field | Value |
|-------|-------|
| **Rule ID** | R-002 |
| **Description** | A Sales Coordinator cannot return a quotation to Sales without both: (a) a supplier PDF attached, and (b) a price value entered. |
| **Playbook Source** | Section 06 — Sales Coordinator Workspace |
| **Current Enforcement** | TIER-3 (UI) — return button requires both; no DB enforcement |
| **Required Enforcement** | TIER-1 (DB) — trigger on `quotations` checking for attachment + numeric price before status advances to 'returned_to_sales' |
| **Risk Level** | HIGH |
| **Required Fix** | Migration: trigger on `quotations` blocking status='returned_to_sales' if `quoted_price IS NULL OR supplier_pdf_url IS NULL` |
| **Backlog Item** | B-009 |
| **Phase** | Phase 3 |
| **Sign-off Test** | Attempt direct DB status update to 'returned_to_sales' without price or PDF — must fail |

---

### R-003 — SO Route Selection Before Approval

| Field | Value |
|-------|-------|
| **Rule ID** | R-003 |
| **Description** | A Sales Order must have its route (Saudi / Dubai / Both) selected before it can be approved. |
| **Playbook Source** | Section 07 — SO Registration, Section 08 — Approval & Routing |
| **Current Enforcement** | TIER-3 (UI) — approval form requires selection; no DB CHECK |
| **Required Enforcement** | TIER-1 (DB) — `CHECK` constraint on `sales_orders`: `route IS NOT NULL` when `status = 'approved'` |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration: `ALTER TABLE sales_orders ADD CONSTRAINT check_route_before_approval CHECK (status != 'approved' OR route IS NOT NULL)` |
| **Backlog Item** | B-010 |
| **Phase** | Phase 2 |
| **Sign-off Test** | Direct UPDATE setting `sales_orders.status = 'approved'` with `route = NULL` — must be rejected |

---

### R-004 — SO Medical Flag Before Approval

| Field | Value |
|-------|-------|
| **Rule ID** | R-004 |
| **Description** | A Sales Order must have its Medical flag (Yes/No) selected before approval. |
| **Playbook Source** | Section 08 — Approval & Routing |
| **Current Enforcement** | TIER-3 (UI) — approval form requires selection; no DB CHECK |
| **Required Enforcement** | TIER-1 (DB) — `CHECK` constraint: `is_medical IS NOT NULL` when `status = 'approved'` |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration: `ALTER TABLE sales_orders ADD CONSTRAINT check_medical_before_approval CHECK (status != 'approved' OR is_medical IS NOT NULL)` |
| **Backlog Item** | B-011 |
| **Phase** | Phase 2 |
| **Sign-off Test** | Direct UPDATE `sales_orders.status = 'approved'` with `is_medical = NULL` — must be rejected |

---

### R-005 — Saudi Factory Gate (WO Required)

| Field | Value |
|-------|-------|
| **Rule ID** | R-005 |
| **Description** | The Saudi factory workspace cannot be started — no Work Orders, BOQ, BOM, or raw material requests — until a WO number has been entered after SO approval. |
| **Playbook Source** | Section 12 — Saudi Factory Workspace, Section 07 — WO/PN Gate |
| **Current Enforcement** | TIER-2/TIER-3 — `executionGate.ts` (`canStartSaudiFactory()`) + UI blocking; no DB trigger |
| **Required Enforcement** | TIER-1 (DB) — trigger on `work_orders` INSERT checking that parent SO has `wo_number IS NOT NULL` |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration: `CREATE TRIGGER` on `work_orders` blocking INSERT if SO lacks `wo_number` |
| **Backlog Item** | B-025 |
| **Phase** | Phase 4 |
| **Sign-off Test** | Attempt direct INSERT into `work_orders` for an SO without `wo_number` — must fail |

---

### R-006 — Dubai PN Gate (PN Required)

| Field | Value |
|-------|-------|
| **Rule ID** | R-006 |
| **Description** | Dubai project follow-up, ETA, and AFS flows cannot start until a PN number has been entered after SO approval. |
| **Playbook Source** | Section 13 — Dubai Projects & AFS, Section 07 — WO/PN Gate |
| **Current Enforcement** | TIER-2/TIER-3 — `executionGate.ts` (`canStartDubaiFollowUp()`) + UI blocking; no DB trigger |
| **Required Enforcement** | TIER-1 (DB) — trigger on `dubai_projects` INSERT checking that parent SO has `pn_number IS NOT NULL` |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration: `CREATE TRIGGER` on `dubai_projects` blocking INSERT if SO lacks `pn_number` |
| **Backlog Item** | B-024 |
| **Phase** | Phase 4 |
| **Sign-off Test** | Attempt direct INSERT into `dubai_projects` for an SO without `pn_number` — must fail |

---

### R-007 — BOQ/BOM/Raw Material WO Prerequisite Gate

| Field | Value |
|-------|-------|
| **Rule ID** | R-007 |
| **Description** | BOQ, BOM entry, and Raw Material Requests cannot be created without a WO number established. |
| **Playbook Source** | Section 12 — Saudi Factory Workspace |
| **Current Enforcement** | TIER-3 (UI) — factory workspace blocked by WO gate screen; no individual table triggers |
| **Required Enforcement** | TIER-1 (DB) — triggers on `boq_items`, `bom_items`, `raw_material_requests` checking for parent WO |
| **Risk Level** | MEDIUM |
| **Required Fix** | Extend WO gate triggers to child tables after R-005 is fixed |
| **Backlog Item** | B-030 |
| **Phase** | Phase 4 |
| **Sign-off Test** | Direct INSERT into `raw_material_requests` without a linked WO — must fail |

---

### R-008 — Dubai ETA/AFS Gate (PN Prerequisite)

| Field | Value |
|-------|-------|
| **Rule ID** | R-008 |
| **Description** | Dubai ETA updates and AFS documentation cannot be entered without a PN number established. |
| **Playbook Source** | Section 13 — Dubai Projects & AFS |
| **Current Enforcement** | TIER-3 (UI) — AFS workspace blocked by PN gate; no DB trigger |
| **Required Enforcement** | TIER-1 (DB) — triggers on `afs_records`, `dubai_eta_updates` checking for parent PN |
| **Risk Level** | MEDIUM |
| **Required Fix** | Extend PN gate triggers to child AFS/ETA tables after R-006 is fixed |
| **Backlog Item** | B-024 |
| **Phase** | Phase 4 |
| **Sign-off Test** | Direct INSERT into `afs_records` without a linked PN — must fail |

---

### R-009 — PO High-Value Approval Gate (>10,000 SAR)

| Field | Value |
|-------|-------|
| **Rule ID** | R-009 |
| **Description** | A Purchase Order exceeding 10,000 SAR cannot be sent to the supplier without approval from Admin or Operations Manager. |
| **Playbook Source** | Section 10 — Procurement & PO Approval |
| **Current Enforcement** | **TIER-1 (DB)** — migration 061 (`061_po_approval_guard.sql`): RLS policy blocking status change + DB trigger enforcing approval requirement ✅ |
| **Required Enforcement** | Already met |
| **Risk Level** | LOW |
| **Required Fix** | None — this is the gold standard implementation |
| **Backlog Item** | None (complete) |
| **Phase** | Complete |
| **Sign-off Test** | Attempt direct UPDATE `purchase_orders.status = 'sent_to_supplier'` for a PO > 10,000 SAR without approval — must fail via trigger |

---

### R-010 — PO Cannot Be Active Without Approval

| Field | Value |
|-------|-------|
| **Rule ID** | R-010 |
| **Description** | A PO cannot move to any "active" or "sent" status if it requires approval and approval has not been granted. |
| **Playbook Source** | Section 10 — Procurement & PO Approval |
| **Current Enforcement** | **TIER-1 (DB)** — covered by migration 061 dual-layer enforcement ✅ |
| **Required Enforcement** | Already met |
| **Risk Level** | LOW |
| **Required Fix** | None |
| **Backlog Item** | None (complete) |
| **Phase** | Complete |
| **Sign-off Test** | Same as R-009 — covered by migration 061 |

---

### R-011 — Medical Serial Number Requirement (CRITICAL)

| Field | Value |
|-------|-------|
| **Rule ID** | R-011 |
| **Description** | Medical items cannot pass QC without a serial number registered for each unit. The QC acceptance must be blocked at DB level if serial number is null. |
| **Playbook Source** | Section 17 — Medical Serial Number Tracking, Permanent Rule #14 |
| **Current Enforcement** | **NONE** — no trigger, no NOT NULL constraint, no UI gate identified in audit |
| **Required Enforcement** | TIER-1 (DB) — trigger on `qc_inspections`: reject status='passed' for medical items (`is_medical = TRUE`) where `serial_number IS NULL` |
| **Risk Level** | **CRITICAL** |
| **Required Fix** | Migration (Tier 0, B-002): `CREATE TRIGGER prevent_medical_qc_without_serial` on `qc_inspections` |
| **Backlog Item** | B-002 |
| **Phase** | **Tier 0 — Immediate** |
| **Sign-off Test** | Direct INSERT `qc_inspections (status='passed', is_medical=TRUE, serial_number=NULL)` — must fail; `serial_number NOT NULL` INSERT — must succeed |

---

### R-012 — Vehicle Receiving: Chassis + Photos Required

| Field | Value |
|-------|-------|
| **Rule ID** | R-012 |
| **Description** | A vehicle receiving record is not complete until: (a) a chassis number has been entered, and (b) at least one photo has been uploaded. |
| **Playbook Source** | Section 16 — Vehicle Receiving |
| **Current Enforcement** | TIER-3 (UI) — form requires chassis number; photo count UI check; no DB enforcement |
| **Required Enforcement** | TIER-1 (DB) — (a) `chassis_number NOT NULL` on `vehicle_receipts` table; (b) trigger blocking status='received' when no photo exists in `vehicle-photos` storage bucket |
| **Risk Level** | HIGH |
| **Required Fix** | Migration (B-018): `ALTER TABLE vehicle_receipts ALTER COLUMN chassis_number SET NOT NULL` + trigger checking photo record |
| **Backlog Item** | B-018, B-019 |
| **Phase** | Phase 7 |
| **Sign-off Test** | INSERT `vehicle_receipts` with `chassis_number = NULL` — must fail; UPDATE status='received' without photo — must fail |

---

### R-013 — Temporary Custody Approval Required

| Field | Value |
|-------|-------|
| **Rule ID** | R-013 |
| **Description** | Material issued under temporary custody requires Admin or Operations Manager approval before handover. |
| **Playbook Source** | Section 15 — Material Custody & Issuance |
| **Current Enforcement** | TIER-3 (UI) — approval workflow screen exists; no DB gate |
| **Required Enforcement** | TIER-1 (DB) — trigger on `custody_issuances`: block status='issued' where `custody_type = 'temporary'` and `approved_by IS NULL` |
| **Risk Level** | HIGH |
| **Required Fix** | Migration (B-020): `CREATE TRIGGER` on `custody_issuances` enforcing approval for temporary custody |
| **Backlog Item** | B-020, B-022 |
| **Phase** | Phase 7 |
| **Sign-off Test** | Direct UPDATE `custody_issuances.status = 'issued'` for temporary custody without approval — must fail |

---

### R-014 — Receiver Accept/Reject Decision

| Field | Value |
|-------|-------|
| **Rule ID** | R-014 |
| **Description** | When material is delivered, the receiver must explicitly Accept or Reject each delivery line. Ambiguous or missing decisions must not be treated as accepted. |
| **Playbook Source** | Section 14 — Store & Warehouse |
| **Current Enforcement** | TIER-2 — data model captures accept/reject; no blocking trigger for missing decision |
| **Required Enforcement** | TIER-1 (DB) — CHECK constraint: `decision IN ('accepted', 'rejected')` and `decision IS NOT NULL` on receiving lines |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration: `ALTER TABLE receiving_lines ADD CONSTRAINT check_decision NOT NULL` and add enum CHECK |
| **Backlog Item** | B-027 |
| **Phase** | Phase 7 |
| **Sign-off Test** | INSERT `receiving_lines` without a `decision` — must fail |

---

### R-015 — Release Note Gate: No Open QC Findings (CRITICAL)

| Field | Value |
|-------|-------|
| **Rule ID** | R-015 |
| **Description** | A Release Note cannot be issued while any QC finding, NCR, or rework task is open on the same project. |
| **Playbook Source** | Section 20 — Quality Control & Release Note, Permanent Rule #15 |
| **Current Enforcement** | **NONE** — no trigger, no DB gate; Release Note can be created regardless of open QC findings |
| **Required Enforcement** | TIER-1 (DB) — trigger on `release_notes`: reject INSERT if any `qc_findings` with `status != 'closed'` exist for the same project |
| **Risk Level** | **CRITICAL** |
| **Required Fix** | Migration (Tier 0, B-001): `CREATE TRIGGER prevent_release_note_with_open_findings` on `release_notes` |
| **Backlog Item** | B-001 |
| **Phase** | **Tier 0 — Immediate** |
| **Sign-off Test** | INSERT `release_notes` for a project with an open `qc_findings` record — must fail; after closing finding — must succeed |

---

### R-016 — Timeline Events Logging

| Field | Value |
|-------|-------|
| **Rule ID** | R-016 |
| **Description** | Every significant status change must create a timeline event record with user, timestamp, and description. |
| **Playbook Source** | Section 28 — Timeline & Audit Log |
| **Current Enforcement** | TIER-2 (partial) — `auditLog()` utility exists but is inconsistently called across modules |
| **Required Enforcement** | TIER-1 (DB) — trigger-based audit log on all primary status columns, supplementing (not replacing) `auditLog()` calls |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration (B-036): create unified audit trigger applied to all status columns across main entity tables |
| **Backlog Item** | B-036 |
| **Phase** | Phase 2 |
| **Sign-off Test** | Update any status field directly — verify a timeline event row is auto-created |

---

### R-017 — Field-Level Audit Trail

| Field | Value |
|-------|-------|
| **Rule ID** | R-017 |
| **Description** | Changes to key fields (price, quantity, supplier, status) must be logged with old value, new value, user, and timestamp. |
| **Playbook Source** | Section 28 — Timeline & Audit Log |
| **Current Enforcement** | TIER-2 (partial) — `auditLog()` captures some changes; no field-level diff log |
| **Required Enforcement** | TIER-1 (DB) — generic audit trigger capturing `OLD.*` vs `NEW.*` for key tables |
| **Risk Level** | MEDIUM |
| **Required Fix** | Migration (B-036): generic audit trigger with JSONB `old_data` / `new_data` columns |
| **Backlog Item** | B-036 |
| **Phase** | Phase 2 |
| **Sign-off Test** | UPDATE `purchase_orders.total_amount` — verify audit row captures old and new value |

---

### R-018 — SLA Breach Tracking and Escalation (CRITICAL)

| Field | Value |
|-------|-------|
| **Rule ID** | R-018 |
| **Description** | SLA breaches must be detected and escalated automatically — not only when a user opens a screen. |
| **Playbook Source** | Section 24 — SLA & Escalation Engine |
| **Current Enforcement** | TIER-3 (UI) — `slaEngine.ts` and `quotationSla.ts` compute SLA status client-side; no server-side scheduler |
| **Required Enforcement** | TIER-2 (scheduled) — background job (BullMQ or pg_cron) running on server; SLA breach updates stored in DB; notification sent |
| **Risk Level** | **CRITICAL** |
| **Required Fix** | Phase 10 (B-006): implement BullMQ or pg_cron scheduler; move SLA computation to server |
| **Backlog Item** | B-006, B-007 |
| **Phase** | Phase 10 |
| **Sign-off Test** | Create a record with SLA deadline in the past; verify that without opening the screen, the SLA breach status is detected and stored |

---

### R-019 — Reports from Real Data (CRITICAL)

| Field | Value |
|-------|-------|
| **Rule ID** | R-019 |
| **Description** | All reports and KPI dashboards must display live data from the database. |
| **Playbook Source** | Section 25 — Reports & KPIs |
| **Current Enforcement** | **NONE** (mock) — all 13 report pages return static mock data |
| **Required Enforcement** | TIER-2 — Supabase queries wired to each report page; no UI change needed, only data provider connection |
| **Risk Level** | **CRITICAL** |
| **Required Fix** | Phase 10 (B-004): wire report pages to live Supabase queries; replace `mockOrEmpty()` with real data fetching |
| **Backlog Item** | B-003, B-004 |
| **Phase** | Phase 10 |
| **Sign-off Test** | Verify all report pages return `[]` in a fresh empty database rather than mock data |

---

## Section 2 — Permanent Rules from Playbook v3.2 (20 Rules)

These 20 rules are from the playbook's foundational governance section and apply to the entire system.

| # | Rule | Enforcement Status | Risk | Backlog |
|---|------|--------------------|------|---------|
| PR-01 | Every project must have a valid SO before factory or Dubai work begins | TIER-2/3 — `executionGate.ts`; no DB trigger | MEDIUM | B-024, B-025 |
| PR-02 | WO number must be entered before Saudi factory workspace activates | TIER-2/3 — gate logic; no DB trigger | MEDIUM | B-025 |
| PR-03 | PN number must be entered before Dubai workspace activates | TIER-2/3 — gate logic; no DB trigger | MEDIUM | B-024 |
| PR-04 | All quotations need at least one specification file before submission | TIER-3 (UI) only | MEDIUM | B-008 |
| PR-05 | Sales Coordinator must provide both PDF and price before return | TIER-3 (UI) only | HIGH | B-009 |
| PR-06 | SO route (Saudi/Dubai/Both) must be selected before approval | TIER-3 (UI) only | MEDIUM | B-010 |
| PR-07 | SO Medical flag must be selected before approval | TIER-3 (UI) only | MEDIUM | B-011 |
| PR-08 | PO > 10,000 SAR requires Admin or Ops Manager approval | **TIER-1 (DB) ✅** — migration 061 | LOW | Complete |
| PR-09 | Approved Supplier registry must be used — blocked suppliers cannot receive POs | TIER-3 (UI) only | MEDIUM | B-016 |
| PR-10 | Raw material requests must reference a WO | TIER-3 (UI) only | MEDIUM | B-030 |
| PR-11 | BOQ and BOM require WO before entry | TIER-3 (UI) only | MEDIUM | B-029 |
| PR-12 | Vehicle receipt requires chassis number AND photos | TIER-3 (UI) only | HIGH | B-018, B-019 |
| PR-13 | Temporary custody requires Admin/Ops Manager approval | TIER-3 (UI) only | HIGH | B-020 |
| PR-14 | Medical items require serial number before QC pass | **NONE ✗** — not enforced | **CRITICAL** | B-002 |
| PR-15 | Release Note blocked while any QC finding is open | **NONE ✗** — not enforced | **CRITICAL** | B-001 |
| PR-16 | Every status change must produce a timeline event | TIER-2 (partial) — inconsistent | MEDIUM | B-036 |
| PR-17 | SLA deadlines must be computed and stored server-side | TIER-3 (UI) only — client-side | **CRITICAL** | B-006 |
| PR-18 | All reports must use live database data | **NONE ✗** — all mock | **CRITICAL** | B-004 |
| PR-19 | 30-day factory rule: vehicle lines not updated in 30 days must be escalated | **NONE ✗** — not implemented | HIGH | B-003 |
| PR-20 | Store user cannot see financial values in any response | TIER-3 (UI) only — no API-level filter | HIGH | B-013 |

---

## Section 3 — Rules Requiring Immediate Action (Tier 0)

These rules have CRITICAL risk and no current DB enforcement. They must be addressed before any new feature development.

### Tier 0 — Action List

| Rule | Description | Migration Required | Backlog Item |
|------|-------------|-------------------|--------------|
| R-011, PR-14 | Medical serial number gate | Trigger on `qc_inspections` | B-002 |
| R-015, PR-15 | Release Note gate | Trigger on `release_notes` | B-001 |

**Both Tier 0 migrations should follow the pattern established in `supabase/migrations/061_po_approval_guard.sql`:**

```sql
-- Pattern: RLS policy + BEFORE INSERT/UPDATE trigger
-- RLS blocks UI-level bypass
-- Trigger provides the enforcement logic with clear error message
-- Error message must describe what is missing and why
```

---

## Section 4 — Rules That Are Fully Compliant

These rules are currently enforced at TIER-1 (DB) level and require no action:

| Rule | Description | Migration |
|------|-------------|-----------|
| R-009 | PO > 10,000 SAR approval gate | `061_po_approval_guard.sql` |
| R-010 | PO cannot go active without approval | `061_po_approval_guard.sql` |
| PR-08 | Same as R-009 | `061_po_approval_guard.sql` |

**Migration 061 is the only DB-level governance enforcement in the system.** All other rules are UI-only or not enforced.

---

## Section 5 — Sign-Off Test Definitions

For a governance rule to be signed off as fully compliant, ALL three tests must pass:

### Test Category A — DB Layer Bypass Test
Attempt to violate the rule by making a direct Supabase call (bypassing all UI). The rule must be rejected at the DB layer.

```typescript
// Example: Testing R-015 Release Note gate
const { error } = await supabase
  .from('release_notes')
  .insert({ project_id: projectWithOpenFindings, ... });

// Expected: error.code === 'P0001' (PostgreSQL raise_exception from trigger)
// Expected: error.message includes "open QC findings"
```

### Test Category B — UI Path Test
Complete the workflow through the normal UI path. Confirm the UI gate prevents the violation before the DB layer is reached.

### Test Category C — Role Bypass Test
Attempt the violation using a role that should not have permission. Confirm the RLS policy blocks it.

---

## Appendix — Rule-to-Backlog Cross-Reference

| Backlog Item | Related Rules |
|-------------|---------------|
| B-001 | R-015, PR-15 |
| B-002 | R-011, PR-14 |
| B-003 | PR-19, R-019 |
| B-004 | R-019, PR-18 |
| B-006 | R-018, PR-17 |
| B-007 | R-018 |
| B-008 | R-001, PR-04 |
| B-009 | R-002, PR-05 |
| B-010 | R-003, PR-06 |
| B-011 | R-004, PR-07 |
| B-013 | PR-20 |
| B-016 | PR-09 |
| B-018 | R-012, PR-12 |
| B-019 | R-012, PR-12 |
| B-020 | R-013, PR-13 |
| B-022 | R-013 |
| B-024 | R-006, R-008, PR-03 |
| B-025 | R-005, PR-02 |
| B-029 | R-007, PR-11 |
| B-030 | R-007, PR-10 |
| B-036 | R-016, R-017, PR-16 |
