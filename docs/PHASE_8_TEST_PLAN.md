# Phase 8 Test Plan

## Overview

This test plan covers all modules introduced in Phase 8: Material QC, Material NCR, Project QC, Rework & Findings, Release Note, and the ProjectDetail QC/Release tab. Tests are written as Given/When/Then scenarios with explicit pass criteria.

Total scenarios: 55

---

## Section 1: Material QC Module (TC-8-001 to TC-8-012)

---

**TC-8-001: Material QC dashboard shows correct KPIs**

| Field | Detail |
|-------|--------|
| Given | There are 5 pending, 3 in_progress, 12 completed inspections in the system |
| When | A qc_user navigates to the Material QC dashboard |
| Then | Dashboard displays: Pending = 5, In Progress = 3, Completed = 12 |
| Pass Criteria | All three KPI cards display the correct counts; counts match database state |

---

**TC-8-002: Inspection created when store_receipt reaches 'received' status**

| Field | Detail |
|-------|--------|
| Given | A store_receipt is in status 'pending' with 2 receipt items |
| When | The receipt status is updated to 'received' |
| Then | A material_qc_inspection record is created with status 'pending' linked to the receipt; inspection number follows MQC-YYYY-NNNN format |
| Pass Criteria | Inspection record exists in DB; inspection number is correctly formatted; inspection appears in QC pending queue |

---

**TC-8-003: QC user can start an inspection (pending → in_progress)**

| Field | Detail |
|-------|--------|
| Given | A material_qc_inspection with status 'pending' exists |
| When | A qc_user clicks "Start Inspection" |
| Then | Inspection status changes to 'in_progress'; in_progress timestamp is recorded |
| Pass Criteria | DB status = 'in_progress'; timestamp set; inspection detail page reflects new status |

---

**TC-8-004: Inspection completed with result 'accepted'**

| Field | Detail |
|-------|--------|
| Given | An inspection is in_progress with all items reviewed |
| When | QC user sets result to 'accepted' and clicks "Complete Inspection" |
| Then | Inspection status = 'completed'; result = 'accepted'; linked store_receipt_items have qc_status = 'cleared' |
| Pass Criteria | DB inspection status and result correct; all receipt item qc_status values updated to 'cleared' |

---

**TC-8-005: Inspection completed with result 'accepted_with_comments' requires comments**

| Field | Detail |
|-------|--------|
| Given | An inspection is in_progress |
| When | QC user selects result 'accepted_with_comments' and attempts to complete without entering comments |
| Then | Validation error displayed; inspection not completed |
| Pass Criteria | Form shows inline error "Comments are required for this result"; API returns 422; inspection remains in_progress |

---

**TC-8-006: Inspection result 'rejected' — receipt item quarantined**

| Field | Detail |
|-------|--------|
| Given | An inspection is in_progress |
| When | QC user sets result to 'rejected' and completes the inspection |
| Then | Inspection status = 'completed'; result = 'rejected'; linked store_receipt_items have quarantined = true |
| Pass Criteria | DB quarantined flag set to true on all linked receipt items; items do not appear in allocation views |

---

**TC-8-007: NCR auto-created on rejection**

| Field | Detail |
|-------|--------|
| Given | A material_qc_inspection result is set to 'rejected' and the inspection is completed |
| When | The completion is saved |
| Then | A material_ncr record is created with status 'open'; NCR number in NCR-YYYY-NNNN format; NCR linked to the inspection via material_qc_inspection_id |
| Pass Criteria | NCR record exists in DB; number format correct; FK to inspection set; NCR appears in NCR list |

---

**TC-8-008: Medical serial numbers displayed in inspection form for serial_required items**

| Field | Detail |
|-------|--------|
| Given | A store_receipt_item has serial_required = true and 3 linked medical_serial_number records |
| When | QC user opens the inspection for this receipt |
| Then | The inspection form shows all 3 serial numbers with individual verify/flag controls |
| Pass Criteria | All 3 serial number entries visible; each has a status control; verified count shown in summary |

---

**TC-8-009: Flagging a serial number sets item result to rejected**

| Field | Detail |
|-------|--------|
| Given | An inspection is in_progress; a serial_required item has 3 serial numbers |
| When | QC user flags 1 serial number as non-conforming |
| Then | That serial_number record status = 'flagged'; the parent receipt item result is set to 'rejected' |
| Pass Criteria | DB serial record status = 'flagged'; receipt item result shows rejected; QC user sees visual indicator |

