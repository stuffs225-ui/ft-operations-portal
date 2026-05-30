# Phase 4 Test Plan — Quotation Management and Sales Coordinator Workflow

## 1. Database / Migration Tests (015–018)

| # | Test | Expected |
|---|---|---|
| 1.1 | Insert quotation with empty customer_name | Fails — NOT NULL constraint |
| 1.2 | Insert quotation without quotation_code | Auto-generates QTN-YYYY-NNNN |
| 1.3 | Insert quotation_request_line with quantity = 0 | Fails — CHECK (quantity > 0) |
| 1.4 | Insert line with final_quotation_unit_value = 100, qty = 5 | final_quotation_line_value = 500 (GENERATED) |
| 1.5 | Delete quotation → cascade to lines/documents/timeline | All child rows deleted |
| 1.6 | Insert duplicate quotation_code | Fails — UNIQUE constraint |
| 1.7 | Insert quotation_document without quotation_request_id | Fails — FK constraint |
| 1.8 | Timeline event created with valid quotation_request_id | Success |

## 2. RLS Policy Tests

| # | Role | Action | Expected |
|---|---|---|---|
| 2.1 | sales_user | INSERT own quotation | Allowed |
| 2.2 | sales_user | SELECT own quotation | Allowed |
| 2.3 | sales_user | SELECT another user's quotation | Denied |
| 2.4 | sales_user | UPDATE draft own quotation | Allowed |
| 2.5 | sales_user | UPDATE submitted own quotation | Denied (not in draft/clarification) |
| 2.6 | sales_user | UPDATE another user's quotation | Denied |
| 2.7 | sales_coordinator | SELECT all quotations | Allowed |
| 2.8 | sales_coordinator | UPDATE any quotation | Allowed |
| 2.9 | sales_coordinator | INSERT quotation | Denied |
| 2.10 | viewer | SELECT submitted quotation | Allowed |
| 2.11 | viewer | SELECT draft quotation | Denied |
| 2.12 | viewer | INSERT quotation | Denied |
| 2.13 | operations_manager | Full CRUD | Allowed |
| 2.14 | admin | Full CRUD | Allowed |

## 3. TypeScript Type Tests

| # | Test | Expected |
|---|---|---|
| 3.1 | `QuotationStatus` has all 12 values | Compiles |
| 3.2 | `QuotationPriority` has 4 values | Compiles |
| 3.3 | `QuotationRequest` optional joined fields | Compiles |
| 3.4 | `QuotationRequestLine.final_quotation_line_value` nullable | Compiles |
| 3.5 | `npm run build` passes | Zero TypeScript errors |
| 3.6 | No unused imports or variables | TS6133 errors absent |

## 4. SLA Helper Tests (`src/lib/quotationSla.ts`)

| # | Input | Expected |
|---|---|---|
| 4.1 | `submitted_by_sales`, submitted 3 days ago | `isQuotationOverdue = true` |
| 4.2 | `submitted_by_sales`, submitted 1 day ago | `isQuotationOverdue = false` |
| 4.3 | `waiting_for_estimation`, sent 6 days ago | `isQuotationOverdue = true` |
| 4.4 | `waiting_for_estimation`, sent 2 days ago | `isQuotationOverdue = false` |
| 4.5 | `need_clarification`, updated 3 days ago | `isQuotationOverdue = true` |
| 4.6 | `returned_to_sales` | `getQuotationSlaDue = null` |
| 4.7 | SLA due in 6 hours | `getQuotationSlaStatus = 'warning'` |
| 4.8 | SLA due in 2 days | `getQuotationSlaStatus = 'ok'` |
| 4.9 | SLA exceeded by 3 days | `getOverdueDays = 3` |

## 5. Quotations List Page Tests

