# Phase 5 Test Plan — Procurement, PR, PO to Supplier, ETA Tracking, Supplier Governance

## 1. Database Migrations (019–024)

| # | Test | Expected |
|---|---|---|
| 1.1 | Run migration 019 — pr_status enum created | All 7 values present |
| 1.2 | Run migration 019 — procurement_requests table created | All columns match type definitions |
| 1.3 | Run migration 020 — pr_item_status enum created | All 9 values present |
| 1.4 | Run migration 020 — procurement_request_items table created | FK to procurement_requests enforced |
| 1.5 | Run migration 021 — po_supplier_status enum created | All 12 values present |
| 1.6 | Run migration 021 — purchase_orders_to_supplier table created | purchase_value numeric column present |
| 1.7 | Run migration 021 — trigger set_po_approval_required fires | PO with value 15000 SAR → approval_required=true, approval_status='pending' |
| 1.8 | Run migration 021 — trigger does not fire for ≤10000 SAR | approval_required=false, approval_status='not_required' |
| 1.9 | Run migration 022 — purchase_order_items table created | GENERATED line_total = unit_price × quantity_ordered |
| 1.10 | Run migration 022 — line_total is computed | Insert unit_price=100, qty=3 → line_total=300 |
| 1.11 | Run migration 023 — eta_change_history table created | entity_type, old_eta, new_eta, reason columns present |
| 1.12 | Run migration 024 — approved_suppliers table created | All columns including approved_for_medical_items |
| 1.13 | Run migration 024 — FK from purchase_orders_to_supplier to approved_suppliers | supplier_id FK enforced |

## 2. RLS Policies

| # | Test | Expected |
|---|---|---|
| 2.1 | procurement_user SELECT procurement_requests | Returns all |
| 2.2 | factory_user SELECT procurement_requests | Returns all (read-only) |
| 2.3 | factory_user INSERT procurement_requests | Denied |
| 2.4 | sales_user SELECT procurement_requests | Denied or empty |
| 2.5 | admin SELECT purchase_orders_to_supplier | Returns all |
| 2.6 | factory_user SELECT purchase_orders_to_supplier | Returns all (status/ETA visible, not cost) |
| 2.7 | procurement_user INSERT purchase_orders_to_supplier | Allowed |
| 2.8 | factory_user UPDATE purchase_orders_to_supplier | Denied |
| 2.9 | admin UPDATE po approval_status | Allowed |
| 2.10 | procurement_user UPDATE po approval_status | Denied |
| 2.11 | qc_user SELECT approved_suppliers | Returns approved/conditions only |
| 2.12 | qc_user UPDATE qc_status on supplier | Allowed |
| 2.13 | qc_user UPDATE procurement_status on supplier | Denied (RLS) |
| 2.14 | procurement_user SELECT eta_change_history | Returns all |
| 2.15 | store_user SELECT eta_change_history | Returns all (read-only) |

## 3. TypeScript Types

| # | Test | Expected |
|---|---|---|
| 3.1 | PRStatus type has 7 values | draft through closed |
| 3.2 | PRItemStatus type has 9 values | pending through cancelled |
| 3.3 | POStatus has 12 values | draft through closed |
| 3.4 | POApprovalStatus has 4 values | not_required through rejected |
| 3.5 | SupplierProcurementStatus has 7 values | draft through inactive |
| 3.6 | SupplierQCStatus has 5 values | not_assessed through rejected |
| 3.7 | ProcurementRequest interface has all fields | Including project? and requested_by_profile? |
| 3.8 | PurchaseOrder interface has approval fields | approval_required, approval_status, approved_by, approved_at |
| 3.9 | EtaChangeHistory interface has all tracking fields | old_eta, new_eta, reason, remarks, changed_by, changed_at |
| 3.10 | ApprovedSupplier has both status fields | procurement_status and qc_status |

## 4. Mock Data

| # | Test | Expected |
|---|---|---|
| 4.1 | MOCK_SUPPLIERS has 6 entries | All statuses represented |
| 4.2 | MOCK_PROCUREMENT_REQUESTS has 4 entries | draft, pr_received, in_progress, partially_ordered |
| 4.3 | MOCK_PR_ITEMS has 6 entries | Multiple statuses including waiting_for_po |
| 4.4 | MOCK_PURCHASE_ORDERS has 4 entries | Values: 8500, 45000, 28500, 6200 |
| 4.5 | PO-002 has approval_required=true | Value is 45000 SAR > 10000 |
| 4.6 | PO-001 has approval_required=false | Value is 8500 SAR ≤ 10000 |
| 4.7 | MOCK_ETA_HISTORY has 3 entries | 2 for POs, 1 for PR item |
| 4.8 | getMockPRItems('pr-001') returns 3 items | pri-001, pri-002, pri-003 |
| 4.9 | getMockPOsForProject('proj-005') returns 3 POs | po-001, po-002, po-003 |
| 4.10 | getMockEtaHistory('po-001') returns 1 entry | eta-001 |

