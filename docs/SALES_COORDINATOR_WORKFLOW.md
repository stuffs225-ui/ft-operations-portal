# Sales Coordinator Workflow

## Role Purpose

The Sales Coordinator acts as the bridge between the Sales team and the external Estimation Team. They do not send email from the system — they record that they have sent the request by email and log the contact details used.

## Step-by-Step Workflow

### 1. New Request Arrives

- Sales submits a quotation request → status: `submitted_by_sales`
- Coordinator sees it in the **New / Unprocessed** section of the Sales Coordinator dashboard
- SLA: Must process within 48 hours of submission

### 2. Mark as Received

- Coordinator opens the quotation request
- Clicks "Mark Received" in the **Coordinator Processing** tab
- Status → `received_by_coordinator`
- Optional: add coordinator remarks
- Timeline event written: `quotation_received_by_coordinator`

### 3. Send to Estimation Team (External, by Email)

- Coordinator contacts the external Estimation Team by email (outside the system)
- In the system: enters the estimation team's email/contact in the text field
- Clicks "Record Sent to Estimation"
- Status → `waiting_for_estimation`
- `sent_to_estimation_at` timestamp recorded
- Timeline event written: `quotation_sent_to_estimation`

### 4a. If Clarification Needed

- If specifications are unclear, coordinator clicks "Request Clarification"
- Enters clarification message
- Status → `need_clarification`
- Sales is notified (via Inbox task) to provide additional information
- SLA: Sales must respond within 48 hours

### 4b. Estimation Response Received

- External Estimation Team sends quotation by email (outside the system)
- Coordinator receives the quotation PDF
- In the **Quotation Response** tab:
  - Enters the quotation number
  - Uploads the quotation PDF (or enters filename in dev mode)
  - Enters final unit value per line (system auto-calculates line total)
  - Clicks "Save Values"
- Status → `quotation_received`
- Timeline event: `quotation_pdf_uploaded`

### 5. Return to Sales

- After all values are entered and PDF is uploaded
- Coordinator clicks "Return to Sales"
- Status → `returned_to_sales`
- `returned_to_sales_at` timestamp recorded
- Timeline event: `quotation_returned_to_sales`

### 6. Sales Reviews and Converts

- Sales sees the returned quotation in their dashboard
- Can view the quotation PDF and all line values
- Options:
  - **Convert to SO**: Creates a draft Sales Order from the quotation
  - **Convert to Hot Project**: (Future phase)

## Coordinator Dashboard Sections

| Section | Status Filter |
|---|---|
| New / Unprocessed | `submitted_by_sales` |
| Waiting Estimation | `sent_to_estimation`, `waiting_for_estimation` |
| Need Clarification | `need_clarification` |
| Ready to Return | `quotation_received` |
| Overdue | SLA-based, across all active statuses |

## SLA Monitoring

The coordinator dashboard shows:
- **Overdue** badge with days overdue on each row
- **SLA Warning** badge when < 24h until deadline
- Dedicated **Overdue** section at top of dashboard (only when items exist)

## Important Rules

1. Coordinator does NOT send emails from the system — they only record that they did.
2. The Estimation Team does not have a system account.
3. Coordinator can read all quotation requests (not just assigned ones) to handle team coverage.
4. Only Sales Coordinators, Operations Managers, and Admins can use the Coordinator Processing and Quotation Response tabs.
5. Sales Users can see the returned quotation (PDF, values) but cannot modify coordinator fields.
