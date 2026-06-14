# Analysis 03 — Design System Recommendation

**Purpose:** Define the recommended UI direction, component library, layout standards, and screen patterns for the FT Operations Portal.

---

## Recommended UI Direction

The FT Operations Portal serves **operational users in a high-stakes vehicle manufacturing and project management context**. The design must be:

- **Functional over decorative** — data density matters; users check dozens of items per session
- **Status-first** — every record should show its current state at a glance
- **Role-appropriate** — different roles see different sections, not just hidden buttons
- **RTL-capable** — the system serves Arabic-speaking users; layout must support RTL direction
- **Responsive but desktop-primary** — operational users primarily work on desktop screens; mobile is secondary

### Design Vocabulary

- **Color palette:** Neutral dark + accent teal/blue (similar to the v3.2 Playbook's color scheme — dark navy headers, teal accent, white content areas)
- **Typography:** Clean sans-serif (Inter or IBM Plex Sans for English; Noto Sans Arabic for Arabic content)
- **Spacing:** 4px base grid (Tailwind default)
- **Border radius:** Subtle (4-8px), not excessive rounding
- **Shadows:** Light — use borders more than shadows for card definition

---

## Recommended Component Library

**Primary:** [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT License)

**Why shadcn/ui:**
- Copy-paste components — not a "black box" dependency; full ownership of component code
- Built on Radix UI primitives — fully accessible (ARIA compliant)
- Tailwind CSS — aligns with most modern React stacks
- RTL-compatible with Tailwind's `rtl:` modifier
- MIT license — no restrictions
- Actively maintained, widely adopted (80k+ stars)
- Works seamlessly with refine as the admin framework

**Supporting Libraries (all MIT):**
- `tailwind-merge` — merge Tailwind classes safely
- `class-variance-authority` (CVA) — component variant management
- `cmdk` — command palette (built into shadcn/ui)
- `@radix-ui/*` — accessible primitives (included with shadcn/ui)
- `lucide-react` — icon library (MIT)
- `recharts` or `tremor` — charts for KPI dashboards

---

## Layout Standard

### Overall Shell

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] [FT Operations Portal]              [Bell] [User]  │  ← Top header (64px)
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  Sidebar      │  Main Content Area                          │
│  (240px)      │                                             │
│               │  [Page Header — Title + Breadcrumb]         │
│  - Module     │                                             │
│    sections   │  [Content — table / form / dashboard]       │
│    by role    │                                             │
│               │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

### Sidebar Organization by Role

Each role sees a tailored sidebar:

**Admin / Operations Manager:**
- Control Tower (home)
- Projects (SO list)
- Quotation Requests
- Procurement
- Store / Warehouse
- Quality
- Suppliers
- Reports
- Settings

**Sales User:**
- My Dashboard
- Quotation Requests
- Hot Projects
- My Projects (SO)
- Invoicing
- Aging

**Sales Coordinator:**
- Coordinator Dashboard
- Quotation Requests (queue)
- Pending Estimation
- Need Clarification
- Returned Quotations
- History

**Factory / Production User:**
- My Projects (Saudi WO only)
- Raw Material Requests
- BOQ / BOM / Drawings

**Store User:**
- Receiving (Material + Vehicle)
- Inventory
- Custody Management
- Issuance

**QC User:**
- Material QC Queue
- Vehicle QC Queue
- NCR Management
- Release Notes

**AFS User:**
- Dubai Projects
- AFS Arrival
- Pre-delivery Reports
- AFS Maintenance

---

## Table / List Page Standards

