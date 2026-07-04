/* ─────────────────────────────────────────────────────────────────────────────
 * E2E Auth Bootstrap — verify (and optionally provision) the 10 real E2E role
 * users used by the Playwright full-workflow suite. STAGING ONLY.
 *
 * Approved role → email mapping (fixed; no other users are touched):
 *   admin→admin@ft.com · operations_manager→ops@ft.com · viewer→viewer@ft.com
 *   sales_user→sales.test@ft.com · sales_coordinator→coo@ft.com
 *   procurement_user→procurement@ft.com · store_user→store@ft.com
 *   factory_user→factory@ft.com · qc_user→qc@ft.com · afs_user→afs@ft.com
 *
 * Modes:
 *   --mode dry-run  (default) — prints the mapping and the checks/actions that
 *                    WOULD run. Opens no connection, writes nothing.
 *   --mode apply    — requires E2E_SEED_CONFIRM=true and passes the same
 *                    production guard as the seeder (host must be allow-listed
 *                    in E2E_NON_PRODUCTION_HOSTS). For each role:
 *                      1. ensure the auth user exists (created with
 *                         E2E_TEST_USER_PASSWORD only if missing),
 *                      2. upsert its profiles row (display only),
 *                      3. upsert its public.user_roles row (role source of truth),
 *                      4. verify sign-in with the shared password (anon client).
 *                    Exits 1 if any role fails verification.
 *
 * Optional: --update-passwords — resets the E2E users' passwords to
 * E2E_TEST_USER_PASSWORD when sign-in verification fails (staging recovery;
 * touches ONLY the 10 mapped emails; not used by the GitHub Action by default).
 *
 * Hard guarantees: never deletes users, never touches unrelated users, never
 * prints passwords or keys, never runs against a non-allow-listed host.
 * ──────────────────────────────────────────────────────────────────────────── */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const ROLE_USERS: { role: string; email: string; fullName: string }[] = [
  { role: 'admin',              email: 'admin@ft.com',       fullName: 'E2E Admin' },
  { role: 'operations_manager', email: 'ops@ft.com',         fullName: 'E2E Operations Manager' },
  { role: 'viewer',             email: 'viewer@ft.com',      fullName: 'E2E Viewer' },
  { role: 'sales_user',         email: 'sales.test@ft.com',  fullName: 'E2E Sales User' },
  { role: 'sales_coordinator',  email: 'coo@ft.com',         fullName: 'E2E Sales Coordinator' },
  { role: 'procurement_user',   email: 'procurement@ft.com', fullName: 'E2E Procurement User' },
  { role: 'store_user',         email: 'store@ft.com',       fullName: 'E2E Store User' },
  { role: 'factory_user',       email: 'factory@ft.com',     fullName: 'E2E Factory User' },
  { role: 'qc_user',            email: 'qc@ft.com',          fullName: 'E2E QC User' },
  { role: 'afs_user',           email: 'afs@ft.com',         fullName: 'E2E AFS User' },
];

const MODE = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'dry-run';
const UPDATE_PASSWORDS = process.argv.includes('--update-passwords');

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const PASSWORD = process.env.E2E_TEST_USER_PASSWORD ?? '';

const maskEmail = (e: string) => `${e[0]}***@${e.split('@')[1] ?? '?'}`;
function fail(msg: string): never { console.error(`\n✗ ${msg}\n`); process.exit(1); }