---

**TC-8-010: store_user cannot create an inspection**

| Field | Detail |
|-------|--------|
| Given | A store_receipt is in 'received' status |
| When | A store_user attempts to navigate to "Create Inspection" or POST to the inspection creation endpoint |
| Then | Access is denied; 403 returned from API; UI does not show "Create Inspection" button for store_user |
| Pass Criteria | API returns 403; no inspection record created; UI button absent for store_user role |

---

**TC-8-011: QC user cannot see purchase costs on inspection items**

| Field | Detail |
|-------|--------|
| Given | A store_receipt_item has unit_price and total_value populated |
| When | A qc_user opens the Material QC inspection detail page |
| Then | unit_price and total_value fields are not displayed; API response excludes these fields |
| Pass Criteria | No cost fields visible in UI; API serializer omits unit_price and total_value for qc_user role |

---

**TC-8-012: Inspection cannot be cancelled after reaching 'completed'**

| Field | Detail |
|-------|--------|
| Given | A material_qc_inspection has status 'completed' |
| When | Any user attempts to cancel the inspection via UI or API |
| Then | Action is rejected; inspection remains 'completed' |
| Pass Criteria | API returns 422 with message "Cannot cancel a completed inspection"; status unchanged in DB |

---

## Section 2: Material NCR Module (TC-8-013 to TC-8-022)

---

**TC-8-013: NCR is created with correct fields from rejected inspection**

| Field | Detail |
|-------|--------|
| Given | A material_qc_inspection result is set to 'rejected' |
| When | The inspection is completed |
| Then | NCR created with: status='open', material_qc_inspection_id set, store_receipt_id set, store_receipt_item_id set, description pre-populated from inspection defect_description |
| Pass Criteria | All FK fields populated correctly; NCR appears in open NCR list; number format NCR-YYYY-NNNN |

---

**TC-8-014: Critical NCR highlighted in red in list view**

| Field | Detail |
|-------|--------|
| Given | There are 4 NCRs: 1 critical, 1 high, 1 medium, 1 low |
| When | Any user with NCR view access opens the Material NCR list |
| Then | The critical NCR row has a red background or red severity badge; other rows display standard styling |
| Pass Criteria | Critical row has CSS class or style indicating red; visual distinction is clear; no other rows styled as critical |

---

**TC-8-015: NCR cannot move to assigned without owner_id**

| Field | Detail |
|-------|--------|
| Given | An NCR has status 'open' |
| When | A qc_user attempts to move it to 'assigned' without setting owner_id |
| Then | Validation error returned; NCR remains 'open' |
| Pass Criteria | API returns 422; error message references owner_id; DB status unchanged |

---

**TC-8-016: NCR requires root_cause_category before moving to corrective_action_in_progress**

| Field | Detail |
|-------|--------|
| Given | An NCR has status 'assigned' with owner_id set |
| When | User attempts to advance to 'corrective_action_in_progress' without root_cause_category |
| Then | Validation error; NCR remains 'assigned' |
| Pass Criteria | API returns 422; error references root_cause_category field; DB status unchanged |

---

**TC-8-017: NCR closure fails without corrective_action and evidence**

| Field | Detail |
|-------|--------|
| Given | An NCR is in status 'pending_evidence' with no corrective_action, no closure_evidence_document, no closure_remarks |
| When | User attempts to close the NCR |
| Then | Closure is rejected; validation errors shown for both missing fields |
| Pass Criteria | API returns 422; errors reference corrective_action and at least one of closure_evidence_document/closure_remarks; status unchanged |

---

**TC-8-018: NCR closes successfully with corrective_action and closure_remarks**

| Field | Detail |
|-------|--------|
| Given | An NCR is in 'pending_evidence' with corrective_action = "Replaced non-conforming batch" and closure_remarks = "Supplier acknowledged fault" |
| When | User submits closure |
| Then | NCR status = 'closed'; closed_at timestamp set; closed_by set to acting user |
| Pass Criteria | DB status = 'closed'; timestamp and user fields populated; NCR no longer appears in "open NCRs" blocking check |

---

**TC-8-019: Closure rejected by admin — NCR reverts to corrective_action_in_progress**