## 5. Procurement Dashboard (/procurement)

| # | Test | Expected |
|---|---|---|
| 5.1 | Page loads for procurement_user | KPI strip + nav sections visible |
| 5.2 | Open PRs KPI count | 3 (non-cancelled/closed PRs) |
| 5.3 | PO Approval Pending KPI | 1 (po-002) |
| 5.4 | Navigate to /procurement/requests | ProcurementRequests page loads |
| 5.5 | Navigate to /procurement/purchase-orders | ProcurementPurchaseOrders page loads |
| 5.6 | Navigate to /procurement/suppliers | ProcurementSuppliers page loads |
| 5.7 | Navigate to /procurement/eta-history | ProcurementEtaHistory page loads |
| 5.8 | Page shows dev mode notice if Supabase not configured | "Using mock data" or similar |

## 6. Procurement Requests List (/procurement/requests)

| # | Test | Expected |
|---|---|---|
| 6.1 | All 4 mock PRs shown on "All" tab | Table rows render |
| 6.2 | Filter to "Draft" tab | Only pr-004 shown |
| 6.3 | Filter to "In Progress" tab | Only pr-001 shown |
| 6.4 | Search by "PR-2025-0042" | Only pr-002 shown |
| 6.5 | Search by "GACA" | pr-001 and pr-002 shown |
| 6.6 | View link → /procurement/requests/pr-001 | Navigates correctly |
| 6.7 | Status badge colors correct | in_progress=warning, partially_ordered=warning |
| 6.8 | Empty state shown when no results | Empty state component renders |

## 7. PR Detail (/procurement/requests/:id)

| # | Test | Expected |
|---|---|---|
| 7.1 | /procurement/requests/pr-001 loads | Overview tab shown with PR details |
| 7.2 | Items tab shows 3 items for pr-001 | pri-001, pri-002, pri-003 |
| 7.3 | PO to Supplier tab shows linked POs | po-001, po-002 for pr-001 |
| 7.4 | Status update for procurement_user | Dropdown + save visible |
| 7.5 | Dev mode status update | "Changes not persisted" notice |
| 7.6 | Invalid PR ID (/requests/pr-999) | "PR not found" or redirect |
| 7.7 | Back link returns to /procurement/requests | Navigation works |

## 8. PO to Supplier List (/procurement/purchase-orders)

| # | Test | Expected |
|---|---|---|
| 8.1 | All 4 mock POs shown | Table renders |
| 8.2 | Filter "Pending Approval" | Only po-002 shown |
| 8.3 | Cost column visible for procurement_user | SAR 45,000 shown |
| 8.4 | Cost column hidden for factory_user | No value shown |
| 8.5 | "Needs Approval" badge on po-002 | Approval badge shown |
| 8.6 | Filter "In Transit" | Only po-003 shown |
| 8.7 | Search by "Al-Faris" | po-001 and po-002 shown |
| 8.8 | View link → /procurement/purchase-orders/po-002 | Navigates correctly |

## 9. PO Detail (/procurement/purchase-orders/:id)

| # | Test | Expected |
|---|---|---|
| 9.1 | /purchase-orders/po-002 loads | Overview shows PO details |
| 9.2 | Cost visible for procurement_user | SAR 45,000 shown |
| 9.3 | Cost hidden for factory_user | No value |
| 9.4 | Items tab shows poi-002 | AFFF Foam Concentrate listed |
| 9.5 | ETA Management tab loads | Current ETA shown, update form present |
| 9.6 | ETA update form — reason required | Cannot submit without reason |
| 9.7 | ETA update dev mode | Success notice shown, history updated |
| 9.8 | Approval tab visible for po-002 | Approve/Reject buttons for admin |
| 9.9 | Procurement_user cannot see Approve button | Action hidden |
| 9.10 | Approve action (dev mode) | Status changes to approved, success notice |
| 9.11 | Reject action — reason required | Cannot submit without rejection_reason |
| 9.12 | Approval tab hidden for po-001 | approval_required=false → tab not prominent |
| 9.13 | Governance note visible on Approval tab | ">10,000 SAR requires approval" text present |

## 10. ETA History (/procurement/eta-history)

