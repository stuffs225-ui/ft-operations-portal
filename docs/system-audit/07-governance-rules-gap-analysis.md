# 07 — Governance Rules Gap Analysis

For each rule from the Governance Playbook, this file documents:
- Current implementation status
- Evidence from code
- Missing enforcement layer
- Risk level
- Required fix

---

## R-001 — Quotation cannot be submitted without specification files

| Field | Detail |
|-------|--------|
| **Status** | ✅ Enforced at UI level |
| **Evidence** | `QuotationNew.tsx:183` — `if (forSubmit && form.documents.length === 0) errs.push('At least one specification document is required to submit.')` |
| **Missing** | DB-level constraint — a direct API call to `quotation_requests` can bypass the UI check |
| **Risk** | 🟡 Medium |
| **Required Fix** | Add DB trigger: prevent INSERT/UPDATE of quotation status to `submitted_by_sales` if no linked document in `quotation_documents` with `document_type = 'specification_file'` |
| **Reference Pattern** | Custom trigger — model on migration 061 pattern |

---

## R-002 — Quotation cannot be returned to Sales without PDF upload and quotation number

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partial — coordinator page exists; enforcement not verified at DB level |
| **Evidence** | `SalesCoordinator.tsx` page exists; `quotation_number` column on `quotation_requests` table exists |
| **Missing** | No DB constraint preventing status change to `returned_to_sales` when `quotation_number IS NULL` or no PDF doc uploaded |
| **Risk** | 🟠 High |
| **Required Fix** | DB trigger: block status change to `returned_to_sales` if `quotation_number IS NULL` or no quotation PDF document linked |
| **Reference Pattern** | Custom trigger |

---

## R-003 — SO cannot be approved without Saudi/Dubai route selection

| Field | Detail |
|-------|--------|
| **Status** | ✅ Enforced |
| **Evidence** | `AdminApprovals.tsx` — route selection (`saudi`/`dubai`) is a required step before approval action. `projects.manufacturing_location` defaults to `not_set`; approval button is gated on route selection in the form |
| **Missing** | DB-level CHECK — `manufacturing_location != 'not_set'` when `project_status = 'approved'` |
| **Risk** | 🟡 Medium |
| **Required Fix** | Add DB CHECK constraint: `CHECK (project_status != 'approved' OR manufacturing_location IN ('saudi', 'dubai'))` |
| **Reference Pattern** | DB CHECK constraint |

---

## R-004 — SO cannot be approved without Medical Yes/No

| Field | Detail |
|-------|--------|
| **Status** | ✅ Enforced |
| **Evidence** | `AdminApprovals.tsx` — Medical selection is presented alongside route. `projects.medical_items` column exists with `not_set`/`yes`/`no` values |
| **Missing** | DB CHECK constraint similar to R-003 |
| **Risk** | 🟡 Medium |
| **Required Fix** | `CHECK (project_status != 'approved' OR medical_items IN ('yes', 'no'))` |
| **Reference Pattern** | DB CHECK constraint |

---

## R-005 — Saudi project cannot start factory details before WO is entered

| Field | Detail |
|-------|--------|
| **Status** | ✅ Enforced at application level |
| **Evidence** | `executionGate.ts` — `canStartSaudiFactory()` returns false if no active WO. `FactoryProjectWorkspace.tsx` uses this gate to block factory actions. |
| **Missing** | DB-level block — `factory_records` INSERT could bypass if API called directly |
| **Risk** | 🟡 Medium |
| **Required Fix** | DB trigger: reject `factory_records` INSERT for Saudi projects unless an active `project_execution_references` record with `reference_type = 'wo'` exists |
| **Reference Pattern** | Custom trigger |

---

## R-006 — Dubai project cannot start Dubai follow-up before PN is entered

| Field | Detail |
|-------|--------|
| **Status** | ✅ Enforced at application level |
| **Evidence** | `executionGate.ts` — `canStartDubaiFollowUp()` returns false if no active PN. `DubaiAfsProjectDetail.tsx` uses this gate. |
| **Missing** | DB-level block on `dubai_project_followups` INSERT without active PN |
| **Risk** | 🟡 Medium |
| **Required Fix** | DB trigger: reject `dubai_project_followups` INSERT for Dubai projects unless active PN reference exists |
| **Reference Pattern** | Custom trigger |

---

## R-007 — BOQ, BOM, drawings, and raw material requests blocked before WO for Saudi route

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partially enforced at UI level |
| **Evidence** | `FactoryProjectWorkspace.tsx` — gate status computed from `executionGate.ts`; UI shows locked state when no WO |
| **Missing** | `factory_requirements` and `raw_material_requests` INSERT not blocked at DB level when no active WO. A direct API call could create requirements without WO. |
| **Risk** | 🟡 Medium |
| **Required Fix** | DB trigger on `factory_requirements` and `raw_material_requests`: reject if project is Saudi route and no active WO |
| **Reference Pattern** | Custom trigger — model on migration 061 |

---

