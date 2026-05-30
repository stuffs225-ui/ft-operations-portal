# Phase 7 Test Plan — Store / Warehouse / Vehicle Receiving / Medical Serials / Material Custody

---

## Section 1: Store Module — Role-Based Access (8 scenarios)

**TC-7-001: Store page access — store_user**
- Given: Signed in as store_user
- When: Navigate to `/store`
- Then: 8 KPI cards visible, "New Receipt" and "New Vehicle" buttons visible, no purchase cost shown anywhere

**TC-7-002: Store page access — viewer**
- Given: Signed in as viewer
- When: Navigate to `/store`
- Then: KPI cards visible, no create buttons visible, no cost data visible

**TC-7-003: Store receipts list — factory_user cannot see purchase cost**
- Given: Signed in as factory_user
- When: Navigate to `/store/receipts`
- Then: Receipt list loads; no unit cost, total cost, or purchase value columns visible

**TC-7-004: Store inventory — admin sees full list**
- Given: Signed in as admin
- When: Navigate to `/store/inventory`
- Then: All items across all receipts visible, all categories available in filter

**TC-7-005: Store inventory — store_user can filter by category**
- Given: Signed in as store_user
- When: Navigate to `/store/inventory`, select category 'medical'
- Then: Only medical items shown, serial_required badge visible

**TC-7-006: Unallocated materials — admin can assign project**
- Given: Signed in as admin, at least one receipt with project_id = null
- When: Navigate to `/store/unallocated`, click "Assign" on an item
- Then: Project dropdown appears with available projects

**TC-7-007: Store route guard — unauthenticated user**
- Given: Not signed in
- When: Navigate to `/store`
- Then: Redirected to sign-in page (ProtectedRoute)

**TC-7-008: Custody — store_user cannot approve own custody request**
- Given: Signed in as store_user who created a custody record
- When: Navigate to `/custody/cus-002` (pending approval)
- Then: Approve button not visible; only admin/operations_manager sees approve action

---

## Section 2: Material Receipt Creation (10 scenarios)

**TC-7-009: Receipt wizard — step 1 requires date**
- Given: Signed in as store_user
- When: Navigate to `/store/receipts/new`, attempt "Next" without entering date
- Then: Navigation to step 2 does not occur

**TC-7-010: Receipt wizard — step 2 requires at least one item**
- Given: On step 2 of new receipt wizard, no items added
- When: Click "Next"
- Then: Navigation to step 3 does not occur

**TC-7-011: Receipt wizard — adding item clears form**
- Given: Filled in item name "AED Device", qty 2, clicked "Add Item"
- When: Observe form state
- Then: Item appears in list below, form resets to blank for next item

**TC-7-012: Receipt wizard — medical item auto-sets serial_required**
- Given: On step 2 of receipt wizard
- When: Change Category to 'medical'
- Then: "Serial number required" checkbox becomes checked automatically

**TC-7-013: Receipt wizard — remove item from list**
- Given: Two items added in step 2
- When: Click trash icon on first item
- Then: First item removed, second item remains

**TC-7-014: Receipt wizard — step 3 shows dev mode notice**
- Given: Supabase not configured (dev mode), on step 3
- When: Review page loads
- Then: Amber "Dev Mode — changes will not be persisted" notice visible

**TC-7-015: Receipt wizard — save as draft navigates to list**
- Given: On step 3 with valid data
- When: Click "Save as Draft"
- Then: Success state shown (dev mode), redirect to /store/receipts after 1.5s

**TC-7-016: Receipt detail — items tab shows all items**
- Given: Navigate to `/store/receipts/rcpt-001`
- When: Items tab active (default)
- Then: All items for that receipt listed with item_name, qty, unit, condition, storage_location

**TC-7-017: Receipt detail — serial numbers tab for medical items**
- Given: Navigate to `/store/receipts/rcpt-001` (has medical items with serials)
- When: Click Serial Numbers tab
- Then: Serial numbers listed with serial_number, expiry_date, qc_status, current_status

**TC-7-018: Receipt detail — no purchase cost shown to store_user**
- Given: Signed in as store_user, at `/store/receipts/rcpt-001`
- When: View page in Items tab
- Then: No unit price, total price, or purchase cost column visible

---

## Section 3: Vehicle Receiving (10 scenarios)

**TC-7-019: Vehicle list — completeness badge shows missing photo count**
- Given: Navigate to `/store/vehicle-receiving`
- When: vrc-002 is in list (missing left_side + right_side photos)
- Then: Badge shows "3/5 Photos" or "2 missing" indicator

**TC-7-020: Vehicle list — vrc-001 shows photos complete**
- Given: Navigate to `/store/vehicle-receiving`
- When: vrc-001 is in list (all 5 required photos present)
- Then: "Photos Complete" or green complete indicator shown

