# Module 05 — Store / Warehouse

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/store` | Store Dashboard | admin, operations_manager, store_user |
| `/store/items` | Store Items | admin, operations_manager, store_user |
| `/store/items/new` | New Store Item | admin, operations_manager, store_user |
| `/store/movements` | Stock Movements | admin, operations_manager, store_user |

## Review Checklist

### Store Dashboard
- [ ] Inventory KPIs (total items, low-stock alerts)
- [ ] Recent movements
- [ ] Quick links to receive / issue items

### Store Items
- [ ] Item list with stock level indicator
- [ ] Low stock visual warning
- [ ] Search and category filter

### Stock Movements
- [ ] Movement log (goods in / goods out)
- [ ] Reference to source document (PO, project)
- [ ] Date and quantity columns

## Open Issues

_Fill in after reviewing screenshots._

## Notes

The store module tracks physical inventory. Stock movements link to procurement (POs) and factory (WOs). Low-stock alerting is important for operational continuity.
