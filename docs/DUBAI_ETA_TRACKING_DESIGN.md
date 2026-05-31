# Dubai ETA Tracking Design

## Purpose

Track the estimated arrival date for each Dubai-route vehicle line and record all changes with reasons.

## ETA Status Values

| Status | Meaning |
|---|---|
| not_set | No ETA confirmed yet |
| on_track | Current ETA is expected to be met |
| delayed | ETA has slipped |
| changed | ETA was updated (reason on file) |
| arrived | Vehicle has arrived in KSA |

## ETA Change Workflow

1. Operations Manager or Admin opens the Dubai follow-up detail (`/dubai-afs/projects/:id`)
2. Enters new ETA date and mandatory reason text
3. System creates a `dubai_eta_history` record with old/new ETA and reason
4. Follow-up `eta_status` updates to `changed` or `delayed` as appropriate

## Dashboard Integration

Delayed ETAs surface as a warning KPI card on the Dashboard and as inbox tasks for Operations Manager.
