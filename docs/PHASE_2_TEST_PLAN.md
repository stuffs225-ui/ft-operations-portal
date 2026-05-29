# Phase 2 Test Plan — Project Core, SO Registration & Approval

## 1. Project List Page (`/projects`)

### 1.1 Page Load
- [ ] Page loads without errors in dev mode (no Supabase)
- [ ] Mock projects (8) are displayed in the table
- [ ] Page loads with real Supabase and fetches live data
- [ ] Loading spinner shown while fetching

### 1.2 Status Tabs
- [ ] "All" tab shows all 8 mock projects
- [ ] "Draft" tab shows only draft projects (proj-001, proj-002)
- [ ] "Submitted" tab shows submitted projects (proj-003, proj-004)
- [ ] "Sent Back" tab shows sent-back projects (proj-007)
- [ ] "Approved" tab shows approved projects (proj-005, proj-006)
- [ ] "Rejected" tab shows rejected projects (proj-008)
- [ ] Badge counts per tab are accurate

### 1.3 Filters
- [ ] Search by project code filters correctly (e.g. "FT-2025-0003")
- [ ] Search by customer name filters correctly (e.g. "Civil Defence")
- [ ] Search by SO number filters correctly (e.g. "SO-MOH")
- [ ] Search is case-insensitive
- [ ] Location filter "Saudi" shows only Saudi projects
- [ ] Location filter "Dubai" shows only Dubai projects
- [ ] Medical filter "Medical" shows only medical-flagged projects
- [ ] Combined filters work (status + location + search)
- [ ] Clearing filters restores full list

### 1.4 Role Visibility
- [ ] Admin sees "New SO / Project" button
- [ ] Operations Manager sees "New SO / Project" button
- [ ] Sales User sees "New SO / Project" button
- [ ] Sales Coordinator does NOT see "New SO / Project" button
- [ ] Factory User does NOT see "New SO / Project" button
- [ ] Admin sees Total Sales Value column
- [ ] Operations Manager sees Total Sales Value column
- [ ] Sales User does NOT see Total Sales Value column
- [ ] All other roles do NOT see Total Sales Value column

### 1.5 Empty States
- [ ] Empty state shows when no projects match filters
- [ ] Empty state shows "New SO / Project" button for eligible roles when no filters active
- [ ] Empty state description changes based on role and filter state

### 1.6 Navigation
- [ ] "View" link navigates to `/projects/:id`
- [ ] "New SO / Project" button navigates to `/projects/new`

---

## 2. SO Creation Wizard (`/projects/new`)

### 2.1 Access Control
- [ ] Admin can access `/projects/new`
- [ ] Operations Manager can access `/projects/new`
- [ ] Sales User can access `/projects/new`
- [ ] Unauthorised roles redirected by ProtectedRoute

### 2.2 Step 1 — Basic Info
- [ ] "Next" button disabled when SO Number is empty
- [ ] "Next" button disabled when Customer Name is empty
- [ ] "Next" button disabled when Delivery Date is empty
- [ ] "Next" button enabled when all required fields filled
- [ ] Manufacturing Location dropdown shows Saudi/Dubai/Not Set
- [ ] Medical Items dropdown shows Yes/No/Not Set
- [ ] Saudi warning info box appears when Saudi selected
- [ ] Dubai info box appears when Dubai selected
- [ ] Medical warning info box appears when Medical=Yes selected
- [ ] Sales Owner pre-filled with current user name
- [ ] Notes field is optional

### 2.3 Step 2 — Documents
- [ ] Step shows "Storage not connected" notice in dev mode
- [ ] Default document entry shown (type=customer_po)
- [ ] "Next" disabled when file name is empty
- [ ] "Next" enabled after filling file name
- [ ] "Add Another Document" adds a new document entry
- [ ] Remove button removes a document entry (not available if only 1 document)
- [ ] All document types available in dropdown
- [ ] Remarks field is optional
- [ ] "Back" returns to Step 1

### 2.4 Step 3 — Vehicle Lines
- [ ] Default empty line shown
- [ ] "Next" disabled when vehicle type is empty
- [ ] "Next" disabled when description is empty
- [ ] "Next" disabled when quantity < 1
- [ ] Line total auto-calculates (qty × unit_value)
- [ ] Running total updates as lines added/edited
- [ ] "Add Vehicle Line" button adds a new line
- [ ] Remove button removes a line (not available if only 1 line)
- [ ] "Back" returns to Step 2

