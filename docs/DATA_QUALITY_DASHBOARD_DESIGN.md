# Data Quality Dashboard Design

Phase 10

## Purpose
Surface missing or incomplete data across all operational modules so that
management can identify and fix gaps before they cause workflow failures.

## Check Inventory (23 checks)

### Projects (5 checks)
| Check | Severity | Owner | Fix Path |
|---|---|---|---|
| SO missing customer delivery date | high | sales_user | /projects |
| Approved Saudi project missing WO | critical | operations_manager | /wo-pn-gate |
| Approved Dubai project missing PN | critical | operations_manager | /wo-pn-gate |
| Project missing vehicle lines | high | sales_user | /projects |
| Project missing Customer PO / Contract | medium | sales_user | /projects |

### Procurement (4 checks)
| Check | Severity | Owner | Fix Path |
|---|---|---|---|
| PR item missing item code | medium | procurement_user | /procurement/requests |
| PO to Supplier missing ETA | high | procurement_user | /procurement/purchase-orders |
| PO above 10,000 SAR missing approval | critical | operations_manager | /procurement/purchase-orders |
| Supplier missing QC status | medium | procurement_user | /procurement/suppliers |

### Factory (3 checks)
| Check | Severity | Owner | Fix Path |
|---|---|---|---|
| Factory line missing BOQ | high | factory_user | /factory/requirements |
| Missing monthly update | medium | factory_user | /factory/monthly-updates |
| Production completed but not sent to QC | high | factory_user | /factory/projects |

### Store (4 checks)
| Check | Severity | Owner | Fix Path |
|---|---|---|---|
| Vehicle missing chassis number | critical | store_user | /store/vehicle-receiving |
| Vehicle missing required photos | critical | store_user | /store/vehicle-receiving |
| Medical item missing serial number | high | store_user | /store/receipts |
| Custody pending acceptance over 1 day | medium | store_user | /custody |

### QC (4 checks)
| Check | Severity | Owner | Fix Path |
|---|---|---|---|
| Rejected material without NCR | critical | qc_user | /material-qc/inspections |
| Open NCR overdue | high | qc_user | /material-qc/ncrs |
| Rework completed but not closed by QC | medium | qc_user | /project-qc/findings |
| Release Note blocked over 3 days | critical | qc_user | /project-qc/release-notes |

### AFS (3 checks)
| Check | Severity | Owner | Fix Path |
|---|---|---|---|
| Dubai follow-up missing ETA | high | afs_user | /dubai-afs/eta |
| Missing items open — blocking pre-delivery | high | afs_user | /dubai-afs/missing-items |
| AFS maintenance closed without resolution notes | medium | afs_user | /after-sales/maintenance |

## Display Logic
- count === 0: green "Passing" badge — no action needed
- count > 0: red/amber count badge — action required
- Row background: critical && count > 0 → bg-red-50; high && count > 0 → bg-amber-50
- Sort order: critical first, then high, then medium, then low; within same severity, count > 0 first

## Mock vs Real
- Dev mode: counts and example_ids from MOCK_DATA_QUALITY_CHECKS in mockReports.ts
- Real Supabase: counts derived from live DB queries per check (Phase 11+)
