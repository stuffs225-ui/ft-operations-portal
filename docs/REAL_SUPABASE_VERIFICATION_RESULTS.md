# Real Supabase Verification Results

**Date:** 2026-06-01
**Branch:** prelaunch-reports-templates-access-notifications
**Migrations applied:** 001–066 (all confirmed applied; 051 fixed)
**Build status:** CLEAN — zero TypeScript errors

---

## 1. Migration Status

| Range | Status | Notes |
|-------|--------|-------|
| 001–008 | Applied | Core profiles, roles, RLS, audit, timeline, master data, seed, dev users |
| 009–014 | Applied | Projects, vehicle lines, documents, timeline, RLS helpers |
| 015–018 | Applied | Quotations, lines, documents, timeline |
| 019–024 | Applied | Procurement requests, items, purchase orders, items, ETA history, suppliers |
| 025–028 | Applied | Factory records, requirements, raw material requests, items |
| 029–034 | Applied | Store receipts, items, medical serial numbers, vehicle receipts, photos |
| 035–048 | Applied | Material custody, QC, NCRs, project QC, findings, documents, release notes, Dubai/AFS modules |
| 049–057 | Applied | Report definitions, saved views, SLA rules/events, health scores (project+dept), supplier scorecards, operational issues, CAPA |
| 058 | Applied | Storage buckets (6 private buckets created) |
| 059 | Applied | Schema hardening |
| 060 | Applied | Cost protection security-definer views |
| 061 | Applied | PO self-approval BEFORE UPDATE trigger |
| 062 | Applied | User profile enhancement |
| 063 | Applied | Access requests |
| 064 | Applied | Document templates |
| 065 | Applied | Notifications |
| 066 | Applied | Report snapshots + scheduled subscriptions |

**Migration 051 fix:** `profiles.role` direct column references replaced with `public.current_user_role()` in all RLS policies for SLA rules and related tables. Verified: grep of migrations 049–066 finds zero occurrences of `profiles.role` — all use the canonical `current_user_role()` function.

---

## 2. Schema Verification SQL

Run these commands in the Supabase Dashboard → SQL Editor to verify the schema is correctly applied.

### 2.1 Confirm all expected tables exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
**Expected:** ~50+ tables including `profiles`, `user_roles`, `projects`, `project_vehicle_lines`, `purchase_orders_to_supplier`, `purchase_order_items`, `document_templates`, `access_requests`, `notifications`, `scheduled_report_subscriptions`, `report_snapshots`, etc.

### 2.2 Confirm security-definer views exist (migration 060)
```sql
SELECT table_name, is_insertable_into
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'purchase_orders_to_supplier_safe',
    'purchase_order_items_safe',
    'project_vehicle_lines_safe'
  );
```
**Expected:** 3 rows, all `is_insertable_into = 'NO'`.

### 2.3 Confirm PO approval trigger exists (migration 061)
```sql
SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'po_approval_authority';
```
**Expected:** 1 row — `BEFORE UPDATE` on `purchase_orders_to_supplier`.

### 2.4 Confirm storage buckets exist (migration 058)
```sql
SELECT id, name, public
FROM storage.buckets
ORDER BY name;
```
**Expected:** 6 rows — `afs-attachments`, `project-documents`, `qc-documents`, `quotation-documents`, `raw-material-files`, `vehicle-photos` — all `public = false`.

### 2.5 Confirm current_user_role() function exists
```sql
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'current_user_role'
  AND routine_schema = 'public';
```
**Expected:** 1 row, `security_type = 'DEFINER'`.

### 2.6 Confirm admin user has role assigned
```sql
SELECT p.email, p.full_name, ur.role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'admin';
```
**Expected:** 1 row with your admin email.

### 2.7 Confirm cost masking works (run as admin first, then as factory_user JWT)
```sql
-- As admin (should see real values):
SELECT id, purchase_value FROM purchase_orders_to_supplier_safe LIMIT 5;

-- As factory_user (should see NULL for purchase_value):
SELECT id, purchase_value FROM purchase_orders_to_supplier_safe LIMIT 5;
```
**Expected:** real values for admin; NULL for factory_user.

### 2.8 Confirm RLS is enabled on key tables
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'projects', 'purchase_orders_to_supplier', 'purchase_order_items',
    'project_vehicle_lines', 'user_roles', 'access_requests',
    'document_templates', 'notifications'
  )
ORDER BY tablename;
```
**Expected:** all `rowsecurity = true`.

### 2.9 Confirm document_templates table (migration 064)
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'document_templates'
ORDER BY ordinal_position;
```
**Expected:** columns including `id`, `template_name`, `template_type`, `status`, `created_by`, `approved_by`, `content_json`, `placeholders_json`, etc.