### 2.5 Step 4 — Review & Submit
- [ ] Summary shows all entered data
- [ ] Validation errors listed if any fields invalid
- [ ] "Save as Draft" button present
- [ ] "Submit for Approval" button present
- [ ] Both buttons disabled if validation errors exist
- [ ] In dev mode: save/submit shows success and redirects to /projects
- [ ] In real Supabase: project inserted, vehicle lines inserted, documents inserted
- [ ] Timeline event recorded on save/submit
- [ ] Audit log entry recorded on save/submit

### 2.6 Breadcrumb & Navigation
- [ ] Breadcrumb shows "Projects / New SO / Project"
- [ ] "Back" buttons work at each step

---

## 3. Project Detail (`/projects/:id`)

### 3.1 Page Load
- [ ] Dev mode: loads correct mock project by ID
- [ ] Dev mode: 404 shown for unknown ID
- [ ] Real Supabase: fetches project + lines + documents + timeline
- [ ] Breadcrumb shows "Projects / FT-2025-XXXX"
- [ ] Status badge shown in header action area

### 3.2 Tab: Overview
- [ ] Project code, SO number, customer name shown
- [ ] Status badge shown
- [ ] Manufacturing location badge shown
- [ ] Medical items badge shown
- [ ] Customer delivery date shown
- [ ] Sales owner name shown
- [ ] Admin/Ops sees total sales value card
- [ ] Non-financial roles do NOT see total sales value
- [ ] Revision reason shown (amber card) when status=sent_back
- [ ] Rejection reason shown (red card) when status=rejected
- [ ] Governance gates shown when status=approved and location set
- [ ] Notes shown when present
- [ ] WO gate info shown for Saudi approved projects
- [ ] PN gate info shown for Dubai approved projects
- [ ] Medical tracking info shown for medical=yes approved projects

### 3.3 Tab: SO Details
- [ ] All project fields displayed in a grid
- [ ] Financial fields visible to Admin/Ops only
- [ ] Dates formatted correctly (DD Mon YYYY HH:MM)

### 3.4 Tab: Vehicle Lines
- [ ] Lines table shows all vehicle lines
- [ ] Admin/Ops sees unit value and total value columns
- [ ] Other roles see quantity but not values
- [ ] Running total in tfoot (Admin/Ops only)
- [ ] Empty state when no lines

### 3.5 Tab: Documents
- [ ] Document cards show type, filename, version, date, status
- [ ] Status badge color-coded (approved=green, rejected=red, etc.)
- [ ] "Storage not connected" notice in dev mode
- [ ] Empty state when no documents

### 3.6 Tab: Approval & Routing
- [ ] Admin sees ApprovePanel for submitted projects
- [ ] Ops Manager sees ApprovePanel for submitted projects
- [ ] Non-approver roles see "restricted to Admin/Ops Manager" message
- [ ] For non-submitted projects: informational message shown
- [ ] Location selector defaults to project's current location (or Saudi if not_set)
- [ ] Medical selector defaults to project's current value (or No if not_set)
- [ ] Saudi info box shown when Saudi selected
- [ ] Dubai info box shown when Dubai selected
- [ ] Medical info shown when Yes selected
- [ ] "Approve Project" approves and updates status in UI
- [ ] "Send Back" expands send-back reason form
- [ ] "Reject" expands rejection reason form
- [ ] Send-back requires non-empty reason
- [ ] Rejection requires non-empty reason
- [ ] All actions work in dev mode (no-op)
- [ ] Approval success updates project status in UI without page reload

### 3.7 Tab: Timeline
- [ ] Timeline events shown in chronological order
- [ ] Each event shows title, actor, body, timestamp
- [ ] Empty state when no events
- [ ] Vertical timeline line rendered

### 3.8 Tab: Audit
- [ ] Only visible to Admin
- [ ] Shows project ID and link to audit log page

---

## 4. Admin Approvals (`/admin-approvals`)

### 4.1 Access
- [ ] Admin can access page
- [ ] Operations Manager can access page
- [ ] Other roles cannot access (ProtectedRoute)

