/* ─────────────────────────────────────────────────────────────────────────────
 * 2026 Sales Plan — real salesmen account bootstrap (idempotent).
 *
 * Creates the 10 real salesman accounts (role: sales_user) used by the plan
 * import. Mirrors tools/e2e/e2e-auth-bootstrap.ts:
 *   • --mode dry-run (default): prints the mapping and intended actions.
 *     No connection, no writes.
 *   • --mode apply: requires IMPORT_CONFIRM=true (+ production guard).
 *     Per salesman: create the auth user ONLY if missing (password from
 *     SALES_USERS_PASSWORD — never printed), upsert profiles (display),
 *     upsert public.user_roles (role source of truth).
 *
 * Hard guarantees: never deletes users, never touches unrelated users, never
 * changes an existing user's password, never prints passwords or keys.
 *
 * Run:  npx tsx tools/import/create-sales-users.ts --mode dry-run
 * ──────────────────────────────────────────────────────────────────────────── */

import {
  SALESMEN, assertWriteAllowed, fail, isProductionTarget, log,
  makeServiceClient, supabaseHost, cliArg,
} from './lib';

const MODE = cliArg('mode') ?? 'dry-run';
const PASSWORD = process.env.SALES_USERS_PASSWORD ?? '';

const maskEmail = (e: string) => `${e[0]}***@${e.split('@')[1] ?? '?'}`;

function dryRun() {
  log('\n─── SALES USERS BOOTSTRAP — DRY-RUN (no connection, no writes) ─────');
  log(`Target host:  ${supabaseHost()} ${isProductionTarget() ? '(treated as PRODUCTION — apply needs IMPORT_ALLOW_PRODUCTION=true)' : '(allow-listed non-production)'}`);
  log(`Password:     ${PASSWORD ? 'provided via SALES_USERS_PASSWORD (not printed)' : 'NOT SET — apply would fail'}`);
  log(`Salesmen (${SALESMEN.length}):`);
  for (const s of SALESMEN) log(`  ${s.name.padEnd(14)} ${maskEmail(s.email)}  role=sales_user`);
  log('\nApply would, per salesman: create the auth user only if missing');
  log('(email confirmed, password from SALES_USERS_PASSWORD), upsert the');
  log('profiles row, and upsert public.user_roles (role source of truth).');
  log('Existing accounts are skipped and reported — passwords are never');
  log('changed and nothing is ever deleted.');
  log('\nTo apply:');
  log('  IMPORT_CONFIRM=true npx tsx tools/import/create-sales-users.ts --mode apply\n');
}

async function apply() {
  assertWriteAllowed('apply (create sales users)');
  if (!PASSWORD) fail('SALES_USERS_PASSWORD is not set — cannot create users.');

  const admin = makeServiceClient();

  const { data: userList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) fail(`Could not list auth users: ${listErr.message}`);
  const byEmail = new Map((userList?.users ?? []).map((u) => [u.email?.toLowerCase(), u]));

  const failures: string[] = [];
  let created = 0;
  let skipped = 0;
  log(`\nBootstrapping ${SALESMEN.length} salesman accounts on ${supabaseHost()}…`);

  for (const s of SALESMEN) {
    const label = `${s.name} (${maskEmail(s.email)})`;
    let userId = byEmail.get(s.email.toLowerCase())?.id ?? null;

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: s.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: s.fullName },
      });
      if (error || !data?.user) { failures.push(`${label}: create failed — ${error?.message}`); continue; }
      userId = data.user.id;
      created += 1;
      log(`  + created auth user for ${label}`);
    } else {
      skipped += 1;
      log(`  = auth user already exists for ${label} — skipped (password untouched)`);
    }

    const { error: profErr } = await admin.from('profiles').upsert(
      { id: userId, email: s.email, full_name: s.fullName, department: 'Sales', is_active: true },
      { onConflict: 'id' },
    );
    if (profErr) console.warn(`    ⚠ ${label}: profile upsert failed — ${profErr.message}`);

    const { error: roleErr } = await admin.from('user_roles').upsert(
      { user_id: userId, role: 'sales_user' },
      { onConflict: 'user_id' },
    );
    if (roleErr) { failures.push(`${label}: user_roles upsert failed — ${roleErr.message}`); continue; }
    log(`  ✓ ${label} — profile + sales_user role in place`);
  }

  if (failures.length) {
    console.error(`\n✗ ${failures.length} account(s) failed:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
    process.exit(1);
  }
  log(`\n✓ All ${SALESMEN.length} salesman accounts ready (${created} created, ${skipped} already existed).\n`);
}

(async () => {
  if (MODE === 'dry-run') dryRun();
  else if (MODE === 'apply') await apply();
  else fail(`Unknown --mode "${MODE}". Valid: dry-run | apply`);
})();
