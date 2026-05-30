# Phase 3 Test Plan — WO / PN Gate and Execution Reference Governance

## 1. Database / Migration Tests (014_execution_references.sql)

| # | Test | Expected |
|---|---|---|
| 1.1 | Insert WO reference with `manufacturing_location = 'saudi'` | Success |
| 1.2 | Insert PN reference with `manufacturing_location = 'dubai'` | Success |
| 1.3 | Insert WO reference with `manufacturing_location = 'dubai'` | Fails — constraint `exec_ref_location_type_match` |
| 1.4 | Insert PN reference with `manufacturing_location = 'saudi'` | Fails — same constraint |
| 1.5 | Insert second active WO for same project | Fails — index `exec_ref_one_active_per_project` |
| 1.6 | Insert second WO after first is `cancelled` | Success |
| 1.7 | Insert same reference_number + reference_type for different projects | Fails — `exec_ref_number_type_unique` |
| 1.8 | Insert same reference_number with different type (one WO, one PN) | Success |
| 1.9 | `project_has_wo(approved_saudi_with_wo)` | Returns TRUE |
| 1.10 | `project_has_wo(approved_saudi_without_wo)` | Returns FALSE |
| 1.11 | `project_has_pn(approved_dubai_with_pn)` | Returns TRUE |
| 1.12 | `can_start_saudi_factory(approved_saudi_with_wo)` | Returns TRUE |
| 1.13 | `can_start_saudi_factory(approved_saudi_without_wo)` | Returns FALSE |
| 1.14 | `can_start_saudi_factory(submitted_saudi_with_wo)` | Returns FALSE (not approved) |
| 1.15 | `can_start_dubai_followup(approved_dubai_with_pn)` | Returns TRUE |
| 1.16 | `can_start_dubai_followup(approved_dubai_without_pn)` | Returns FALSE |

## 2. RLS Policy Tests

| # | Role | Action | Expected |
|---|---|---|---|
| 2.1 | factory_user | INSERT WO reference for Saudi project | Allowed |
| 2.2 | factory_user | INSERT PN reference | Denied |
| 2.3 | factory_user | UPDATE own WO reference | Allowed |
| 2.4 | factory_user | DELETE WO reference | Denied |
| 2.5 | afs_user | SELECT PN references | Allowed |
| 2.6 | afs_user | INSERT PN reference | Denied |
| 2.7 | sales_user | SELECT references for own project | Allowed |
| 2.8 | sales_user | INSERT reference | Denied |
| 2.9 | procurement_user | SELECT references for approved project | Allowed |
| 2.10 | procurement_user | INSERT reference | Denied |
| 2.11 | operations_manager | Full CRUD on all references | Allowed |
| 2.12 | admin | Full CRUD on all references | Allowed |
| 2.13 | viewer | SELECT references for approved project | Allowed |
| 2.14 | viewer | INSERT reference | Denied |

## 3. TypeScript Type Tests

| # | Test | Expected |
|---|---|---|
| 3.1 | `ExecutionReference` type has all required fields | Compiles without error |
| 3.2 | `ExecutionGateStatus` type has all 11 fields | Compiles without error |
| 3.3 | `getExecutionGateStatus` returns correct type | No TS errors |
| 3.4 | `fetchProjectReferences` return type is `ExecutionReference[]` | Correct |
| 3.5 | `npm run build` passes with zero TypeScript errors | Zero errors |

## 4. `getExecutionGateStatus` Unit Tests

| # | Input | Expected Output |
|---|---|---|
| 4.1 | approved Saudi project + active WO | `canStartSaudiFactory: true` |
| 4.2 | approved Saudi project + no WO | `canStartSaudiFactory: false, requiresWO: true` |
| 4.3 | approved Dubai project + active PN | `canStartDubaiFollowUp: true` |
| 4.4 | approved Dubai project + no PN | `canStartDubaiFollowUp: false, requiresPN: true` |
| 4.5 | draft Saudi project + WO | `canStartSaudiFactory: false, isApproved: false` |
| 4.6 | approved Saudi project + cancelled WO only | `hasActiveWO: false` (cancelled not counted) |
| 4.7 | approved Saudi project + superseded WO only | `hasActiveWO: false` |
| 4.8 | not_set location + no refs | `requiresWO: false, requiresPN: false` |

## 5. Dev Mode / Mock Data Tests

| # | Test | Expected |
|---|---|---|
| 5.1 | `fetchProjectReferences('proj-005')` in dev mode | Returns WO-2025-0041 |
| 5.2 | `fetchProjectReferences('proj-006')` in dev mode | Returns PN-2025-0018 |
| 5.3 | `fetchProjectReferences('proj-001')` in dev mode | Returns empty array |
| 5.4 | `fetchAllReferences()` in dev mode | Returns both mock references |
| 5.5 | `fetchProjectsMissingReference('wo')` in dev mode | Returns no projects (proj-005 already has WO) |
| 5.6 | `fetchProjectsMissingReference('pn')` in dev mode | Returns no projects (proj-006 already has PN) |