| Field | Detail |
|-------|--------|
| Given | An NCR is in 'pending_evidence' |
| When | An admin sets status to 'rejected_closure' with closure_rejection_reason = "Evidence insufficient" |
| Then | NCR status = 'rejected_closure' then auto-transitions to 'corrective_action_in_progress'; closure_rejection_reason stored |
| Pass Criteria | Status = 'corrective_action_in_progress'; rejection reason persisted; timeline event 'ncr_closure_rejected' written |

---

**TC-8-020: store_user has read-only access to NCRs on their receipts**

| Field | Detail |
|-------|--------|
| Given | An NCR is linked to a store_receipt owned by a specific store_user |
| When | That store_user opens the NCR detail page |
| Then | NCR detail is visible; no edit controls are shown; status update buttons are absent |
| Pass Criteria | Page loads without 403; all edit/action buttons absent for store_user; API PATCH returns 403 |

---

**TC-8-021: Open NCR blocks Release Note for linked project**

| Field | Detail |
|-------|--------|
| Given | A material_ncr with status 'open' is linked to project P; a Release Note exists for project P |
| When | The Release Note status is evaluated |
| Then | Release Note status = 'blocked'; checklist item "No open Material NCRs" shows unresolved with count = 1 |
| Pass Criteria | Release Note status in DB = 'blocked'; UI checklist shows red cross for condition 1; NCR count displayed |

---

**TC-8-022: Closing NCR unblocks Release Note (if other conditions met)**

| Field | Detail |
|-------|--------|
| Given | The only blocking NCR for project P is in 'pending_evidence'; all other blocking conditions are resolved |
| When | The NCR is closed |
| Then | Release Note status re-evaluates; if all other conditions are clear, status moves to 'ready_to_issue' |
| Pass Criteria | Release Note status = 'ready_to_issue' after NCR closure; checklist item 1 shows green check |

---

## Section 3: Project QC Module (TC-8-023 to TC-8-032)

---

**TC-8-023: Project QC dashboard shows inspection queue**

| Field | Detail |
|-------|--------|
| Given | There are 4 pending and 2 in_progress project QC inspections |
| When | A qc_user opens the Project QC dashboard |
| Then | Dashboard shows Pending = 4, In Progress = 2 with correct inspection numbers and project names |
| Pass Criteria | KPI counts match DB; inspection queue table lists all pending/in_progress records with correct data |

---

**TC-8-024: Inspection created when factory_record status = 'sent_to_qc'**

| Field | Detail |
|-------|--------|
| Given | A factory_record is in status 'in_progress' for project P |
| When | Factory user updates factory_record status to 'sent_to_qc' |
| Then | A project_qc_inspection record is created with status 'pending'; inspection number follows PQC-YYYY-NNNN format |
| Pass Criteria | Inspection record exists; FK to factory_record set; number format correct; inspection in QC queue |

---

**TC-8-025: QC user starts inspection and sets result to 'passed'**

| Field | Detail |
|-------|--------|
| Given | A project_qc_inspection is in 'pending' |
| When | QC user starts and completes the inspection with result 'passed' |
| Then | Inspection status = 'completed'; result = 'passed'; readiness_status = 'ready_for_release' |
| Pass Criteria | All three fields correct in DB; timeline event 'qc_inspection_passed' written |

---

**TC-8-026: Completing inspection with result 'failed' requires at least one finding**

| Field | Detail |
|-------|--------|
| Given | An inspection is in_progress with no findings |
| When | QC user sets result to 'failed' and attempts to complete |
| Then | Validation error; inspection not completed; error states at least one finding is required |
| Pass Criteria | API returns 422; error message references findings requirement; inspection remains in_progress |

---

**TC-8-027: Completing with result 'rework_required' creates finding with rework_required=true**

| Field | Detail |
|-------|--------|
| Given | An inspection is in_progress; QC user has added one finding |
| When | QC user sets result to 'rework_required' and completes inspection |
| Then | Inspection status = 'completed'; result = 'rework_required'; the linked finding has rework_required = true; inspection readiness_status = 'pending_rework' |
| Pass Criteria | Finding rework_required flag = true in DB; readiness_status = 'pending_rework'; timeline event 'qc_rework_required' written |

---

**TC-8-028: Ready for release blocked while open findings exist**

| Field | Detail |
|-------|--------|
| Given | An inspection has result 'rework_required'; 2 findings exist with status 'open' |
| When | The readiness_status check is evaluated |
| Then | readiness_status remains 'pending_rework'; Release Note status = 'blocked' |
| Pass Criteria | DB readiness_status != 'ready_for_release'; Release Note checklist shows conditions 2, 3, 4 as unresolved |

