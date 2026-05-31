# After Sales Maintenance Design

## Purpose

Track post-delivery maintenance and repair issues raised by customers, sales team, or AFS.

## Status Lifecycle

```
open → assigned → under_inspection → parts_waiting / in_repair → completed → closed
(+ cancelled)
```

## Issue Types

- mechanical, electrical, body_damage, software, upholstery, other

## Priority

- low, medium, high, critical

## Governance

- **Resolution notes are required** to move a request to `completed`.
- Requests should be linked to the original project (SO) where possible.
- Link WO or PN reference if applicable.
- Raised by: sales_user, operations_manager, afs_user, admin.

## Number Format

`MNT-YYYY-NNNN` (auto-generated on creation)
