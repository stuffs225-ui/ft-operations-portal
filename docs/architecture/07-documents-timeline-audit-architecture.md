# 07 — Documents, Timeline, and Audit Architecture

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no code changed

---

## Current Document / Upload Architecture

### Storage Buckets (6 purpose-specific, all private)

| Bucket | Write Roles | Module |
|--------|-------------|--------|
| `project-documents` | admin, ops, sales_user | Projects / SO |
| `quotation-documents` | admin, ops, sales_user, sales_coordinator | Quotations |
| `raw-material-files` | admin, ops, factory_user | Factory / Raw Materials |
| `vehicle-photos` | admin, ops, store_user | Vehicle Receiving |
| `qc-documents` | admin, ops, qc_user | QC Inspections / NCR |
| `afs-attachments` | admin, ops, afs_user | Dubai / AFS Maintenance |

**Gap:** No `template-files` or `generated-documents` bucket. The `document_templates` and `generated_documents` tables include `storage_path` columns but no bucket policy was created for them (noted in `docs/system-audit/04-database-supabase-audit.md`). B-036 addresses this gap.

---

### Document Metadata Tables

Each module has its own document table:

| Table | Parent | Key Columns |
|-------|--------|------------|
| `project_documents` | `projects` | `document_type`, `storage_path`, `version`, `status` |
| `quotation_documents` | `quotation_requests` | `document_type`, `storage_path`, `version` |
| `qc_inspection_documents` | `material_qc_inspections` | `document_type`, `storage_path` |
| `afs_maintenance_attachments` | `afs_maintenance_requests` | `document_type`, `storage_path` |

**Pattern observation:** Each module defined its own document table during early development. The schemas are similar but not identical, and there is no shared "document engine" across modules.

---

### Upload Component Architecture

**Current state:**
- `src/components/documents/DocumentPanel.tsx` — general upload panel (partial implementation)
- `src/components/features/DocumentList.tsx` — document list view (partial)
- `src/lib/documents.ts` — document helpers

**Problem:** Each page that needs document upload (`ProjectDetail.tsx`, `QuotationDetail.tsx`, `StoreVehicleReceivingNew.tsx`) re-implements upload logic. `DocumentPanel.tsx` exists but is not universally adopted. Vehicle photo uploads in `StoreVehicleReceivingNew.tsx` use a completely different approach.

**Duplication found:**
- Upload input elements
- File size validation
- Upload progress display
- File type restrictions
- Remove/replace logic

---

## Current Timeline Architecture

### DB Tables

| Table | Parent | Key Columns |
|-------|--------|------------|
| `project_timeline_events` | `projects` | `event_type`, `title`, `body`, `actor_id`, `actor_name`, `is_system` |
| `quotation_timeline_events` | `quotation_requests` | `event_type`, `title`, `actor_id` |

**Gap:** Only projects and quotations have dedicated timeline tables. Other modules (Store, Factory, QC, AFS) do not have module-specific timeline event tables. Their significant events are either not recorded at all, or written to the general `audit_log` table via the new migration 080.

---

### Timeline Utility Functions

`src/lib/projectAudit.ts`:
```typescript
recordProjectEvent(projectId, eventType, title, body, actorId, actorName, metadata)
  → writes to project_timeline_events

recordAuditEntry(action, entityId, description, beforeData, afterData, actorId, actorEmail, actorRole)
  → writes to audit_log
```

Similar files exist per module:
- `src/lib/quotationAudit.ts` — quotation events
- `src/lib/qcAudit.ts` — QC events
- `src/lib/storeAudit.ts` — store events
- `src/lib/factoryAudit.ts` — factory events
- `src/lib/procurementAudit.ts` — procurement events
- `src/lib/afsAudit.ts` — AFS events

**Problem:** 6 separate audit utility files with similar function signatures. They all write to `audit_log` with `entity_type` set to the module name. This fragmentation means:
1. A new developer must know which audit utility file to use for each module
2. Inconsistent function signatures across files
3. If the `audit_log` schema changes, 6+ files need updates

---

## Current Audit Architecture

### DB-Level Audit (Migration 080 — New)

`public.append_audit_log()` — AFTER trigger on `projects` and `release_notes`:
- Captures `row_to_json(OLD)::jsonb` and `row_to_json(NEW)::jsonb`
- Writes to `audit_log.before_data` and `audit_log.after_data`
- Runs for every INSERT and UPDATE — automatic, cannot be bypassed

**Strength:** Catches any write to these tables, even direct API calls or psql sessions.

**Limitation:** Only applied to `projects` and `release_notes` in migration 080. Purchase orders, store receipts, QC inspections, factory records, etc. are not covered by the DB-level audit trigger.

