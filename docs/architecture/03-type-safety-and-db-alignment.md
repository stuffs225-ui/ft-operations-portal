# 03 — Type Safety and Database Alignment

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no types changed

---

## Summary

The TypeScript build passes with zero errors (`npx tsc --noEmit` clean). However, the five migrations added in Step 4A and 4B (076–080) have introduced **schema changes that are not yet reflected in the TypeScript types**. These are additive gaps — the types are not wrong, but they are incomplete. A developer writing code against the current Supabase schema will silently lose the new fields.

---

## Migration-by-Migration Type Gap Analysis

### Migration 076 — Release Note Gate (`enforce_release_note_gate()`)

**DB change:** No new columns. A BEFORE trigger was added to the `release_notes` table.

**TypeScript impact:**
- The `ReleaseNote` interface in `src/types/index.ts:890` is correct and complete.
- `ReleaseStatus` enum at `index.ts:887` correctly includes `'draft' | 'blocked' | 'ready_to_issue' | 'issued' | 'cancelled'`.
- The trigger may now raise DB exceptions on `INSERT`/`UPDATE`. The application layer (pages that call `.from('release_notes').update(...)`) is not handling the DB trigger error in a user-friendly way.

**Required Type Update:** None for the type itself. Required behavior: add error-boundary handling to release note status transitions.

---

### Migration 077 — Medical Serial Gate (`enforce_medical_serial_gate()`)

**DB change:** No new columns. A BEFORE trigger on `store_receipt_items`.

**TypeScript impact:**
- `StoreReceiptItem` at `src/types/index.ts:622` includes `serial_required: boolean` — correct.
- `MedicalSerialNumber` at `src/types/index.ts:648` includes `store_receipt_item_id` — correct.
- The trigger can now raise DB exceptions when `serial_required = true` and no serial exists. Status transition code in `StoreReceiptDetail.tsx` is not handling this DB exception.

**Required Type Update:** None. Required behavior: catch and surface DB trigger errors as user-facing messages.

---

### Migration 078 — SO Approval Checks (`enforce_so_approval_fields()`)

**DB change:** No new columns. A BEFORE trigger on `projects`.

**TypeScript impact:**
- `Project` interface correctly has `manufacturing_location: ManufacturingLocation` and `medical_items: MedicalItems` — correct.
- `ManufacturingLocation = 'saudi' | 'dubai' | 'not_set'` — correct.
- `MedicalItems = 'yes' | 'no' | 'not_set'` — correct.
- The trigger raises on `project_status → 'approved'` when either is `'not_set'`.

**Required Type Update:** None. The enum types are correct. Required behavior: the admin approval page must handle the DB trigger exception with a clear user message.

---

### Migration 079 — Customer Master Data (CRITICAL GAP)

**DB change:**
1. New table `public.customers` with columns: `id`, `name`, `country`, `contact_name`, `contact_email`, `contact_phone`, `is_active`, `notes`, `created_by`, `created_at`, `updated_at`.
2. New column `customer_id uuid` added to `public.projects`.

**TypeScript gaps found:**

**Gap 1: `Project` type is missing `customer_id`**

Current `Project` interface (`src/types/index.ts:38`):
```typescript
export interface Project {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;     // free-text field — still valid
  sales_owner_id: string | null;
  // ... (no customer_id field)
}
```

Required update:
```typescript
export interface Project {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
  customer_id: string | null;    // ← ADD — nullable FK from migration 079
  sales_owner_id: string | null;
  // ...
  customer?: Pick<Customer, 'id' | 'name'> | null;  // ← ADD — optional join
}
```

**Gap 2: `Customer` interface does not exist**

Migration 079 created the `customers` table. No `Customer` TypeScript interface exists in `src/types/index.ts` or `src/types/database.ts`.

