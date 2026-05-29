# Project Core — Data Model, Status Lifecycle & Role Matrix

## Data Model

### projects
Primary entity representing a Sales Order and its full lifecycle.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| project_code | text | Auto-generated: FT-YYYY-NNNN |
| so_number | text | Customer-facing SO reference (unique) |
| customer_name | text | Customer organisation name |
| sales_owner_id | uuid → profiles | Responsible sales person |
| customer_delivery_date | date | Contracted delivery date |
| project_status | enum | See lifecycle below |
| manufacturing_location | enum | saudi \| dubai \| not_set |
| medical_items | enum | yes \| no \| not_set |
| total_sales_value | numeric(15,2) | Sum of all vehicle line totals |
| submitted_at | timestamptz | When submitted for approval |
| approved_at | timestamptz | When approved by Admin/Ops |
| approved_by | uuid → profiles | Approver profile ID |
| rejected_at | timestamptz | When rejected |
| rejected_by | uuid → profiles | Rejector profile ID |
| rejection_reason | text | Mandatory if rejected |
| revision_reason | text | Mandatory if sent back |
| notes | text | Free-form notes |
| created_by | uuid → profiles | Creator profile ID |
| created_at / updated_at | timestamptz | Auto-managed |

### project_vehicle_lines
Line items within a project (one per vehicle/item type).

| Column | Type | Notes |
|--------|------|-------|
| project_id | uuid → projects | Parent project |
| line_number | int | Sequential within project |
| vehicle_type | text | Fire Truck, Ambulance, etc. |
| description | text | Detailed description |
| quantity | int | Must be > 0 |
| unit_sales_value | numeric(15,2) | Per-unit value |
| line_total_value | numeric(15,2) | Auto-computed: qty × unit |
| line_status | text | pending → active → completed |

### project_documents
Documents attached to a project (PO, contract, specifications).

| Column | Type | Notes |
|--------|------|-------|
| project_id | uuid → projects | Parent project |
| document_type | enum | customer_po, customer_contract, etc. |
| file_name | text | Original filename |
| storage_path | text | Supabase Storage path (nullable) |
| uploaded_by | uuid → profiles | Uploader |
| status | enum | uploaded → under_review → approved |
| version | text | e.g. "1.0", "2.1" |

### project_timeline_events
Immutable chronological record of all project events.

| Column | Type | Notes |
|--------|------|-------|
| project_id | uuid → projects | Parent project |
| event_type | text | project_created, approved, rejected, etc. |
| title | text | Short event title |
| body | text | Optional long description |
| actor_id / actor_name | uuid / text | Who triggered the event |
| metadata | jsonb | Structured extra data |
| is_system | bool | True for auto-generated events |

---

## Status Lifecycle

```
draft
  ↓ (Sales User submits)
submitted_for_approval
  ↓ (Admin/Ops approves)           ↓ (Admin/Ops sends back)    ↓ (Admin/Ops rejects)
approved                     sent_back_for_revision           rejected
  ↓
active → completed
  ↓
cancelled (any time by Admin)
```

### Allowed Transitions

| From | To | Who |
|------|----|-----|
| draft | submitted_for_approval | Sales User (own projects), Admin, Ops Manager |
| submitted_for_approval | approved | Admin, Operations Manager |
| submitted_for_approval | sent_back_for_revision | Admin, Operations Manager |
| submitted_for_approval | rejected | Admin, Operations Manager |
| sent_back_for_revision | submitted_for_approval | Sales User (own projects), Admin, Ops Manager |
| approved | active | Admin, Operations Manager |
| active | completed | Admin, Operations Manager |
| any | cancelled | Admin only |

---

## Role Matrix

| Role | Can Create | Can Edit | Can Submit | Can Approve | Can See Value |
|------|-----------|----------|------------|-------------|---------------|
| admin | ✓ | ✓ all | ✓ | ✓ | ✓ |
| operations_manager | ✓ | ✓ all | ✓ | ✓ | ✓ |
| sales_user | ✓ (own) | own draft/sent_back | ✓ (own) | ✗ | ✗ |
| sales_coordinator | ✗ | ✗ | ✗ | ✗ | ✗ |
| procurement_user | ✗ | ✗ | ✗ | ✗ | ✗ |
| factory_user | ✗ | ✗ | ✗ | ✗ | ✗ |
| store_user | ✗ | ✗ | ✗ | ✗ | ✗ |
| qc_user | ✗ | ✗ | ✗ | ✗ | ✗ |
| afs_user | ✗ | ✗ | ✗ | ✗ | ✗ |
| viewer | ✗ | ✗ | ✗ | ✗ | ✗ |

Note: sales_coordinator, operational roles, and viewer can only SELECT from approved projects.

---

## Governance Constraints

- **SO** is the commercial reference. WO and PN are execution references.
- **WO mandatory**: Saudi Arabia route requires a Work Order before factory execution.
- **PN mandatory**: Dubai/UAE route requires a Part Number before Dubai follow-up.
- **Medical serial tracking**: Medical items require serial number tracking at delivery.
- **Chassis & photos**: Every vehicle must have chassis number and photos before delivery.
- **PO >10,000 SAR**: Supplier POs above SAR 10,000 require Admin or Ops Manager approval (enforced in procurement phase).
- **Release Note gate**: Release Note is blocked until Project QC is closed (enforced in QC phase).
