# 01 — Component Catalog

**Step:** 5A — Design System Foundation  
**Date:** 2026-06-14

---

## Import Paths

All new components use the `@/` path alias (`@/` = `src/`).

```typescript
// shadcn/ui primitives (non-conflicting)
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// shadcn/ui primitives (in primitives/ to avoid casing collision with legacy)
import { Button } from '@/components/ui/primitives/button'
import { Badge } from '@/components/ui/primitives/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/primitives/card'

// FT Portal status components
import { StatusBadge } from '@/components/status/status-badge'
import { PriorityBadge } from '@/components/status/priority-badge'
import { RoleBadge } from '@/components/status/role-badge'

// FT Portal common components
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { MetricCard } from '@/components/common/metric-card'
import { DetailHeader } from '@/components/common/detail-header'
import { TimelineItem } from '@/components/common/timeline-item'
import { ChecklistItem } from '@/components/common/checklist-item'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

// Feedback
import { EmptyState } from '@/components/feedback/empty-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { ErrorState } from '@/components/feedback/error-state'

// Data display
import { DataTable } from '@/components/data-display/data-table'
import { FilterBar } from '@/components/data-display/filter-bar'

// Documents
import { DocumentCard } from '@/components/documents/document-card'
```

---

## Usage Examples

### StatusBadge

```tsx
// Renders a color-coded badge based on the status string
<StatusBadge status="approved" />        // Green "Approved"
<StatusBadge status="pending_approval" /> // Amber "Pending Approval"
<StatusBadge status="rejected" />         // Red "Rejected"
<StatusBadge status="active" />           // Green "Active"
```

### PageHeader

```tsx
<PageHeader
  title="Purchase Orders"
  subtitle="42 active orders"
  breadcrumb={[
    { label: 'Procurement', href: '/procurement' },
    { label: 'Purchase Orders' },
  ]}
  actions={
    <Button onClick={handleCreate}>New PO</Button>
  }
/>
```

### SectionCard

```tsx
<SectionCard
  title="Vehicle Lines"
  description="Items in this Sales Order"
  actions={<Button size="sm" variant="outline">Add Line</Button>}
>
  {/* table or list content */}
</SectionCard>
```

### DataTable

```tsx
const columns: ColumnDef<Project>[] = [
  { accessorKey: 'project_code', header: 'Project Code' },
  { accessorKey: 'customer_name', header: 'Customer' },
  {
    accessorKey: 'project_status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.project_status} />,
  },
]

<DataTable
  columns={columns}
  data={projects}
  searchColumn="project_code"
  searchPlaceholder="Search by project code..."
/>
```

### ConfirmDialog

```tsx
const [open, setOpen] = useState(false)

<Button variant="destructive" onClick={() => setOpen(true)}>
  Delete Record
</Button>

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete Record"
  description="This action cannot be undone. The record will be permanently deleted."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="destructive"
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

### EmptyState

```tsx
<EmptyState
  icon={<ClipboardList className="h-8 w-8" />}
  title="No Purchase Orders Yet"
  description="Procurement team can create purchase orders from this workspace."
  action={
    <Button onClick={handleCreate}>Create Purchase Order</Button>
  }
/>
```

### LoadingState

```tsx
// Default: table skeleton
<LoadingState rows={8} />

// Card grid skeleton
<LoadingState variant="cards" rows={6} />

// Detail page skeleton
<LoadingState variant="detail" />
```

### MetricCard

```tsx
<MetricCard
  title="Active Projects"
  value={42}
  subtitle="3 pending approval"
  icon={<Briefcase className="h-5 w-5" />}
  trend={{ value: 12, label: 'vs last month' }}
  href="/projects"
/>
```

### DetailHeader

```tsx
<DetailHeader
  title="FT-2025-0001"
  subtitle="Civil Defence — Riyadh Region"
  status="approved"
  meta={[
    { label: 'SO Number', value: 'SO-CRCD-2025-0143' },
    { label: 'Route', value: 'Saudi Factory' },
    { label: 'Delivery', value: formatDate('2025-09-30') },
  ]}
  actions={
    <>
      <Button variant="outline">Edit</Button>
      <Button>Approve</Button>
    </>
  }
/>
```

### TimelineItem

```tsx
<TimelineItem
  title="Project Approved"
  body="Manufacturing route set to Saudi Arabia."
  actorName="Ahmed Al-Rashid"
  timestamp={event.created_at}
  isSystem={false}
  icon={<CheckCircle className="h-4 w-4" />}
/>
```

### FilterBar

```tsx
<FilterBar
  search={{
    value: searchValue,
    onChange: setSearchValue,
    placeholder: 'Search suppliers...',
  }}
  filters={[
    {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'active_approved', label: 'Active' },
        { value: 'blacklisted', label: 'Blacklisted' },
      ],
    },
  ]}
  hasActiveFilters={statusFilter !== 'all' || searchValue !== ''}
  onClear={handleClear}
/>
```