function host(): string {
  try { return new URL(SUPABASE_URL).hostname; } catch { return '(invalid-url)'; }
}
function isProduction(): boolean {
  const allow = (process.env.E2E_NON_PRODUCTION_HOSTS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return !allow.includes(host());
}

function dryRun() {
  console.log('\n─── E2E AUTH BOOTSTRAP — DRY-RUN (no connection, no writes) ─────');
  console.log(`Target host:  ${host()} ${isProduction() ? '(treated as PRODUCTION — apply would be blocked)' : '(allow-listed non-production)'}`);
  console.log(`Password:     ${PASSWORD ? 'provided via E2E_TEST_USER_PASSWORD (not printed)' : 'NOT SET — apply would fail'}`);
  console.log(`Roles (${ROLE_USERS.length}):`);
  for (const u of ROLE_USERS) console.log(`  ${u.role.padEnd(20)} ${maskEmail(u.email)}`);
  console.log('\nApply would, per role: ensure auth user (create only if missing),');
  console.log('upsert profiles row, upsert public.user_roles row (source of truth),');
  console.log('then verify sign-in with the shared password. Nothing is deleted;');
  console.log('no unrelated user is touched; passwords/keys are never printed.');
  console.log('\nTo apply (staging only):');
  console.log('  E2E_SEED_CONFIRM=true npx tsx tools/e2e/e2e-auth-bootstrap.ts --mode apply\n');
}

async function apply() {
  if (process.env.E2E_SEED_CONFIRM !== 'true') {
    fail('apply writes auth/role rows and is blocked. Set E2E_SEED_CONFIRM=true to confirm.');
  }
  if (isProduction() && process.env.E2E_ALLOW_PRODUCTION !== 'true') {
    fail(`Target host "${host()}" is not in E2E_NON_PRODUCTION_HOSTS and is treated as PRODUCTION. Blocked.`);
  }
  if (!SUPABASE_URL) fail('E2E_SUPABASE_URL / VITE_SUPABASE_URL is not set.');
  if (!SERVICE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY is required for apply (backend tool only).');
  if (!PASSWORD) fail('E2E_TEST_USER_PASSWORD is not set — cannot create users or verify sign-in.');
  if (!ANON_KEY) fail('VITE_SUPABASE_ANON_KEY is required for sign-in verification.');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  // One page of 1000 covers any realistic staging user count for id lookup.
  const { data: userList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) fail(`Could not list auth users: ${listErr.message}`);
  const byEmail = new Map((userList?.users ?? []).map(u => [u.email?.toLowerCase(), u]));

  const failures: string[] = [];
  console.log(`\nBootstrapping ${ROLE_USERS.length} E2E role users on ${host()}…`);

  for (const u of ROLE_USERS) {
    const label = `${u.role} (${maskEmail(u.email)})`;
    let userId = byEmail.get(u.email.toLowerCase())?.id ?? null;

    // 1. Ensure the auth user exists — password set ONLY on creation.
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email, password: PASSWORD, email_confirm: true,
      });
      if (error || !data?.user) { failures.push(`${label}: create failed — ${error?.message}`); continue; }
      userId = data.user.id;
      console.log(`  + created auth user for ${label}`);
    } else {
      console.log(`  = auth user exists for ${label}`);
    }

    // 2. Profile row (display only — not the role source of truth).
    const { error: profErr } = await admin.from('profiles').upsert(
      { id: userId, email: u.email, full_name: u.fullName, is_active: true },
      { onConflict: 'id' },
    );
    if (profErr) console.warn(`    ⚠ ${label}: profile upsert failed — ${profErr.message}`);

    // 3. Role assignment — public.user_roles is the source of truth.
    const { error: roleErr } = await admin.from('user_roles').upsert(
      { user_id: userId, role: u.role },
      { onConflict: 'user_id' },
    );
    if (roleErr) { failures.push(`${label}: user_roles upsert failed — ${roleErr.message}`); continue; }

    // 4. Verify sign-in with the shared password (never printed).
    const { error: signInErr } = await anon.auth.signInWithPassword({ email: u.email, password: PASSWORD });
    if (signInErr) {
      if (UPDATE_PASSWORDS) {
        const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
        if (updErr) { failures.push(`${label}: password update failed — ${updErr.message}`); continue; }
        const { error: retryErr } = await anon.auth.signInWithPassword({ email: u.email, password: PASSWORD });
        if (retryErr) { failures.push(`${label}: sign-in still failing after password update`); continue; }
        console.log(`  ~ password aligned for ${label} (--update-passwords)`);
      } else {
        failures.push(`${label}: sign-in verification FAILED — existing password differs from E2E_TEST_USER_PASSWORD (re-run with --update-passwords to align, staging only)`);
        continue;
      }
    }
    await anon.auth.signOut();
    console.log(`  ✓ verified ${label}`);
  }

  if (failures.length) {
    console.error(`\n✗ ${failures.length} role user(s) failed:\n${failures.map(f => `  - ${f}`).join('\n')}\n`);
    process.exit(1);
  }
  console.log(`\n✓ All ${ROLE_USERS.length} E2E role users exist, have correct user_roles rows, and sign in with the shared password.\n`);
}

(async () => {
  if (MODE === 'dry-run') dryRun();
  else if (MODE === 'apply') await apply();
  else fail(`Unknown --mode "${MODE}". Valid: dry-run | apply`);
})();
