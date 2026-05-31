# AFS Missing Items Design

## Lifecycle

```
open → requested (Store request raised) → received (item delivered to AFS)
    → waived (item not needed)
    → cancelled
```

## Severity

| Level | Example |
|---|---|
| critical | Safety-critical component missing |
| high | Primary functional component missing |
| medium | Secondary component missing |
| low | Documentation or cosmetic items |

## Integration

- Missing items are linked to an Arrival Report
- Critical/High missing items generate inbox tasks for AFS user
- Pre-Delivery Report shows open_missing_items count
- Delivery approval is blocked while any missing items are open