**TC-7-021: Vehicle detail — completeness banner when photos incomplete**
- Given: Navigate to `/store/vehicle-receiving/vrc-002`
- When: Page loads
- Then: Warning banner showing which required photos are missing

**TC-7-022: Vehicle detail — photo grid shows uploaded photos**
- Given: Navigate to `/store/vehicle-receiving/vrc-001`
- When: Page loads
- Then: Photo grid shows all 5 required photo slots filled

**TC-7-023: Vehicle detail — add photo inline form**
- Given: Navigate to `/store/vehicle-receiving/vrc-003` (missing right_side)
- When: Click "Add Photo" or photo slot for right_side
- Then: Photo type pre-filled with 'right_side', file input appears

**TC-7-024: Vehicle receipt wizard — chassis number required**
- Given: On new vehicle receiving wizard step 1
- When: Try to proceed without chassis number
- Then: Validation prevents proceeding to step 2

**TC-7-025: Vehicle receipt wizard — step 2 photo documentation slots**
- Given: On step 2 of new vehicle receiving wizard
- When: Page loads
- Then: 5 required photo slot labels visible: Front, Rear, Left Side, Right Side, Chassis Plate

**TC-7-026: Vehicle receipt — redirect from old route**
- Given: Navigate to `/vehicle-receiving`
- When: Route resolves
- Then: Redirect to `/store/vehicle-receiving` (302 replace)

**TC-7-027: Vehicle receipt — missing chassis number warning in list**
- Given: A vehicle receipt with no chassis_number
- When: Viewing vehicle receiving list
- Then: Chassis number column shows "Missing" warning in red

**TC-7-028: Vehicle detail — governance note displayed**
- Given: Navigate to any vehicle receipt detail page
- When: Page loads
- Then: Governance note visible: "Vehicle receipt is incomplete without chassis number and all 5 required photos"

---

## Section 4: Medical Serial Tracking (8 scenarios)

**TC-7-029: Serial required auto-set on medical category**
- Given: Adding item in receipt wizard step 2
- When: Select Category = 'medical'
- Then: serial_required checkbox becomes checked and read-only

**TC-7-030: Serial not required by default for non-medical**
- Given: Adding item with category = 'general'
- When: Observe serial_required checkbox
- Then: Unchecked by default, user can check manually if needed

**TC-7-031: Serial number entry — receipt detail serial tab**
- Given: Navigate to receipt with medical items
- When: Click "Serial Numbers" tab
- Then: Tab shows serials for medical items; includes serial_number, batch_number, expiry_date, qc_status

**TC-7-032: Serial qc_status default on receipt**
- Given: Medical item received and serial entered
- When: View serial record
- Then: qc_status = 'not_checked' (Phase 8 will change this)

**TC-7-033: Serial current_status starts as in_store**
- Given: Serial record created on receipt
- When: View current_status
- Then: current_status = 'in_store'

**TC-7-034: Serial moves to in_custody on issuance**
- Given: Medical item issued via custody
- When: Custody record status = 'issued'
- Then: Associated serial records current_status = 'in_custody'

**TC-7-035: Serial expiry date visible in list**
- Given: Navigate to `/store/receipts/rcpt-001` serial numbers tab
- When: Items with expiry_date present
- Then: Expiry date column visible for medical items

**TC-7-036: Serial governance note on receipt detail**
- Given: Navigate to any receipt with serial_required = true items
- When: Items tab visible
- Then: Note "Serial number tracking required for medical items" visible

---

## Section 5: Material Custody (10 scenarios)

**TC-7-037: Custody list — status filter tabs**
- Given: Navigate to `/custody`
- When: Click "Pending Approval" tab
- Then: Only records with approval_status = 'pending_approval' shown

**TC-7-038: Custody — temporary custody requires approval**
- Given: Custody record with issue_type = 'temporary_custody' and approval_required = true
- When: Navigate to custody detail
- Then: Approval pending banner visible; approve button only shown to admin/ops_manager

**TC-7-039: Custody — permanent assign does not require approval**
- Given: Custody record with issue_type = 'permanent_assign'
- When: Navigate to custody detail
- Then: No approval banner shown; status can proceed to issued directly

**TC-7-040: Custody wizard — step 1 select item**
- Given: Navigate to `/custody/new`, step 1
- When: Select an item from the material list
- Then: Item details (name, qty, category) shown in selection

**TC-7-041: Custody wizard — issue type selection**
- Given: On custody wizard step 2
- When: Select 'Temporary Custody'
- Then: Info note displayed: "Requires Admin/Ops approval before material can be issued"