| # | Test | Expected |
|---|---|---|
| 5.1 | Navigate to /quotations | Page loads, 10 mock quotations shown |
| 5.2 | Status tab: Draft | Shows 2 draft quotations |
| 5.3 | Status tab: Submitted | Shows 2 submitted quotations |
| 5.4 | Status tab: With Coordinator | Shows received/estimation/received quotations |
| 5.5 | Status tab: Clarification | Shows 1 need_clarification |
| 5.6 | Status tab: Returned | Shows 1 returned_to_sales |
| 5.7 | Status tab: Converted | Shows 1 converted_to_so |
| 5.8 | Priority filter: Urgent | Shows only urgent quotations |
| 5.9 | Search: "GACA" | Shows GACA quotations only |
| 5.10 | Search: "QTN-2025-0038" | Shows 1 result |
| 5.11 | sales_user role | Sees only own quotations |
| 5.12 | admin role | Sees all quotations |
| 5.13 | "New Quotation Request" button shown for sales_user | Visible |
| 5.14 | "New Quotation Request" button hidden for viewer | Hidden |
| 5.15 | Total value column shown for admin | Visible |
| 5.16 | Total value column hidden for sales_user | Hidden |
| 5.17 | Overdue triangle icon on overdue rows | Visible |
| 5.18 | "View" link navigates to /quotations/:id | Works |

## 6. New Quotation Wizard Tests

| # | Test | Expected |
|---|---|---|
| 6.1 | Navigate to /quotations/new | 4-step wizard loads |
| 6.2 | Click Next on Step 1 without customer name | Proceeds (validation on Step 4) |
| 6.3 | Complete Step 1 and proceed to Step 2 | Line form visible |
| 6.4 | Add line without vehicle type or description | Add button disabled |
| 6.5 | Add valid line — quantity 0 | Not allowed (min 1) |
| 6.6 | Add valid line | Line appears in list |
| 6.7 | Remove a line | Line removed |
| 6.8 | Step 3: dev mode notice visible | Shown when !isSupabaseConfigured |
| 6.9 | Add document by filename | Document listed |
| 6.10 | Remove document | Document removed |
| 6.11 | Step 4 Review: empty customer name | Error: "Customer / Entity Name is required" |
| 6.12 | Step 4 Review: no lines | Error: "At least one requested vehicle / item line required" |
| 6.13 | Submit without documents | Error: "At least one specification document required" |
| 6.14 | Save as Draft without documents | Succeeds (no doc requirement for draft) |
| 6.15 | Full valid form: Save as Draft in dev mode | Navigates to /quotations |
| 6.16 | Full valid form: Submit in dev mode | Navigates to /quotations |
| 6.17 | Step indicator shows correct step | Correct highlighting |
| 6.18 | Back button returns to previous step | Works |

## 7. QuotationDetail Page Tests

| # | Tab | Test | Expected |
|---|---|---|---|
| 7.1 | Overview | Navigate to /quotations/qtn-001 | Loads without error |
| 7.2 | Overview | Shows status badge | Correct status |
| 7.3 | Overview | Overdue badge for overdue quotation | Visible |
| 7.4 | Overview | SLA warning badge when approaching | Visible |
| 7.5 | Overview | Total value hidden for sales_user | Hidden |
| 7.6 | Overview | Convert link shown when converted_to_so | "View Project" button visible |
| 7.7 | Customer | Shows all customer fields | Correct data |
| 7.8 | Lines | Shows all requested lines | Correct data |
| 7.9 | Lines | Financial columns hidden for sales_user on non-returned | Hidden |
| 7.10 | Lines | Financial columns shown for coordinator | Visible |
| 7.11 | Documents | Shows specification files (not quotation_pdf) | Correct filter |
| 7.12 | Coordinator | Non-coordinator sees access message | Shown |
| 7.13 | Coordinator | Mark Received on submitted_by_sales | Status → received_by_coordinator |
| 7.14 | Coordinator | Record sent to estimation without contact | Error message |
| 7.15 | Coordinator | Record sent to estimation with contact | Status → waiting_for_estimation |
| 7.16 | Coordinator | Request clarification without message | No action |
| 7.17 | Coordinator | Request clarification with message | Status → need_clarification |
| 7.18 | Coordinator | SLA overdue indicator | Visible on overdue quotation |
| 7.19 | Response | Enter line values and save (dev mode) | Lines updated, status → quotation_received |
| 7.20 | Response | Return to Sales button | Status → returned_to_sales |
| 7.21 | Response | Convert to SO in dev mode | Navigates to /projects/proj-005 |
| 7.22 | Response | Convert to Hot Project button disabled | Shows future phase notice |
| 7.23 | Timeline | Shows all mock timeline events | Correct order (newest first) |
| 7.24 | Audit | Admin sees audit link | Visible |

