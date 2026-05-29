# Authentication and Roles

## Auth Flow Overview

```
User opens app
  → ProtectedRoute checks AuthContext
      → loading? → show spinner
      → not authenticated + not devMode? → redirect /login
      → authenticated? → render page

/login
  → signIn(email, password)
      → devMode (Supabase not configured)? → accept any credentials, use DEV_PROFILE
      → Supabase configured? → supabase.auth.signInWithPassword()
          → success → fetchProfile() → set profile + role in context → navigate /
          → failure → show error message
```

## Dev Mode

When `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set (or still equal the `.env.example` placeholder), the app enters **Dev Mode**:

- A `DEV_PROFILE` is used (id: `dev-usr-001`, full_name: `Dev Admin`, role: `admin`).
- Any email + password combination passes login.
- A yellow **DEV MODE** badge appears in the Header.
- `ProtectedRoute` does **not** redirect to `/login` — it renders the page directly.

This lets the entire UI be tested without a real Supabase project.

## Role Assignment Flow

1. Admin creates a user account (invite via Supabase Auth or direct insert).
2. Supabase trigger `on_auth_user_created` auto-creates a `profiles` row.
3. Admin navigates to **Admin / Users** and clicks **Assign Role**.
4. A row is inserted into `user_roles` with the selected role.
5. On next login, `fetchProfile()` reads both `profiles` and `user_roles` and stores the role in React context.

## Roles Reference

| Role | Label | Access |
|------|-------|--------|
| `admin` | Admin | All pages, all financial data, user management |
| `operations_manager` | Ops Manager | All operational pages, approvals, financial visibility |
| `sales_user` | Sales | Quotations, Sales Workspace, After Sales |
| `sales_coordinator` | Sales Coordinator | Quotations, Sales Coordinator page |
| `procurement_user` | Procurement | Procurement module only |
| `factory_user` | Factory | WO/PN Gate, Factory/Production, Material Custody |
| `store_user` | Store | Store, Material Custody, Vehicle Receiving |
| `qc_user` | QC | Material QC, Project/Vehicle QC |
| `afs_user` | AFS | Dubai/AFS, After Sales, Material Custody |
| `viewer` | Viewer | Dashboard, Reports (read-only) |

## Navigation Filtering

`buildVisibleNav()` in `src/components/layout/Sidebar.tsx`:

1. Iterates `NAV_ITEMS` in order.
2. Holds section separator headers and only emits them when a visible child follows.
3. An item is visible if:
   - It has no `roles` array → visible to all authenticated users.
   - `role === 'admin'` → visible regardless of `roles` array.
   - The user's role appears in the item's `roles` array.

## RLS Connection

Role enforcement happens at two levels:

- **UI**: `buildVisibleNav()` hides navigation items; `ProtectedRoute` can be extended to check roles.
- **Database**: Supabase RLS policies call `public.current_user_role()` to compare the JWT's `auth.uid()` against the `user_roles` table. Even if a user crafts a direct API call, they cannot read or write data their role doesn't permit.
