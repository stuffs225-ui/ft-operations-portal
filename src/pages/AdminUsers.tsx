import { PlaceholderPage } from './PlaceholderPage';

export function AdminUsers() {
  return (
    <PlaceholderPage
      title="Admin / Users"
      description="Manage system users, role assignments, and access permissions. Integrates with Supabase Auth in Phase 1."
      phase={1}
      module="Foundation"
      roles={['admin']}
      features={[
        'User List',
        'Create / Invite User',
        'Assign Role',
        'Update Role',
        'Suspend / Reactivate User',
        'Role-Based Navigation Preview',
        'Supabase Auth Integration (Phase 1)',
        'Row Level Security Setup',
      ]}
      governanceNotes={[
        'User management is Admin-only.',
        'Role assignment determines financial visibility and page access.',
        'Permissions apply at both UI and database level (Supabase RLS).',
        'Security is enforced in the database, not only by hiding UI buttons.',
      ]}
    />
  );
}
