# 05 — Business Rules Layering

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no code changed

---

## Recommended Enforcement Model

The FT Operations Portal uses a **dual-layer** enforcement model (established in migration 061) and extended in Steps 4A and 4B:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Layer 1 — DB/RLS** | PostgreSQL triggers + Row Level Security | Enforce at the data level regardless of API path |
| **Layer 2 — UI/Service** | React components + `lib/` utilities | Provide user-friendly feedback before the DB rejects |

A **triple-layer** model is appropriate for the most critical governance rules:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Layer 1 — DB trigger** | BEFORE trigger (SECURITY DEFINER) | Last line of defense — always enforces |
| **Layer 2 — Service layer** | `services/*.service.ts` (Phase 1) | Validates before calling Supabase |
| **Layer 3 — UI validation** | React form validation | Provides immediate feedback to user |

---

## Rule-by-Rule Placement Analysis

### Rule R-001 — Quotation Spec File Gate

**Playbook:** A quotation cannot be submitted without at least one specification file uploaded.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ❌ Not enforced | B-008: Needed |
| Service layer | ❌ Not wired | Phase 3: Add `validateQuotationSubmit()` |
| UI validation | ✅ `QuotationNew.tsx` — spec file check before submit | Keep |

**Gap:** DB-level enforcement missing (B-008). A direct API call can create a submitted quotation without a spec file.

**Recommended final state:** Triple-layer (DB trigger + service validation + UI check).

---

### Rule R-002 — Coordinator Return Gate

**Playbook:** Coordinator cannot return a quotation to sales without a completed PDF and quotation number.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ❌ Not enforced | B-009: Needed |
| Service layer | ❌ Not wired | Phase 3: Add `validateCoordinatorReturn()` |
| UI validation | ⚠️ Partial — `QuotationDetail.tsx` | Verify gate logic completeness |

**Gap:** DB-level enforcement missing (B-009).

**Recommended final state:** Triple-layer.

---

### Rule R-003 — SO Route Selection Before Approval

**Playbook:** A Sales Order cannot be approved unless `manufacturing_location` is set to `'saudi'` or `'dubai'`.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ✅ **Migration 078** — `enforce_so_approval_fields()` BEFORE trigger | Complete |
| Service layer | ❌ Not wired | Phase 2: Validate in `approveProject()` service function |
| UI validation | ✅ `AdminApprovals.tsx` — route selection required in form | Keep |

**Current state:** Dual-layer (DB + UI). Triple-layer once service validation is added.

---

### Rule R-004 — SO Medical Items Before Approval

**Playbook:** A Sales Order cannot be approved unless `medical_items` is set to `'yes'` or `'no'`.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ✅ **Migration 078** — `enforce_so_approval_fields()` | Complete |
| Service layer | ❌ Not wired | Phase 2: Include in `approveProject()` |
| UI validation | ✅ `AdminApprovals.tsx` | Keep |

**Current state:** Dual-layer. Triple-layer in Phase 2.

---

### Rule R-005 — WO Number Required Before Saudi Factory Execution

**Playbook:** Saudi factory workspace cannot start until a WO number has been entered after SO approval.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ❌ Not enforced (B-025) | Phase 4 |
| Service layer | ✅ `executionGate.ts` — `canStartSaudiFactory()` | Keep — already extracted correctly |
| UI validation | ✅ `WoPnGate.tsx`, `FactoryProjectWorkspace.tsx` — gate status shown | Keep |

**Gap:** DB trigger missing (B-025). Service layer is correct and well-placed.

**Recommended final state:** Triple-layer (DB + service `executionGate.ts` + UI gate display).

---

### Rule R-006 — PN Number Required Before Dubai Follow-Up

**Playbook:** Dubai project follow-up cannot start without a PN number after SO approval.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ❌ Not enforced (B-024) | Phase 4 |
| Service layer | ✅ `executionGate.ts` — `canStartDubaiFollowUp()` | Keep |
| UI validation | ✅ `DubaiAfsProjectDetail.tsx` — gate status shown | Keep |

**Gap:** DB trigger missing (B-024).

---

### Rule R-008 — PO Value > 10,000 SAR Requires Approval

