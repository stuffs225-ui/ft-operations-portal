# Phase 1 Test Plan

## Environment Requirements

- Dev Mode (no Supabase): all tests marked [DEV] should pass with `npm run dev` and no `.env` set.
- Real Supabase: tests marked [SUPA] require a configured project with migrations applied.

---

## 1. Login / Logout

| # | Scenario | Expected | Mode |
|---|----------|----------|------|
| 1.1 | Open `/` without being logged in | Redirect to `/login` | SUPA |
| 1.2 | Open `/` in Dev Mode | Render Dashboard (no redirect) | DEV |
| 1.3 | Submit login with valid credentials | Redirect to `/` (Dashboard) | SUPA |
| 1.4 | Submit login with invalid credentials | Error message shown, no redirect | SUPA |
| 1.5 | Submit login with any credentials in Dev Mode | Redirect to `/` | DEV |
| 1.6 | Click Logout button in Header | Redirect to `/login`, session cleared | SUPA |
| 1.7 | Open `/login` while already authenticated | Redirect to `/` | SUPA |
| 1.8 | Header shows DEV MODE badge | Yellow badge visible | DEV |
| 1.9 | Header shows real user name and role badge | Correct name and role displayed | SUPA |

---

## 2. Role-Based Navigation

Test by logging in as each role and verifying sidebar items.

| Role | Should See | Should NOT See |
|------|-----------|----------------|
| admin | All items | — |
| operations_manager | All except Settings, Admin/Users, Audit Log | Settings, Admin/Users, Audit Log |
| sales_user | Quotations, Sales Workspace, After Sales, Dashboard, Inbox | Procurement, Factory, Store, QC, Dubai/AFS, Admin pages |
| sales_coordinator | Quotations, Sales Coordinator, Dashboard, Inbox | Sales Workspace, Procurement, Factory, Store, QC |
| procurement_user | Procurement, Dashboard, Inbox | Factory, Store, QC, Dubai/AFS, Sales, Admin pages |
| factory_user | WO/PN Gate, Factory, Material Custody, Dashboard, Inbox | Procurement, Store, QC, Dubai/AFS (except Custody), Sales |
| store_user | Store, Material Custody, Vehicle Receiving, Dashboard, Inbox | Factory, Procurement, QC, Dubai/AFS, Sales |
| qc_user | Material QC, Project QC, Dashboard, Inbox | Factory, Store, Procurement, Dubai/AFS, Sales |
| afs_user | Dubai/AFS, After Sales, Material Custody, Dashboard, Inbox | Factory, Store, QC, Procurement, Sales workspace |
| viewer | Dashboard, Reports | Everything else |

Verify: section separators (SALES, PROJECTS, etc.) are hidden when all items in that section are hidden.

---

## 3. Admin / Users Page

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Load `/admin/users` as admin | Table shows 12 users |
| 3.2 | Filter by role tab "Factory" | Shows 2 factory users |
| 3.3 | Search "sara" | Shows Sara Khalid row only |
| 3.4 | Click "Assign Role" on any user | Modal opens with current role pre-selected |
| 3.5 | Select different role in modal | Description text updates |
| 3.6 | Click "Save Role" | Modal closes (UI only — no real save in Phase 1) |
| 3.7 | Click "Invite User" | Button visible (no-op in Phase 1) |
| 3.8 | Inactive users show grey "Inactive" badge | Reem Al-Zahrani and Hana Al-Dosari show Inactive |

---

## 4. Settings Page

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | Load `/settings` | Page shows with "Vehicle Types" tab active |
| 4.2 | Click each tab | Correct seed data table displayed |
| 4.3 | Vehicle Types tab | 7 rows; codes visible (FT, AMB, etc.) |
| 4.4 | Material Categories tab | Medical Equipment and Safety Equipment show "Yes" for serial required |
| 4.5 | Document Types tab | "PO to Supplier" row visible with note about >10k SAR approval |
| 4.6 | SLA Rules tab | 8 rows; SLA hours shown in amber badge |
| 4.7 | WO / PN Status tab | Both WO and PN status sub-tables visible |
| 4.8 | Add button | Visible on each tab (no-op in Phase 1) |
| 4.9 | Edit button | Visible on each row (no-op in Phase 1) |

---

## 5. Audit Log Page

| # | Scenario | Expected |
|---|----------|----------|
| 5.1 | Load `/audit-log` as admin | 8 sample entries displayed |
| 5.2 | Filter by "APPROVE" action | Shows 1 entry |
| 5.3 | Search "sara" | Shows Sara's CREATE entry |
| 5.4 | Click expandable row with before/after data | Diff viewer expands |
| 5.5 | Diff viewer shows before/after values | Red = before, green = after |
| 5.6 | LOGIN entry has no expand arrow | Non-expandable (no before data) — false for LOGIN in sample |

---

## 6. DocumentList Component

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | Render DocumentList with no props | 8 mock documents visible |
| 6.2 | Filter by "Approved" status | Shows 4 approved documents |
| 6.3 | Search "BOM" | Shows 1 row |
| 6.4 | Rejected row shows remarks tooltip | "Photos blurry..." visible |

---

## 7. Build Integrity

| # | Scenario | Expected |
|---|----------|----------|
| 7.1 | `npm run build` | Zero TypeScript errors, zero build errors |
| 7.2 | `npm run dev` with no `.env` | App boots, DEV MODE badge visible, all pages navigate without error |
| 7.3 | All 20+ routes render without white screen | Navigate to each route manually |
