# SLA & Escalation Foundation Design

Phase 10

## SLA Rule Structure

Each rule defines:
- trigger_status: the status that starts the clock
- target_status: the status that stops the clock
- duration_hours: time allowed before SLA breach
- severity: low / medium / high / critical
- applies_to_roles: who is responsible
- escalation_roles: who gets notified on breach

## Implemented SLA Rules (12)

| Rule Key | Module | Duration | Severity |
|---|---|---|---|
| quotation_coordinator_processing | quotations | 48h | high |
| so_pending_approval | projects | 24h | high |
| saudi_project_missing_wo | wo_pn_gate | 24h | critical |
| dubai_project_missing_pn | wo_pn_gate | 24h | critical |
| pr_item_waiting_po | procurement | 72h | medium |
| po_missing_eta | procurement | 48h | medium |
| eta_delayed_past_due | procurement | 0h (immediate) | high |
| factory_monthly_update_missing | factory | 720h (30d) | medium |
| material_pending_qc | material_qc | 48h | medium |
| qc_finding_open | project_qc | 120h (5d) | high |
| release_note_blocked | project_qc | 72h | critical |
| afs_critical_maintenance | after_sales | 48h | critical |

## SLA Event Lifecycle

```
open → acknowledged → escalated → resolved
              ↓
           cancelled
```

- open: SLA triggered, within window
- acknowledged: owner has seen the event
- escalated: due_at passed without resolution
- resolved: target_status reached
- cancelled: entity cancelled or rule deactivated

## Escalation Levels

- Level 0: owner role notified
- Level 1: escalation_roles notified (due_at + 50% overdue)
- Level 2: admin notified (due_at + 100% overdue)

## SLA Helper Functions (src/lib/slaEngine.ts)

- `calculateDueDate(triggeredAt, durationHours)` → ISO string
- `getSlaStatus(event)` → 'overdue' | 'due_soon' | 'within_sla' | 'breached' | 'resolved'
- `isOverdue(event)` → boolean
- `getEscalationLevel(event)` → number
- `getSlaSeverityBadge(severity)` → Badge variant
- `formatDuration(hours)` → "2d 4h" string
- `getSlaDueLabel(event)` → "Due in 2h" / "3h overdue" string

All functions are pure — no DB calls, deterministic in dev mode.

## Future: Background Scheduler
Phase 11 or later: Supabase Edge Function or pg_cron job to:
1. Scan all workflow entities for SLA trigger conditions
2. Insert sla_events rows
3. Update escalation_level on overdue events
4. Send notifications to owner_role / escalation_roles
