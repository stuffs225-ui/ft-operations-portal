# Quotation Management Design

## Overview

Phase 4 introduces the formal pre-sales quotation workflow. Before a Sales Order (SO) can be created, a quotation must go through a structured lifecycle: request by Sales → processing by Sales Coordinator → external Estimation → return to Sales → conversion to SO.

## Data Model

### quotation_requests

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `quotation_code` | text | Auto-generated: QTN-YYYY-NNNN |
| `customer_name` | text | Required |
| `customer_contact_name` | text | Optional |
| `customer_email` | text | Optional |
| `customer_phone` | text | Optional |
| `opportunity_source` | text | Direct, Tender, Referral, etc. |
| `requested_by` | uuid → profiles | Sales user who created the request |
| `assigned_coordinator_id` | uuid → profiles | Optional coordinator assignment |
| `quotation_status` | enum | See status lifecycle below |
| `priority` | enum | low, medium, high, urgent |
| `required_delivery_expectation` | date | Customer-requested delivery date |
| `scope_summary` | text | Brief description of what is requested |
| `sales_remarks` | text | Internal notes from Sales |
| `coordinator_remarks` | text | Coordinator processing notes |
| `quotation_number` | text | Number from the Estimation team |
| `quotation_total_value` | numeric | Sum of final line values |
| `submitted_at` | timestamptz | When Sales submitted to coordinator |
| `sent_to_estimation_at` | timestamptz | When coordinator sent to external Estimation |
| `estimation_contact` | text | Email/contact used to reach Estimation |
| `quotation_received_at` | timestamptz | When quotation PDF was received from Estimation |
| `returned_to_sales_at` | timestamptz | When coordinator returned to Sales |
| `converted_to_project_id` | uuid → projects | If converted to SO |

### quotation_request_lines

| Column | Notes |
|---|---|
| `line_number` | Unique per quotation |
| `vehicle_type` | ARFF Cat 7, ALS Ambulance, etc. |
| `quantity` | CHECK > 0 |
| `final_quotation_unit_value` | Entered by coordinator from Estimation |
| `final_quotation_line_value` | GENERATED: unit_value × quantity |

### quotation_documents

Types: `specification_file`, `quotation_pdf`, `supporting_document`, `customer_requirement`, `other`

### quotation_timeline_events

Event types: `quotation_draft_created`, `quotation_submitted_by_sales`, `quotation_received_by_coordinator`, `quotation_sent_to_estimation`, `clarification_requested`, `quotation_pdf_uploaded`, `quotation_returned_to_sales`, `quotation_converted_to_so`, `quotation_converted_to_hot_project`, `quotation_cancelled`, `quotation_closed_lost`

## Status Lifecycle

```
draft
  ↓  (Sales submits)
submitted_by_sales
  ↓  (Coordinator marks received)
received_by_coordinator
  ↓  (Coordinator sends to external Estimation)
sent_to_estimation → waiting_for_estimation
  ↓  (Coordinator uploads quotation PDF)
quotation_received
  ↓  (Coordinator returns to Sales)
returned_to_sales
  ↓  (Sales converts)
converted_to_so  /  converted_to_hot_project

At any non-terminal step:
  → need_clarification  (coordinator requests info from Sales)
      ↓  (Sales answers)
  → back to appropriate active state
  → cancelled / closed_lost
```

## Role Matrix

| Action | Sales User | Coordinator | Ops Manager | Admin |
|---|---|---|---|---|
| Create quotation request | ✓ (own) | — | ✓ | ✓ |
| View quotation list | Own only | All | All | All |
| Edit draft / clarification | Own only | — | ✓ | ✓ |
| Mark received | — | ✓ | ✓ | ✓ |
| Record sent to estimation | — | ✓ | ✓ | ✓ |
| Request clarification | — | ✓ | ✓ | ✓ |
| Upload quotation PDF | — | ✓ | ✓ | ✓ |
| Enter quotation values | — | ✓ | ✓ | ✓ |
| Return to sales | — | ✓ | ✓ | ✓ |
| Convert to SO | ✓ | — | ✓ | ✓ |
| See financial values | — | ✓ | ✓ | ✓ |
| View audit | — | — | — | ✓ |

## SLA Thresholds

| Stage | SLA |
|---|---|
| `submitted_by_sales` → `received_by_coordinator` | 48 hours |
| `sent_to_estimation` → `quotation_received` | 120 hours (5 days) |
| `need_clarification` → Sales response | 48 hours |

## Conversion to SO

When "Convert to SO" is triggered:
1. A new draft project is inserted into `projects` table.
2. `quotation_requests.converted_to_project_id` is set.
3. `quotation_status` → `converted_to_so`.
4. Timeline event written.
5. User navigated to `/projects/:id`.

In dev mode: navigates to mock project `proj-005`.

## Auto-Generated Quotation Code

A database trigger runs on INSERT and generates: `QTN-{YEAR}-{seq:4}` from a sequence, e.g. `QTN-2025-0031`.
