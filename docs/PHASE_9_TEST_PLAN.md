# Phase 9 Test Plan — Dubai / AFS + After Sales Maintenance

## Routes

| Route | Expected Content |
|---|---|
| `/dubai-afs` | Dashboard with 8 KPI cards, follow-up list, governance rules |
| `/dubai-afs/projects` | Follow-up list with All/Active/Delayed/Arrived/Completed tabs |
| `/dubai-afs/projects/dpf-001` | Follow-up detail, ETA update form, ETA history |
| `/dubai-afs/projects/dpf-003` | PN warning banner (pn_reference_id is null) |
| `/dubai-afs/eta` | ETA tracking table sorted by ETA date |
| `/dubai-afs/arrival-reports` | Arrival report list with status tabs |
| `/dubai-afs/arrival-reports/aar-001` | Detail: condition notes, missing items, add item form |
| `/dubai-afs/missing-items` | Missing items list with status tabs |
| `/dubai-afs/predelivery-reports` | Pre-delivery list with Ready/Not Ready tabs |
| `/dubai-afs/predelivery-reports/apdr-001` | Detail: checklist, blocking items, approve button |
| `/dubai-afs/condition-reports` | Condition reports list |
| `/after-sales` | Dashboard with 6 KPI cards and recent requests |
| `/after-sales/maintenance` | Maintenance list with status tabs |
| `/after-sales/maintenance/amr-001` | Detail: inspection notes, parts, completion form |
| `/after-sales/maintenance/amr-002` | Critical priority, parts_waiting status |
| `/after-sales/maintenance/amr-003` | Completed state, resolution notes visible |
| `/after-sales/maintenance/new` | 4-step wizard |

## ProjectDetail Dubai/AFS Tab

| Scenario | Expected |
|---|---|
| `/projects/proj-006` → Dubai/AFS tab | Shows dpf-001, dpf-002 follow-ups; aar-001 arrival report |
| `/projects/proj-005` → Dubai/AFS tab | No follow-ups (Saudi route); shows informational message |
| `/projects/proj-006` → Dubai/AFS tab | Shows amr-002 maintenance request |

## Governance Verification

| Rule | Verification |
|---|---|
| PN required before Dubai tracking | dpf-003 shows warning banner (no pn_reference_id) |
| ETA change requires reason | ETA Update button disabled until reason filled |
| Open missing items block pre-delivery | apdr-001 shows "Not Ready", delivery approve button hidden |
| Resolution notes required to complete | MNT completion button disabled until resolution notes filled |
| AFS users cannot see purchase costs | No SAR cost columns in any AFS pages |
| Admin/Ops only approve delivery | Delivery approve button hidden for afs_user |

## Role Visibility

| Role | Dubai Follow-ups | Maintenance Requests | Delivery Approve |
|---|---|---|---|
| admin | ✅ Full | ✅ Full | ✅ |
| operations_manager | ✅ Full | ✅ Full | ✅ |
| afs_user | ✅ Read + Edit | ✅ Read + Edit | ❌ |
| sales_user | ✅ Own projects | ✅ Read only | ❌ |
| qc_user | ✅ Read | ✅ Read | ❌ |
| factory_user | ✅ Read | ❌ | ❌ |
| store_user | ✅ Read | ❌ | ❌ |
| viewer | ✅ Read | ❌ | ❌ |

## Dashboard KPIs

- 8 new AFS KPI cards visible: Active Follow-ups, Delayed ETAs, Open Missing Items, Not Ready, Open Maintenance, Parts Waiting, Completed, Condition Reports
- All KPIs link to correct routes
- Plane and FileSearch icons render correctly

## Action Inbox

| Task | Role | Route |
|---|---|---|
| Dubai ETA delayed — FT-2025-0006 | operations_manager | /dubai-afs/projects/dpf-002 |
| Missing item open — Emergency Lighting | afs_user | /dubai-afs/arrival-reports/aar-001 |
| Pre-delivery not ready — PDR-2025-0001 | afs_user | /dubai-afs/predelivery-reports/apdr-001 |
| Critical maintenance — Siren unit | afs_user | /after-sales/maintenance/amr-002 |
| Condition report open — CMD-VEH-002 | operations_manager | /dubai-afs/condition-reports |

## Build

- `npm run build` must pass with zero TypeScript errors
- No unused imports in any Phase 9 file
- No `any` types without suppression comment