---

**TC-8-029: Line-level inspection scoped correctly to vehicle line**

| Field | Detail |
|-------|--------|
| Given | A project has 2 vehicle lines; an inspection is created with project_vehicle_line_id set to line 1 |
| When | QC user views the inspection detail |
| Then | Inspection shows vehicle line name and ID; inspection does not affect line 2's readiness |
| Pass Criteria | project_vehicle_line_id populated in DB; line 2 readiness unaffected; line 1 shows inspection in detail view |

---

**TC-8-030: factory_user cannot create a project QC inspection**

| Field | Detail |
|-------|--------|
| Given | A factory_record is in 'sent_to_qc' status |
| When | A factory_user POSTs to the project QC inspection creation endpoint |
| Then | 403 Forbidden returned; no inspection created |
| Pass Criteria | API returns 403; DB count of inspections unchanged; UI does not show create button for factory_user |

---

**TC-8-031: sales_user sees only result and readiness_status on own projects**

| Field | Detail |
|-------|--------|
| Given | A project_qc_inspection exists for a project owned by a sales_user |
| When | The sales_user opens the project detail QC section |
| Then | Result and readiness_status are visible; finding details, inspector notes, and internal fields are not shown |
| Pass Criteria | API response for sales_user role excludes finding detail fields; UI renders summary view only |

---

**TC-8-032: Cancelled inspection is excluded from readiness evaluation**

| Field | Detail |
|-------|--------|
| Given | Project P has one cancelled inspection and one completed passed inspection |
| When | Release Note readiness is evaluated |
| Then | Cancelled inspection does not contribute to blocking; readiness is based on the passed inspection |
| Pass Criteria | Release Note checklist item 2 resolves based on non-cancelled inspections only; cancelled inspection ignored in query |

---

## Section 4: Findings and Rework Module (TC-8-033 to TC-8-040)

---

**TC-8-033: Finding created with correct number format**

| Field | Detail |
|-------|--------|
| Given | A project_qc_inspection is in_progress |
| When | QC user creates a new finding with type 'functional' and severity 'high' |
| Then | Finding record created with number in FND-YYYY-NNNN format; type = 'functional'; severity = 'high'; status = 'open' |
| Pass Criteria | Number format correct; all fields persisted; finding appears in inspection finding list |

---

**TC-8-034: factory_user marks rework completed**

| Field | Detail |
|-------|--------|
| Given | A finding has rework_required = true and status = 'rework_in_progress' |
| When | A factory_user submits "Mark Rework Complete" |
| Then | Finding status = 'pending_reinspection'; rework_completed_by = factory_user ID; rework_completed_at = current timestamp |
| Pass Criteria | All three fields set correctly in DB; finding status updated; QC user sees finding in 'pending_reinspection' state |

---

**TC-8-035: QC cannot close rework_required finding before rework_completed_at is set**

| Field | Detail |
|-------|--------|
| Given | A finding has rework_required = true and rework_completed_at = null |
| When | A qc_user attempts to close the finding |
| Then | Closure rejected; validation error states rework must be completed first |
| Pass Criteria | API returns 422; error message references rework completion requirement; finding status unchanged |

---

**TC-8-036: QC closes finding with closure_notes — finding removed from blocking list**

| Field | Detail |
|-------|--------|
| Given | A finding has status 'pending_reinspection'; rework_completed_at is set |
| When | QC user closes the finding with closure_notes = "Rework verified, dimensions within tolerance" |
| Then | Finding status = 'closed'; closure_notes persisted; finding no longer counted in open finding blocking check |
| Pass Criteria | DB status = 'closed'; Release Note blocking query count decreases by 1 |

---

**TC-8-037: Non-rework finding closed directly by QC**

| Field | Detail |
|-------|--------|
| Given | A finding has rework_required = false and status = 'assigned' |
| When | QC user closes the finding with closure_notes populated |
| Then | Finding status = 'closed'; no factory rework steps required or checked |
| Pass Criteria | DB status = 'closed'; rework_completed_at remains null (not required); closure_notes persisted |

---

**TC-8-038: Finding closure requires closure_notes**

| Field | Detail |
|-------|--------|
| Given | A finding is in 'assigned' status with rework_required = false |
| When | QC user attempts to close without entering closure_notes |
| Then | Validation error displayed; finding not closed |
| Pass Criteria | API returns 422; error references closure_notes; DB status unchanged |

---

