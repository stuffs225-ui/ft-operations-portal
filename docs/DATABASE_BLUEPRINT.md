# FT Operations Portal — Database Blueprint

**Database:** Supabase PostgreSQL (Phase 1+)  
**Security:** Row Level Security (RLS) on all tables  

---

## Data Hierarchy (from Playbook §04)

```
QuotationRequest
  └── ProjectHeader (SO)
        ├── ExecutionReference (WO or PN)
        ├── VehicleLines[]
        │     ├── OperationalRecords[]
        │     │     ├── PR
        │     │     ├── POtoSupplier
        │     │     ├── StoreReceipt
        │     │     ├── CustodyRecord
        │     │     ├── FactoryProgress (Saudi)
        │     │     ├── DubaiTracking (Dubai)
        │     │     └── QCInspection
        │     └── Documents[]
        └── GovernanceRecords[]
              ├── Timeline[]
              ├── AuditLog[]
              ├── SLARecord[]
              └── Issues/CAPA[]
```

---

## Core Tables

### `quotation_requests`
```sql
id, reference_number, customer_id, sales_user_id,
status, specification_files[], hot_project_id,
sent_to_estimation_date, quotation_number,
quotation_pdf_url, validity_date,
quotation_lines (jsonb), created_at, updated_at
```

### `projects` (Sales Orders)
```sql
id, so_number, customer_id, sales_owner_id,
status, manufacturing_route (saudi|dubai),
is_medical, total_value, contract_url,
delivery_date, admin_approved_at, admin_approved_by,
created_at, updated_at
```

### `vehicle_lines`
```sql
id, project_id, vehicle_type, quantity,
line_value, line_status, wo_id, pn_id,
chassis_number, created_at, updated_at
```

### `execution_references` (WO / PN)
```sql
id, project_id, reference_type (wo|pn),
reference_number, entered_by, entered_at,
status, created_at
```

### `purchase_requests`
```sql
id, project_id, vehicle_line_id, requested_by,
status, items (jsonb), created_at
```

### `po_to_supplier`
```sql
id, pr_id, supplier_id, value_sar,
requires_approval, approved_by, approved_at,
status, po_document_url, eta_date,
eta_history (jsonb), created_at
```

### `store_receipts`
```sql
id, po_to_supplier_id, project_id, item_id,
received_by, received_date, quantity,
serial_number (medical items), is_medical,
condition, created_at
```

### `custody_records`
```sql
id, material_id, issued_to_role, issued_to_user_id,
custody_type (project|temporary), project_id,
approved_by, status, accepted_at, installed_at,
returned_at, created_at
```

### `vehicle_receipts`
```sql
id, vehicle_line_id, chassis_number, received_by,
received_date, condition, photos_urls (jsonb),
receiving_report_url, is_complete, created_at
```

### `qc_inspections`
```sql
id, object_type (material|vehicle), object_id,
inspector_id, result, checklist (jsonb),
findings (jsonb), rework_required, closed_at,
created_at
```

### `release_notes`
```sql
id, project_id, vehicle_line_id, issued_by,
issued_at, approved_by, approved_at,
all_qc_closed, document_url, created_at
```

### `afs_maintenance_requests`
```sql
id, project_id, vehicle_line_id, wo_id, pn_id,
raised_by, issue_type, priority, description,
attachments_urls (jsonb), status, resolution_notes,
closed_at, created_at
```

### `timeline_events`
```sql
id, project_id, event_type, event_data (jsonb),
actor_id, occurred_at
```

### `audit_log`
```sql
id, table_name, record_id, action (insert|update|delete),
old_values (jsonb), new_values (jsonb),
actor_id, occurred_at
```

---

## RLS Policy Pattern

```sql
-- Example: factory_user can only see Saudi projects with WO
CREATE POLICY "factory_sees_saudi_projects"
ON vehicle_lines FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'factory_user'
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = vehicle_lines.project_id
    AND p.manufacturing_route = 'saudi'
    AND p.status != 'quotation_requested'
  )
);
```

---

## Master Data Tables

- `customers`
- `suppliers` (with status: draft/pending_review/approved/approved_with_conditions/suspended/blacklisted)
- `vehicle_types`
- `material_categories`
- `document_types`
- `checklist_templates`
- `sla_rules`
- `store_locations`
- `root_cause_categories`
- `issue_types`
