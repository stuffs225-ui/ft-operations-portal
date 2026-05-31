# AFS Arrival and Pre-Delivery Design

## Arrival Report

AFS team creates an Arrival Report when vehicles arrive in KSA.

Fields:
- Arrival date, received quantity vs expected quantity
- Storage location assignment
- Condition on arrival notes
- Missing items list

## Missing Items

Items missing from the shipment are logged against the Arrival Report. Each missing item has:
- Severity: low / medium / high / critical
- Status: open → requested → received / waived / cancelled
- Link to Store request (if Store team needs to source the item)

**Open missing items block pre-delivery readiness.**

## Pre-Delivery Report

Before a vehicle is delivered to the customer, AFS creates a Pre-Delivery Report with:
- Readiness checklist (12 items typical)
- Open missing items count
- Open NCRs count
- Release Note issuance status
- Delivery approval (Admin or Ops Manager only)

### Blocking Conditions for Delivery Approval

1. Release Note must be issued
2. No open missing items
3. No open NCRs
