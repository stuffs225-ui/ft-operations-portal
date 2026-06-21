# Phase 1A.1 — Post-Merge Storage Uploads Verification and Stabilization

**Date:** 2026-06-21
**Branch:** `fix/phase-1a-1-storage-post-merge-verification`
**Based on:** `feature/phase-1a-storage-uploads-document-evidence` (commit `b994a87`)
**Latest main SHA:** `be133e2` (PR #123 — Step 18.8 Go-Live Readiness Audit)

---

## Preamble — Merge Status Clarification

The task premise states Phase 1A was already merged to main. This is **not accurate** at the
time of this verification: Phase 1A commit `b994a87` exists on the feature branch
`feature/phase-1a-storage-uploads-document-evidence` and has NOT been merged to main.

This verification branch was therefore created from the Phase 1A feature branch rather than
from main, so all Phase 1A code is available for review. This PR should be treated as the
final pre-merge verification step; Phase 1A should be merged (or this verification PR should
target main via a merge of the feature branch first).

---

## Part 1 — Confirmed Merged State (Phase 1A on Feature Branch)

All Phase 1A artifacts confirmed present on `feature/phase-1a-storage-uploads-document-evidence`:

| Artifact | Path | Status |
|----------|------|--------|
| Storage helper | `src/lib/storage.ts` | ✅ Present |
| DocumentPanel extension | `src/components/documents/DocumentPanel.tsx` | ✅ Present |
| Database types updated | `src/types/database.ts` | ✅ Present |
| Procurement migration | `supabase/migrations/096_procurement_documents.sql` | ✅ Present |
| AFS document migration | `supabase/migrations/097_afs_document_tables.sql` | ✅ Present |
| QC column migration | `supabase/migrations/098_qc_documents_file_columns.sql` | ✅ Present |
| Procurement upload tab | `src/pages/ProcurementPODetail.tsx` | ✅ Present |
| QC release document panel | `src/pages/ProjectQcReleaseNoteDetail.tsx` | ✅ Present |
| AFS arrival photo panel | `src/pages/DubaiAfsArrivalReportDetail.tsx` | ✅ Present |
| Missing item evidence table | Migration 097 — `afs_missing_item_attachments` | ✅ Table only — UI deferred |
| Quotation PDF flow | `src/pages/QuotationDetail.tsx` | ✅ Unchanged |
| Phase 1A doc | `docs/implementation/phase-1a-storage-uploads-document-evidence.md` | ✅ Present |

---

## Part 2 — Migration Safety Review

### Migration Order Verification

| File | Number | Predecessor | Status |
|------|--------|-------------|--------|
| 096_procurement_documents.sql | 096 | 095 | ✅ Sequential |
| 097_afs_document_tables.sql | 097 | 096 | ✅ Sequential |
| 098_qc_documents_file_columns.sql | 098 | 097 | ✅ Sequential |

No number conflicts. No gaps in sequence.

### Migration 096 — `procurement_documents`

**Reviewed:**
- `INSERT INTO storage.buckets ... ON CONFLICT (id) DO NOTHING` — idempotent ✅
- Bucket: `procurement-documents`, `public = false`, `file_size_limit = 10485760` (10 MB) ✅
- Bucket MIME types match `ALLOWED_MIME_TYPES` in `src/lib/storage.ts` ✅
- `CREATE TABLE IF NOT EXISTS purchase_order_documents` — idempotent ✅
- FK: `purchase_order_id REFERENCES purchase_orders_to_supplier(id) ON DELETE CASCADE` —
  `purchase_orders_to_supplier` exists (migration 021) ✅
- FK: `uploaded_by REFERENCES profiles(id)` — nullable ✅
- All required NOT NULL columns have DEFAULT values (`document_type` → 'other',
  `uploaded_at` → now(), `status` → 'uploaded', `version` → '1') ✅
- Table RLS policies: `po_docs_select` and `po_docs_insert` using `current_user_role()` ✅
- Index on `purchase_order_id` ✅

**Issue found and FIXED in this PR:**
Storage object policies (`CREATE POLICY "procurement_docs_objects_select"` and
`"procurement_docs_objects_insert"`) lacked the `DROP POLICY IF EXISTS` pattern used by
migration 058. This made them non-idempotent. Fixed by prepending `DROP POLICY IF EXISTS`
before each `CREATE POLICY` on `storage.objects`, matching the 058 convention.

**SELECT restriction note:** The `procurement-documents` storage SELECT policy restricts reads
to `admin/operations_manager/procurement_user` only — more restrictive than 058's
open-authenticated-read pattern. This is intentional: PO documents are cost-sensitive and
should not be readable by sales, factory, store, or viewer roles even if they know a path.
This is confirmed safe and appropriately strict.

### Migration 097 — `afs_document_tables`

**Reviewed:**
- Two new tables: `afs_arrival_documents` and `afs_missing_item_attachments`
- Uses existing `afs-attachments` bucket (created in 058) — no new bucket needed ✅
- FK: `arrival_report_id REFERENCES afs_arrival_reports(id) ON DELETE CASCADE` —
  `afs_arrival_reports` exists (migration 043) ✅
- FK: `missing_item_id REFERENCES afs_missing_items(id) ON DELETE CASCADE` —
  `afs_missing_items` exists (migration 044) ✅
- All FK references verified against earlier migrations ✅
- `CREATE TABLE IF NOT EXISTS` — idempotent ✅
- Table-level `CREATE POLICY` without DROP — consistent with all other table migrations ✅
- RLS: `admin/operations_manager/afs_user` for both tables ✅
- Indexes on FKs ✅
- No destructive statements ✅

**Observation — afs-attachments open SELECT (not a Phase 1A defect):**
Migration 058's `obj_afs_attach_read` policy allows ANY authenticated user to read objects
from the `afs-attachments` bucket. AFS arrival documents stored in this bucket could therefore
have signed URLs generated by any authenticated user (if they know the path). This is an
existing migration 058 design decision, not introduced by Phase 1A. Documented for awareness;
out of scope for this stabilization.

### Migration 098 — `qc_documents_file_columns`

**Reviewed:**
- `ALTER TABLE qc_inspection_documents ADD COLUMN IF NOT EXISTS file_size bigint` — safe ✅
- `ALTER TABLE qc_inspection_documents ADD COLUMN IF NOT EXISTS mime_type text` — safe ✅
- No NOT NULL constraint added — no data required for existing rows ✅
- No DEFAULT value needed — nullable columns ✅
- `IF NOT EXISTS` on both `ADD COLUMN` statements — idempotent ✅
- Required because DocumentPanel always inserts `file_size` and `mime_type` into the payload;
  without these columns the live DB would reject the insert ✅

### Rollback Risk

| Migration | Rollback | Risk |
|-----------|----------|------|
| 096 | Drop `purchase_order_documents` table; remove `procurement-documents` bucket; remove 2 storage policies; remove 2 table policies | Low — new objects only |
| 097 | Drop `afs_arrival_documents` and `afs_missing_item_attachments` tables; remove 4 table policies | Low — new objects only |
| 098 | `ALTER TABLE qc_inspection_documents DROP COLUMN file_size, DROP COLUMN mime_type` | Very low — nullable columns, no data loss if null |

No migration alters or drops any existing table, column, index, or policy from earlier migrations.

### Supabase Apply Order

Apply in this exact sequence:
1. `096_procurement_documents.sql`
2. `097_afs_document_tables.sql`
3. `098_qc_documents_file_columns.sql`

Note: 097 references `afs_arrival_reports` (043) and `afs_missing_items` (044) which must
already be applied. 096 references `purchase_orders_to_supplier` (021) and `profiles` (001).
All dependencies were applied in Steps 1–95.

Note on storage policies: 096's storage.objects policies require the Supabase `postgres` role
to run (storage schema ownership). Apply via the Supabase SQL Editor if the migration CLI
lacks storage permissions, consistent with the guidance in migration 058.

---

## Part 3 — Storage Bucket and Policy Review

| Bucket | Created in | Phase 1A uses | Visibility | Who reads | Who writes |
|--------|-----------|---------------|------------|-----------|------------|
| `project-documents` | 058 | No (pre-existing) | Private | Any authenticated (058) | admin/ops/sales_user |
| `quotation-documents` | 058 | No (pre-existing) | Private | Any authenticated (058) | admin/ops/sales_user/coordinator |
| `qc-documents` | 058 | Yes (Priority B) | Private | Any authenticated (058) | admin/ops/qc_user |
| `afs-attachments` | 058 | Yes (Priority C) | Private | Any authenticated (058) | admin/ops/afs_user |
| `procurement-documents` | **096** | Yes (Priority A) | **Private** | admin/ops/procurement_user only | admin/ops/procurement_user |

**Verification checklist:**

| Check | Result |
|-------|--------|
| All buckets private | ✅ All `public = false` |
| Signed URLs used | ✅ `openSignedUrl()` via `createSignedUrl()` — no public URLs |
| Service role key in frontend | ✅ No — only anon key via `supabase` client |
| Secrets in code | ✅ No |
| File paths scoped by entity | ✅ Path: `{entityId}/{docType}/{timestamp}_{safeName}` |
| Filenames sanitized | ✅ `file.name.replace(/[^a-zA-Z0-9._-]/g, '_')` |
| Overwrite prevented | ✅ `upsert: false` in storage upload |
| File size validated | ✅ `MAX_FILE_SIZE = 10 MB` checked before upload; bucket enforces 10 MB limit |
| MIME type validated | ✅ Browser `accept` attribute; bucket `allowed_mime_types` enforces server-side |
| Viewer cannot upload | ✅ All `canUpload` role sets exclude viewer |
| Unauthorized roles blocked | ✅ Storage INSERT policies use `current_user_role()` |

---

## Part 4 — Frontend Wiring Review

### `src/lib/storage.ts`

- `ALLOWED_MIME_TYPES`: 7 MIME types — matches bucket configs ✅
- `MAX_UPLOAD_BYTES`: 10 MB — matches `MAX_FILE_SIZE` in DocumentPanel ✅
- `sanitizeFileName()`: matches DocumentPanel's inline `safeName` logic (equivalent, not DRY) ✅
- `validateUploadFile()`: defined but not wired into DocumentPanel — the bucket-level
  `allowed_mime_types` provides the server-side validation. The browser `accept` attribute
  provides the client-side hint. Non-blocking gap; no security risk.

### `src/components/documents/DocumentPanel.tsx`

- `UploadSpec.table: string` — backward compatible; existing callers pass string literals ✅
- `UploadSpec.foreignKey.field: string` — backward compatible; existing callers unaffected ✅
- `UploadSpec.extraFields?: Record<string, unknown>` — optional; existing callers don't set it ✅
- `(supabase as any).from(upload.table)` — necessary to support tables not yet in generated
  Supabase types; `eslint-disable` comment present ✅
- `documents: ProjectDocument[]` — existing callers already cast (QuotationDetail uses
  `as unknown as ProjectDocument[]`; ProjectDetail passes `ProjectDocument[]` directly) ✅
- `onUploaded?: (doc: unknown) => void` — existing callers use `as` assertions:
  - ProjectDetail: `doc as ProjectDocument` ✅
  - QuotationDetail: `doc as unknown as QuotationDocument` ✅
- `upsert: false` preserved ✅
- `isSupabaseConfigured` gate preserved ✅

**Observation — storage fail does not abort DB insert (pre-existing behavior):**
When the storage upload fails, `storagePath` is set to `null` and the component logs a console
error, but continues to insert the DB record with `storage_path = null`. This was the
pre-existing behavior before Phase 1A. The document list shows the record; download is
unavailable (no file in bucket). Not introduced by Phase 1A; documented here for awareness.

### `src/pages/ProcurementPODetail.tsx` (Priority A)

- Documents tab key: `'documents'` added to `TabKey` union ✅
- Documents tab in `TABS` array with `FileText` icon ✅
- `poDocuments: ProjectDocument[]` state ✅
- Fetch: `purchase_order_documents` in parallel with items and ETA in Supabase branch ✅
- Mock/dev branch: `poDocuments` stays `[]` — correct (upload UI hidden, empty list shown) ✅
- `canUpload={canUpdateStatus}` — admin/ops/procurement_user — viewer excluded ✅
- Insert payload: `purchase_order_id` (FK, NOT NULL) + `document_type` (has DEFAULT) +
  `file_name` (NOT NULL) + `uploaded_by` (nullable) — no constraint violations possible ✅
- `bucket="procurement-documents"` matches migration 096 ✅
- `table: 'purchase_order_documents'` matches migration 096 ✅

### `src/pages/ProjectQcReleaseNoteDetail.tsx` (Priority B)

- `releaseDocs: ProjectDocument[]` state ✅
- Fetch: `qc_inspection_documents` filtered by `inspection_id = id` AND
  `inspection_type = 'release_note'` — scoped to this release note only ✅
- Mock/dev branch: `releaseDocs` stays `[]` — correct ✅
- `canUpload={canIssue && isSupabaseConfigured}` — upload UI hidden in dev mode ✅
- `canIssue`: admin/ops/qc_user — viewer excluded ✅
- `extraFields: { inspection_type: 'release_note', project_id: releaseNote.project_id }` —
  satisfies `inspection_type NOT NULL` constraint in `qc_inspection_documents` ✅
- `inspection_type: 'release_note'` is a valid `qc_inspection_type_enum` value ✅
- `document_type` options: 'release_note' and 'other' are valid `qc_document_type_enum` values ✅
- `bucket="qc-documents"` matches migration 058 bucket ✅
- `table: 'qc_inspection_documents'` matches migration 039 / 098 ✅
- QC release gate (`fetchLiveBlockers` + re-verification in `handleIssue`) untouched ✅
- DocumentPanel is always visible regardless of `release_status` — documents remain accessible
  after issuing ✅

**Observation — `uploaded_by NOT NULL` in `qc_inspection_documents`:**
The `uploaded_by` column is `NOT NULL` in the table, but DocumentPanel passes
`upload.uploadedBy` which is `profile?.id ?? null`. If `profile` is `null`, the DB would
reject the insert. However, `canUpload = canIssue && isSupabaseConfigured` requires the user
to be authenticated with a valid role, so `profile` should always be non-null in this context.
Theoretical race condition risk is very low.

### `src/pages/DubaiAfsArrivalReportDetail.tsx` (Priority C)

- `{ role, profile }` from `useAuth()` — `profile` added for `uploadedBy` ✅
- `arrivalDocs: ProjectDocument[]` state ✅
- Fetch: `afs_arrival_documents` in parallel with report + missing items ✅
- Mock/dev branch: `arrivalDocs` stays `[]` — correct ✅
- `canUpload={canManage && isSupabaseConfigured}` — upload UI hidden in dev mode ✅
- `canManage`: admin/ops/afs_user — viewer excluded ✅
- `extraFields: { project_id: report.project_id }` — denormalizes project FK ✅
- `bucket="afs-attachments"` matches migration 058 bucket ✅
- `table: 'afs_arrival_documents'` matches migration 097 ✅
- `uploaded_by: profile?.id ?? null` — `uploaded_by` is nullable in 097 ✅
- AFS delivery readiness (`ready_for_delivery` on `afs_predelivery_reports`) — not referenced
  in this component at all ✅

### Quotation PDF (`QuotationDetail.tsx`)

- DocumentPanel wiring unchanged: `table: 'quotation_documents'`, `bucket: 'quotation-documents'` ✅
- Upload roles: admin/ops/sales_user/coordinator — unchanged ✅
- `onUploaded` cast unchanged ✅
- Quotation conversion logic untouched ✅

### `src/types/database.ts`

- `qc_inspection_documents` Row/Insert updated with `file_size: number | null` and
  `mime_type: string | null` — matches migration 098 ✅
- `purchase_order_documents` added with correct Row/Insert/Update/Relationships ✅
- `afs_arrival_documents` added — matches migration 097 column definitions ✅
- `afs_missing_item_attachments` added — matches migration 097 column definitions ✅
- Pre-existing `@typescript-eslint/no-empty-object-type` errors from `Views: {}` in
  existing stubs — unchanged baseline (0 new errors from this phase) ✅

---

## Part 5 — Permission and Role Safety

| Role | Procurement upload | QC release upload | AFS arrival upload | Viewer result |
|------|--------------------|-------------------|--------------------|---------------|
| admin | ✅ allowed | ✅ allowed | ✅ allowed | N/A |
| operations_manager | ✅ allowed | ✅ allowed | ✅ allowed | N/A |
| procurement_user | ✅ allowed | ❌ blocked | ❌ blocked | N/A |
| qc_user | ❌ blocked | ✅ allowed | ❌ blocked | N/A |
| afs_user | ❌ blocked | ❌ blocked | ✅ allowed | N/A |
| viewer | ❌ blocked | ❌ blocked | ❌ blocked | Read-only — no upload UI visible |
| sales_user | ❌ blocked | ❌ blocked | ❌ blocked | N/A |
| sales_coordinator | ❌ blocked | ❌ blocked | ❌ blocked | N/A |
| factory_user | ❌ blocked | ❌ blocked | ❌ blocked | N/A |
| store_user | ❌ blocked | ❌ blocked | ❌ blocked | N/A |

Cross-role uploads (e.g., procurement_user attempting QC upload) are blocked at TWO layers:
1. UI layer: `canUpload` prop is false — upload UI not rendered
2. RLS layer: storage INSERT policy and table INSERT policy reject unauthorized roles

---

## Part 6 — Business Gate Safety

| Gate | Component | Verification | Status |
|------|-----------|--------------|--------|
| PO approval (>10K SAR) | ProcurementPODetail | `handleApprove`/`handleReject` unchanged; Documents tab is independent; upload does NOT modify `po_status` or `approval_status` | ✅ Preserved |
| QC release gate | ProjectQcReleaseNoteDetail | `fetchLiveBlockers` re-verified synchronously inside `handleIssue` before any update; DocumentPanel upload does NOT update `release_status` | ✅ Preserved |
| AFS delivery readiness | DubaiAfsArrivalReportDetail | `ready_for_delivery` on `afs_predelivery_reports` not referenced; arrival document upload has no code path to delivery approval | ✅ Preserved |
| AFS missing item closure | `afs_missing_item_attachments` table | Table stores attachments only; no trigger, no status update, no auto-resolve | ✅ Preserved |
| Quotation conversion | QuotationDetail | Unchanged — same DocumentPanel call as before Phase 1A | ✅ Preserved |
| SO approval/routing | N/A | Phase 1A touched no routing logic | ✅ Preserved |
| WO gate | N/A | Phase 1A touched no factory/WO logic | ✅ Preserved |
| PN gate | N/A | Phase 1A touched no PN logic | ✅ Preserved |
| Store rules | N/A | Phase 1A touched no store logic | ✅ Preserved |

---

## Part 7 — Manual Smoke Test

**Status: Not executed locally — Supabase not configured in dev environment.**

Tests to execute in Supabase/Vercel environment:

**Priority A — Procurement PO PDF:**
- [ ] Open a PO detail page — page loads without error
- [ ] Verify "Documents" tab appears between "Approval" and "Timeline"
- [ ] Log in as `procurement_user` — upload UI visible, upload works, file stored in bucket
- [ ] Log in as `viewer` — PO detail inaccessible (route guard) or Documents tab upload UI hidden
- [ ] Upload a file >10 MB — client rejects before upload attempt
- [ ] Upload an `.exe` file — browser rejects via `accept` attribute; if bypassed, bucket rejects
- [ ] After upload — row appears in `purchase_order_documents` with `storage_path` set
- [ ] Click document — signed URL opens file in new tab

**Priority B — QC Release Documents:**
- [ ] Open a release note with `blocked` or `ready_to_issue` status
- [ ] Verify "Release Documents" card is visible regardless of release status
- [ ] Log in as `qc_user` — upload UI visible and functional
- [ ] Upload release note PDF — row in `qc_inspection_documents` with `inspection_type = 'release_note'`
- [ ] Uploading does NOT change `release_status` in `release_notes` table
- [ ] Verify `issued_at` and release blockers are unchanged after document upload
- [ ] Log in as `viewer` — QC page inaccessible or upload UI hidden

**Priority C — AFS Arrival Photos:**
- [ ] Open an arrival report detail
- [ ] Verify "Arrival Photos / Documents" card appears after the condition card
- [ ] Log in as `afs_user` — upload visible and functional
- [ ] Upload JPEG photo — row in `afs_arrival_documents` with `arrival_report_id` set
- [ ] Uploading does NOT update `arrival_status` or any delivery flag
- [ ] Upload invalid file type — blocked by bucket policy

**Priority D — AFS Missing Item Evidence:**
- [ ] Confirm `afs_missing_item_attachments` table exists in Supabase dashboard
- [ ] Confirm no upload UI exists in `DubaiAfsMissingItems.tsx` (list page)
- [ ] No spurious UI claiming missing item evidence is wired

**Priority E — Quotation PDF:**
- [ ] Open a quotation detail — existing document section unchanged
- [ ] Upload a PDF as `sales_user` — goes to `quotation_documents` table, `quotation-documents` bucket

---

## Part 8 — Fixes Applied in This Stabilization PR

### Fix 1 — Migration 096 Storage Policy Idempotency

**Problem:** `CREATE POLICY "procurement_docs_objects_select"` and
`"procurement_docs_objects_insert"` on `storage.objects` were not idempotent. Running the
migration a second time (e.g., dev DB reset) would fail with "policy already exists."
Migration 058 uses `DROP POLICY IF EXISTS` before each `CREATE POLICY` on `storage.objects`.

**Fix:** Added `DROP POLICY IF EXISTS "..."  ON storage.objects` before each
`CREATE POLICY` in migration 096. No functional change to the policy content.

**Status:** ✅ Applied directly to migration 096 — migration has not been applied to any live
database (Phase 1A not yet merged to main at time of this verification).

---

## Remaining Gaps (Non-Blocking)

| Gap | Severity | Resolution |
|-----|----------|------------|
| `storage.ts` helpers (`validateUploadFile`, `sanitizeFileName`) not used by DocumentPanel | Low | Server-side bucket validation covers MIME/size; browser `accept` covers client hint |
| Storage upload failure continues to DB insert (pre-existing) | Low | Logs error to console; document record created with null path; file download unavailable |
| `afs-attachments` SELECT open to all authenticated users (pre-existing 058) | Info | Existing policy decision; signed URLs still required; not a Phase 1A change |
| `qc_inspection_documents.uploaded_by NOT NULL` with null-safe `??` pattern | Very Low | Auth context ensures profile is non-null before upload UI is accessible |
| Phase 1A not yet merged to main | Blocker for production | Merge `feature/phase-1a-storage-uploads-document-evidence` to main, then this PR |

---

## Validation Results

- `npm run build` ✅ PASS — 0 errors, 5.90s
- `npx tsc --noEmit` ✅ PASS — 0 errors
- `npm run lint` (global) ✅ 81 problems — unchanged baseline
- Changed source files: migration 096 only (SQL file — no ESLint applicable)

---

## Production Test Checklist (Pre-Deploy)

1. Apply migrations 096, 097, 098 to Supabase via SQL Editor (postgres role required for storage)
2. Verify `procurement-documents` bucket visible in Supabase Storage dashboard, `public: false`
3. Verify `purchase_order_documents`, `afs_arrival_documents`, `afs_missing_item_attachments` tables in Supabase Table Editor
4. Verify `file_size` and `mime_type` columns added to `qc_inspection_documents`
5. Log in as `procurement_user` — test PO document upload end-to-end
6. Log in as `qc_user` — test release note document upload end-to-end
7. Log in as `afs_user` — test arrival photo upload end-to-end
8. Log in as `viewer` — confirm no upload UI visible on any page
9. Confirm signed URL download works for all three module uploads
10. Confirm Vercel/preview build passes with these changes