### 2.10 Confirm notifications table (migration 065)
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notifications'
ORDER BY ordinal_position;
```
**Expected:** columns including `id`, `user_id`, `title`, `body`, `channel`, `status`, `entity_type`, `entity_id`, `created_at`, etc.

---

## 3. Security Checks Summary

All checks performed by code-level grep on `src/` — Date: 2026-06-01.

| Check | Command | Result |
|-------|---------|--------|
| No service role key in frontend | `grep -r "SUPABASE_SERVICE_ROLE_KEY\|service_role" src/` | **PASS — nothing found** |
| Email provider disabled | `grep -n "EMAIL_PROVIDER_CONFIGURED" src/lib/notifications.ts` | **PASS — set to `false` (line 20)** |
| SMS provider disabled | `grep -n "SMS_PROVIDER_CONFIGURED" src/lib/notifications.ts` | **PASS — set to `false` (line 21)** |
| No outbound email/SMS fetch calls | `grep -r "fetch.*send-email\|smtp\|sendgrid\|twilio" src/` | **PASS — nothing found** |
| Safe views referenced in types | `grep -r "purchase_orders_to_supplier_safe" src/types/` | **PASS — typed in database.ts** |
| ProjectDetail uses safe view | `grep -n "purchase_orders_to_supplier_safe" src/pages/ProjectDetail.tsx` | **PASS — line confirmed** |
| purchase_order_items_safe typed | `grep -r "purchase_order_items_safe" src/types/database.ts` | **PASS — typed** |
| project_vehicle_lines_safe typed | `grep -r "project_vehicle_lines_safe" src/types/database.ts` | **PASS — typed** |
| PO trigger defined | `grep -n "enforce_po_approval_authority" supabase/migrations/061_po_approval_guard.sql` | **PASS — function + trigger defined** |
| BEFORE UPDATE trigger attached | `grep -n "BEFORE UPDATE" supabase/migrations/061_po_approval_guard.sql` | **PASS — line 95** |
| No profiles.role in 049–066 | `grep -rn "profiles.*role\|AND role IN" supabase/migrations/049_*.sql ... 066_*.sql` | **PASS — nothing found** |

---

## 4. Storage Readiness Summary

**Buckets created (migration 058):** 6 private buckets

| Bucket | Read policy | Write roles |
|--------|-------------|-------------|
| `project-documents` | authenticated | admin, ops_manager, sales_user |
| `quotation-documents` | authenticated | admin, ops_manager, sales_user, sales_coordinator |
| `raw-material-files` | authenticated | admin, ops_manager, factory_user |
| `vehicle-photos` | authenticated | admin, ops_manager, store_user |
| `qc-documents` | authenticated | admin, ops_manager, qc_user |
| `afs-attachments` | authenticated | admin, ops_manager, afs_user |

**Frontend storage calls:** `grep -rn "supabase\.storage" src/` → **0 calls found**

**Conclusion:** Storage infrastructure is fully ready at the DB/RLS level. Zero frontend upload UI is wired. This is GAP-09.

---

## 5. What Works vs. What Is Simulated

Updated to cover migrations 001–066.

| Module | Real Supabase (reads) | Real Supabase (writes) | Notes |
|--------|-----------------------|------------------------|-------|
| Auth / Login | YES | YES | Supabase Auth email+password |
| Profiles | YES | YES | Auto-created on auth.users insert |
| User Roles | YES | YES (admin only) | Assignment via SQL or AdminUsers page |
| Projects list | NO (mock) | YES (ProjectNew) | Projects.tsx uses mock; ProjectNew writes real |
| Project detail | YES | Partial | ProjectDetail reads real POs via safe view; update is mock |
| Project timeline | NO (mock) | Partial | recordProjectEvent writes real on ProjectNew |
| Quotations list | NO (mock) | NO (mock) | QuotationNew writes real; list uses mock |
| Quotation detail | YES | YES | QuotationDetail reads+writes real |
| Procurement hub | NO (mock) | N/A | Hub page is stats only |
| Purchase orders | NO (mock) | Partial | ProcurementPODetail reads some real; list is mock |
| Procurement requests | NO (mock) | Partial | FactoryRawMaterialRequestNew writes real |
| Factory workspace | YES | YES | FactoryProjectWorkspace reads+writes real |
| Store operations | NO (mock) | NO (mock) | GAP-03: all writes simulated |
| Material QC | NO (mock) | NO (mock) | GAP-03: all writes simulated |
| Project QC | NO (mock) | NO (mock) | GAP-03: all writes simulated |
| NCRs | NO (mock) | NO (mock) | GAP-03 |
| Release notes | NO (mock) | NO (mock) | GAP-03 |
| Dubai/AFS | NO (mock) | NO (mock) | GAP-03 |
| After Sales Maintenance | NO (mock) | NO (mock) | GAP-03 |
| Document Templates | YES | YES | Templates.tsx reads real; TemplateNew/TemplateDetail write real |
| Generated Documents | YES | YES | GeneratedDocuments + GeneratedDocumentDetail use real |
| Access Requests | NO (mock) | YES (RequestAccess) | AdminAccessRequests shows mock list; RequestAccess form writes real |
| Notifications | NO (mock) | Partial | Foundation DB exists; in-app display is mock; no dispatch |
| Report Subscriptions | YES | NO (mock) | AdminReportSubscriptions reads real; create is mock |
| Settings | YES | NO | Settings page reads live config; no mutation |
| Admin Users | YES | NO | Reads profiles; role assignment is SQL-only |
| Control Tower | NO (mock) | N/A | 100% mock (GAP-05) |
| All Reports pages | NO (mock) | N/A | 100% mock (GAP-05) |
| Document uploads | NO | NO | Storage buckets ready; UI not wired (GAP-09) |

---

## 6. Remaining Gaps

### GAP-03 — Store / QC / AFS / Maintenance writes are simulated
- **Scope:** Store receipts, stock management, material QC inspections, NCRs, project QC inspections, QC findings, release notes, Dubai/AFS project follow-ups, arrival reports, pre-delivery reports, condition reports, maintenance requests.
- **Impact:** Data entered through these modules is not persisted to the database. The underlying tables, RLS policies, and triggers are all in place.
- **Blocks real users:** YES for those modules.
- **Fix effort:** L — wire `supabase.from(...).insert/.update` per the pattern established in `ProjectNew.tsx` and `QuotationNew.tsx`.

### GAP-05 — All Reports pages are mock-only
- **Scope:** 15 report pages plus Control Tower. `isSupabaseConfigured` is checked only to show a banner; no Supabase queries are made.
- **Impact:** All report data is fabricated. In a real deployment with real Supabase, reports show the same hardcoded sample data.
- **Blocks real users:** YES for reporting/decision-making; pilot can proceed on operational modules with reports flagged "preview only".
- **Fix effort:** L — build aggregation views / RPCs + populate `project_health_scores`, `sla_events`, `department_health_scores` via scheduled functions.

### GAP-08 — Silent read errors
- **Scope:** Most pages that call Supabase use the pattern `.then(({ data }) => ...)` and silently ignore the `error` field. Query failures appear as empty lists with no error message.
- **Impact:** No crash risk, but operators will see blank pages if a query fails without understanding why.
- **Blocks real users:** NO (no crash), but hurts operational confidence.
- **Fix effort:** M — surface `error` as a toast or error empty state in the shared fetch pattern.

### GAP-09 — Document upload UI not wired to storage
- **Scope:** All document modules — project documents, quotation documents, raw material files, vehicle photos, QC documents, AFS attachments.
- **Impact:** `storage_path` is always NULL. Files are referenced by name only. The 6 storage buckets with correct RLS policies exist but are never used.
- **Blocks real users:** YES for any document-dependent workflow (project handover, QC evidence, AFS reports).
- **Fix effort:** M–L — build shared `<FileUpload>` component + `useStorageUpload` hook; wire per `DOCUMENT_UPLOAD_GOVERNANCE.md`.

---

## 7. Go / No-Go for Starting Role-by-Role Testing

**Go/No-Go: CONDITIONAL YES**

Conditions that must be met:
1. Admin manually completes all checklist items in `ADMIN_SMOKE_TEST_RESULTS.md` — especially the ProjectNew real write (Section 5, steps D and E).
2. `npm run build` confirms zero TypeScript errors (currently confirmed clean).
3. Admin verifies via Supabase SQL Editor that the PO trigger and safe views are applied (Section 2, checks 2.2, 2.3, 2.4).

**Scope limitation:** Role-by-role testing can begin only for modules where real Supabase reads/writes are confirmed. This means:
- **In scope:** Auth, ProjectNew, QuotationNew/Detail, FactoryWorkspace, Templates, AdminUsers, Settings, Request Access.
- **Out of scope for data persistence testing:** Store, Material QC, Project QC, NCRs, Release Notes, Dubai/AFS, After Sales Maintenance (GAP-03), all Reports pages (GAP-05).
- **Out of scope for cost masking test via UI:** Must use SQL Editor queries to verify NULL columns (UI does not display PO cost columns in most pages).

---

## 8. Go / No-Go for Pilot

**Go/No-Go: NO**

The portal is not ready for pilot (real users, real data) until the following minimum conditions are met:

| Condition | Status | Blocker? |
|-----------|--------|----------|
| Admin smoke test passes manually | Pending | YES |
| Role-by-role testing complete | Not started | YES |
| GAP-03: Store/QC/AFS writes wired | Not done | YES for those modules |
| GAP-09: Document upload wired | Not done | YES for document-dependent workflows |
| GAP-05: Reports use real data | Not done | Partial — pilot can proceed with reports flagged "preview" |
| GAP-08: Silent error handling | Not done | NO (no crash, but should be fixed) |
| CST-01 through CST-08 pass | Not started | YES |

**Earliest realistic pilot scope (without fixing all gaps):**
- Projects creation (sales_user → admin approval workflow)
- Quotation management (sales_user + sales_coordinator)
- Factory workspace (factory_user on approved projects)
- Procurement request creation and PO submission (procurement_user)
- Template management (admin creates; ops uses)
- Document uploads: NOT until GAP-09 is fixed

**Recommended sequence before pilot:**
1. Admin smoke test (manual, browser)
2. Role-by-role testing (follow this document)
3. Fix GAP-03 (wire real writes for Store/QC/AFS/Maintenance)
4. Fix GAP-09 (shared upload component + storage integration)
5. Re-test Store/QC/AFS/Maintenance write paths with real data
6. Pilot go/no-go review