## R-008 — Dubai ETA and AFS readiness blocked before PN for Dubai route

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partially enforced at UI level |
| **Evidence** | `executionGate.ts` gate used in `DubaiAfsProjectDetail.tsx` |
| **Missing** | `dubai_project_followups` and `afs_arrival_reports` INSERT not blocked at DB level without active PN |
| **Risk** | 🟡 Medium |
| **Required Fix** | DB trigger on Dubai tables: reject if project is Dubai route and no active PN |
| **Reference Pattern** | Custom trigger |

---

## R-009 — PO above 10,000 SAR requires Admin or Operations Manager approval

| Field | Detail |
|-------|--------|
| **Status** | ✅ Fully enforced — dual layer |
| **Evidence** | Migration `061_po_approval_guard.sql` — RLS policy prevents procurement_user from setting `approval_status = 'approved'`. DB trigger `enforce_po_approval_authority()` raises EXCEPTION for non-admin/ops users. |
| **Missing** | Auto-set of `approval_required = true` for POs > 10,000 SAR (needs DB trigger or client-side logic verification) |
| **Risk** | 🟢 Low — approval mechanism is solid |
| **Required Fix** | Verify that `approval_required` is auto-set to `true` when `purchase_value > 10000`; add DB trigger if not |
| **Reference Pattern** | Already implemented — migration 061 is the gold standard pattern for other modules |

---

## R-010 — High-value PO cannot become active or sent without approval

| Field | Detail |
|-------|--------|
| **Status** | ✅ Enforced via same migration 061 mechanism |
| **Evidence** | `po_status` flow: `pending_approval` → `approved` → `sent_to_supplier`. Procurement cannot set `approved` status. |
| **Missing** | UI should prevent status change to `sent_to_supplier` when `approval_status = 'pending'` — needs UI-level verification |
| **Risk** | 🟢 Low |
| **Required Fix** | Verify UI blocks "Send to Supplier" button when `approval_status = 'pending'` |
| **Reference Pattern** | Migration 061 pattern ✓ |

---

## R-011 — Medical item cannot be accepted/installed without serial number

| Field | Detail |
|-------|--------|
| **Status** | 🔴 Not enforced at DB level |
| **Evidence** | `store_receipt_items.serial_required` boolean exists. `medical_serial_numbers` table exists. But no DB constraint prevents status change to `accepted` or `installed` when serial is missing. |
| **Missing** | DB trigger: when `store_receipt_item` has `serial_required = true` and status changes to `accepted_by_qc`/`installed`, check that at least one `medical_serial_numbers` record exists for this item |
| **Risk** | 🔴 Critical — medical compliance |
| **Required Fix** | DB trigger on `store_receipt_items` UPDATE: raise exception if `serial_required = true` and `status IN ('accepted_by_qc', 'installed')` and no serial records exist |
| **Reference Pattern** | Model on migration 061 PO guard pattern |

---

## R-012 — Vehicle receiving cannot be completed without chassis number and required photos

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partially enforced at UI level |
| **Evidence** | `VehicleReceipt` type has `chassis_number: string` (not nullable). `VehicleReceiptPhoto` has `photo_type: PhotoType` with required types. |
| **Missing** | DB NOT NULL constraint on `vehicle_receipts.chassis_number`. No DB trigger checking that all required photo types (front, rear, left_side, right_side, chassis_plate) are uploaded before status = 'accepted'. |
| **Risk** | 🟠 High |
| **Required Fix** | 1. Add NOT NULL to `chassis_number` at DB level. 2. Add DB trigger checking required photos before `status = 'accepted'` |
| **Reference Pattern** | Custom trigger |

---

## R-013 — Temporary custody requires Admin or Operations Manager approval

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partially enforced at UI level |
| **Evidence** | `MaterialCustodyRecord` type has `approval_required: boolean` and `CustodyApprovalStatus`. `issue_type` field distinguishes temporary vs. permanent. |
| **Missing** | No DB trigger preventing custody status change to `in_custody` when `approval_required = true` and `approval_status != 'approved'`. No guard like migration 061 for custody. |
| **Risk** | 🟠 High |
| **Required Fix** | DB trigger on `material_custody_records` UPDATE: block `status = 'in_custody'` or `issued` when `approval_required = true` and `approval_status != 'approved'`. Only admin/ops can set `approval_status = 'approved'`. |
| **Reference Pattern** | Mirror migration 061 PO approval guard |

---

## R-014 — Receiver must accept or reject custody

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Data model exists; enforcement unclear |
| **Evidence** | `CustodyReceiverDecision = 'pending' | 'accepted' | 'rejected'` in types. `receiver_decision` column on `material_custody_records`. |
| **Missing** | No DB constraint preventing status = `in_custody` while `receiver_decision = 'pending'`. No UI timeout/reminder for pending acceptance. |
| **Risk** | 🟡 Medium |
| **Required Fix** | DB CHECK or trigger: custody cannot be marked `in_custody` until `receiver_decision = 'accepted'` |
| **Reference Pattern** | Custom |

---

## R-015 — Release Note cannot be issued before all QC findings and rework are closed

