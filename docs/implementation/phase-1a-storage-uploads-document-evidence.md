# Phase 1A — Storage Uploads and Document Evidence Foundation

**Date:** 2026-06-21
**Branch:** `feature/phase-1a-storage-uploads-document-evidence`
**Depends on:** Step 18.8 (PR #123 — Final System Stabilization and Go-Live Readiness Audit)

---

## Executive Summary

Implements storage-backed file uploads for workflow evidence files across four modules.
Uses and extends the existing Supabase Storage infrastructure (private buckets, signed URLs).
No business logic, route guards, approval workflows, or role permission changes.

Five priority targets were assessed:

| Priority | Target | Result |
|----------|--------|--------|
| A | Procurement PO PDF | ✅ Wired — new `purchase_order_documents` table + DocumentPanel |
| B | QC Release Documents | ✅ Wired — existing `qc_inspection_documents` table + DocumentPanel |
| C | AFS Arrival Photos | ✅ Wired — new `afs_arrival_documents` table + DocumentPanel |
| D | AFS Missing Item Evidence | ✅ Migration only — table created, UI deferred (no detail page) |
| E | Quotation PDF | ✅ Pre-existing — already wired in QuotationDetail (no changes) |

---

## Files Changed

### Infrastructure / Shared

- `src/lib/storage.ts` — **new** — reusable constants and helpers:
  `ALLOWED_MIME_TYPES`, `MAX_UPLOAD_BYTES`, `sanitizeFileName()`, `validateUploadFile()`

- `src/components/documents/DocumentPanel.tsx` — **extended**:
  - `UploadSpec.table` widened from `'project_documents' | 'quotation_documents'` → `string`
  - `UploadSpec.foreignKey.field` widened from specific union → `string`
  - `UploadSpec.extraFields?: Record<string, unknown>` added — allows passing additional
    columns (e.g., `inspection_type`, `project_id`) without per-table customization
  - `extraFields` spread into insert payload
  - `supabase.from()` cast via `(supabase as any)` to support tables not yet in
    generated Supabase types (safe — insert payload still fully typed at the call sites)
  - `documents` prop narrowed to `ProjectDocument[]` (callers already cast)
  - `onUploaded` widened to `(doc: unknown) => void` (callers use `as` assertions)
  - Existing callers (ProjectDetail, QuotationDetail) unaffected

- `src/types/database.ts` — **updated**:
  - `qc_inspection_documents.Row/Insert` — added `file_size: number | null; mime_type: string | null`
  - Added `purchase_order_documents` table type (Row, Insert, Update, Relationships)
  - Added `afs_arrival_documents` table type
  - Added `afs_missing_item_attachments` table type

### Migrations

- `supabase/migrations/096_procurement_documents.sql` — **new**:
  - `procurement-documents` storage bucket (private, max 10 MB)
  - Storage RLS: `admin / operations_manager / procurement_user` can insert and select
  - `purchase_order_documents` table — FK to `purchase_orders_to_supplier(id)`
  - Table RLS: same three roles

- `supabase/migrations/097_afs_document_tables.sql` — **new**:
  - `afs_arrival_documents` table — FK to `afs_arrival_reports(id)`
  - `afs_missing_item_attachments` table — FK to `afs_missing_items(id)`
  - Both use the existing `afs-attachments` bucket (from migration 058)
  - Table RLS: `admin / operations_manager / afs_user` for both

- `supabase/migrations/098_qc_documents_file_columns.sql` — **new**:
  - `ALTER TABLE qc_inspection_documents ADD COLUMN IF NOT EXISTS file_size bigint`
  - `ALTER TABLE qc_inspection_documents ADD COLUMN IF NOT EXISTS mime_type text`
  - Required so DocumentPanel's insert payload (which always includes these fields) does not fail

### Pages

- `src/pages/ProcurementPODetail.tsx` — **Priority A**:
  - Added `documents` tab key and tab entry (icon: FileText)
  - Added `poDocuments: ProjectDocument[]` state
  - Fetches `purchase_order_documents` in parallel with items + ETA history
  - Documents tab renders DocumentPanel with `canUpload` for `admin/ops/procurement_user`
  - Document types: PO PDF, Supplier Quote, Delivery Note, Invoice, Other

- `src/pages/ProjectQcReleaseNoteDetail.tsx` — **Priority B**:
  - Added `releaseDocs: ProjectDocument[]` state
  - Fetches `qc_inspection_documents` filtered by `inspection_id = releaseNote.id` AND
    `inspection_type = 'release_note'` — only release note documents
  - Replaced placeholder "Upload Release Note document — requires Supabase storage
    configuration." card with a standalone `Release Documents` Card using DocumentPanel
  - `extraFields: { inspection_type: 'release_note', project_id: releaseNote.project_id }` —
    satisfies `qc_inspection_documents.inspection_type NOT NULL` constraint
  - `canUpload = canIssue && isSupabaseConfigured` (admin / operations_manager / qc_user)
  - Document types: Release Note, Other
  - Panel is always visible (even after release note is issued) so documents remain accessible

- `src/pages/DubaiAfsArrivalReportDetail.tsx` — **Priority C**:
  - Added `{ profile }` to `useAuth()` destructure (for `uploadedBy`)
  - Added `arrivalDocs: ProjectDocument[]` state
  - Fetches `afs_arrival_documents` in parallel with report + missing items
  - Added `Arrival Photos / Documents` Card after the condition card
  - `extraFields: { project_id: report.project_id }` — denormalized for reporting
  - `canUpload = canManage && isSupabaseConfigured` (admin / operations_manager / afs_user)
  - Document types: Arrival Photo, Condition Report, Other
  - Bucket: `afs-attachments` (shared with maintenance attachments)

---

## Architecture

### Storage Layer (`src/lib/storage.ts`)

Lightweight helpers shared across upload components:

```ts
ALLOWED_MIME_TYPES  // PDF, Word, Excel, JPG, PNG
MAX_UPLOAD_BYTES    // 10 MB
sanitizeFileName()  // replaces non-safe chars with _
validateUploadFile() // returns error string or null
```

DocumentPanel already applies `MAX_FILE_SIZE = 10 * 1024 * 1024` and `safeName` internally.
`storage.ts` provides the same constants for use in future upload components.

### DocumentPanel Extension Pattern

`extraFields` allows module-specific columns without forking the component:

```ts
upload={{
  bucket: 'qc-documents',
  table: 'qc_inspection_documents',
  foreignKey: { field: 'inspection_id', value: releaseNoteId },
  extraFields: { inspection_type: 'release_note', project_id: releaseNote.project_id },
  uploadedBy: profile?.id ?? null,
  documentTypeOptions: [...]
}}
```

The insert payload becomes:
```ts
{
  inspection_id: releaseNoteId,
  document_type: selectedType,
  file_name: file.name,
  storage_path: uploadedPath,
  file_size: file.size,
  mime_type: file.type || null,
  uploaded_by: profile.id,
  remarks: remarks || null,
  inspection_type: 'release_note',   // from extraFields
  project_id: releaseNote.project_id, // from extraFields
}
```

### Document Path Convention

All uploads follow the existing path pattern from DocumentPanel:
```
{foreignKey.value}/{docType}/{Date.now()}_{safeName}
```

Examples:
- `{po_id}/po_pdf/1719000000000_PO_2024_001.pdf`
- `{release_note_id}/release_note/1719000000000_RN_001.pdf`
- `{arrival_report_id}/arrival_photo/1719000000000_photo_01.jpg`

`upsert: false` is enforced — files are never overwritten.

### Bucket Summary

| Bucket | Who uploads | New in this phase |
|--------|-------------|-------------------|
| `project-documents` | admin/ops/sales_user | No (existing) |
| `quotation-documents` | admin/ops/sales_user/coordinator | No (existing) |
| `procurement-documents` | admin/ops/procurement_user | **Yes** (migration 096) |
| `qc-documents` | admin/ops/qc_user | No (existing, new table columns) |
| `afs-attachments` | admin/ops/afs_user | No (existing, new DB tables) |

---

## Priority D — AFS Missing Item Evidence (Deferred UI)

`afs_missing_item_attachments` table is created (migration 097) and typed (database.ts).
UI wiring is deferred because `DubaiAfsMissingItems.tsx` is a list-only page with no
individual detail view. Per-item document upload in a list table would be poor UX.

When a missing item detail page is added, wire DocumentPanel with:
- `table: 'afs_missing_item_attachments'`
- `foreignKey: { field: 'missing_item_id', value: item.id }`
- `extraFields: { arrival_report_id: item.arrival_report_id, project_id: item.project_id }`
- `bucket: 'afs-attachments'`

---

## Security Review

| Item | Changed |
|------|---------|
| DB / RLS / migrations | Yes — 3 new migrations (additive only, new tables/columns/policies) |
| Existing RLS weakened | No |
| Route guards weakened | No |
| Business workflows | No |
| SO approval/routing logic | No |
| Quotation conversion logic | No |
| PO approval logic | No |
| WO / PN / Store / QC / Release gates | No |
| Admin-only features exposed to non-admin | No |
| Viewer can upload | No — all `canUpload` gates exclude viewer |
| Files stored as base64 in DB | No — `storage_path` text column; file in bucket |
| Supabase service role key exposed | No |
| Files made public | No — all buckets remain private; signed URLs only |
| Secrets in code | No |
| Filename sanitization | Yes — `safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')` |
| File overwrite possible | No — `upsert: false` in storage upload |
| Max file size enforced | Yes — 10 MB in component + bucket config |

---

## Validation Results

- `npm run build` ✅ PASS — 0 errors, 7.45s
- `npx tsc --noEmit` ✅ PASS — 0 errors
- `npm run lint` (global) ✅ 81 problems — **unchanged baseline**
- `npx eslint` (changed source files — DocumentPanel, storage.ts, pages) ✅ 0 new errors
  - `database.ts` — 18 pre-existing `@typescript-eslint/no-empty-object-type` errors (from
    `Views: {}` entries in existing table stubs; unchanged count; 0 added by this phase)
  - `DocumentPanel.tsx` — 1 pre-existing `react-refresh/only-export-components` warning
    (the `export { openSignedUrl }` re-export; was at line 174 before this phase)

---

## Closure Statement

Phase 1A delivers storage-backed file upload for the three highest-priority workflow evidence
targets (PO PDF, QC release documents, AFS arrival photos), using only private buckets and
signed URLs. The DocumentPanel component is now generic enough to support any module table
without forking. Migrations are additive and safe. No business logic or role permissions changed.
Priority D (AFS missing item evidence) has DB infrastructure in place and is ready to wire when
a detail page is added.