## 8. Sales Coordinator Dashboard Tests

| # | Test | Expected |
|---|---|---|
| 8.1 | Navigate to /sales-coordinator | Dashboard loads |
| 8.2 | sales_user role | "Access Restricted" message shown |
| 8.3 | KPI strip shows 5 counters | All render correctly |
| 8.4 | "New / Unprocessed" section | Shows submitted_by_sales quotations |
| 8.5 | "Waiting Estimation" section | Shows estimation quotations |
| 8.6 | "Need Clarification" section | Shows clarification quotations |
| 8.7 | "Ready to Return" section | Shows quotation_received |
| 8.8 | Overdue section at top (when present) | Shows overdue quotations |
| 8.9 | Sections collapsible | Click to toggle open/close |
| 8.10 | Row action button navigates to /quotations/:id | Works |
| 8.11 | Overdue badge shown on individual rows | Visible |
| 8.12 | Days-in-status shown on rows | Correct value |

## 9. Dashboard / Inbox Integration Tests

| # | Test | Expected |
|---|---|---|
| 9.1 | "Pending Quotations" KPI card | Shows count, links to /quotations |
| 9.2 | "Waiting Estimation" KPI card | Shows count, links to /quotations |
| 9.3 | "Need Clarification" KPI card | Shows count, links to /quotations |
| 9.4 | "Returned to Sales" KPI card | Shows count, links to /quotations |
| 9.5 | Inbox: Sales tasks visible (task-001, task-001b, task-001c) | For sales_user |
| 9.6 | Inbox: Coordinator tasks (task-002, task-002b) | For sales_coordinator |
| 9.7 | Inbox: Ops task (task-011) | For operations_manager |

## 10. Timeline & Audit Tests

| # | Test | Expected |
|---|---|---|
| 10.1 | Submit quotation (Supabase mode) | `quotation_submitted_by_sales` event created |
| 10.2 | Mark received (Supabase mode) | `quotation_received_by_coordinator` event created |
| 10.3 | Record sent to estimation | `quotation_sent_to_estimation` event with estimation_contact |
| 10.4 | Request clarification | `clarification_requested` event with message body |
| 10.5 | Return to sales | `quotation_returned_to_sales` event |
| 10.6 | Convert to SO | `quotation_converted_to_so` event with project_id |
| 10.7 | Audit: quotation_created entry | Correct entity_type = 'quotation' |
| 10.8 | Dev mode: no DB writes, console logs only | No errors |

## 11. Routing Tests

| # | Test | Expected |
|---|---|---|
| 11.1 | /quotations navigates to full Quotations page (not placeholder) | Correct page |
| 11.2 | /quotations/new navigates to wizard | Correct page |
| 11.3 | /quotations/qtn-001 navigates to detail | Correct page |
| 11.4 | /sales-coordinator navigates to coordinator dashboard | Correct page |
| 11.5 | Back button from wizard | Returns to /quotations |

## 12. Build & Quality Tests

| # | Test | Expected |
|---|---|---|
| 12.1 | `npm run build` | Zero TypeScript errors |
| 12.2 | No unused imports | TS6133 errors absent |
| 12.3 | Button `as={Link}` not used | Not in codebase |
| 12.4 | `.finally()` not used on Supabase promises | Not in codebase |
| 12.5 | All roles render pages without crash | No runtime errors |
| 12.6 | Dev mode banner visible when Supabase not configured | DevModeBanner renders |