**Playbook:** A purchase order with `purchase_value > 10000 SAR` must not be approved by the submitter. An admin or operations manager must approve.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ✅ **Migration 061** — dual-layer guard (self-approval blocked) | Complete |
| Service layer | ⚠️ Not separately extracted; logic in `ProcurementPODetail.tsx` | Extract to `procurement.service.ts` in Phase 5 |
| UI validation | ✅ `ProcurementPODetail.tsx` — approval action shown to correct roles only | Keep |

**Current state:** Dual-layer (DB + UI). Best-enforced rule in the system (gold standard).

---

### Rule R-011 — Medical Serial Required Before QC Acceptance

**Playbook:** Medical items (`serial_required = TRUE`) cannot be accepted by QC or installed without a registered serial number.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ✅ **Migration 077** — `enforce_medical_serial_gate()` BEFORE trigger | Complete |
| Service layer | ❌ Not wired | Phase 7: Validate in `acceptByQc()` store service function |
| UI validation | ⚠️ Not enforced in `StoreReceiptDetail.tsx` — no pre-check | Phase 7: Add serial count check |

**Gap:** Service and UI layers missing. DB layer is complete.

---

### Rule R-012 — Vehicle Receipt Chassis Number Required

**Playbook:** Vehicle receipt cannot be marked complete without `chassis_number` filled in.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ❌ Not enforced (B-018) | Phase 7 |
| Service layer | ❌ Not wired | Phase 7 |
| UI validation | ⚠️ `StoreVehicleReceivingNew.tsx` — required field in form | Keep; add service validation |

**Gap:** DB trigger and service layer both missing.

---

### Rule R-013 — Temporary Custody Requires Approval

**Playbook:** Temporary custody handover requires admin or operations manager approval.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ❌ Not enforced (B-020, B-021) | Phase 7 |
| Service layer | ❌ Not wired | Phase 7 |
| UI validation | ✅ `CustodyNew.tsx` — `approval_required` flag UI exists | Keep |

**Gap:** DB trigger missing (B-020, B-021). Approval is UI-enforced only.

---

### Rule R-015 — Release Note Gate (QC Findings Must Be Closed)

**Playbook:** A Release Note cannot be set to `ready_to_issue` or `issued` while any QC finding is open.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ✅ **Migration 076** — `enforce_release_note_gate()` BEFORE trigger | Complete |
| Service layer | ❌ Not wired | Phase 8: Validate in `issueReleaseNote()` |
| UI validation | ⚠️ `ProjectQcReleaseNoteDetail.tsx` — status field exists | Phase 8: Add open-findings check before enabling action button |

**Gap:** Service and UI layers missing. DB layer is complete.

---

### Rule R-016/R-017 — Audit Trail for Key Field Changes

**Playbook:** Every significant status change must create a timeline event. Changes to key fields must log old/new value, user, and timestamp.

| Layer | Current State | Required State |
|-------|--------------|---------------|
| DB trigger | ✅ **Migration 080** — `append_audit_log()` AFTER trigger on `projects`, `release_notes` | Active for these tables |
| Service layer | ✅ `src/lib/projectAudit.ts` — `recordProjectEvent()`, `recordAuditEntry()` | Keep; extend to other modules |
| UI | N/A — audit is passive | N/A |

**Gap:** Migration 080 covers `projects` and `release_notes`. Other tables (store_receipts, procurement, QC) are not covered by the DB trigger — they rely on audit utility calls in `lib/`. The audit utilities (`qcAudit.ts`, `storeAudit.ts`, etc.) must be called consistently from all service layer functions.

---

## Business Rules Placement Matrix