| Field | Detail |
|-------|--------|
| **Status** | 🔴 Not enforced at DB level |
| **Evidence** | `release_notes.release_status = 'blocked'` exists as a status option. `project_qc_findings.finding_status` has `open`/`rework_in_progress`/`closed` values. But no DB trigger or FK prevents changing `release_status` to `issued` while open findings exist. |
| **Missing** | DB trigger on `release_notes` UPDATE: when `release_status` changes to `ready_to_issue` or `issued`, check that all `project_qc_findings` for the same `project_id` have `finding_status = 'closed'` or `cancelled`. Raise exception if any are open. |
| **Risk** | 🔴 Critical — core governance rule |
| **Required Fix** | DB trigger on release_notes — highest priority governance fix after serial enforcement |
| **Reference Pattern** | Model on migration 061 PO guard pattern |

---

## R-016 — Important operational events must appear in Timeline

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partial — infrastructure exists; consistency not guaranteed |
| **Evidence** | Timeline audit libs exist: `projectAudit.ts`, `quotationAudit.ts`, `procurementAudit.ts`, `factoryAudit.ts`, `qcAudit.ts`, `storeAudit.ts`, `afsAudit.ts`. Tables: `timeline_events`, `project_timeline_events`, `quotation_timeline_events`. |
| **Missing** | Audit lib functions must be called consistently. Currently, some pages call them and some don't. No mandatory DB trigger that auto-creates timeline events on status changes. |
| **Risk** | 🟡 Medium |
| **Required Fix** | Add DB triggers for critical status transitions (SO approval, PO approval, Release Note issue, Custody approval) to auto-insert timeline events regardless of UI path |
| **Reference Pattern** | Inngest (Direct, MIT, Low risk) for event-driven timeline creation |

---

## R-017 — Important data changes must appear in Audit Log

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partial — table exists; writes are manual |
| **Evidence** | `audit_log` table in migration 004. `projectAudit.ts` and other audit libs write to it. |
| **Missing** | Not all pages call audit functions consistently. No automatic DB-level audit trigger. |
| **Risk** | 🟡 Medium |
| **Required Fix** | Consider Supabase `pg_audit` extension or a generic `audit_trigger` function that auto-logs changes to key tables |
| **Reference Pattern** | Custom DB trigger |

---

## R-018 — SLA breaches must be trackable

| Field | Detail |
|-------|--------|
| **Status** | ⚠️ Partial — data model exists; no auto-generation |
| **Evidence** | `sla_rules`, `sla_events` tables. `slaEngine.ts` and `quotationSla.ts` for client-side SLA calculation. |
| **Missing** | No background job creates `sla_events` automatically when SLA is breached. No escalation trigger fires when events age past threshold. |
| **Risk** | 🔴 Critical |
| **Required Fix** | Inngest/Trigger.dev background job: scan active quotations/POs/projects for SLA breach; insert `sla_events`; notify escalation roles |
| **Reference Pattern** | Inngest (Direct, MIT, Low risk) |

---

## R-019 — Reports must be based on recorded system data

| Field | Detail |
|-------|--------|
| **Status** | 🔴 Not implemented in live mode |
| **Evidence** | All 13 report pages and ControlTower use `mockOrEmpty()` — they return empty or mock data in live Supabase mode. No live aggregation queries. |
| **Missing** | Live Supabase queries aggregating real records for every report page |
| **Risk** | 🔴 Critical — operational blindness |
| **Required Fix** | Wire each report page to real Supabase queries; replace `mockOrEmpty(MOCK_*)` calls with actual `.from(table).select()` calls |
| **Reference Pattern** | refine / react-admin (Pattern only, MIT, Low risk) for data-driven reporting |

---

## Summary

| Rule | Status | Risk |
|------|--------|------|
| R-001 Quotation spec-file gate | ⚠️ UI only | 🟡 |
| R-002 Coordinator return PDF/number | ⚠️ UI only | 🟠 |
| R-003 SO route before approval | ✅ UI; missing DB CHECK | 🟡 |
| R-004 SO Medical before approval | ✅ UI; missing DB CHECK | 🟡 |
| R-005 Saudi factory gate | ✅ UI; missing DB trigger | 🟡 |
| R-006 Dubai PN gate | ✅ UI; missing DB trigger | 🟡 |
| R-007 BOQ/BOM/raw material gate | ⚠️ UI only | 🟡 |
| R-008 Dubai ETA/AFS gate | ⚠️ UI only | 🟡 |
| R-009 PO > 10k approval | ✅ Dual-enforced | 🟢 |
| R-010 PO active/sent without approval | ✅ Dual-enforced | 🟢 |
| R-011 Medical serial requirement | 🔴 Not enforced | 🔴 |
| R-012 Vehicle chassis + photos | ⚠️ UI only | 🟠 |
| R-013 Temporary custody approval | ⚠️ UI only | 🟠 |
| R-014 Receiver accept/reject | ⚠️ Data model only | 🟡 |
| R-015 Release Note before QC closed | 🔴 Not enforced | 🔴 |
| R-016 Timeline events | ⚠️ Partial | 🟡 |
| R-017 Audit log | ⚠️ Partial | 🟡 |
| R-018 SLA breach tracking | ⚠️ Client-side only | 🔴 |
| R-019 Reports from real data | 🔴 Mock only | 🔴 |