---

### Application-Level Audit (6 utility files)

The `*Audit.ts` utility files call `audit_log` INSERT via the Supabase client from application code. They:
1. Run only when called explicitly
2. Can be bypassed if a developer forgets to call them
3. Include `actor_email` (which the DB trigger does not, for latency reasons)
4. Are called inconsistently — some pages call them, others do not

**Dual-logging risk:** For `projects` and `release_notes`, both the DB trigger (migration 080) and `recordAuditEntry()` from `projectAudit.ts` may now fire on the same operation. This creates **two audit entries per operation** for these tables.

---

## Gaps Summary

| Gap | Risk | Phase |
|-----|------|-------|
| No `template-files` / `generated-documents` storage bucket | Medium | Phase 8 (B-036) |
| Document upload logic duplicated per page | Medium | Phase 5–8 (when implementing pages) |
| `DocumentPanel.tsx` not universally adopted | Medium | Phase 1 (Step 5 design system) |
| Only 2 tables have timeline event tables (`projects`, `quotations`) | Medium | Phase 2+ (extend per module) |
| 6 separate audit utility files with fragmented signatures | Low | Phase 2 (consolidate) |
| Dual-logging risk for `projects`/`release_notes` after migration 080 | Low-Medium | Phase 2 (remove duplicate calls) |
| DB audit trigger only on `projects` + `release_notes` — other tables uncovered | High | Phase 2–8 (extend per migration) |
| No document versioning (`supersedes_id` FK missing — B-034) | Medium | Phase 8 |

---

## Relationship to Migration 080

Migration 080 (`append_audit_log`) introduces the DB-level safety net. Its relationship to the application-layer audit utilities:

| Scenario | DB Trigger | App-Layer Utility | Result |
|----------|-----------|------------------|--------|
| Normal UI update on `projects` | ✅ Fires automatically | ✅ `recordAuditEntry()` called | Two audit entries (acceptable; DB entry has full row diff; app entry has actor_email) |
| Direct API call bypassing UI | ✅ Fires automatically | ❌ Not called | One audit entry (correct — DB catches the bypass) |
| UI update on `store_receipts` | ❌ No trigger applied | ✅ `storeAudit.ts` called (if developer remembered) | Zero to one entry (inconsistent) |

**Recommendation:** For Phase 2, remove redundant `recordAuditEntry()` calls for `projects` and `release_notes` from the application service layer. The DB trigger is the reliable layer. Keep the application-layer calls for the `actor_email` field (which the trigger omits for performance).

---

## Recommended Architecture Direction

### Document Engine (Phase 8)

A shared document engine should replace the per-module document components:

```
src/services/documents.service.ts
  uploadDocument(bucket, file, metadata): Promise<DocumentRecord>
  getDocumentUrl(bucket, storagePath): Promise<string>
  deleteDocument(id, bucket, storagePath): Promise<void>
  listDocuments(entityType, entityId): Promise<DocumentRecord[]>

src/components/ui/DocumentUploader.tsx    ← shadcn/ui FileInput + progress bar
src/components/ui/DocumentList.tsx        ← list + download + remove
src/components/ui/VehiclePhotoUploader.tsx ← specialized for vehicle photo requirement
```

This service would be used by ALL module pages that need document functionality, replacing per-module implementations.

### Timeline Service (Phase 2+)

```
src/services/timeline.service.ts
  recordEvent(entityType, entityId, eventType, title, body, actorId): Promise<void>
  getEvents(entityType, entityId): Promise<TimelineEvent[]>
```

This replaces the 6 separate `*Audit.ts` files with a single service that takes `entityType` as a parameter. The `entityType` determines which underlying table is written to (`project_timeline_events`, `audit_log`, etc.).

### Audit Service (Phase 2)

```
src/services/audit.service.ts
  recordAuditEntry(action, entityType, entityId, before, after, actorId, actorEmail, actorRole): Promise<void>
```

This consolidates the 6 `*Audit.ts` files. Internally it writes to `audit_log`. For `projects` and `release_notes`, the DB trigger already writes the row-level diff; the service call adds `actor_email`.

### Storage Bucket Expansion (Phase 8 — B-036)

Two new buckets needed:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('template-files', 'template-files', false),
  ('generated-documents', 'generated-documents', false);

CREATE POLICY template_files_write ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'template-files' AND 
              public.current_user_role() IN ('admin', 'operations_manager'));
```

### Document Versioning (Phase 8 — B-034)

Add `supersedes_id` FK to document tables:
```sql
ALTER TABLE project_documents
  ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES project_documents(id);
```

The UI should: show version history, display "superseded by" badge on old versions, allow download of any version.
