# FT Operations Portal — Development Rules

These rules apply to all developers working on this project. They derive from the Governance Playbook and architectural decisions.

---

## Naming Rules

- **Never use "BO"** in code, UI text, database columns, or comments. The correct term is "PO to Supplier".
- Use `snake_case` for database columns and TypeScript identifiers where mapping to DB.
- Use `PascalCase` for React components.
- Use `camelCase` for TypeScript variables and functions.
- Route paths use `kebab-case`: `/wo-pn-gate`, `/material-qc`.

---

## Governance Rules in Code

### WO/PN Gate — NEVER bypass
```typescript
// CORRECT: block factory actions without WO
if (!project.wo_number && project.route === 'saudi') {
  throw new Error('WO required before factory actions');
}

// CORRECT: block Dubai actions without PN
if (!project.pn_number && project.route === 'dubai') {
  throw new Error('PN required before Dubai tracking');
}
```

### PO Approval Gate
```typescript
// Any PO to Supplier above 10,000 SAR requires approval
const HIGH_VALUE_PO_THRESHOLD = 10_000; // SAR

if (po.value_sar > HIGH_VALUE_PO_THRESHOLD && !po.approved_by) {
  // Do not allow "Sent to Supplier" status
}
```

### Release Note Gate
```typescript
// Cannot issue Release Note if any QC finding is open/rework required
const canIssueReleaseNote = qcFindings.every(
  (f) => f.status === 'closed'
);
```

### Medical Serial Number Gate
```typescript
// Medical items must have serial number to proceed
if (item.is_medical && !item.serial_number) {
  // Block QC acceptance and installation
}
```

---

## Security Rules

1. **Never enforce access control only via UI button visibility.** Supabase RLS policies must also enforce the same rules at the database level.
2. Every sensitive action (approval, issuance, WO entry) must be recorded in the audit log.
3. Role checks must happen on both the component level and the API/database level.

---

## Data Quality Rules

| Rule | Enforcement Point |
|------|------------------|
| Quotation cannot be submitted without specification file | Form validation |
| Vehicle receipt is incomplete without chassis number + photos | DB constraint / form validation |
| Medical item serial number mandatory | DB constraint |
| WO required before Saudi factory actions | DB RLS + API |
| PN required before Dubai actions | DB RLS + API |
| PO > 10,000 SAR blocked without approval | API + DB trigger |
| Release Note blocked if QC open | API check |
| Temporary custody blocked without Admin/Ops approval | API + DB trigger |

---

## Code Structure Rules

1. **One page component per route.** Pages are thin — they delegate to feature components.
2. **UI primitives live in `src/components/ui/`** — Badge, Button, Card, EmptyState, PageHeader.
3. **Types live in `src/types/index.ts`** until a feature grows large enough for its own `types.ts`.
4. **No business logic in UI components.** Logic belongs in hooks or service files.
5. **Static/mock data lives in `src/data/`** during Phase 0. Move to API calls in Phase 1+.

---

## Commit Convention

```
feat(quotations): add coordinator PDF upload form
fix(wo-gate): block BOQ form when WO is missing
chore(deps): upgrade react-router-dom to 6.28
docs(roadmap): update Phase 3 deliverables
```

---

## What NOT to Do

- Do NOT generate reports from manually entered duplicate data. Reports must derive from real workflow records.
- Do NOT allow free-form text for terms that have a defined list (vehicle types, issue types, etc.). Use master data.
- Do NOT skip Timeline and Audit events for important actions.
- Do NOT build features that assume future requirements. Build only what the current phase requires.
- Do NOT use `any` TypeScript type. Use proper interfaces.
- Do NOT use `console.log` in production code.
