# 09 — Documents & Upload Audit

---

## Current Upload Implementation

The system has a metadata-based document model. Files are stored in Supabase Storage private buckets; the database tracks metadata (filename, storage path, mime type, size, status, version).

**Key components:**
- `DocumentPanel.tsx` — reusable document upload/view component
- `DocumentList.tsx` — list view for documents linked to an entity
- `documents.ts` (lib) — document helper functions
- `storageMode` pattern — upload only when Supabase configured

---

## Storage Buckets

| Bucket | Purpose | Write Roles | Private |
|--------|---------|-------------|---------|
| `project-documents` | SO/Project files (contract, PO, specs) | admin, ops, sales_user | ✅ Yes |
| `quotation-documents` | Quotation PDFs, spec files | admin, ops, sales_user, sales_coordinator | ✅ Yes |
| `raw-material-files` | Excel BOM/BOQ uploads | admin, ops, factory_user | ✅ Yes |
| `vehicle-photos` | Vehicle receiving condition photos | admin, ops, store_user | ✅ Yes |
| `qc-documents` | QC inspection evidence, NCR closure, Release Note file | admin, ops, qc_user | ✅ Yes |
| `afs-attachments` | AFS maintenance photos, inspection reports | admin, ops, afs_user | ✅ Yes |

**Gap — Missing buckets:**
- No bucket for `template-files` (document templates uploaded by admin)
- No bucket for `generated-documents` (filled-in generated documents)
- No bucket for `custody-documents` (custody handover forms)

---

## Document Types Tracked

### Project Documents (`project_documents`)
- `contract` — Customer contract/PO
- `specification` — Technical specifications
- `drawing` — Engineering drawings
- `delivery_note` — Delivery documentation
- `other`

### Quotation Documents (`quotation_documents`)
- `specification_file` — Customer specification (REQUIRED for submission)
- `customer_requirement` — Customer requirements document
- `quotation_pdf` — Coordinator-uploaded quotation PDF (REQUIRED for return to sales)
- `supporting_document`
- `other`

### QC Documents (`qc_inspection_documents`)
- Inspection evidence, NCR closure evidence, Release Note file

### Vehicle Photos (`vehicle_receipt_photos`)
- `front`, `rear`, `left_side`, `right_side`, `chassis_plate`, `damage`, `other`
- Required types: front, rear, left_side, right_side, chassis_plate

### AFS Attachments (`afs_maintenance_attachments`)
- `photo`, `inspection_report`, `parts_request`, `resolution_report`, `other`

### Raw Material Files (`raw_material_request_files`)
- Excel BOM/BOQ uploads with `parsing_status`

---

## Document Status Model

All document tables share a common status vocabulary (from `DocumentStatus` type):
- `uploaded` — file is stored
- `under_review` — pending approval
- `approved` — accepted
- `rejected` — rejected
- `superseded` — replaced by newer version
- `expired` — past validity

**Assessment:** Status model is well-defined. However, status transitions are not enforced at DB level — any status can be set to any value without guard.

---

## Document Versioning

Version tracking exists via a `version` column (string, e.g. "v1", "v2"). However:
- No auto-increment on new upload
- No FK linking versions together (no `supersedes_document_id`)
- Old documents not automatically set to `superseded` when a new version is uploaded
- No version history UI

---

## Document Governance Gaps

| Gap | Risk | Required Fix |
|-----|------|-------------|
| No required-document checklist per module | High | Define which documents are mandatory for each entity type and status; enforce before status transitions |
| Specification file gate: UI only | Medium | DB trigger to block quotation submission without spec file |
| Quotation PDF gate: not verified | High | DB trigger to block coordinator return without PDF upload |
| Vehicle photo completeness: not enforced at DB | High | DB trigger requiring all 5 photo types before vehicle receipt status = 'accepted' |
| No document approval workflow for project documents | Medium | Add review/approve step for contract and specification docs |
| Template bucket missing | Medium | Add `template-files` and `generated-documents` storage buckets |
| No document expiry alerts | Low | SLA-style rule: notify when document nears expiry date |
| Version history not linked | Low | Add `supersedes_id` FK to document tables |

---

## Upload Implementation Risks

| Risk | Detail | Severity |
|------|--------|----------|
| Metadata-only in dev mode | In dev mode, file upload saves metadata but no actual file — creates phantom records | Medium |
| No file type validation at DB level | Only mime_type stored; no CHECK constraint on allowed extensions | Medium |
| No file size limit enforced | Supabase has bucket-level limits but no per-upload UI validation | Low |
| No virus/malware scanning | Uploaded files are served to users without content scanning | Medium |
| Signed URL expiry | `createSignedUrl()` URLs expire; no refresh mechanism in UI | Low |

---

## Recommended Future Document Engine

Based on the Governance Playbook's requirement for a governed document and checklist system:

### Phase 1 — Document Checklist Engine
Create a `document_requirements` table defining which document types are required for which entity type and status transition:

```
document_requirements:
  entity_type: 'quotation' | 'project' | 'vehicle_receipt' | 'purchase_order' ...
  document_type: 'specification_file' | 'quotation_pdf' | 'contract' ...
  required_for_status: 'submitted_by_sales' | 'approved' | 'accepted' ...
  is_mandatory: boolean
```

DB trigger checks `document_requirements` before allowing status transition.

### Phase 2 — Upload Card Component
Shared `DocumentUploadCard` component using shadcn/ui (Direct, MIT, Low risk):
- Drag-and-drop
- File type whitelist
- Size limit
- Preview for images/PDFs
- Status badge

### Phase 3 — Version Control
Link document versions with `supersedes_id` FK. Auto-set old doc to `superseded` on new upload.

---

## Reference Library Patterns

| Pattern | Source | Usage | License Risk |
|---------|--------|-------|-------------|
| File upload card with status | shadcn/ui | Direct | Low (MIT) |
| Document checklist per entity | ERPNext attachment model | Inspiration only | High (GPL) — business logic only, no code copy |
| Document approval workflow | refine | Pattern only | Low (MIT) |
| Background file processing | Inngest / Trigger.dev | Direct | Low (MIT/Apache) |