### 4.2 Tabs
- [ ] "Pending Approval" tab shows submitted projects
- [ ] "Sent Back" tab shows sent-back projects
- [ ] "Rejected" tab shows rejected projects
- [ ] Badge count per tab is accurate
- [ ] Empty state shown when no projects in tab

### 4.3 Project Row
- [ ] Project code, SO number, customer name shown
- [ ] Submitted date shown
- [ ] Total sales value shown (admin/ops always)
- [ ] Medical badge shown if medical=yes
- [ ] Revision reason shown in sent-back tab
- [ ] Rejection reason shown in rejected tab
- [ ] "View detail" link navigates to `/projects/:id`

### 4.4 Approve Modal
- [ ] Approve button opens ApproveModal
- [ ] Modal shows project summary (code + customer)
- [ ] Location selector (Saudi/Dubai) pre-populated from project
- [ ] Medical selector pre-populated from project
- [ ] Dubai auto-checks Dubai/AFS routing
- [ ] Medical=Yes auto-checks Material QC routing
- [ ] "Approve Project" button triggers approval
- [ ] Dev mode: approval succeeds silently
- [ ] Real Supabase: project status updated to approved
- [ ] Success message shown after approval
- [ ] Project disappears from Pending tab after approval
- [ ] Modal closes on success

### 4.5 Send Back Modal
- [ ] "Send Back" button opens SendBackModal
- [ ] Reason textarea required
- [ ] "Confirm Send Back" disabled when reason empty
- [ ] Dev mode: send back succeeds silently
- [ ] Success message shown
- [ ] Project moves to Sent Back tab

### 4.6 Reject Modal
- [ ] "Reject" button opens RejectModal
- [ ] Reason textarea required
- [ ] "Confirm Rejection" uses red danger styling
- [ ] Dev mode: rejection succeeds silently
- [ ] Success message shown
- [ ] Project moves to Rejected tab

---

## 5. Database Migrations

### 5.1 Migration 009 (projects)
- [ ] project_status enum created
- [ ] manufacturing_location_enum created
- [ ] medical_items_enum created
- [ ] projects table created with all columns
- [ ] project_code uniqueness constraint
- [ ] so_number uniqueness constraint
- [ ] generate_project_code trigger fires on empty project_code
- [ ] handle_updated_at trigger attached
- [ ] RLS policies created (admin/ops, sales_user, read-approved)
- [ ] Re-running migration is idempotent

### 5.2 Migration 010 (vehicle lines)
- [ ] project_vehicle_lines table created
- [ ] compute_line_total trigger auto-calculates line_total_value
- [ ] Unique constraint on (project_id, line_number)
- [ ] RLS policies match project ownership rules

### 5.3 Migration 011 (documents)
- [ ] project_document_type enum created
- [ ] document_review_status enum created
- [ ] project_documents table created
- [ ] RLS policies match project ownership rules

### 5.4 Migration 012 (timeline)
- [ ] project_timeline_events table created
- [ ] Indices on project_id and created_at
- [ ] RLS: authenticated can insert; roles can select based on project access

### 5.5 Migration 013 (RLS helpers)
- [ ] can_read_project() function created
- [ ] can_write_project() function created
- [ ] Both functions use security definer correctly

---

## 6. TypeScript Types

- [ ] ProjectStatus type includes all 8 statuses
- [ ] ManufacturingLocation type includes saudi/dubai/not_set
- [ ] MedicalItems type includes yes/no/not_set
- [ ] Project interface has all fields including joined fields
- [ ] ProjectVehicleLine interface complete
- [ ] ProjectDocument interface complete
- [ ] ProjectTimelineEvent interface complete
- [ ] database.ts has all 4 new tables with correct shapes
- [ ] `npm run build` passes with zero TypeScript errors

---

## 7. Cross-Cutting Concerns

- [ ] Dev mode banner still shown on all protected pages
- [ ] Existing Phase 1 pages (Settings, AdminUsers, AuditLog) unaffected
- [ ] Navigation sidebar links to /projects and /admin-approvals work
- [ ] Login page unaffected
- [ ] Dashboard unaffected
- [ ] isSupabaseConfigured guard prevents any DB calls when not configured
- [ ] No `any` types used without comment justification
- [ ] All imports used (no TS6133 errors)
