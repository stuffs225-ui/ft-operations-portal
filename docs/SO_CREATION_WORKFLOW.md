# SO Creation Workflow — Step-by-Step Guide

## Who Can Create an SO?

- **Admin** — full access
- **Operations Manager** — full access
- **Sales User** — can create and edit own projects (draft / sent back only)

---

## Wizard Steps

### Step 1 — Basic Information

Required fields:
- **SO Number** — unique commercial reference (e.g. SO-CRCD-2025-0143)
- **Customer Name** — full organisation name
- **Customer Delivery Date** — contracted deadline

Optional fields:
- **Manufacturing Location** — Saudi Arabia or Dubai (can be decided at approval)
- **Medical Items** — Yes or No (can be decided at approval)
- **Notes** — any additional context

The **Sales Owner** is pre-populated from the logged-in user's profile. Admin and Operations Manager can override this.

### Step 2 — Documents

At least one document is required before submission. Supported document types:
- Customer PO
- Customer Contract
- SO Supporting Document
- Specification File
- Other

Each document entry requires a **file name**. If Supabase Storage is not configured, enter the filename manually. Real file upload is available when Storage is connected.

### Step 3 — Vehicle Lines

At least one vehicle line is required. Each line contains:
- **Vehicle Type** — selected from the master list (Fire Truck, Ambulance, etc.)
- **Description** — detailed specification
- **Quantity** — must be ≥ 1
- **Unit Sales Value** — in SAR (≥ 0)
- **Line Total** — auto-calculated as Quantity × Unit Sales Value

The running total across all lines becomes the **Total Sales Value** of the project.

### Step 4 — Review & Submit

Before submission, the wizard shows a full summary of all entered data. Validation checks include:
- SO Number not empty
- Customer Name not empty
- Customer Delivery Date set
- At least one document with a filename
- At least one vehicle line with a valid vehicle type and description
- All line quantities ≥ 1

Two submission options:
- **Save as Draft** — saves without submitting; can be edited and submitted later
- **Submit for Approval** — sends to Admin/Operations Manager approval queue immediately

---

## After Submission

The project enters **Submitted for Approval** status and appears in the Admin Approvals queue.

Possible outcomes:
1. **Approved** — Admin routes the project to departments, confirms location and medical flag
2. **Sent Back for Revision** — Admin returns with a revision reason; Sales User can re-edit and resubmit
3. **Rejected** — Admin permanently rejects with a rejection reason

---

## Dev Mode Behaviour

When Supabase is not configured:
- All steps work with mock data
- Save and Submit succeed silently (no data persisted)
- A dev mode notice is shown on each step
- File upload shows "Storage not connected" notice