## 6. WoPnGate Page Tests

| # | Test | Expected |
|---|---|---|
| 6.1 | Navigate to /wo-pn-gate | Page loads without errors |
| 6.2 | Summary strip shows 4 counters | All counter cards render |
| 6.3 | Governance banner visible | Dark brand card with WO/PN rules |
| 6.4 | Missing WO section visible | Shows approved Saudi projects without WO |
| 6.5 | Missing PN section visible | Shows approved Dubai projects without PN |
| 6.6 | Existing references section | Shows WO-2025-0041 and PN-2025-0018 |
| 6.7 | Search by project code | Filters results correctly |
| 6.8 | Route filter: Saudi | Shows only Saudi-related rows |
| 6.9 | Route filter: Dubai | Shows only Dubai-related rows |
| 6.10 | Gate filter: confirmed | Shows only confirmed references |
| 6.11 | Gate filter: missing | Shows only missing-reference rows |
| 6.12 | factory_user sees "Add WO" button | Visible |
| 6.13 | factory_user does NOT see "Add PN" button | Hidden |
| 6.14 | sales_user sees NO add buttons | Both hidden |
| 6.15 | Click "Add WO" → modal opens | AddReferenceModal for WO type |
| 6.16 | Submit empty reference number | Form blocked — required field |
| 6.17 | Submit valid WO number in dev mode | Success — reference appears in list |
| 6.18 | Click "Edit" on existing reference | EditReferenceModal opens |
| 6.19 | Non-admin/ops "Confirm" button hidden | factory_user cannot confirm |
| 6.20 | Admin "Confirm" button clicks → reference status updates | status → confirmed |
| 6.21 | Page is fully accessible (no ARIA errors) | Pass |

## 7. ProjectDetail WoPnGateCard Tests

| # | Test | Expected |
|---|---|---|
| 7.1 | Open proj-005 (approved Saudi with WO) | Gate card shows green "WO Active" state |
| 7.2 | Open proj-006 (approved Dubai with PN) | Gate card shows green "PN Active" state |
| 7.3 | Open proj-003 (submitted Saudi, no WO) | Gate card not shown (not approved) |
| 7.4 | Open proj-001 (draft, not_set location) | Gate card not shown |
| 7.5 | Approved Saudi project without WO | Card shows amber "WO Required" with inline form |
| 7.6 | factory_user on approved Saudi project | "Add WO" inline form visible |
| 7.7 | sales_user on approved Saudi project | No add form (canAdd = false) |
| 7.8 | Submit inline WO in dev mode | Reference added, card flips to green |
| 7.9 | "Manage in WO/PN Gate" link | Navigates to /wo-pn-gate |
| 7.10 | Gate card spans 2 columns in grid | Correct md:col-span-2 styling |

## 8. Dashboard / Inbox Integration Tests

| # | Test | Expected |
|---|---|---|
| 8.1 | Dashboard KPI "SO without WO" card visible | Shows count, links to /wo-pn-gate |
| 8.2 | Dashboard KPI "SO without PN" card visible | Shows count, links to /wo-pn-gate |
| 8.3 | Inbox task-003 "Factory WO missing" visible | For factory_user |
| 8.4 | Inbox task-007 "Dubai PN missing" visible | For operations_manager |
| 8.5 | KPI cards correctly color-coded (critical/warning) | WO = critical, PN = warning |

## 9. Timeline & Audit Tests

| # | Test | Expected |
|---|---|---|
| 9.1 | Create WO via AddReferenceModal (Supabase mode) | Timeline event `wo_created` written |
| 9.2 | Confirm WO via EditReferenceModal (Supabase mode) | Timeline event `wo_confirmed` written |
| 9.3 | Create PN via WoPnGate (Supabase mode) | Timeline event `pn_created` written |
| 9.4 | All events include actor_id, actor_name | Correct profile data |
| 9.5 | Audit entry written for each reference create | `action = 'wo_created'` in audit_log |
| 9.6 | Audit entry includes before/after data | Correct shapes |

## 10. Navigation & Routing Tests

| # | Test | Expected |
|---|---|---|
| 10.1 | /wo-pn-gate in sidebar nav | Visible, active state correct |
| 10.2 | Navigate to /wo-pn-gate directly | Loads without 404 |
| 10.3 | Link from WoPnGateCard to /wo-pn-gate | Works |
| 10.4 | Breadcrumb / back navigation | Works correctly |

## 11. Build & Quality Tests

| # | Test | Expected |
|---|---|---|
| 11.1 | `npm run build` | Zero TypeScript errors |
| 11.2 | No unused imports | TS6133 errors absent |
| 11.3 | No `any` types without justification | Clean |
| 11.4 | All lucide-react imports valid | No missing icon errors |
| 11.5 | Dev mode banner visible when Supabase not configured | DevModeBanner renders |
| 11.6 | WoPnGate page renders in all user role contexts | No runtime errors for any role |
| 11.7 | ProjectDetail renders for each mock project | No blank screens |