| # | Test | Expected |
|---|---|---|
| 10.1 | All 3 mock ETA records shown | Table renders |
| 10.2 | Filter by "PO to Supplier" | 2 records (eta-001, eta-002) |
| 10.3 | Filter by "PR Item" | 1 record (eta-003) |
| 10.4 | Days delta for eta-001 | +13 days (Feb 15 → Feb 28) shown in red |
| 10.5 | Days delta color red for delays | Positive delta = red text |
| 10.6 | Sort by changed_at descending | Most recent first |
| 10.7 | Search by "Al-Faris" | eta-001 returned (reason contains Jeddah) |

## 11. Supplier List (/procurement/suppliers)

| # | Test | Expected |
|---|---|---|
| 11.1 | All 6 mock suppliers shown | Table renders |
| 11.2 | Filter "Approved" | sup-001, sup-002, sup-003 shown |
| 11.3 | Filter "Suspended" | sup-006 shown |
| 11.4 | Quality rating stars rendered | sup-001 shows 5 stars |
| 11.5 | Medical Items badge for sup-002 | "Yes" badge shown |
| 11.6 | Search by "Hajjar" | sup-006 shown |
| 11.7 | View link → /procurement/suppliers/sup-001 | Navigates correctly |

## 12. Supplier Detail (/procurement/suppliers/:id)

| # | Test | Expected |
|---|---|---|
| 12.1 | /suppliers/sup-001 loads | Overview with Al-Faris details |
| 12.2 | Procurement tab shows status + remarks | "approved" badge + contract note |
| 12.3 | QC tab shows qc_status + rating | qc_status=approved, 5 stars |
| 12.4 | Procurement_user can update procurement_status | Dropdown visible |
| 12.5 | Procurement_user cannot update qc_status | QC update hidden |
| 12.6 | qc_user can update qc_status | QC fields editable |
| 12.7 | Purchase Orders tab shows POs for sup-001 | po-001, po-002 listed |
| 12.8 | Contacts tab shows email + phone | Links render |
| 12.9 | /suppliers/sup-006 shows suspended badge | Status = suspended, red badge |

## 13. ProjectDetail Procurement Tab

| # | Test | Expected |
|---|---|---|
| 13.1 | Projects page for proj-005 has Procurement tab | Tab visible in tab bar |
| 13.2 | Procurement tab shows 2 PRs (pr-001, pr-002) | Table shows both PRs |
| 13.3 | Procurement tab shows 3 POs | po-001, po-002, po-003 for proj-005 |
| 13.4 | Cost hidden for factory_user | No purchase_value shown |
| 13.5 | Cost visible for procurement_user | Values shown |
| 13.6 | PR rows link to /procurement/requests/:id | Navigation works |
| 13.7 | PO rows link to /procurement/purchase-orders/:id | Navigation works |
| 13.8 | proj-006 shows 1 PR and 1 PO | pr-003 and po-004 |

## 14. Role-Based Visibility

| # | Test | Expected |
|---|---|---|
| 14.1 | factory_user visits /procurement | Can view (status only, no costs) |
| 14.2 | sales_user visits /procurement | Should be blocked or empty |
| 14.3 | procurement_user can create PR | Button visible |
| 14.4 | admin can approve PO | Approve button visible |
| 14.5 | store_user sees no cost columns | purchase_value hidden |
| 14.6 | viewer sees supplier list (approved only per RLS) | Only approved suppliers |
| 14.7 | qc_user can view supplier QC fields | QC tab visible |
| 14.8 | qc_user cannot update procurement_status | Procurement update hidden |

## 15. Dev Mode Fallbacks

| # | Test | Expected |
|---|---|---|
| 15.1 | Supabase not configured — PR list uses mock data | MOCK_PROCUREMENT_REQUESTS shown |
| 15.2 | Supabase not configured — PO list uses mock data | MOCK_PURCHASE_ORDERS shown |
| 15.3 | Supabase not configured — Supplier list uses mock data | MOCK_SUPPLIERS shown |
| 15.4 | ETA update (dev mode) | Success message shown, no DB write |
| 15.5 | PO approval (dev mode) | Success message shown, no DB write |
| 15.6 | Status update (dev mode) | "Dev mode — changes not persisted" shown |
| 15.7 | ProjectDetail procurement tab (dev mode) | Mock PRs and POs shown for project |

## 16. Build Quality

| # | Test | Expected |
|---|---|---|
| 16.1 | npm run build passes | Zero TypeScript errors |
| 16.2 | No unused imports | noUnusedLocals enforced |
| 16.3 | No 'any' without eslint-disable | Code quality maintained |
| 16.4 | No "BO" anywhere in UI text | Only "PO to Supplier" used |
| 16.5 | All routes registered in App.tsx | /procurement/* routes work |
| 16.6 | Procurement tab added to ProjectDetail | Tab renders without error |
