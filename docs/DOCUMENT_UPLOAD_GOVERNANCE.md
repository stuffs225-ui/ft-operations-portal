# Document Upload Governance

**Status:** ⚠️ No real file upload is wired anywhere in the app today. The
database stores **file metadata only** — every `storage_path` is `null` (except
mock vehicle photos). This document defines the governance rules and the wiring
gap per module.

---

## Current reality (audit findings)

- `DocumentList.tsx` is pure mock UI — the "Upload" button has no handler.
- The only `<input type="file">` elements are in `QuotationNew.tsx` and
  `QuotationDetail.tsx`; both capture `file.name` only and **never upload bytes**
  (they insert a metadata row with `storage_path` unset).
- No call to `supabase.storage.*` exists in `src/`.
- All other modules (project docs, PO docs, BOQ/BOM, store receipts, vehicle
  photos, QC reports, NCR evidence, release notes, AFS reports, maintenance
  attachments) have backing tables but **no upload UI at all**.

## Governance rules (to enforce when wiring uploads)

| Rule | Enforcement |
|---|---|
| All buckets private; downloads via signed URL only | `058` (public=false) + client `createSignedUrl` |
| Upload allowed only for module-owning role + admin/ops | `058` object RLS + UI guard |
| Persist `storage_path` only after a successful upload | client helper (upload → update row) |
| Documents are versioned, not overwritten | bump `version`, write a new object key; never reuse a path |
| Delete restricted to admin/ops | object RLS + metadata-table policy |
| Medical/QC evidence immutable once linked to a release note | `release_notes.document_id` FK + no UPDATE policy on `qc_inspection_documents` |
| File type + size validated client-side AND via bucket limits | UI check + Dashboard bucket settings |

## Per-module wiring checklist (remaining work)

| Module | Bucket | Metadata table | Upload UI today |
|---|---|---|---|
| Project documents | `project-documents` | `project_documents` | ❌ none (DocumentList is mock) |
| Quotation PDF/docs | `quotation-documents` | `quotation_documents` | ⚠️ filename-only, no bytes |
| PO to Supplier doc | `project-documents` or new | `project_documents` | ❌ none |
| BOQ / BOM / drawings | `raw-material-files`/`qc-documents` | `factory_item_requirements`/`qc_inspection_documents` | ❌ none |
| Raw material Excel | `raw-material-files` | `production_raw_material_request_files` | ❌ none |
| Store receipt docs | `project-documents` | `project_documents` | ❌ none |
| Vehicle photos | `vehicle-photos` | `vehicle_receipt_photos` | ❌ none (mock paths only) |
| QC reports / NCR evidence | `qc-documents` | `qc_inspection_documents` | ❌ none |
| Release Note | `qc-documents` | `qc_inspection_documents` (via `release_notes.document_id`) | ❌ none |
| AFS arrival / condition | `afs-attachments` | `afs_maintenance_attachments` | ❌ none |
| Maintenance attachments | `afs-attachments` | `afs_maintenance_attachments` | ❌ none |

## Recommended build order (Phase 11)

1. Build a shared `useUpload(bucket)` hook + `<FileUpload>` component (upload →
   signed URL → persist `storage_path`).
2. Wire `DocumentList` to a real metadata table + the hook.
3. Replace the two quotation filename inputs with real uploads.
4. Add vehicle-photo capture (highest governance value — chassis/photo
   completeness already gates delivery).
5. Wire QC / release-note / AFS evidence last (lower volume).
