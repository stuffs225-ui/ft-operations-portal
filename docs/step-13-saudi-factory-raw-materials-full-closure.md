# Step 13 — Saudi Factory / Raw Materials Full Closure

**Branch:** `feature/step-13-saudi-factory-raw-materials-full-closure`  
**Date:** 2026-06-18  
**Lint baseline before:** 80 problems (64 errors, 16 warnings)  
**Lint after:** 75 problems (59 errors, 16 warnings) — improved, no new issues

---

## Scope

Audit and full closure of the Saudi Factory / Raw Materials module:
1. Audit current state
2. Governance verification
3. Live Supabase reads/writes where schema supports
4. Raw materials ↔ Store/custody/inventory connections where schema supports
5. Factory audit trail
6. UI consistency
7. Documentation (this file)
8. Validation

---

## Files Modified

### `src/pages/Factory.tsx`
- **Supabase path:** `useEffect` wrapped in async IIFE; 5 parallel count queries via `Promise.all`:
  - `factory_records` → `in_production` count
  - `factory_item_requirements` → `pending` count
  - `factory_records` → `monthly_update_required = true` count
  - `production_raw_material_requests` → open (not fulfilled/rejected/cancelled) count
  - `projects` → approved Saudi count (for subtitle label)
- **Dev path:** unchanged — uses MOCK_FACTORY_RECORDS, MOCK_FACTORY_REQUIREMENTS, MOCK_RAW_MATERIAL_REQUESTS, MOCK_PROJECTS
- KPI labels changed: "Missing BOQ" + "Missing GA Drawing" (2 KPIs) → "Pending Requirements" (1 KPI) in Supabase mode, since `factory_item_requirements` aggregates all requirement types.

### `src/pages/FactoryProjects.tsx`
- **Supabase path:** Two parallel queries + client-side join:
  - `projects` filtered to `manufacturing_location = saudi`, `project_status = approved`
  - `factory_records` all records
  - Joined client-side: `records.filter((r) => r.project_id === p.id)`
- Used two separate queries (not PostgREST embedded join) because `factory_records.Relationships: []` in `database.ts` makes embedded join typing uncertain.

### `src/pages/FactoryRequirements.tsx`
- **Supabase path:** Live load from `factory_item_requirements` with embedded join to `factory_requirement_types`:
  ```
  .select('*, requirement_type:factory_requirement_types(*)')
  .order('created_at', { ascending: false })
  ```
- `setItems` / `setFiltered` populated from Supabase response.

### `src/pages/FactoryRawMaterialRequests.tsx`
- **Supabase path:** Live load from `production_raw_material_requests` with project join:
  ```
  .select('*, project:projects(project_code, so_number, customer_name)')
  .order('requested_at', { ascending: false })
  ```
- Profile join (`requested_by_profile`) skipped — FK constraint name ambiguity with profiles/users table; shows `—` for requestor name in Supabase mode.

### `src/pages/FactoryMonthlyUpdates.tsx`
- **Supabase load:** `factory_records` filtered to `monthly_update_required = true` with joins:
  ```
  .select('*, project:projects(...), vehicle_line:project_vehicle_lines(...)')
  .eq('monthly_update_required', true)
  .order('last_updated_at', { ascending: true })
  ```
- **Supabase write (`submitUpdate`):** Converted to `async function`; updates `factory_records` with typed `Update` object (no `as any` needed — all fields present in `database.ts` `factory_records.Update`):
  ```typescript
  { progress_percentage, remarks, monthly_update_required: false,
    last_updated_by: user?.id, last_updated_at: new Date().toISOString() }
  ```
- **Audit trail:** `recordFactoryEvent('factory_record', record.id, record.project_id, 'factory_progress_updated', ...)` called after successful update.
- **Error handling:** `saveError` state shown in expanded form row.
- Added `useAuth` import (for `user.id` in `last_updated_by`) and `recordFactoryEvent` import.

### `src/pages/FactoryRawMaterialRequestNew.tsx`
- **Live project picker:** Changed `saudiProjects` from synchronous `MOCK_PROJECTS.filter(...)` to `useState<Project[]>([])` + `useEffect` with async IIFE:
  - Supabase mode: queries `projects` live, filtered to Saudi + approved
  - Dev mode fallback: uses `MOCK_PROJECTS.filter(...)`
- **Removed hardcoded WO hint:** Deleted `projectId === 'proj-005'` block that showed `WO: WO-2025-0041`; WO validation now comes from the live `executionGate` / DB trigger.
- Step 3 Review uses `saudiProjects.find(...)` instead of `MOCK_PROJECTS.find(...)`.

---

## Governance Verification

### WO Gate (R-005)
- **DB level:** Migration 089 — `trg_factory_requires_active_wo` BEFORE INSERT trigger on `factory_records`. Blocks INSERT for Saudi projects without active WO.
- **App level:** `FactoryProjectWorkspace.tsx` — `canEdit = !!role && FACTORY_EDIT_ROLES.includes(role) && hasWO`. Shows `WoGateAlert` when `!hasWO`.
- **Status:** Fully implemented. No changes needed.

### RLS
- `factory_records`: Migration 083 — SELECT + INSERT + UPDATE for `factory_user`; no DELETE. `factory_user_update` WITH CHECK ensures role stays `factory_user`.
- `production_raw_material_requests`: Migration 027 — scoped policies present.
- **Status:** No changes needed; existing RLS is correct.

### Audit Trail
- `src/lib/factoryAudit.ts` — `recordFactoryEvent()` writes to `audit_log` table.
- Already used in `FactoryProjectWorkspace.tsx` (workspace actions) and `FactoryRawMaterialRequestNew.tsx` (new RMR submit).
- **Added:** `FactoryMonthlyUpdates.tsx` now calls `recordFactoryEvent` on each successful progress update.

---

## Deferred Items (Out of Scope)

| Item | Reason |
|---|---|
| Document upload for factory requirements | Requires Supabase Storage integration |
| BOQ/BOM Excel parser | Separate tooling, marked `pending_future_parser` |
| `requested_by_profile` join in RMR list | FK constraint name ambiguity; shows `—` |
| `custody_records_factory_update` WITH CHECK hardening | Deferred since Step 12A, tracked separately |
| Store/CustodyNew + StoreReceiptNew live project picker | Those forms have hardcoded mock options; out of Step 13 scope |

---

## Validation Results

| Check | Result |
|---|---|
| `npm run build` | ✅ 0 errors, built in ~5s |
| `npx tsc --noEmit` | ✅ 0 type errors |
| `npm run lint` | 75 problems (59 errors, 16 warnings) |
| Lint vs baseline (80 problems) | Improved by 5 — no new issues introduced |
| Routes unchanged | ✅ All factory routes untouched |
| Dubai/AFS pages untouched | ✅ |
| QC/Release Note pages untouched | ✅ |
| After Sales pages untouched | ✅ |
| Quotation/SO/WO gate logic untouched | ✅ |
| No schema/migration/RLS changes | ✅ |
| No invented schema fields | ✅ All column names verified in `database.ts` |