**TC-8-039: All findings closed — inspection readiness_status moves to ready_for_release**

| Field | Detail |
|-------|--------|
| Given | An inspection has 2 findings, both in 'open' status |
| When | QC user closes both findings with closure_notes |
| Then | After the second closure, inspection readiness_status automatically updates to 'ready_for_release' |
| Pass Criteria | DB readiness_status = 'ready_for_release' after final finding closure; timeline event 'qc_ready_for_release' written |

---

**TC-8-040: Open finding blocks Release Note**

| Field | Detail |
|-------|--------|
| Given | Project P has 1 finding with status 'open'; Release Note exists for project P |
| When | Release Note readiness is evaluated |
| Then | Release Note status = 'blocked'; checklist item "No open QC findings" shows unresolved |
| Pass Criteria | Release Note status = 'blocked'; checklist item 3 shows red; open finding count = 1 displayed |

---

## Section 5: Release Note Module (TC-8-041 to TC-8-050)

---

**TC-8-041: Release Note blocked when open Material NCR exists**

| Field | Detail |
|-------|--------|
| Given | Project P has 1 open material_ncr (status = 'open'); Release Note for project P |
| When | Release Note status is evaluated |
| Then | Release Note status = 'blocked'; checklist item 1 shows red cross with count |
| Pass Criteria | DB release_status = 'blocked'; checklist item 1 unresolved; NCR count = 1 shown |

---

**TC-8-042: Release Note blocked when QC inspection not ready_for_release**

| Field | Detail |
|-------|--------|
| Given | Project P has an inspection with readiness_status = 'pending_rework'; Release Note for project P |
| When | Release Note status is evaluated |
| Then | Release Note status = 'blocked'; checklist item 2 shows red cross |
| Pass Criteria | DB release_status = 'blocked'; checklist item 2 unresolved |

---

**TC-8-043: Release Note moves to ready_to_issue when all conditions cleared**

| Field | Detail |
|-------|--------|
| Given | All 4 blocking conditions are resolved for project P: no open NCRs, all inspections ready_for_release, no open findings, all rework complete |
| When | The final condition resolves (e.g., last NCR closed) |
| Then | Release Note status automatically updates to 'ready_to_issue'; timeline event 'release_note_ready_to_issue' written |
| Pass Criteria | DB release_status = 'ready_to_issue'; timeline event exists; checklist shows all 4 items green |

---

**TC-8-044: QC user can issue a ready_to_issue Release Note**

| Field | Detail |
|-------|--------|
| Given | Release Note for project P has status 'ready_to_issue' |
| When | QC user clicks "Issue Release Note", uploads a document, and confirms |
| Then | Release Note status = 'issued'; issued_at and issued_by populated; release_note_document_id set; timeline event 'release_note_issued' written |
| Pass Criteria | All DB fields set; timeline event exists; audit entry created; project delivery_status = 'ready_for_delivery' |

---

**TC-8-045: Issuance blocked if condition becomes unresolved between check and submit**

| Field | Detail |
|-------|--------|
| Given | Release Note is 'ready_to_issue'; QC user has opened the issue modal |
| When | A new NCR is opened for the project mid-flow; QC user submits the issuance form |
| Then | System performs final blocking check; detects open NCR; rejects issuance with error message; Release Note reverts to 'blocked' |
| Pass Criteria | API returns 409 or 422; Release Note status = 'blocked'; not issued; error shown in UI |

---

**TC-8-046: Document upload placeholder accepted during issuance**

| Field | Detail |
|-------|--------|
| Given | Release Note is 'ready_to_issue' |
| When | QC user issues the Release Note and uploads a PDF document |
| Then | Document record created; release_note_document_id set on Release Note; document accessible from project Documents tab |
| Pass Criteria | Document record in DB; FK set on release_note; document listed in project Documents tab |

---

**TC-8-047: Timeline event written when Release Note status changes to blocked**

| Field | Detail |
|-------|--------|
| Given | A Release Note is 'ready_to_issue'; a new open NCR is created for the project |
| When | The blocking check re-evaluates |
| Then | Release Note status = 'blocked'; timeline event 'release_note_blocked' written with timestamp |
| Pass Criteria | Event exists in project_timeline_events with correct type and timestamp; Release Note status updated |

---

**TC-8-048: Audit entry written on Release Note creation**

