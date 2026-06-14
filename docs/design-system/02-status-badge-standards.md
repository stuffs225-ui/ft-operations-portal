# 02 — Status Badge Standards

**Step:** 5A — Design System Foundation  
**Date:** 2026-06-14

---

## Rule: One Source of Truth

All status → color mappings live in `src/components/status/status-config.ts`. Do NOT add per-page badge color logic. If a status is missing, add it to `STATUS_CONFIG` in that file.

---

## Status Map

### Projects / Sales Orders

| Status | Color | Label |
|--------|-------|-------|
| `draft` | Gray | Draft |
| `submitted_for_approval` | Amber | Pending Approval |
| `approved` | Green | Approved |
| `rejected` | Red | Rejected |
| `active` | Green | Active |
| `in_progress` | Blue | In Progress |
| `completed` | Emerald muted | Completed |
| `cancelled` | Gray muted | Cancelled |
| `sent_back_for_revision` | Orange | Sent Back |

### Release Notes

| Status | Color | Label |
|--------|-------|-------|
| `ready_to_issue` | Blue | Ready to Issue |
| `issued` | Green | Issued |
| `blocked` | Red | Blocked |

### Purchase Orders

| Status | Color | Label |
|--------|-------|-------|
| `pending` | Yellow | Pending |
| `pending_approval` | Amber | Pending Approval |
| `approved` | Green | Approved |
| `rejected` | Red | Rejected |

### Store / Inventory

| Status | Color | Label |
|--------|-------|-------|
| `accepted_by_qc` | Green | Accepted by QC |
| `rejected_by_qc` | Red | Rejected by QC |
| `installed` | Green | Installed |
| `in_custody` | Blue | In Custody |
| `returned` | Gray | Returned |
| `consumed` | Purple | Consumed |
| `lost_damaged` | Red | Lost / Damaged |

### Suppliers

| Status | Color | Label |
|--------|-------|-------|
| `active_approved` | Green | Active / Approved |
| `blacklisted` | Red | Blacklisted |
| `suspended` | Orange | Suspended |

### QC / NCR Findings

| Status | Color | Label |
|--------|-------|-------|
| `open` | Red | Open |
| `assigned` | Blue | Assigned |
| `rework_required` | Orange | Rework Required |
| `closed` | Gray | Closed |
| `released` | Green | Released |

### Quotations

| Status | Color | Label |
|--------|-------|-------|
| `submitted` | Blue | Submitted |
| `under_review` | Yellow | Under Review |
| `returned_to_sales` | Orange | Returned to Sales |
| `approved` | Green | Approved |
| `rejected` | Red | Rejected |
| `expired` | Red muted | Expired |

---

## Priority Levels

Used for NCR severity, CAPA urgency, and QC findings:

| Priority | Color | Label |
|----------|-------|-------|
| `critical` | Dark Red | Critical |
| `high` | Orange-Red | High |
| `medium` | Yellow | Medium |
| `low` | Gray | Low |

---

## Role Colors

| Role | Color |
|------|-------|
| `admin` | Purple |
| `operations_manager` | Blue |
| `sales_user` | Sky |
| `sales_coordinator` | Cyan |
| `procurement_user` | Amber |
| `factory_user` | Orange |
| `store_user` | Teal |
| `qc_user` | Indigo |
| `afs_user` | Rose |
| `viewer` | Gray |

---

## Adding a New Status

1. Open `src/components/status/status-config.ts`
2. Add an entry to `STATUS_CONFIG`:

```typescript
new_status_name: {
  variant: 'default',  // or 'secondary', 'destructive', 'outline'
  label: 'Human Readable Label',
  className: 'bg-blue-100 text-blue-700 border-blue-200',
},
```

3. Use `<StatusBadge status="new_status_name" />` anywhere — no other changes needed.

If a status is not in `STATUS_CONFIG`, `StatusBadge` falls back to an `outline` badge with the status string formatted as Title Case.
