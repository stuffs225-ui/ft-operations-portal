# FT Operations Portal — System Architecture

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend Framework | React 18 + TypeScript | Strict mode, no `any` |
| Build Tool | Vite 6 | Fast dev server + optimized builds |
| Styling | Tailwind CSS v3 | Utility-first, custom brand palette |
| Routing | React Router v6 | Nested routes, AppLayout outlet |
| Icons | Lucide React | Consistent icon set |
| Auth (future) | Supabase Auth | JWT, session management |
| Database (future) | Supabase PostgreSQL | RLS enforced at DB level |
| Storage (future) | Supabase Storage | Documents, photos, PDFs |
| Deployment (future) | Vercel | CI/CD from main branch |

---

## Folder Structure

```
src/
├── app/
│   └── App.tsx              # Router and route definitions
├── components/
│   ├── ui/                  # Reusable design system primitives
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   └── PageHeader.tsx
│   └── layout/              # Layout building blocks
│       ├── Header.tsx
│       └── Sidebar.tsx
├── layouts/
│   └── AppLayout.tsx        # Shell: Header + Sidebar + Outlet
├── pages/                   # One file per route
├── features/                # Future: domain-specific feature modules
├── types/
│   └── index.ts             # All TypeScript types and interfaces
├── lib/
│   ├── roles.ts             # Role config, mock user
│   └── utils.ts             # Utility functions
├── data/
│   ├── navigation.ts        # Sidebar nav items
│   ├── mockDashboard.ts     # Static dashboard data
│   └── mockInbox.ts         # Static inbox tasks
└── styles/
    └── index.css            # Tailwind directives + global styles
```

---

## Layout Architecture

```
AppLayout
├── Sidebar (fixed, collapsible on mobile)
│   ├── Logo
│   ├── NavItems (from navigation.ts)
│   └── Version footer
├── Header (sticky top)
│   ├── Mobile hamburger
│   ├── Logo (mobile)
│   ├── Global search
│   ├── Notifications bell
│   └── User profile chip
└── Main content area
    └── <Outlet /> → Page component
```

---

## Security Model (Phase 0 placeholder, Phase 1 implementation)

- **UI Layer**: Navigation items filtered by role. Pages show only authorized actions.
- **Database Layer (future)**: Supabase Row Level Security (RLS) policies enforce access at the data level. Hiding UI buttons is NOT sufficient.
- **Auth Layer (future)**: Supabase Auth JWT tokens. Session stored securely.
- **Approval Gate Layer**: System-level blocks (WO gate, PN gate, PO approval gate) enforced server-side.

---

## Data Flow (Phase 2+)

```
User Action → React Component → Supabase Client
  → PostgreSQL (RLS-enforced) → Response
  → React State Update → UI Re-render
  → Audit Log Entry (automatic trigger)
  → Timeline Event (automatic trigger)
```

---

## State Management Strategy

- **Phase 0**: Static mock data in `/src/data/` files
- **Phase 1-2**: React Context for auth user + role
- **Phase 3+**: React Query (TanStack Query) for server state + Supabase real-time subscriptions
- No Redux or Zustand planned unless complexity demands it

---

## Mobile Responsiveness

- Sidebar: drawer on mobile (overlay), fixed on desktop (lg+)
- Grid layouts: 1 col mobile → 2-3 col tablet → 3-4 col desktop
- Tables: horizontal scroll on mobile
- Forms: full-width on mobile