Required new interface:
```typescript
export interface Customer {
  id: string;
  name: string;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### Migration 080 — Unified Audit Trigger (MODERATE GAP)

**DB change:** New trigger `append_audit_log()` populates `audit_log.before_data` and `audit_log.after_data` as JSONB.

**TypeScript gap:**

The `AuditLog` interface needs inspection. Searching `src/types/index.ts` for `AuditLog` / `audit_log` reveals **no `AuditLog` interface exists in `src/types/index.ts`**.

The `AuditLog` page (`src/pages/AuditLog.tsx` at 338 lines) renders audit entries but the data is fetched and typed inline. The absence of a shared `AuditLog` type means:
- Any code that reads from `audit_log` uses implicit typing
- The new `before_data` and `after_data` JSONB columns from migration 080 are not in any TypeScript type

Required new interface:
```typescript
export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;              // 'CREATE' | 'UPDATE' | 'DELETE' | string
  entity_type: string;         // table name (e.g., 'projects', 'release_notes')
  entity_id: string;
  description: string;
  before_data: Record<string, unknown> | null;   // ← from migration 080
  after_data: Record<string, unknown> | null;    // ← from migration 080
  changes_json: Record<string, unknown> | null;  // legacy column (if exists)
  created_at: string;
}
```

---

## Additional Type Gaps (Pre-Existing)

These gaps existed before the Step 4 migrations and are documented here for completeness.

### Gap: `database.ts` is stale

`src/types/database.ts` (1,830 lines) is auto-generated from the Supabase schema. It was generated at some point before migrations 060–080. It does not reflect:
- Migration 079: `customers` table
- Migration 079: `projects.customer_id`
- Migration 080: trigger effects (no schema column change, but the audit_log description field usage)
- Migrations 076, 077, 078: trigger functions (these appear as DB objects, not schema columns)

**Recommended action:** Regenerate `database.ts` using `supabase gen types typescript` after applying all migrations to a development Supabase project. Do not manually edit `database.ts`.

### Gap: `MOCK_CURRENT_USER` in `src/lib/roles.ts`

`roles.ts:77` defines:
```typescript
export const MOCK_CURRENT_USER = {
  id: 'usr-001',
  name: 'Operations Admin',
  email: 'admin@ft-ops.com',
  role: 'admin' as UserRole,
  avatar: 'OA',
};
```

This constant is not referenced by any page, hook, or component in the codebase. It is dead code. The type `UserRole` is used by `AuthContext` and `ROLE_CONFIGS` — the constant is purely legacy.

**Safe to remove:** `grep -rn "MOCK_CURRENT_USER"` confirms it appears only in `roles.ts:77` itself — no other file imports it.

### Gap: `PERMISSION_KEYS` defined but not consumed

`src/types/index.ts:1353`:
```typescript
export const PERMISSION_KEYS = [
  'can_view_costs',
  'can_approve_po',
  'can_approve_templates',
  'can_manage_users',
  'can_export_reports',
  'can_issue_release_note',
  'can_approve_custody',
  'can_manage_sla',
  'can_manage_capa',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
```

No page, component, hook, or service file imports or uses `PermissionKey`. The type exists as future-proofing but is not wired to any access control check.

**Gap:** RBAC action-level permission checks should use `PermissionKey` values — see document 06.

### Gap: `any` usage in type casting

In `src/lib/executionGate.ts:88`:
```typescript
return (data as unknown as ExecutionReference[]) ?? [];
```

This double-cast (`as unknown as T`) is a TypeScript escape hatch used when the Supabase response type does not match the app type. It indicates that `database.ts` and `index.ts` are out of sync for the `project_execution_references` table shape.

**Required action:** After regenerating `database.ts`, update the cast to a proper type assertion or derive `ExecutionReference` from the database type.

---

## All Required Type Updates (Prioritized)

| Priority | Update | File | Migration Source | Risk |
|----------|--------|------|-----------------|------|
| 1 | Add `Customer` interface | `src/types/index.ts` | Migration 079 | None — new type |
| 2 | Add `customer_id: string \| null` to `Project` | `src/types/index.ts` | Migration 079 | Low — additive field |
| 3 | Add `customer?: Pick<Customer,...> \| null` join to `Project` | `src/types/index.ts` | Migration 079 | None — optional join |
| 4 | Add `AuditLogEntry` interface with `before_data`, `after_data` | `src/types/index.ts` | Migration 080 | None — new type |
| 5 | Remove `MOCK_CURRENT_USER` from `src/lib/roles.ts` | `src/lib/roles.ts` | — | Very low — unused |
| 6 | Regenerate `database.ts` from Supabase schema | `src/types/database.ts` | Migrations 079–080 | Low — auto-gen |
| 7 | Wire `PermissionKey` to access control checks | `src/types/index.ts` + new hook | — | Phase 1 |
| 8 | Replace `as unknown as T` casts with typed assertions | `src/lib/executionGate.ts` etc. | — | Low — correctness |

---

## Recommended Approach to Type Management

### Short Term (Phase 1)

1. **Manual additions for migration 079/080 gaps** — add `Customer`, `AuditLogEntry`, and `customer_id` to `Project` by hand. These are small, well-defined changes.
2. **Do not regenerate `database.ts` manually** — wait until a development Supabase instance has all 80 migrations applied, then run `supabase gen types typescript --local`.
3. **Split `index.ts` into domain files** — see document 01 for the re-export strategy.

### Medium Term (Phase 2)

4. **Enforce Supabase SDK type derivation** — instead of maintaining parallel interfaces (`Project` in `index.ts` and `Database['public']['Tables']['projects']['Row']` in `database.ts`), derive app types from the generated DB type:
   ```typescript
   import type { Database } from './database';
   type ProjectRow = Database['public']['Tables']['projects']['Row'];
   export interface Project extends ProjectRow {
     // app-layer join fields
     sales_owner?: { full_name: string | null; email: string } | null;
     customer?: Pick<Customer, 'id' | 'name'> | null;
   }
   ```

5. **Enforce `no-explicit-any` via ESLint** — once `eslint.config.js` is created (B-005), add `@typescript-eslint/no-explicit-any` rule to catch any new escape hatches.
