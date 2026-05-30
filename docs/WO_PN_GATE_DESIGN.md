# WO / PN Gate Design

## Overview

The WO/PN Gate is the execution governance layer that sits between SO approval and factory/Dubai operations. No production activity may begin on a Saudi-routed project until a Work Order (WO) is entered; no Dubai follow-up activities may begin until a Project Number (PN) is entered.

## Database Table: `project_execution_references`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto-generated |
| `project_id` | uuid | FK → projects |
| `reference_type` | enum | `wo` or `pn` |
| `reference_number` | text | Globally unique per type (e.g. WO-2025-0041) |
| `manufacturing_location` | text | `saudi` (WO) or `dubai` (PN) |
| `status` | enum | `created` → `confirmed` → `superseded` / `cancelled` |
| `created_by` | uuid | FK → profiles |
| `confirmed_by` | uuid | FK → profiles |
| `confirmed_at` | timestamptz | Set when ops manager confirms |
| `remarks` | text | Optional notes |

### Constraints

- `exec_ref_location_type_match`: WO must be Saudi; PN must be Dubai (CHECK constraint)
- `exec_ref_number_type_unique`: reference_number + reference_type globally unique (UNIQUE constraint)
- `exec_ref_one_active_per_project`: partial unique index on (project_id, reference_type) WHERE status IN ('created','confirmed') — ensures at most one active reference per type per project

### Status Lifecycle

```
created → confirmed
       ↘ cancelled
confirmed → superseded (when a new reference supersedes it)
         ↘ cancelled
```

## SQL Blocking Functions

All four functions are `security definer stable` and callable from RLS policies:

| Function | Returns | Logic |
|---|---|---|
| `project_has_wo(uuid)` | bool | EXISTS active WO for project |
| `project_has_pn(uuid)` | bool | EXISTS active PN for project |
| `can_start_saudi_factory(uuid)` | bool | project approved + Saudi + has WO |
| `can_start_dubai_followup(uuid)` | bool | project approved + Dubai + has PN |

## RLS Access Matrix

| Role | WO | PN |
|---|---|---|
| admin | Full CRUD | Full CRUD |
| operations_manager | Full CRUD | Full CRUD |
| factory_user | INSERT + UPDATE own WO | No access |
| afs_user | No access | SELECT only |
| sales_user | SELECT own project refs | SELECT own project refs |
| procurement/store/qc/viewer | SELECT approved project refs | SELECT approved project refs |

## Client-Side Gate Helpers (`src/lib/executionGate.ts`)

### `getExecutionGateStatus(project, references): ExecutionGateStatus`

Pure function — no DB calls. Takes project + references array, returns:

```typescript
{
  isApproved: boolean;
  isSaudi: boolean;
  isDubai: boolean;
  requiresWO: boolean;      // isApproved && isSaudi
  requiresPN: boolean;      // isApproved && isDubai
  hasActiveWO: boolean;
  hasActivePN: boolean;
  woReference: ExecutionReference | null;
  pnReference: ExecutionReference | null;
  canStartSaudiFactory: boolean;  // isApproved && isSaudi && hasActiveWO
  canStartDubaiFollowUp: boolean; // isApproved && isDubai && hasActivePN
}
```

### `fetchProjectReferences(projectId)`

Fetches active (non-cancelled/superseded) references for a single project. Falls back to mock data when Supabase is not configured.

### `fetchAllReferences()`

Fetches all active references with joined project/profile data for the gate dashboard.

### `fetchProjectsMissingReference(type)`

Returns approved projects that are missing their required WO (Saudi) or PN (Dubai).

## UI Components

### WoPnGate Page (`/wo-pn-gate`)

- **Summary strip**: 4 KPI counters (Saudi projects, Dubai projects, missing WO count, missing PN count)
- **Governance banner**: explains the gate rules and what is blocked
- **Missing WO section**: approved Saudi projects without a WO, with Add button (factory_user, admin, ops)
- **Missing PN section**: approved Dubai projects without a PN, with Add button (admin, ops only)
- **Existing references section**: all active references with edit/confirm capability
- **Filters**: route (all/Saudi/Dubai), gate status (all/missing/created/confirmed)
- **Search**: by project code, SO number, customer, reference number

### WoPnGateCard (in ProjectDetail Overview tab)

- Shown only for approved Saudi or Dubai projects
- Displays current WO/PN status (locked/unlocked visual)
- Inline form for adding reference without navigating away
- Link to full WoPnGate dashboard for management

## Design Decisions

1. **Partial unique index vs constraint**: Allows cancelled/superseded history while enforcing one active reference per project per type.
2. **Pure `getExecutionGateStatus`**: Called both in the gate page and ProjectDetail without extra DB round-trips.
3. **Dev mode fallback**: All writes show simulated success; reads use `MOCK_EXECUTION_REFERENCES`.
4. **Dynamic import in `fetchAllReferences`**: Avoids circular dependency issues with mock data in dev mode.