| Field | Detail |
|-------|--------|
| Given | No Release Note exists for project P |
| When | A qc_user creates a new Release Note draft |
| Then | Audit entry created in release_note_audit with action = 'created', user = qc_user, timestamp set |
| Pass Criteria | Audit record exists; all fields populated; accessible via audit log endpoint |

---

**TC-8-049: sales_user sees Release Note status but cannot issue**

| Field | Detail |
|-------|--------|
| Given | A Release Note for a project owned by sales_user is 'ready_to_issue' |
| When | The sales_user opens the project detail page |
| Then | Release Note status is visible; "Issue Release Note" button is not present; any POST to issue endpoint returns 403 |
| Pass Criteria | Status visible; button absent; API returns 403 for issue attempt |

---

**TC-8-050: Cancelled Release Note does not affect project delivery_status**

| Field | Detail |
|-------|--------|
| Given | A Release Note is 'ready_to_issue' |
| When | An admin cancels the Release Note with a cancellation reason |
| Then | Release Note status = 'cancelled'; project delivery_status is not set to 'ready_for_delivery'; timeline event 'release_note_cancelled' written |
| Pass Criteria | DB release_status = 'cancelled'; project delivery_status unchanged; timeline event exists |

---

## Section 6: ProjectDetail QC/Release Tab (TC-8-051 to TC-8-055)

---

**TC-8-051: QC/Release tab is visible in ProjectDetail for authorised roles**

| Field | Detail |
|-------|--------|
| Given | A project exists with QC inspections and a Release Note |
| When | A qc_user, admin, ops_manager, sales_user, and factory_user each open the project detail page |
| Then | The QC/Release tab is visible for qc_user, admin, ops_manager, sales_user; factory_user sees a limited view (readiness only) |
| Pass Criteria | Tab renders without error for all listed roles; factory_user sees restricted content; role-appropriate data shown |

---

**TC-8-052: Material QC section in ProjectDetail shows inspection summary**

| Field | Detail |
|-------|--------|
| Given | Project P has 3 material QC inspections: 2 accepted, 1 rejected (with open NCR) |
| When | A qc_user opens the QC/Release tab |
| Then | Material QC section shows: total inspections = 3, accepted = 2, rejected = 1; open NCR count = 1; rejected inspection links to NCR |
| Pass Criteria | Counts correct; NCR link navigates to NCR detail; section renders without error |

---

**TC-8-053: Project QC section shows inspection readiness and findings summary**

| Field | Detail |
|-------|--------|
| Given | Project P has 1 project QC inspection with readiness_status = 'pending_rework' and 2 open findings |
| When | A qc_user opens the QC/Release tab |
| Then | Project QC section shows: inspection status, readiness = 'Pending Rework', open findings = 2; findings list with type, severity, and status visible |
| Pass Criteria | Readiness status label matches DB value; findings count and list accurate; each finding shows number, type, severity |

---

**TC-8-054: Release Note status section shows readiness checklist**

| Field | Detail |
|-------|--------|
| Given | Project P has a Release Note with status 'blocked'; condition 1 (NCR) and condition 3 (findings) are unresolved |
| When | Any authorised user opens the QC/Release tab |
| Then | Release Note status = Blocked; checklist shows: item 1 (red), item 2 (green), item 3 (red), item 4 (green) |
| Pass Criteria | Status label correct; checklist items render with correct pass/fail indicators; unresolved items show counts |

---

**TC-8-055: "Ready for Delivery" banner appears after Release Note is issued**

| Field | Detail |
|-------|--------|
| Given | Project P has a Release Note with status 'ready_to_issue'; all conditions are clear |
| When | QC user issues the Release Note |
| Then | ProjectDetail shows a prominent "Ready for Delivery" banner or indicator; indicator persists on subsequent page loads |
| Pass Criteria | Banner/indicator visible immediately after issuance; project delivery_status = 'ready_for_delivery' in DB; sales_user also sees the indicator on their project view |

---

## Test Environment Notes

- All tests assume a seeded test database with known fixture data
- Role-based tests must be run with separate authenticated sessions per role
- Blocking condition re-evaluation tests require triggering the evaluation endpoint or waiting for the background job to run (document which mechanism is used)
- Timeline event tests should query `project_timeline_events` directly or via the project timeline API endpoint
- Audit tests should query the relevant audit table directly

## Pass/Fail Criteria Summary

A test scenario passes when:
1. The DB state matches the expected outcome
2. The API response code is as specified
3. The UI renders the expected view without console errors
4. Any timeline or audit records are correctly written