### Standard DataTable Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Title]                          [+ Create Button]    │
├─────────────────────────────────────────────────────────────┤
│  [Search Input]  [Filter: Status ▾]  [Filter: Date ▾]  [x] │  ← Filter bar
├──────┬──────────────────┬─────────┬──────────┬─────────────┤
│  #   │  Project / Name  │ Status  │  Date    │  Actions    │
├──────┼──────────────────┼─────────┼──────────┼─────────────┤
│  001 │  Fire Truck x3   │ [badge] │ 2026-01  │ View / Edit │
│  002 │  Ambulance x1    │ [badge] │ 2026-02  │ View / Edit │
└──────┴──────────────────┴─────────┴──────────┴─────────────┘
│  Showing 1-10 of 47          [< 1 2 3 4 5 >]               │
```

**Rules:**
- Always show status as a Badge component with semantic color
- Include a search bar on all list pages
- Default sort by created date descending
- Pagination: 25 rows default, configurable
- Actions column: "View" always shown; "Edit" shown only to authorized roles
- Column visibility toggle for power users
- Export to CSV available on report-type lists

---

## Form Standards

### Standard Create / Edit Form

```
┌─────────────────────────────────────────────────────────────┐
│  Create Quotation Request                    [← Back]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Section: Customer Information                              │
│  ────────────────────────────                               │
│  Customer / Entity *          [Select or type...]           │
│  Hot Project (optional)       [Select...]                   │
│                                                             │
│  Section: Requested Items                                   │
│  ─────────────────────────                                  │
│  [+ Add Vehicle Line]                                       │
│  ┌─────────────────┬──────────┬──────────────────────────┐ │
│  │ Vehicle Type    │ Quantity │ Actions                   │ │
│  │ Fire Truck      │ 3        │ [Edit] [Remove]           │ │
│  └─────────────────┴──────────┴──────────────────────────┘ │
│                                                             │
│  Section: Supporting Documents                              │
│  ──────────────────────────────                             │
│  Specification Files *        [Upload PDF / DOCX]           │
│                                                             │
│                    [Cancel]  [Save Draft]  [Submit]         │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Required fields marked with * and enforced at submit
- Multi-section forms use clear section headers (not tabs unless truly separate contexts)
- Line item tables inside forms use inline edit or a slide-over Sheet for complex entries
- File upload always shows: file name, size, upload status, remove button
- Save Draft should always be available before Submit to prevent data loss
- Submit triggers stage-gate validation; show specific errors, not generic "form invalid"
- Approval actions (Approve / Reject) should use a confirmation Dialog with a reason field for Reject

---

## Dialog / Modal Standards

**Use Dialog (modal) for:**
- Confirmation of destructive or irreversible actions (Approve SO, Reject PO, Close NCR)
- Quick-action forms that don't warrant a full page (Add a comment, Request Clarification, Enter WO number)
- Document preview

**Use Sheet (side panel) for:**
- Detail view of a record without leaving the list page
- Complex forms that need more space than a Dialog

**Do NOT use dialogs for:**
- Full record creation (use a dedicated page)
- Multi-step workflows (use a dedicated flow with progress indicator)

**Dialog structure:**
```
┌──────────────────────────────────┐
│  Approve SO-2026-041?            │  ← Title
│                                  │
│  This will route the project to  │  ← Description
│  Saudi manufacturing (WO required│
│  before production can begin).   │
│                                  │
│  Route: [Saudi ▾]  Medical: [Yes]│  ← Form fields if needed
│                                  │
│           [Cancel]  [Approve]    │  ← Actions
└──────────────────────────────────┘
```

---

## Status Badge Standards

Use semantic color coding consistently across all modules:

| Status | Color | Badge Text |
|---|---|---|
| Draft | Gray | Draft |
| Pending / Waiting | Yellow / Amber | Pending |
| In Progress | Blue | In Progress |
| Pending Approval | Orange | Pending Approval |
| Approved | Green | Approved |
| Rejected | Red | Rejected |
| Active | Green | Active |
| Completed | Green (muted) | Completed |
| Delivered | Teal | Delivered |
| Closed | Gray (dark) | Closed |
| Suspended | Orange | Suspended |
| Blacklisted | Red | Blacklisted |
| In Custody | Blue | In Custody |
| Installed | Green | Installed |
| Returned | Gray | Returned |
| Consumed | Purple (muted) | Consumed |
| Lost / Damaged | Red | Lost/Damaged |
| NCR Open | Red | NCR Open |
| Rework Required | Orange | Rework Required |
| Released | Green | Released |
| Expired | Red (muted) | Expired |

