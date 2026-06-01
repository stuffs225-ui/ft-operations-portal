/**
 * createTestUsers.ts
 *
 * Creates 10 test accounts (one per role) using the Supabase Admin API.
 * Run locally with the service role key — NEVER import this in src/.
 *
 * Usage:
 *   npx tsx scripts/createTestUsers.ts
 *
 * Required env vars (set in .env.local.admin — never commit that file):
 *   SUPABASE_URL              — e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — found in Supabase Dashboard → Settings → API
 *   TEST_USERS_PASSWORD       — temporary shared password for all test accounts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local.admin first, then fall back to .env.local
config({ path: resolve(process.cwd(), '.env.local.admin') });
config({ path: resolve(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Validate required env vars
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USERS_PASSWORD = process.env.TEST_USERS_PASSWORD;

if (!SUPABASE_URL) {
  console.error('❌  SUPABASE_URL is not set.');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is not set.');
  process.exit(1);
}
if (!TEST_USERS_PASSWORD) {
  console.error('❌  TEST_USERS_PASSWORD is not set.');
  process.exit(1);
}
if (TEST_USERS_PASSWORD.length < 8) {
  console.error('❌  TEST_USERS_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Admin Supabase client (service role — bypasses RLS)
// ---------------------------------------------------------------------------

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Test user definitions
// ---------------------------------------------------------------------------

interface TestUser {
  email: string;
  role: string;
  full_name: string;
  department: string;
  job_title: string;
  employee_number: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'admin.test@ft-operations.local',
    role: 'admin',
    full_name: 'Admin Tester',
    department: 'IT',
    job_title: 'System Administrator',
    employee_number: 'EMP-T001',
  },
  {
    email: 'ops.test@ft-operations.local',
    role: 'operations_manager',
    full_name: 'Operations Tester',
    department: 'Operations',
    job_title: 'Operations Manager',
    employee_number: 'EMP-T002',
  },
  {
    email: 'sales.test@ft-operations.local',
    role: 'sales_user',
    full_name: 'Sales Tester',
    department: 'Sales',
    job_title: 'Sales Representative',
    employee_number: 'EMP-T003',
  },
  {
    email: 'coordinator.test@ft-operations.local',
    role: 'sales_coordinator',
    full_name: 'Coordinator Tester',
    department: 'Sales',
    job_title: 'Sales Coordinator',
    employee_number: 'EMP-T004',
  },
  {
    email: 'procurement.test@ft-operations.local',
    role: 'procurement_user',
    full_name: 'Procurement Tester',
    department: 'Procurement',
    job_title: 'Procurement Officer',
    employee_number: 'EMP-T005',
  },
  {
    email: 'factory.test@ft-operations.local',
    role: 'factory_user',
    full_name: 'Factory Tester',
    department: 'Factory',
    job_title: 'Production Technician',
    employee_number: 'EMP-T006',
  },
  {
    email: 'store.test@ft-operations.local',
    role: 'store_user',
    full_name: 'Store Tester',
    department: 'Store',
    job_title: 'Store Keeper',
    employee_number: 'EMP-T007',
  },
  {
    email: 'qc.test@ft-operations.local',
    role: 'qc_user',
    full_name: 'QC Tester',
    department: 'Quality Control',
    job_title: 'QC Inspector',
    employee_number: 'EMP-T008',
  },
  {
    email: 'afs.test@ft-operations.local',
    role: 'afs_user',
    full_name: 'AFS Tester',
    department: 'After Sales',
    job_title: 'AFS Coordinator',
    employee_number: 'EMP-T009',
  },
  {
    email: 'viewer.test@ft-operations.local',
    role: 'viewer',
    full_name: 'Viewer Tester',
    department: 'Management',
    job_title: 'Observer',
    employee_number: 'EMP-T010',
  },
];

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

type ResultStatus = 'created' | 'already-existed' | 'failed';

interface Result {
  email: string;
  role: string;
  status: ResultStatus;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper: get existing user by email via admin API list
// ---------------------------------------------------------------------------

async function findExistingUserId(email: string): Promise<string | null> {
  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data) return null;
  const match = data.users.find((u) => u.email === email);
  return match?.id ?? null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🔧  FT Operations Portal — Test User Setup');
  console.log(`📡  Supabase URL : ${SUPABASE_URL}`);
  console.log(`👥  Users to provision: ${TEST_USERS.length}\n`);

  const results: Result[] = [];

  for (const user of TEST_USERS) {
    process.stdout.write(`  ⏳  ${user.email.padEnd(45)} `);

    let userId: string | null = null;
    let status: ResultStatus = 'created';
    let errorMsg: string | undefined;

    // Attempt to create
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: user.email,
      password: TEST_USERS_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        department: user.department,
        job_title: user.job_title,
        employee_number: user.employee_number,
      },
    });

    if (createError) {
      if (
        createError.message.toLowerCase().includes('already registered') ||
        createError.message.toLowerCase().includes('already been registered') ||
        createError.message.toLowerCase().includes('duplicate')
      ) {
        // User exists — look up their ID
        userId = await findExistingUserId(user.email);
        status = 'already-existed';
      } else {
        status = 'failed';
        errorMsg = createError.message;
      }
    } else {
      userId = createData.user?.id ?? null;
    }

    // Upsert into public.user_roles
    if (userId && status !== 'failed') {
      const { error: roleError } = await adminClient
        .from('user_roles')
        .upsert({ user_id: userId, role: user.role }, { onConflict: 'user_id' });

      if (roleError) {
        status = 'failed';
        errorMsg = `role upsert: ${roleError.message}`;
      }
    }

    // Also upsert a basic profile row so the app can read full_name
    if (userId && status !== 'failed') {
      await adminClient.from('profiles').upsert(
        {
          id: userId,
          full_name: user.full_name,
          email: user.email,
          department: user.department,
          job_title: user.job_title,
          employee_number: user.employee_number,
        },
        { onConflict: 'id' },
      );
      // Ignore profile upsert errors — profiles may not have all columns yet
    }

    results.push({ email: user.email, role: user.role, status, error: errorMsg });

    const icon = status === 'created' ? '✅' : status === 'already-existed' ? '🔄' : '❌';
    const label = status === 'created' ? 'created' : status === 'already-existed' ? 'already existed (role refreshed)' : `FAILED: ${errorMsg}`;
    console.log(`${icon}  ${label}`);
  }

  // ---------------------------------------------------------------------------
  // Summary table
  // ---------------------------------------------------------------------------

  console.log('\n' + '─'.repeat(80));
  console.log('  SUMMARY');
  console.log('─'.repeat(80));
  console.log(
    `  ${'Email'.padEnd(45)} ${'Role'.padEnd(22)} Status`,
  );
  console.log('─'.repeat(80));
  for (const r of results) {
    const icon = r.status === 'created' ? '✅' : r.status === 'already-existed' ? '🔄' : '❌';
    console.log(`  ${r.email.padEnd(45)} ${r.role.padEnd(22)} ${icon}  ${r.status}`);
  }
  console.log('─'.repeat(80));

  const created = results.filter((r) => r.status === 'created').length;
  const existing = results.filter((r) => r.status === 'already-existed').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  console.log(`\n  ✅ Created: ${created}  🔄 Already existed: ${existing}  ❌ Failed: ${failed}`);
  console.log('\n  ⚠️   Password NOT shown. Check TEST_USERS_PASSWORD in your .env.local.admin');
  console.log('  ⚠️   These accounts are for LOCAL TESTING only — delete before production.\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
