# Step 11C — Supplier Approval Audit Trail Completion

**Date:** 2026-06-16
**Branch:** `feature/step-11c-supplier-approval-audit-trail`
**Status:** COMPLETE — audit calls added, build passing
**Prerequisite:** Step 11B merged at `eb092a3` (migration `093_procurement_governance_hardening.sql` confirmed present)

---

## Executive Summary

Step 11B identified that `ProcurementSupplierDetail.tsx` updated supplier `procurement_status` and `qc_status` via Supabase without recording any event to the procurement audit log. This meant supplier approvals, suspensions, blacklistings, QC assessments, and conditional approvals were not traceable in `audit_log`.

This step adds two `recordProcurementEvent()` calls to `ProcurementSupplierDetail.tsx`:

1. `handleProcStatusSave()` — fires after a successful procurement status update
2. `handleQCStatusSave()` — fires after a successful QC status update

No new library, no schema change, no migration, no new dependency. One source file changed.

---

## A. Baseline Build Result

```
Branch: feature/step-11c-supplier-approval-audit-trail (off main @ eb092a3)
npm ci:           ✅ success
npm run build:    ✅ 7.00 s — 0 errors, 0 warnings
tsc --noEmit:     ✅ 0 errors
npm run lint:     ⚠️  80 problems (64 errors, 16 warnings) — all pre-existing
```

Migration `093_procurement_governance_hardening.sql` confirmed present at baseline.

Docs not found (non-blocking):
- `docs/governance/playbook-to-system-mapping.md` — not present
- `docs/governance/governance-rules.md` — not present
- `docs/reference-library/05-license-risk-notes.md` — not present (no new dependencies; irrelevant)

---

## B. Files Inspected

- `src/pages/ProcurementSupplierDetail.tsx` — target file
- `src/lib/procurementAudit.ts` — audit utility signatures and behaviour
- `src/pages/ProcurementPODetail.tsx` — reference for existing audit event call patterns and naming conventions

---

## C. Existing Audit Utility Pattern

**`src/lib/procurementAudit.ts`** — `recordProcurementEvent()` signature:

```typescript
export async function recordProcurementEvent(
  entityType: string,    // e.g. 'purchase_order', 'procurement_request'
  entityId: string,      // UUID of the entity
  projectId: string | null,
  eventType: string,     // e.g. 'status_updated', 'po_approved', 'po_rejected'
  title: string,         // human-readable description
  _body: string | null,  // not used — always null in existing call sites
  actorId: string | null,
  _actorName: string | null,
  metadata?: Record<string, unknown>,
): Promise<void>
```

**Behaviour:**
- In dev mode (`!isSupabaseConfigured`): `console.debug` only, no DB write, returns immediately
- In Supabase mode: inserts row to `audit_log` table
- No error handling on the insert — errors are silently dropped
- **All existing call sites use it fire-and-forget (no `await`)** — audit failure is non-blocking

**Existing event types in use:**
| Entity type | Event type | Used in |
|---|---|---|
| `'purchase_order'` | `'status_updated'` | `ProcurementPODetail.handleStatusSave()` |
| `'purchase_order'` | `'po_approved'` | `ProcurementPODetail.handleApprove()` |
| `'purchase_order'` | `'po_rejected'` | `ProcurementPODetail.handleReject()` |
| `'procurement_request'` | `'status_updated'` | `ProcurementRequestDetail.handleStatusSave()` |

**`profile` availability:** `useAuth()` returns `{ role, profile }` where `profile?.id` and `profile?.full_name` are the actor fields, consistent with all other procurement pages.

---

## D. Procurement Status Audit Event Implemented

**Added to `handleProcStatusSave()`** — fires after successful Supabase update, before state update:

```typescript
recordProcurementEvent(
  'supplier', supplier.id, null,
  'procurement_status_updated',
  `Supplier ${supplier.supplier_name} procurement status updated to ${newProcStatus}`,
  null, profile?.id ?? null, profile?.full_name ?? null,
  { old_status: supplier.procurement_status, new_status: newProcStatus, remarks: procRemarks || null },
);
```

**Context captured:**
- `entityType`: `'supplier'`
- `entityId`: `supplier.id` (UUID)
- `projectId`: `null` — suppliers are not project-scoped
- `eventType`: `'procurement_status_updated'` — distinct from QC status updates
- `title`: includes supplier name and new status for human readability
- `metadata.old_status`: previous procurement status before this change
- `metadata.new_status`: new procurement status
- `metadata.remarks`: procurement remarks if provided (null if empty)
- `actorId`: `profile?.id ?? null`

---

## E. QC Status Audit Event Implemented

**Added to `handleQCStatusSave()`** — fires after successful Supabase update, before state update:

```typescript
recordProcurementEvent(
  'supplier', supplier.id, null,
  'qc_status_updated',
  `Supplier ${supplier.supplier_name} QC status updated to ${newQCStatus}`,
  null, profile?.id ?? null, profile?.full_name ?? null,
  { old_status: supplier.qc_status, new_status: newQCStatus, quality_rating: newQualityRating || null, remarks: qcRemarks || null },
);
```