**TC-7-042: Custody detail — receiver accepts**
- Given: Custody with status = 'issued', receiver_decision = 'pending'
- When: Navigate to `/custody/cus-001`, click "Accept"
- Then: Dev mode success message shown, receiver_decision moves to 'accepted'

**TC-7-043: Custody detail — receiver rejects**
- Given: Custody with status = 'issued', receiver_decision = 'pending'
- When: Click "Reject" on detail page
- Then: Dev mode success message, receiver_decision = 'rejected'

**TC-7-044: Custody detail — install action**
- Given: Custody with status = 'in_custody'
- When: Click "Mark as Installed"
- Then: Status moves to 'installed', install date recorded

**TC-7-045: Custody detail — return action**
- Given: Custody with status = 'in_custody'
- When: Click "Return to Store"
- Then: Status moves to 'returned', return date recorded

**TC-7-046: Custody KPI counts — dashboard**
- Given: Mock data has 1 pending approval, 1 pending acceptance, 1 in_custody, 1 returned
- When: Navigate to `/custody`
- Then: KPI strip shows exact counts matching mock data

---

## Section 6: ProjectDetail Store Tab (6 scenarios)

**TC-7-047: Store tab visible in project detail**
- Given: Navigate to `/projects/proj-005`
- When: Tab bar renders
- Then: "Store" tab is visible between "Factory" and "Approval & Routing" tabs

**TC-7-048: Store tab — material receipts for proj-005**
- Given: Navigate to `/projects/proj-005`, click Store tab
- When: Material Receipts section loads
- Then: RCP-2025-0001, RCP-2025-0002, RCP-2025-0005 shown (linked to proj-005)

**TC-7-049: Store tab — vehicle receipts for proj-005**
- Given: Navigate to `/projects/proj-005`, click Store tab
- When: Vehicle Receipts section loads
- Then: vrc-001 and vrc-002 shown (linked to proj-005)

**TC-7-050: Store tab — empty state for project with no store data**
- Given: Navigate to a project with no store receipts
- When: Store tab active
- Then: "No material receipts linked to this project" empty messages shown

**TC-7-051: Store tab — view all links navigate correctly**
- Given: On Store tab of any project
- When: Click "View All" link in Material Receipts section
- Then: Navigate to `/store/receipts`

**TC-7-052: Store tab — Phase 8 notice**
- Given: On Store tab
- When: Bottom of page
- Then: "Phase 8 — Material QC" notice visible explaining upcoming QC workflow

---

## Section 7: Dashboard Store KPIs (5 scenarios)

**TC-7-053: Dashboard — store KPI cards present**
- Given: Navigate to `/`
- When: KPI section renders
- Then: Cards include: "Materials Pending QC", "Vehicles Missing Photos", "Custody Pending Approval", "Custody Pending Acceptance", "Unallocated Materials"

**TC-7-054: Dashboard — Store KPI icons render**
- Given: Navigate to `/`
- When: Store KPI cards visible
- Then: No broken/fallback icons; Package, Truck, ShieldAlert, Clock icons render correctly

**TC-7-055: Dashboard — "Materials Pending QC" card links to /store/receipts**
- Given: Click "Materials Pending QC" KPI card
- When: Navigation resolves
- Then: `/store/receipts` loads with pending_qc tab active (or at least the list page)

**TC-7-056: Dashboard — "Vehicles Missing Photos" card links to /store/vehicle-receiving**
- Given: Click "Vehicles Missing Photos" KPI card
- When: Navigation resolves
- Then: `/store/vehicle-receiving` loads

**TC-7-057: Dashboard — "Custody Pending Approval" links to /custody**
- Given: Click "Custody Pending Approval" KPI card
- When: Navigation resolves
- Then: `/custody` loads

---

## Section 8: Action Inbox Store Tasks (4 scenarios)

**TC-7-058: Inbox — store_user sees receipt and photo tasks**
- Given: Signed in as store_user
- When: Navigate to `/inbox`
- Then: Tasks visible include vehicle photo completeness, pending QC receipts, unallocated materials

**TC-7-059: Inbox — admin sees custody approval task**
- Given: Signed in as admin
- When: Navigate to `/inbox`
- Then: "Custody pending approval" task visible for pending_approval custody records

**TC-7-060: Inbox — factory_user sees custody acceptance task**
- Given: Signed in as factory_user (or receiver role)
- When: Navigate to `/inbox`
- Then: "Custody pending acceptance" task visible for items issued to production

**TC-7-061: Inbox — task links navigate to correct detail pages**
- Given: Click a custody task in inbox
- When: Link resolves
- Then: Navigate to `/custody` or specific `/custody/:id` detail page