| Rule | Layer 1 (DB) | Layer 2 (Service) | Layer 3 (UI) | Priority |
|------|-------------|------------------|-------------|---------|
| R-001 Spec file gate | ❌ | ❌ | ✅ | Phase 3 |
| R-002 Coordinator return gate | ❌ | ❌ | ⚠️ | Phase 3 |
| R-003 SO route check | ✅ mig-078 | ❌ | ✅ | Phase 2 |
| R-004 SO medical check | ✅ mig-078 | ❌ | ✅ | Phase 2 |
| R-005 WO gate | ❌ | ✅ executionGate | ✅ | Phase 4 |
| R-006 PN gate | ❌ | ✅ executionGate | ✅ | Phase 4 |
| R-008 PO 10k approval | ✅ mig-061 | ⚠️ | ✅ | Phase 5 |
| R-011 Medical serial | ✅ mig-077 | ❌ | ❌ | Phase 7 |
| R-012 Chassis number | ❌ | ❌ | ⚠️ | Phase 7 |
| R-013 Custody approval | ❌ | ❌ | ⚠️ | Phase 7 |
| R-015 Release Note gate | ✅ mig-076 | ❌ | ⚠️ | Phase 8 |
| R-016/017 Audit trail | ✅ mig-080 (partial) | ✅ lib/audit (inconsistent) | N/A | Phase 2+ |

**Legend:** ✅ enforced | ⚠️ partial | ❌ missing

---

## Current Gaps in Business Logic Placement

### Gap 1 — Service Layer Missing

No `src/services/` directory exists. Business logic is in:
- `src/lib/executionGate.ts` — ✅ well-placed (pure functions + Supabase)
- `src/lib/quotationSla.ts` — ✅ well-placed (SLA calculation)
- Directly in page components (ProjectDetail, QuotationDetail, ProcurementPODetail) — 🔴 wrong layer

**Fix:** Create service layer (Phase 1). Extract Supabase calls and business validation from pages into service files. Service functions call audit utilities after successful writes.

### Gap 2 — Audit Utility Calls Are Inconsistent

Six separate audit utility files exist (`projectAudit.ts`, `qcAudit.ts`, `storeAudit.ts`, `factoryAudit.ts`, `procurementAudit.ts`, `quotationAudit.ts`, `afsAudit.ts`). These must be called by the code that performs the state change. However:
- Migration 080 adds DB-level audit for `projects` and `release_notes` automatically
- Service layer calls to audit utilities create double-logging for these two tables
- Other tables have no DB-level audit — they depend entirely on audit utility calls that may be missed

**Fix (Phase 2):** 
1. Migration 080 covers projects + release_notes at DB level. Remove duplicate `recordAuditEntry()` calls for these tables from the service layer.
2. Extend migration 080-style triggers to other high-value tables in dedicated future migrations.
3. Consolidate the 6 separate audit files into `src/services/audit.service.ts`.

### Gap 3 — SLA Logic Client-Side Only

`src/lib/slaEngine.ts` (61 lines) provides client-side SLA calculation. The result is not persisted to `sla_events`. No background scheduler exists to evaluate SLA conditions periodically. SLA breach notifications never fire.

**Fix (Phase 10):** Server-side SLA evaluation using BullMQ (MIT) with `pg-boss` (MIT) as a PostgreSQL-backed scheduler. Client-side SLA calculation can remain for display but should not be the enforcement mechanism.

---

## Recommended Triple-Layer Implementation Pattern

For every new rule implemented in Phase 1+:

```
Rule: "XYZ cannot happen until ABC"

DB Layer (always required):
  CREATE OR REPLACE FUNCTION public.enforce_xyz_rule()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    -- guard: early exit if not the transitioning state
    -- check: query the ABC condition
    -- raise: clear error message with R-XXX reference
  END; $$;
  CREATE TRIGGER xyz_rule BEFORE INSERT OR UPDATE ON target_table
    FOR EACH ROW EXECUTE FUNCTION public.enforce_xyz_rule();

Service Layer (Phase 1+ service files):
  async function performXyz(id: string): Promise<Result> {
    // validate ABC condition first
    const isReady = await checkAbcCondition(id);
    if (!isReady) return { error: 'XYZ blocked: ABC not complete' };
    // call Supabase
    const { error } = await supabase.from('table').update(...).eq('id', id);
    // audit
    await recordAuditEntry(...);
    return { success: true };
  }

UI Layer (page components):
  // Check before enabling action button
  const canPerformXyz = useAbcConditionCheck(id);
  // Show disabled button + tooltip explanation
  <Button disabled={!canPerformXyz} title="XYZ requires ABC to be complete">
    Perform XYZ
  </Button>
```