**Context captured:**
- `entityType`: `'supplier'`
- `entityId`: `supplier.id`
- `projectId`: `null`
- `eventType`: `'qc_status_updated'` — distinct from procurement status updates
- `title`: includes supplier name and new QC status
- `metadata.old_status`: previous QC status
- `metadata.new_status`: new QC status
- `metadata.quality_rating`: quality rating set at time of update (null if not set)
- `metadata.remarks`: QC remarks if provided
- `actorId`: `profile?.id ?? null`

---

## F. Other Changes in `ProcurementSupplierDetail.tsx`

- **Import added:** `import { recordProcurementEvent } from '../lib/procurementAudit';`
- **Removed:** `void profile;` suppression line — `profile` is now genuinely used in the audit event calls, so the suppression is no longer needed

---

## G. Error Handling Behaviour

**Chosen behaviour: non-blocking (consistent with existing pattern)**

All 4 existing `recordProcurementEvent()` call sites in the codebase use fire-and-forget (no `await`). The function signature is `async` but errors from the internal `supabase.from('audit_log').insert()` are not propagated — any failure is silently dropped.

This step follows the same pattern. Audit failure does not interrupt the supplier status save or display an error to the user.

**Rationale:** The DB-level governance guardrail (migration 093) already enforces access control independently of the application audit trail. The audit trail is an additional observability layer, not the primary enforcement mechanism. Blocking a legitimate status update because the audit log INSERT failed would be overly disruptive.

**Limitation documented:** If the `audit_log` INSERT fails (e.g., transient DB error), the supplier status change will succeed but no audit record will exist for that event. This is consistent with the existing behaviour for PO and PR audit events and is a known, accepted pattern in this codebase.

---

## H. Governance Impact

| Before Step 11C | After Step 11C |
|---|---|
| Supplier `procurement_status` changes: not in `audit_log` | ✅ Written to `audit_log` with actor, old/new status, remarks |
| Supplier `qc_status` changes: not in `audit_log` | ✅ Written to `audit_log` with actor, old/new status, rating, remarks |
| Supplier approval, suspension, blacklisting: not auditable | ✅ Auditable via `audit_log` events |
| QC approval, conditional approval, rejection: not auditable | ✅ Auditable via `audit_log` events |

DB-level governance guardrails from Step 11B remain unchanged and unaffected.

---

## I. Safety Review

| Check | Result |
|---|---|
| Status update logic changed | No — only added a non-blocking audit call after success |
| Supplier approval authority changed | No |
| Status transition rules changed | No |
| RLS/migrations changed | No |
| Route paths or guards changed | No |
| New dependencies added | No (`procurementAudit.ts` already existed) |
| Error handling: audit failure blocks status save | No — non-blocking, consistent with existing pattern |
| `tsc -b` (build gate) | ✅ 0 errors |

---

## J. Validation Results

```
npm ci:               ✅ success
npm run build:        ✅ 7.08 s — 0 errors, 0 warnings
npx tsc --noEmit:     ✅ 0 errors
npm run lint:         ⚠️  80 problems (64 errors, 16 warnings) — all pre-existing
                          No errors in ProcurementSupplierDetail.tsx or procurementAudit.ts
Vercel check:         Not available in this environment
```

The `ProcurementSupplierDetail.tsx` lint entry (`setState synchronously within a useEffect`) is a pre-existing issue whose line number shifted due to the import addition and void-suppression removal. Issue count is unchanged at 80.

---

## K. Remaining Procurement Governance Gaps

| Gap | Severity | Status |
|---|---|---|
| `ProcurementRequestDetail` + `ProcurementPODetail` legacy `ui/PageHeader` | COSMETIC | Open — deferred, not a governance issue |
| Medical/critical item approval — no QC sign-off workflow requirement | LOW-MEDIUM | Open — requires product decision |
| `audit_log` INSERT failures silently dropped | LOW | Accepted — consistent with existing pattern across all procurement pages |

---

## L. Recommended Step 11D Scope

Step 11D should address the two remaining cosmetic/consistency items that do not require migration or logic changes:

### L.1 Migrate `ProcurementRequestDetail` and `ProcurementPODetail` to `common/page-header`

These 2 procurement detail pages still use legacy `ui/PageHeader` (`action=` singular, `path=` breadcrumb prop). Rename `action=` → `actions=` and `path=` → `href=` at both call sites. Wrap in `<div className="space-y-6">` to replace the `mb-6` from the legacy component.

**Scope constraint:** Change only the two procurement detail pages. Do not touch other pages, routes, or RLS.

### L.2 (Lower priority) Strengthen audit trail to be blocking for governance-critical events

For supplier approval/suspension/blacklisting specifically (`procurement_status IN ('approved', 'approved_with_conditions', 'suspended', 'blacklisted')`), consider converting to an `await`-based call with user-visible error feedback if the audit INSERT fails. This would ensure no high-impact status transition goes unrecorded.

This is a design decision (blocking vs non-blocking audit) that should be explicitly confirmed before implementation.

**Step 11D should NOT change:** RLS, migrations, routes, route guards, or any non-procurement module.
