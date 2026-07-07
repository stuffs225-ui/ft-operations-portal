/* ─────────────────────────────────────────────────────────────────────────────
 * Real Sales User Bootstrap — provisions the 10 real sales employee accounts.
 *
 * This is REAL business data, not a test fixture: unlike
 * tools/e2e/e2e-auth-bootstrap.ts (which provisions 10 throwaway *role* test
 * accounts for Playwright), this script creates named accounts for actual
 * NAFFCO sales employees. Same safety shape, different purpose — see the
 * README at the top of e2e-auth-bootstrap.ts for the pattern this mirrors.
 *
 * Approved user → email mapping (fixed; no other users are touched):
 *   nader@ft.com        Nader
 *   mahmoud@ft.com      Mahmoud
 *   abdullah.s@ft.com   Abdullah
 *   abdulhamid@ft.com   Abdulhamid
 *   essam@ft.com        ESSAM
 *   obada@ft.com        Obada
 *   ahmed.qadomi@ft.com Ahmed Qadomi
 *   hatem@ft.com        Hatem
 *   suliman@ft.com      Suliman
 *   nadeem@ft.com       Nadeem
 * All 10 are provisioned with role = sales_user.
 *
 * Modes:
 *   --mode dry-run  (default) — prints the mapping and the checks/actions that
 *                    WOULD run. Opens no connection, writes nothing.
 *   --mode apply    — requires REAL_SALES_USERS_CONFIRM=true. For each user:
 *                      1. ensure the auth user exists (created with
 *                         REAL_SALES_USER_PASSWORD only if missing — an
 *                         existing account's password is NEVER changed unless
 *                         --update-passwords is also passed),
 *                      2. upsert its profiles row (display only),
 *                      3. upsert its public.user_roles row (role = sales_user,
 *                         the role source of truth),
 *                      4. verify sign-in with the shared password (anon client).
 *                    Exits 1 if any user fails verification.
 *
 * Hard guarantees:
 *   - The shared password is read ONLY from env REAL_SALES_USER_PASSWORD.
 *     It is never hardcoded, never logged, never echoed in any form.
 *   - Never deletes users, never touches any account outside the 10 listed.
 *   - Never prints passwords or keys — only masked emails.
 * ──────────────────────────────────────────────────────────────────────────── */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SALES_USERS: { email: string; fullName: string }[] = [
  { email: 'nader@ft.com', fullName: 'Nader' },
  { email: 'mahmoud@ft.com', fullName: 'Mahmoud' },
  { email: 'abdullah.s@ft.com', fullName: 'Abdullah' },
  { email: 'abdulhamid@ft.com', fullName: 'Abdulhamid' },
  { email: 'essam@ft.com', fullName: 'ESSAM' },
  { email: 'obada@ft.com', fullName: 'Obada' },
  { email: 'ahmed.qadomi@ft.com', fullName: 'Ahmed Qadomi' },
  { email: 'hatem@ft.com', fullName: 'Hatem' },
  { email: 'suliman@ft.com', fullName: 'Suliman' },
  { email: 'nadeem@ft.com', fullName: 'Nadeem' },
];
const ROLE = 'sales_user' as const;

const MODE = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'dry-run';
const UPDATE_PASSWORDS = process.argv.includes('--update-passwords');

const SUPABASE_URL = process.env.SALES_IMPORT_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const PASSWORD = process.env.REAL_SALES_USER_PASSWORD ?? '';

const maskEmail = (e: string) => `${e[0]}***@${e.split('@')[1] ?? '?'}`;
function fail(msg: string): never { console.error(`\n✗ ${msg}\n`); process.exit(1); }

function host(): string {
  try { return new URL(SUPABASE_URL).hostname; } catch { return '(invalid-url)'; }
}

function dryRun() {
  console.log('\n─── REAL SALES USERS BOOTSTRAP — DRY-RUN (no connection, no writes) ─────');
  console.log(`Target host:  ${host() || '(SUPABASE_URL not set)'}`);
  console.log(`Password:     ${PASSWORD ? 'provided via REAL_SALES_USER_PASSWORD (not printed)' : 'NOT SET — apply would fail'}`);
  console.log(`Users (${SALES_USERS.length}), all role="${ROLE}":`);
  for (const u of SALES_USERS) console.log(`  ${maskEmail(u.email).padEnd(16)} ${u.fullName}`);
  console.log('\nApply would, per user: ensure auth user (create only if missing — an');
  console.log('existing password is never changed unless --update-passwords is also');
  console.log('passed), upsert profiles row, upsert public.user_roles row (role=sales_user,');
  console.log('source of truth), then verify sign-in with the shared password. Nothing is');
  console.log('deleted; no unrelated user is touched; passwords/keys are never printed.');
  console.log('\nTo apply:');
  console.log('  REAL_SALES_USERS_CONFIRM=true npx tsx tools/import/sales-users-bootstrap.ts --mode apply\n');
}

async function apply() {
  if (process.env.REAL_SALES_USERS_CONFIRM !== 'true') {
    fail('apply writes real auth/role rows and is blocked. Set REAL_SALES_USERS_CONFIRM=true to confirm.');
  }
  if (!SUPABASE_URL) fail('SALES_IMPORT_SUPABASE_URL / VITE_SUPABASE_URL is not set.');
  if (!SERVICE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY is required for apply (backend tool only).');
  if (!PASSWORD) fail('REAL_SALES_USER_PASSWORD is not set — cannot create users or verify sign-in.');
  if (!ANON_KEY) fail('VITE_SUPABASE_ANON_KEY is required for sign-in verification.');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  const { data: userList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) fail(`Could not list auth users: ${listErr.message}`);
  const byEmail = new Map((userList?.users ?? []).map(u => [u.email?.toLowerCase(), u]));

  const failures: string[] = [];
  console.log(`\nProvisioning ${SALES_USERS.length} real sales users on ${host()}…`);

  for (const u of SALES_USERS) {
    const label = `${u.fullName} (${maskEmail(u.email)})`;
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
      { user_id: userId, role: ROLE },
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
        failures.push(`${label}: sign-in verification FAILED — existing password differs from REAL_SALES_USER_PASSWORD (re-run with --update-passwords to align)`);
        continue;
      }
    }
    await anon.auth.signOut();
    console.log(`  ✓ verified ${label} — signs in and lands with role=${ROLE}`);
  }

  if (failures.length) {
    console.error(`\n✗ ${failures.length} user(s) failed:\n${failures.map(f => `  - ${f}`).join('\n')}\n`);
    process.exit(1);
  }
  console.log(`\n✓ All ${SALES_USERS.length} real sales users exist, have role=${ROLE}, and sign in with the shared password.\n`);
}

(async () => {
  if (MODE === 'dry-run') dryRun();
  else if (MODE === 'apply') await apply();
  else fail(`Unknown --mode "${MODE}". Valid: dry-run | apply`);
})();
