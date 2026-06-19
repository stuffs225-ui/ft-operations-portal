/**
 * FT Operations Portal — Test User Bootstrap Script
 * ==================================================
 * Creates 8 role-based test users for staging/preview UX audit.
 *
 * SECURITY:
 *   - Uses SUPABASE_SERVICE_ROLE_KEY (never a VITE_ variable — never exposed to browser)
 *   - Run only against staging/preview, never production
 *   - Never commit .env.local or any file containing these secrets
 *
 * USAGE:
 *   export VITE_SUPABASE_URL="https://your-project.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *   export TEST_USER_PASSWORD="..."
 *   node scripts/create-test-users.mjs
 *
 * Or via npm:
 *   npm run create:test-users
 *
 * Re-running is safe: existing users are detected and reused.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.TEST_USER_PASSWORD;

const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TEST_USER_PASSWORD'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.warn(`\n⚠ Skipping test user creation — missing env vars: ${missing.join(', ')}`);
  console.warn('  Set them in your shell (never in a VITE_ variable for SERVICE_ROLE_KEY).');
  console.warn('  See scripts/README.md for setup instructions.\n');
  process.exit(0);
}

const USERS = [
  { email: 'admin.test@example.com',       fullName: 'Admin Test',       role: 'admin' },
  { email: 'ops.test@example.com',         fullName: 'Ops Manager Test', role: 'operations_manager' },
  { email: 'sales.test@example.com',       fullName: 'Sales Test',       role: 'sales_user' },
  { email: 'procurement.test@example.com', fullName: 'Procurement Test', role: 'procurement_user' },
  { email: 'store.test@example.com',       fullName: 'Store Test',       role: 'store_user' },
  { email: 'factory.test@example.com',     fullName: 'Factory Test',     role: 'factory_user' },
  { email: 'afs.test@example.com',         fullName: 'AFS Test',         role: 'afs_user' },
  { email: 'qc.test@example.com',          fullName: 'QC Test',          role: 'qc_user' },
];

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nCreating ${USERS.length} test users against: ${SUPABASE_URL}\n`);

  const results = [];

  for (const u of USERS) {
    let userId = null;
    let status = '';

    // 1. Try to create the auth user with email pre-confirmed.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    });

    if (createErr) {
      // User likely already exists — find them in the list.
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find(x => x.email === u.email);
      if (!existing) {
        console.error(`✗ ${u.email}: ${createErr.message}`);
        results.push({ email: u.email, role: u.role, status: 'ERROR', error: createErr.message });
        continue;
      }
      userId = existing.id;
      status = 'reused';
    } else {
      userId = created?.user?.id ?? null;
      status = 'created';
    }

    if (!userId) {
      console.error(`✗ ${u.email}: could not resolve user id`);
      results.push({ email: u.email, role: u.role, status: 'ERROR', error: 'no user id' });
      continue;
    }

    // 2. Upsert the profiles row (trigger may have already created it).
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(
        { id: userId, email: u.email, full_name: u.fullName, is_active: true },
        { onConflict: 'id' }
      );

    if (profileErr) {
      console.warn(`  ⚠ ${u.email}: profile upsert failed — ${profileErr.message}`);
    }

    // 3. Upsert role assignment (single-role model, unique on user_id).
    const { error: roleErr } = await admin
      .from('user_roles')
      .upsert({ user_id: userId, role: u.role }, { onConflict: 'user_id' });

    if (roleErr) {
      console.error(`✗ ${u.email}: role assign failed — ${roleErr.message}`);
      results.push({ email: u.email, role: u.role, status: 'ROLE_ERROR', error: roleErr.message });
      continue;
    }

    console.log(`${status === 'created' ? '✓' : '•'} ${u.email} [${u.role}] — ${status}`);
    results.push({ email: u.email, role: u.role, status: status === 'created' ? 'CREATED' : 'REUSED' });
  }

  // Summary
  console.log('\n── Summary ──────────────────────────────────────────────');
  const created = results.filter(r => r.status === 'CREATED').length;
  const reused = results.filter(r => r.status === 'REUSED').length;
  const errors = results.filter(r => r.status.includes('ERROR')).length;
  console.log(`  Created: ${created}  Reused: ${reused}  Errors: ${errors}`);

  if (errors > 0) {
    console.log('\n  Failed:');
    results.filter(r => r.status.includes('ERROR')).forEach(r => {
      console.log(`    ✗ ${r.email}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\nTest users ready.\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
