# Sales Workspace Design

## Overview

The Sales Workspace (`/sales`) is the primary hub for Sales users, Sales Coordinators, and Operations Managers to monitor quotation pipeline, track SO-registered projects, and access quick actions across the sales lifecycle.

## Role Behaviour

| Role | Quotation Scope | Project Scope | Sales Value |
|---|---|---|---|
| `sales_user` | Own requests (`requested_by = uid`) | Own projects (`sales_owner_id = uid`) | Visible (own only) |
| `sales_coordinator` | All | All | Hidden |
| `operations_manager` | All | All | Visible |
| `admin` | All | All | Visible |
| `viewer` | None | None | Hidden |

**Important:** Purchase costs (PO to Supplier values, procurement totals) are **never** shown on the Sales Workspace. Only `total_sales_value` is surfaced, and only to roles with financial visibility.

## KPI Strip

Eight cards computed in real-time from loaded data:

| Card | Derivation |
|---|---|
| Active Projects | `project_status IN (approved, active)` |
| Open Quotations | `quotation_status IN (draft, submitted_by_sales, received_by_coordinator, sent_to_estimation, waiting_for_estimation, need_clarification, quotation_received)` |
| Returned to Sales | `quotation_status = returned_to_sales` |
| SO Drafts | `project_status = draft` |
| Pending Approval | `project_status = submitted_for_approval` |
| Approved Projects | `project_status IN (approved, active, completed)` |
| Sent Back | `project_status = sent_back_for_revision` |
| Need Clarification | `quotation_status = need_clarification` |

## Sections

### Quick Actions
Static action bar with links to: My Quotations, My Projects, Register New SO (role-gated), Approval Queue, Sent-Back SOs.

### My Quotation Requests
Live table of quotation requests filtered by role. Shows: code, customer, scope (truncated to 60 chars), status badge, expected delivery date. Searchable by code and customer name. Shows first 10 rows; "View all" link to `/quotations`.

### My Projects
Live table of projects filtered by role. Shows: project code, SO number, customer, status badge, delivery date, sales value (role-gated). Searchable by code, SO number, and customer name. Shows first 10 rows; "View all" link to `/projects`.

### Hot Projects (Placeholder)
Future module for pre-SO opportunity tracking. Displays informational message with phase label.

### Invoicing Plan (Placeholder)
Future module for milestone-based invoice scheduling. Displays informational message with phase label.

### Aging / Receivables (Placeholder)
Future module for outstanding invoice aging dashboard (30/60/90/90+ day buckets). Displays informational message with phase label.

## Data Loading

- **Supabase configured:** Queries `quotation_requests` and `projects` tables in parallel using `Promise.all`. Applies `eq` filter on `requested_by` / `sales_owner_id` for non-broad roles.
- **Dev mode (no Supabase):** Uses `MOCK_QUOTATIONS` and `MOCK_PROJECTS`. Filters by `profile.id` (defaults to `dev-usr-001`).

## Governance Rules Applied

- WO mandatory before Saudi factory execution — surfaced in project status and routing
- PN mandatory before Dubai follow-up — surfaced in project status and routing
- Purchase costs never exposed to Sales roles
- "New SO / Project" button only shown to `admin`, `operations_manager`, `sales_user`