**Implementation:** Use shadcn/ui `Badge` with `variant` prop. Define a `statusBadge(status)` utility function that maps status strings to badge variants.

---

## Empty State Standards

Every list page and section must handle empty state gracefully:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Icon: ClipboardList]                    │
│                                                             │
│               No Quotation Requests Yet                     │
│                                                             │
│         Sales team can submit quotation requests            │
│         from their workspace.                               │
│                                                             │
│              [Create Quotation Request]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Always show an icon (from lucide-react)
- Short title: "No [Entity] Yet" or "No [Entity] Found"
- One line of helpful context
- Call-to-action button if the user can create records (role-gated)
- For filtered results: "No results match your filters" with a "Clear Filters" button

---

## Document Upload UI Standards

Every document upload must show:
1. Accepted file types (PDF, DOCX, XLS, XLSX, JPG, PNG)
2. Maximum file size
3. Upload progress bar during upload
4. Uploaded file: name + size + status badge + download link + remove button (if editable)
5. For versioned documents: version number, upload date, uploaded by

**Multiple document uploads** (e.g., Vehicle Photos):

```
[Drop files here or click to upload]
Required: Front, Rear, Left, Right, Chassis Plate photos

✓ front.jpg     (2.1 MB)  [Remove]
✓ rear.jpg      (1.8 MB)  [Remove]
⚠ left.jpg      (1.2 MB)  [Remove]   ← Uploaded but low quality warning
✗ right.jpg     Failed — file too large  [Retry]
  chassis.jpg   Required — not uploaded yet
```

---

## Timeline / Audit UI Standards

Project-level timeline (visible to all users with project access):

```
Timeline

●── 2026-01-15 09:32  Admin
│   SO Approved — Route: Saudi, Medical: Yes
│
●── 2026-01-18 14:05  Production Team
│   WO Created — WO-2026-010
│
●── 2026-01-20 11:22  Procurement
│   PR Submitted — 3 items
│
●── 2026-01-25 16:40  Store
    Vehicle Received — Chassis: NFXXX12345
```

**Rules:**
- Chronological, most recent first (or option to reverse)
- Each event: timestamp, actor, action description
- Color-coded by event type (approval = green, rejection = red, creation = blue, update = gray)
- Filtered by event type (Governance / Operational / Document / QC)
- Audit log (field-level changes) accessible to Admin only via a separate tab

---

## Role-Based Workspace UI Standards

Each role should have a dedicated dashboard / home page that shows:

1. **Their queue** — items requiring action from them
2. **SLA status** — items near or past their deadline
3. **Recent activity** — recent events on their relevant records
4. **Quick actions** — one-click access to the most common actions for their role

**Control Tower (Admin / Operations Manager home):**
```
┌─────────────┬──────────────┬───────────────────────────────┐
│ Pending      │ SO without   │ SO without PN                 │
│ Quotations   │ WO           │                               │
│      7       │      3       │      2                        │
│ [View all]   │ [View all]   │ [View all]                    │
├─────────────┼──────────────┼───────────────────────────────┤
│ PO Pending   │ Materials    │ Vehicle Issues                │
│ Approval     │ in Custody   │                               │
│      4       │      12      │      1                        │
│ [View all]   │ [View all]   │ [View all]                    │
├─────────────┼──────────────┼───────────────────────────────┤
│ Raw Mat.     │ QC Rework    │ Critical Issues               │
│ Requests     │ Open         │                               │
│      6       │      2       │      0                        │
│ [View all]   │ [View all]   │ [View all]                    │
└─────────────┴──────────────┴───────────────────────────────┘
```

Each tile:
- Shows count with semantic coloring (0 = green, any count = amber/red based on severity)
- Links to a pre-filtered list view
- Auto-refreshes every 30 seconds (or on-demand refresh button)
