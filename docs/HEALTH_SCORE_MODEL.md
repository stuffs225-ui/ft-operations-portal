# Health Score Model

Phase 10

## Project Health Score

### Formula
Score = weighted average of 7 dimension scores (0–100 each):
- Delay (20%): days overdue vs customer_delivery_date
- Data Quality (15%): DQ checks passing for this project
- Procurement (15%): PO coverage, ETA coverage, no delayed ETAs
- Factory (15%): BOQ/GA present, monthly update current
- Store (10%): vehicle photos/chassis complete, serial numbers present
- QC (15%): no open NCRs, no open findings, release note not blocked
- AFS (10%): PN confirmed, no open missing items, no critical maintenance

Blockers reduce score by 5 points each.
Open issues reduce score by 3 points each.

### Score Bands
| Band | Score Range |
|---|---|
| healthy | 80–100 |
| watch | 60–79 |
| at_risk | 40–59 |
| critical | 0–39 |

### Transparency
The "How this score is calculated" section is always visible on the health scores page.
No hidden weights or black-box calculations.

---

## Department Health Score

### Formula
Score = 100 - (overdue_tasks × 10) - (sla_breaches × 15) - (overdue_ratio × 20)

Where overdue_ratio = overdue_tasks_count / max(open_tasks_count, 1) × 100

### Departments Tracked
sales, sales_coordinator, procurement, factory, store, qc, afs, operations

### Score Bands: Same as project health (healthy / watch / at_risk / critical)

---

## Supplier Scorecard

### Formula
Score = quality_score × 0.40 + delivery_score × 0.35 + responsiveness_score × 0.25

Quality deductions: −10 per NCR
Delivery deductions: −5 per delayed PO

### Score Bands: Same as above

---

## Calculation Frequency
- Dev mode: pre-calculated mock values in MOCK_PROJECT_HEALTH_SCORES, MOCK_DEPARTMENT_HEALTH_SCORES, MOCK_SUPPLIER_SCORECARDS
- Real Supabase: calculate on demand (Phase 11+) via Supabase Edge Function or SQL view
- calculated_at timestamp displayed on health score pages to show data freshness
