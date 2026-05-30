# Quotation Status Model

## All Statuses

| Status | Actor | Description |
|---|---|---|
| `draft` | Sales | Created but not yet submitted |
| `submitted_by_sales` | Sales | Submitted to coordinator for processing |
| `received_by_coordinator` | Coordinator | Coordinator acknowledged receipt |
| `sent_to_estimation` | Coordinator | Forwarded to external Estimation Team by email |
| `waiting_for_estimation` | System | Waiting for Estimation Team response (same as sent, after SLA timer starts) |
| `need_clarification` | Coordinator | Coordinator needs more info from Sales |
| `quotation_received` | Coordinator | Estimation PDF received, values entered, ready to return |
| `returned_to_sales` | Coordinator | Quotation returned to Sales for review and decision |
| `converted_to_hot_project` | Sales | Quotation converted to Hot Project (future phase) |
| `converted_to_so` | Sales | Quotation converted to Sales Order (SO) |
| `cancelled` | Admin / Ops | Request cancelled |
| `closed_lost` | Admin / Ops | Opportunity lost — no SO created |

## Status Transitions

```
draft
  │
  ├─[Submit]──────────────────────────► submitted_by_sales
  │                                              │
  │                                    [Mark Received]
  │                                              │
  │                                    received_by_coordinator
  │                                              │
  │                              ┌───────────────┤
  │                              │               │
  │                    [Request Clarification]  [Send to Estimation]
  │                              │               │
  │                              ▼               ▼
  │                      need_clarification  waiting_for_estimation
  │                              │               │
  │                    [Sales Responds]   [Quotation Received]
  │                              │               │
  │                              └──────►  quotation_received
  │                                              │
  │                                     [Return to Sales]
  │                                              │
  │                                    returned_to_sales
  │                                              │
  │                              ┌───────────────┤
  │                              │               │
  │                    [Convert to SO]  [Convert to Hot Project]
  │                              │               │
  │                              ▼               ▼
  │                        converted_to_so  converted_to_hot_project
  │
  └─[Any state]────────────────────────► cancelled / closed_lost
```

## Editable States

Sales User can edit (own requests):
- `draft`
- `need_clarification`

Coordinator can update:
- All non-terminal states

## Terminal States (no further actions)

- `converted_to_so`
- `converted_to_hot_project`
- `cancelled`
- `closed_lost`

## Badge Colors

| Status | UI Variant |
|---|---|
| draft | neutral (gray) |
| submitted_by_sales | info (sky) |
| received_by_coordinator | info (sky) |
| sent_to_estimation | info (sky) |
| waiting_for_estimation | warning (amber) |
| need_clarification | critical (red) |
| quotation_received | default (brand) |
| returned_to_sales | success (green) |
| converted_to_hot_project | success (green) |
| converted_to_so | success (green) |
| cancelled | neutral (gray) |
| closed_lost | neutral (gray) |
