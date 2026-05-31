/**
 * FT Operations Portal — Local-only user bootstrap script
 * ============================================================================
 * OPTIONAL. Not required for production. Not part of the frontend bundle.
 *
 * This script lives OUTSIDE src/ and is excluded from tsconfig (`include: ["src"]`)
 * and from the Vite build, so it is NEVER shipped to the browser. It uses the
 * Supabase SERVICE ROLE KEY (which bypasses RLS) and MUST only ever run on a
 * trusted local/CI machine — never in client code, never in a deployed runtime.
 *
 * It creates one Supabase Auth user per role (with email confirmed) and assigns
 * the matching role in public.user_roles. The on_auth_user_created trigger
 * (migration 001) creates the profiles row automatically.
 *
 * USAGE (local only):
 *   1. Set environment variables (do NOT use VITE_ prefix — these are secrets):
 *        export SUPABASE_URL="https://your-project-ref.supabase.co"
 *        export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *   2. Run with a TypeScript runner, e.g.:
 *        npx tsx scripts/create-dev-users.ts
 *      (or compile separately; this file is intentionally not in any tsconfig)
 *
 * Edit DEFAULT_PASSWORD and the USERS list before running. Re-running is safe:
 * existing users are detected and only their role is (re)assigned.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Change this before running. Use a strong password for any shared environment.
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'ChangeMe!2026';

type Role =
  | 'admin'
  | 'operations_manager'
  | 'sales_user'
  | 'sales_coordinator'
  | 'procurement_user'
  | 'factory_user'
  | 'store_user'
  | 'qc_user'
  | 'afs_user'
  | 'viewer';

interface SeedUser {
  email: string;
  fullName: string;
  role: Role;
}

// REPLACE these emails with real addresses before running against a shared project.
const USERS: SeedUser[] = [
  { email: 'admin@example.com',             fullName: 'System Admin',        role: 'admin' },
  { email: 'ops.manager@example.com',       fullName: 'Operations Manager',  role: 'operations_manager' },
  { email: 'sales@example.com',             fullName: 'Sales User',          role: 'sales_user' },
  { email: 'sales.coordinator@example.com', fullName: 'Sales Coordinator',   role: 'sales_coordinator' },
  { email: 'procurement@example.com',       fullName: 'Procurement User',    role: 'procurement_user' },
  { email: 'factory@example.com',           fullName: 'Factory User',        role: 'factory_user' },
  { email: 'store@example.com',             fullName: 'Store User',          role: 'store_user' },
  { email: 'qc@example.com',                fullName: 'QC Inspector',        role: 'qc_user' },
  { email: 'afs@example.com',               fullName: 'AFS User',            role: 'afs_user' },
  { email: 'viewer@example.com',            fullName: 'Read-only Viewer',    role: 'viewer' },
];

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set them in your local shell (never with a VITE_ prefix) and retry.',
    );
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const u of USERS) {
    // 1. Create the auth user (email pre-confirmed). If it already exists, find it.
    let userId: string | null = null;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    });

    if (createErr) {
      // Most likely "already registered" — look the user up by listing.
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users.find((x) => x.email === u.email);
      if (!existing) {
        console.error(`✗ ${u.email}: ${createErr.message}`);
        continue;
      }
      userId = existing.id;
      console.log(`• ${u.email}: already exists, reusing`);
    } else {
      userId = created.user?.id ?? null;
      console.log(`✓ ${u.email}: created`);
    }

    if (!userId) {
      console.error(`✗ ${u.email}: could not resolve user id`);
      continue;
    }

    // 2. Assign role (upsert — single-role model, unique on user_id).
    const { error: roleErr } = await admin
      .from('user_roles')
      .upsert({ user_id: userId, role: u.role }, { onConflict: 'user_id' });

    if (roleErr) {
      console.error(`✗ ${u.email}: role assign failed — ${roleErr.message}`);
    } else {
      console.log(`  → role: ${u.role}`);
    }
  }

  console.log('\nDone. Remember to change DEFAULT_PASSWORD for any shared environment.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
