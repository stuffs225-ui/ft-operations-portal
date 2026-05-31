# Dubai / AFS Workflow Design

## Overview

Dubai-route projects follow a separate fulfillment path from Saudi factory projects. Vehicles are manufactured by a Dubai partner, shipped to KSA, received by the AFS team, and prepared for delivery.

## Status Lifecycle

```
not_started → pending_dubai_po → dubai_po_sent → under_dubai_production
  → eta_confirmed → in_transit → arrived_ksa → handed_to_afs
  → ready_for_pre_delivery → completed
  (+ on_hold / cancelled as off-ramp)
```

## Governance Gate

- **PN is mandatory** before any Dubai tracking can begin.
- Without a confirmed PN reference, no ETA can be set and no Dubai PO can be tracked.
- PN entry is done via `/wo-pn-gate`.

## Key Entities

| Entity | Number Format | Description |
|---|---|---|
| DubaiProjectFollowup | — | Per-vehicle-line ETA and status tracking |
| DubaiEtaHistory | — | Every ETA change with mandatory reason |
| AfsArrivalReport | ARR-YYYY-NNNN | Vehicle arrival registration |
| AfsMissingItem | — | Missing items from arrival shipment |
| AfsPredeliveryReport | PDR-YYYY-NNNN | Pre-delivery readiness check |
| AfsConditionReport | CND-YYYY-NNNN | Post-arrival damage or condition issues |

## ETA Change Rule

Every ETA change must include a written reason. Changes are recorded in `dubai_eta_history` and visible in the follow-up detail view.
