# Step 12H — Temporary Custody User Picker Completion

**Date:** 2026-06-17
**Branch:** `feature/step-12h-temporary-custody-user-picker`
**Status:** COMPLETE — awaiting review
**Prerequisites:** PR #98 (Step 12 Full Closure — all Store live writes), fully merged

---

## Executive Summary

Step 12H eliminates the `issued_to_user_id = null` gap introduced in Step 12 Full Closure. A real receiver picker is added to `CustodyNew.tsx` for temporary custody records. The implementation uses a two-path design driven by the `profiles` RLS policy (migration 003):

- **admin / operations_manager** — can query all profiles; see a dropdown picker to choose any registered user as the receiver.
- **All other roles** (factory_user, afs_user, store_user) — can only read their own profile per RLS; self-assignment (`issued_to_user_id = user.id`) is used, which is semantically correct as they are requesting custody for themselves.

`assign_to_project` records are unchanged: `issued_to_user_id` remains `null` (no individual receiver required for project assignments; `custody_records_factory_update` RLS only applies to factory/afs UPDATE, not project-assigned records).

---

## A. Scope

### A.1 Files Modified

| File | Change |
|---|---|
| `src/pages/CustodyNew.tsx` | Two-path receiver picker; real `issued_to_user_id` on all temporary custody records |

### A.2 Files Created

| File | Purpose |
|---|---|
| `docs/implementation/step-12h-temporary-custody-user-picker.md` | This document |

### A.3 Not Changed

- DB schema, migrations, RLS policies
- Route paths or route guards
- `CustodyDetail.tsx` — already handles `issued_to_user_id` correctly (`isReceiver = record?.issued_to_user_id === user?.id || canApprove`)
- `StoreReceiptNew.tsx`, `StoreReceiptDetail.tsx` — Store Receipt modules unchanged
- Vehicle Receiving pages — unchanged
- Any non-Store module (Factory, Dubai/AFS, QC, Procurement, Sales, Dashboard, etc.)

---

## B. RLS Context

### B.1 Profiles RLS (migration 003)

```sql
-- profiles: own read
CREATE POLICY "profiles: own read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- profiles: manager read (admin + operations_manager can read all)
CREATE POLICY "profiles: manager read" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
            AND role IN ('admin','operations_manager'))
  );
```

**Consequence:** Any SELECT on `profiles` that attempts to read rows not belonging to the current user will return 0 rows unless the user is `admin` or `operations_manager`. A dropdown for non-manager roles would silently return an empty list.

### B.2 Custody Records Factory Update RLS (migration 034)

```sql
CREATE POLICY "custody_records_factory_update" ON material_custody_records
  FOR UPDATE
  USING (issued_to_user_id = auth.uid())
  WITH CHECK (issued_to_user_id = auth.uid());
```

When `issued_to_user_id = null`, `null = auth.uid()` evaluates to `NULL` (not TRUE), which blocks all UPDATE operations by the intended receiver. This broke receiver actions (Accept, Reject) for temporary custody records created in Step 12 Full Closure. Step 12H resolves this by ensuring `issued_to_user_id` is always set for temporary custody records.

---

## C. Implementation

### C.1 ReceiverProfile Interface

```typescript
interface ReceiverProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}
```

Minimal shape — only the four columns needed for the picker label and Supabase insert.

### C.2 Two-Path Design

```typescript
const canPickReceiver = role === 'admin' || role === 'operations_manager';
const [receiverUsers, setReceiverUsers] = useState<ReceiverProfile[]>([]);
const [receiverUserId, setReceiverUserId] = useState('');
```

**Profile load (admin/ops only):**

```typescript
useEffect(() => {
  if (!canPickReceiver || !isSupabaseConfigured || !supabase) return;
  (async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true, nullsFirst: false });
    setReceiverUsers((data as unknown as ReceiverProfile[]) ?? []);
  })();
}, [canPickReceiver]);
```

**handleIssue receiver resolution:**

```typescript
let issuedToUserId: string | null = null;
if (issueType === 'temporary_custody') {
  if (canPickReceiver) {
    if (!receiverUserId) {
      setSaveError('Please select a receiver for temporary custody.');
      return;
    }
    issuedToUserId = receiverUserId;
  } else {
    // Self-assignment: custody_records_factory_update RLS requires
    // issued_to_user_id = auth.uid() for the receiver's UPDATE operations.
    issuedToUserId = user.id;
  }
}
```

### C.3 UI Paths

| Role | temporary_custody UI | issued_to_user_id |
|---|---|---|
| admin / operations_manager | Dropdown picker (required) | Selected user's ID |
| factory_user / afs_user / store_user | Sky notice: "You are requesting custody for yourself" | user.id (self) |
| Any role — assign_to_project | No receiver field shown | null (unchanged) |

**Validation gates:**
- Step 2 "Next" button: blocked if `temporary_custody && canPickReceiver && !receiverUserId`
- Step 3 "Issue Custody" button: `disabled={saving || (issueType === 'temporary_custody' && canPickReceiver && !receiverUserId)}`
- `handleIssue` guard: `if (!receiverUserId) { setSaveError(...); return; }`

### C.4 Approval Flow (unchanged)

```typescript
const custodyStatus = issueType === 'temporary_custody' ? 'pending_approval' : 'issued';
const approvalStatus = approvalRequired ? 'pending_approval' : 'not_required';
```

Temporary custody records still enter `pending_approval` state and require admin/operations_manager approval via `CustodyDetail.tsx` before becoming `issued`.

---

## D. CustodyDetail Compatibility

`CustodyDetail.tsx` was NOT modified. Its existing `isReceiver` check already handles both cases correctly:

```typescript
const isReceiver = record?.issued_to_user_id === user?.id || canApprove;
```

- **Named receiver** (`issued_to_user_id` set to picker selection): `record.issued_to_user_id === user.id` → TRUE when the receiver views the record. Accept/Reject custody buttons shown.
- **Self-custody** (non-manager role): same condition holds — `user.id === user.id` → TRUE.
- **Admin override**: `canApprove = role === 'admin' || role === 'operations_manager'` → TRUE regardless.

The acceptance message already distinguishes named vs. override:

```typescript
{record.issued_to_user_id === user?.id
  ? 'Material has been issued to you. Please accept or reject.'
  : 'Confirm receipt on behalf of the recipient (admin override).'}
```

---

## E. Audit Trail

Unchanged. `recordStoreAudit('custody_issued', ...)` fires on all successful inserts. The receiver's identity is captured in `issued_to_user_id` on the `material_custody_records` row itself.

---

## F. Technical Debt Updated

| Item | Status |
|---|---|
| `issued_to_user_id` always null for temporary custody | **RESOLVED** in Step 12H |
| Live project picker in StoreReceiptNew / CustodyNew | Still deferred — hardcoded mock options remain |
| `custody_records_factory_update` WITH CHECK hardening | Still deferred — existing USING clause is sufficient for current use |

---

## G. Validation Results

```
Branch:              feature/step-12h-temporary-custody-user-picker
Base commit:         (post PR #98 merge)

npm ci:              ✅ (dependencies unchanged)
npm run build:       ✅ 0 errors, 0 warnings (5.59 s)
npx tsc --noEmit:    ✅ 0 errors
npm run lint:        ✅ 80 problems (64 errors, 16 warnings) — unchanged from Step 12 Full Closure baseline
```
