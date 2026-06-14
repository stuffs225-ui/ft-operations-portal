# 03 — Page Layout Standards

**Step:** 5A — Design System Foundation  
**Date:** 2026-06-14

---

## Standard List Page Layout

```tsx
function ProjectList() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Projects"
          subtitle={`${projects.length} records`}
          breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Projects' }]}
          actions={
            <Button onClick={() => navigate('/projects/new')}>
              New Project
            </Button>
          }
        />

        <SectionCard noPadding>
          <DataTable
            columns={columns}
            data={projects}
            searchColumn="project_code"
            searchPlaceholder="Search by project code..."
            toolbar={
              <FilterBar
                filters={[statusFilter]}
                hasActiveFilters={hasFilters}
                onClear={clearFilters}
              />
            }
          />
        </SectionCard>
      </div>
    </AppLayout>
  )
}
```

## Standard Detail Page Layout

```tsx
function ProjectDetail() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <DetailHeader
          title={project.project_code}
          subtitle={project.customer_name}
          status={project.project_status}
          meta={[
            { label: 'SO Number', value: project.so_number },
            { label: 'Route', value: project.manufacturing_location },
            { label: 'Delivery', value: formatDate(project.customer_delivery_date) },
          ]}
          actions={<ApprovalActions project={project} />}
        />

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard title="Project Details">
                {/* fields */}
              </SectionCard>
              <SectionCard title="Vehicle Lines">
                {/* table */}
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <SectionCard title="Documents" actions={<UploadButton />}>
              {documents.map(doc => (
                <DocumentCard key={doc.id} {...doc} />
              ))}
            </SectionCard>
          </TabsContent>

          <TabsContent value="timeline">
            <SectionCard title="Activity">
              {events.map(event => (
                <TimelineItem key={event.id} {...event} />
              ))}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
```

---

## Typography Standards

| Context | Class |
|---------|-------|
| Page title | `text-2xl font-semibold tracking-tight` |
| Section title | `text-base font-semibold` |
| Table header | `text-xs font-medium text-muted-foreground` |
| Table cell | `text-sm` |
| Badge label | `text-xs font-semibold` |
| Caption / help | `text-xs text-muted-foreground` |
| Body text | `text-sm text-foreground` |

## Spacing Standards

| Context | Class |
|---------|-------|
| Page outer padding | `p-6` |
| Page section gaps | `space-y-6` |
| Card inner padding | `p-6` |
| Grid gaps | `gap-4` |
| Form field gaps | `space-y-4` |
| Table row height | Natural (content drives it) |

## Grid Layouts

```tsx
// Two columns (responsive)
<div className="grid gap-4 md:grid-cols-2">

// Three columns (responsive)
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

// Four KPI tiles (responsive)
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
```

---

## Loading/Empty/Error Patterns

Every list or section that fetches data must handle all three states:

```tsx
if (loading) return <LoadingState rows={8} />
if (error) return <ErrorState message={error.message} onRetry={refetch} />
if (!data.length) return (
  <EmptyState
    icon={<ClipboardList className="h-8 w-8" />}
    title={`No ${entityName} Yet`}
    description="..."
    action={canCreate ? <Button onClick={handleCreate}>Create</Button> : undefined}
  />
)
```

---

## Color Token Reference

These CSS variables are defined in `src/styles/index.css` and mapped to Tailwind classes in `tailwind.config.js`:

| Token | Light Value | Usage |
|-------|-------------|-------|
| `--background` | white | Page background |
| `--foreground` | slate-900 | Primary text |
| `--card` | white | Card backgrounds |
| `--primary` | slate-900 | Primary button, emphasis |
| `--secondary` | slate-100 | Secondary button |
| `--muted` | slate-100 | Table row hover, input backgrounds |
| `--muted-foreground` | slate-500 | Placeholder text, captions |
| `--destructive` | red-500 | Error state, delete actions |
| `--border` | slate-200 | Borders throughout |
| `--ring` | slate-900 | Focus ring |

Existing brand tokens (`brand-600`, `charcoal-*`) remain available for the sidebar, navigation, and legacy custom components.
