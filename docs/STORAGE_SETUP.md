# Storage Setup — FT Operations Portal

**Current state:** the schema is storage-ready (every document table has a
`storage_path` column), but **no real upload wiring exists in the app yet** — see
`DOCUMENT_UPLOAD_GOVERNANCE.md`. Migration `058_storage_buckets.sql` creates the
buckets and object-level RLS so the storage layer is ready when upload UI is wired.

---

## Buckets (created by `058_storage_buckets.sql`)

All buckets are **private**. Downloads must use `createSignedUrl()`; there are no
public URLs.

| Bucket | Backs table(s) | Write roles | Suggested object path |
|---|---|---|---|
| `project-documents` | `project_documents` | admin, ops, sales_user | `projects/{project_id}/{doc_id}.{ext}` |
| `quotation-documents` | `quotation_documents` | admin, ops, sales_user, sales_coordinator | `quotations/{quotation_request_id}/{doc_id}.{ext}` |
| `raw-material-files` | `production_raw_material_request_files`/`_items` | admin, ops, factory_user | `rm-requests/{request_id}/{item_id}.xlsx` |
| `vehicle-photos` | `vehicle_receipt_photos` | admin, ops, store_user | `vehicle-receipts/{receipt_id}/{photo_type}.jpg` |
| `qc-documents` | `qc_inspection_documents` (also NCR evidence + release notes) | admin, ops, qc_user | `qc/{inspection_type}/{inspection_id}/{doc_id}.{ext}` |
| `afs-attachments` | `afs_maintenance_attachments` | admin, ops, afs_user | `afs-maintenance/{request_id}/{attachment_id}.{ext}` |

> The `vehicle-photos` path convention matches existing mock data in
> `src/data/mockStore.ts` (`vehicle-receipts/vrc-001/front.jpg`).

## Object RLS

`058` applies, per bucket, on `storage.objects`:
- **SELECT** — any authenticated user (objects are private; served only via
  short-lived signed URLs; cost sensitivity is governed at the metadata-table
  level, not the file).
- **INSERT/UPDATE/DELETE** — admin/ops + the module-owning role, via
  `public.current_user_role()`.

> If `058` errors under the CLI with a storage-schema ownership message, run it
> in the Supabase **SQL Editor** (executes as `postgres`).

## Recommended bucket limits (set in Dashboard → Storage → bucket settings)

| Setting | Value |
|---|---|
| Max file size | 50 MB (10 MB for photos) |
| Allowed MIME (documents) | `application/pdf`, `image/png`, `image/jpeg`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Allowed MIME (vehicle-photos) | `image/png`, `image/jpeg`, `image/webp` |
| Public | **off** for every bucket |

## Wiring uploads (next step — not yet implemented)

The minimal client helper to build:
```ts
// upload then persist the returned key into the metadata table's storage_path
const path = `projects/${projectId}/${docId}.${ext}`;
const { error } = await supabase.storage.from('project-documents').upload(path, file);
if (!error) await supabase.from('project_documents').update({ storage_path: path }).eq('id', docId);
// download:
const { data } = await supabase.storage.from('project-documents').createSignedUrl(path, 60);
```
See `DOCUMENT_UPLOAD_GOVERNANCE.md` for the per-module wiring checklist.
