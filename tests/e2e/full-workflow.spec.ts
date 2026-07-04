/* ─────────────────────────────────────────────────────────────────────────────
 * Full-workflow role × route smoke test — NAFFCO Operations Portal
 *
 * For every role, visits every key workflow route and asserts:
 *   • expected ACCESS  → page renders without crash and without the
 *     "Access restricted" guard panel                    → PASS
 *   • expected DENIAL  → the RequireRole "Access restricted" panel renders
 *     (denial working as designed)                       → PASS
 *   • unexpected access / unexpected denial / crash / error page → FAIL
 *
 * Credentials come from env (same convention as scripts/playwright):
 *   TEST_ADMIN_EMAIL/PASSWORD, TEST_OPS_*, TEST_VIEWER_*, TEST_SALES_*,
 *   TEST_COORDINATOR_*, TEST_PROCUREMENT_*, TEST_STORE_*, TEST_FACTORY_*,
 *   TEST_QC_*, TEST_AFS_*
 * Roles with missing credentials are SKIPPED unless E2E_STRICT_AUTH=true.
 *
 * Read-only: this spec only navigates and reads the DOM — it never submits
 * forms or mutates data.
 * ──────────────────────────────────────────────────────────────────────────── */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL ?? 'http://localhost:5173';
const STRICT_AUTH = process.env.E2E_STRICT_AUTH === 'true';

type RoleKey =
  | 'admin' | 'operations_manager' | 'viewer' | 'sales_user' | 'sales_coordinator'
  | 'procurement_user' | 'store_user' | 'factory_user' | 'qc_user' | 'afs_user';

const ROLES: { key: RoleKey; email?: string; password?: string }[] = [
  { key: 'admin',              email: process.env.TEST_ADMIN_EMAIL,       password: process.env.TEST_ADMIN_PASSWORD },
  { key: 'operations_manager', email: process.env.TEST_OPS_EMAIL,         password: process.env.TEST_OPS_PASSWORD },
  { key: 'viewer',             email: process.env.TEST_VIEWER_EMAIL,      password: process.env.TEST_VIEWER_PASSWORD },
  { key: 'sales_user',         email: process.env.TEST_SALES_EMAIL,       password: process.env.TEST_SALES_PASSWORD },
  { key: 'sales_coordinator',  email: process.env.TEST_COORDINATOR_EMAIL, password: process.env.TEST_COORDINATOR_PASSWORD },
  { key: 'procurement_user',   email: process.env.TEST_PROCUREMENT_EMAIL, password: process.env.TEST_PROCUREMENT_PASSWORD },
  { key: 'store_user',         email: process.env.TEST_STORE_EMAIL,       password: process.env.TEST_STORE_PASSWORD },
  { key: 'factory_user',       email: process.env.TEST_FACTORY_EMAIL,     password: process.env.TEST_FACTORY_PASSWORD },
  { key: 'qc_user',            email: process.env.TEST_QC_EMAIL,          password: process.env.TEST_QC_PASSWORD },
  { key: 'afs_user',           email: process.env.TEST_AFS_EMAIL,         password: process.env.TEST_AFS_PASSWORD },
];

const ALL: RoleKey[] = ROLES.map(r => r.key);

/**
 * Expected-access matrix, transcribed from the actual RequireRole guards in
 * src/app/App.tsx (admin always passes the guard by design). Routes without a
 * RequireRole wrapper are open to every authenticated role.
 *
 * NOTE: the app route for Material Custody is /custody (the sidebar's
 * "/store/custody" label maps to it) — tested at its real path.
 */
const ROUTES: { route: string; heading: RegExp; allowed: RoleKey[] }[] = [
  { route: '/sales',                     heading: /Sales Dashboard/i,          allowed: ALL },
  { route: '/quotations',                heading: /Quotation/i,                allowed: ALL },
  { route: '/quotations/new',            heading: /Quotation/i,                allowed: ALL },
  { route: '/sales-coordinator',         heading: /Coordinator/i,              allowed: ['admin', 'sales_coordinator', 'operations_manager'] },
  { route: '/coordinator-queue',         heading: /Queue|Coordinator/i,        allowed: ['admin', 'sales_coordinator', 'operations_manager'] },
  { route: '/hot-projects',              heading: /Hot Projects/i,             allowed: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer'] },
  { route: '/projects',                  heading: /Projects/i,                 allowed: ALL },
  { route: '/procurement',               heading: /Procurement/i,              allowed: ['admin', 'procurement_user', 'operations_manager'] },
  { route: '/procurement/requests',      heading: /Purchase Requests/i,        allowed: ['admin', 'procurement_user', 'operations_manager'] },
  { route: '/procurement/pr-items-without-po', heading: /PR Items Without PO/i, allowed: ['admin', 'procurement_user', 'operations_manager'] },
  { route: '/procurement/purchase-orders', heading: /PO to Supplier/i,         allowed: ['admin', 'procurement_user', 'operations_manager'] },
  { route: '/procurement/eta-history',   heading: /ETA Tracking/i,             allowed: ['admin', 'procurement_user', 'operations_manager'] },
  { route: '/procurement/suppliers',     heading: /Approved Suppliers/i,       allowed: ['admin', 'procurement_user', 'operations_manager'] },
  { route: '/store',                     heading: /Store Dashboard/i,          allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/store/receipts',            heading: /Material Receiving/i,       allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/store/vehicle-receiving',   heading: /Vehicle Receiving/i,        allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/store/inventory',           heading: /Inventory/i,                allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/store/issuance',            heading: /Issuance/i,                 allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/custody',                   heading: /Custody/i,                  allowed: ['admin', 'store_user', 'factory_user', 'afs_user', 'operations_manager'] },
  { route: '/store/unallocated',         heading: /Unallocated/i,              allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/store/serials',             heading: /Serial Register/i,          allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/store/qc-handoff',          heading: /QC Handoff/i,               allowed: ['admin', 'store_user', 'operations_manager'] },
  { route: '/factory',                   heading: /Factory/i,                  allowed: ['admin', 'factory_user', 'operations_manager'] },
  { route: '/qc',                        heading: /QC/i,                       allowed: ['admin', 'qc_user', 'operations_manager'] },
  { route: '/dubai-afs',                 heading: /AFS|Dubai/i,                allowed: ['admin', 'afs_user', 'operations_manager'] },
  { route: '/reports',                   heading: /Reports/i,                  allowed: ['admin', 'operations_manager', 'viewer', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'sales_coordinator'] },
  { route: '/reports/procurement',       heading: /Procurement Reports/i,      allowed: ['admin', 'operations_manager', 'procurement_user'] },
  { route: '/reports/suppliers',         heading: /Supplier Reports/i,         allowed: ['admin', 'operations_manager', 'procurement_user'] },
  { route: '/receivables',               heading: /Receivables/i,              allowed: ['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer'] },
  { route: '/control-tower',             heading: /Control Tower|Operations/i, allowed: ['admin', 'operations_manager', 'viewer'] },
  { route: '/management-dashboard',      heading: /Management Dashboard/i,     allowed: ['admin', 'viewer'] },
  { route: '/admin/invoicing-schedule',  heading: /Invoicing Schedule/i,       allowed: ['admin'] },
  { route: '/admin/sales-targets',       heading: /Sales Targets/i,            allowed: ['admin'] },
];

async function login(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/* ── S11 seeded-data visibility checks ─────────────────────────────────────────
 * Enabled only when E2E_RUN_ID is set (the GitHub Action passes the seed step's
 * run_id). Verifies that the S11 two-order records (KSA + Dubai) are actually
 * visible in the UI for the roles whose guards allow the route. Detection is
 * the run's own `E2E-<shortid>` reference prefix, so only THIS run's data
 * satisfies the check — pre-existing data cannot produce a false pass.
 * Read-only; roles with missing credentials skip unless E2E_STRICT_AUTH=true.
 */
const RUN_ID = process.env.E2E_RUN_ID ?? '';
const SEED_PREFIX = RUN_ID ? `E2E-${RUN_ID.replace(/[^a-z0-9]/gi, '').slice(-6)}` : '';

const S11_DATA_CHECKS: { role: RoleKey; route: string; expects: string; tab?: string }[] = [
  { role: 'sales_user',       route: '/projects',                    expects: 'S11 project (SO / customer reference)' },
  // /quotations defaults to the "Action Required" tab; S11 quotations are
  // converted_to_so (under "Converted"), so select the All tab first.
  { role: 'sales_user',       route: '/quotations',                  expects: 'S11 quotation (customer reference)', tab: 'All' },
  { role: 'procurement_user', route: '/procurement/requests',        expects: 'S11 PR reference' },
  { role: 'procurement_user', route: '/procurement/purchase-orders', expects: 'S11 PO reference' },
  { role: 'store_user',       route: '/store/receipts',              expects: 'S11 store receipt reference' },
  { role: 'store_user',       route: '/store/vehicle-receiving',     expects: 'S11 Dubai vehicle chassis reference' },
];

const maskEmail = (e: string) => `${e[0]}***@${e.split('@')[1] ?? '?'}`;

test.describe('S11 seeded-data visibility (requires E2E_RUN_ID)', () => {
  test.skip(!RUN_ID, 'E2E_RUN_ID not set — run the seeder first (the GitHub Action wires this automatically)');

  for (const check of S11_DATA_CHECKS) {
    const roleCfg = ROLES.find(r => r.key === check.role)!;
    test(`${check.role} sees ${check.expects} on ${check.route}`, async ({ browser }) => {
      test.skip(!roleCfg.email || !roleCfg.password,
        STRICT_AUTH ? undefined : `no credentials for ${check.role}`);
      if ((!roleCfg.email || !roleCfg.password) && STRICT_AUTH) {
        throw new Error(`Missing credentials for ${check.role} (E2E_STRICT_AUTH=true)`);
      }
      const page = await browser.newPage();
      try {
        const ok = await login(page, roleCfg.email!, roleCfg.password!);
        expect(ok, `login failed for ${check.role}`).toBe(true);
        await page.goto(`${BASE_URL}${check.route}`);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        // Some list pages open on a filtered tab — switch to the required tab
        // before asserting (e.g. "All" on /quotations).
        if (check.tab) {
          const tabButton = page.locator('main').getByRole('button', { name: check.tab, exact: true }).first();
          if (await tabButton.isVisible().catch(() => false)) {
            await tabButton.click();
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
          }
        }

        // The vehicle chassis has no dash after the prefix (E2E<sid>CHS11D);
        // all other references start with `E2E-<sid>`. Scope to <main> so
        // sidebar text can never satisfy (or hide) the match.
        const sid = SEED_PREFIX.slice(4);
        const marker = page.locator('main').getByText(new RegExp(`E2E-?${sid}`, 'i')).first();
        const visible = await marker.isVisible().catch(() => false) ||
          await marker.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);

        if (!visible) {
          // Failure diagnostics — everything needed to tell filter issues from
          // ownership/RLS issues at a glance. No secrets are printed.
          const emptyState = await page.locator('main').getByText(/No .* (found|yet|available)/i).first()
            .textContent().catch(() => null);
          const mainExcerpt = (await page.locator('main').innerText().catch(() => ''))
            .replace(/\s+/g, ' ').slice(0, 300);
          expect(visible, [
            `no ${SEED_PREFIX}* reference visible`,
            `route: ${check.route} (url: ${page.url()})`,
            `role: ${check.role} (${maskEmail(roleCfg.email!)})`,
            `searched prefix: ${SEED_PREFIX} (regex E2E-?${sid})`,
            `tab selected: ${check.tab ?? '(page default)'}`,
            `empty-state text: ${emptyState ?? '(none found)'}`,
            `main excerpt: ${mainExcerpt}`,
            `hint: empty list for sales_user usually means ownership fields (requested_by / sales_owner_id) were not assigned — ensure the sales profile (E2E_SALES_USER_EMAIL) existed at seed time`,
          ].join('\n  ')).toBe(true);
        }
      } finally {
        await page.close();
      }
    });
  }
});

for (const role of ROLES) {
  test.describe(`role: ${role.key}`, () => {
    test.describe.configure({ mode: 'serial' });
    let page: Page;
    let loggedIn = false;
    const pageErrors: string[] = [];

    test.beforeAll(async ({ browser }) => {
      if (!role.email || !role.password) {
        if (STRICT_AUTH) throw new Error(`Missing credentials for ${role.key} (E2E_STRICT_AUTH=true)`);
        return; // tests below will skip
      }
      page = await browser.newPage();
      page.on('pageerror', err => pageErrors.push(`${role.key}: ${err.message}`));
      loggedIn = await login(page, role.email, role.password);
    });

    test.afterAll(async () => { await page?.close(); });

    test('login', async () => {
      test.skip(!role.email || !role.password, `no credentials for ${role.key} — skipped (set TEST_* env or E2E_STRICT_AUTH=true)`);
      expect(loggedIn, `login failed for ${role.key}`).toBe(true);
    });

    for (const { route, heading, allowed } of ROUTES) {
      const expectAccess = allowed.includes(role.key);
      test(`${route} → ${expectAccess ? 'access' : 'denied'}`, async () => {
        test.skip(!role.email || !role.password, 'no credentials');
        test.skip(!loggedIn, 'login failed');

        pageErrors.length = 0;
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        // Session must not have bounced to /login mid-run.
        expect(page.url(), 'unexpected redirect to /login (session lost)').not.toContain('/login');

        // Crash detection: no uncaught page errors, and the app root rendered.
        expect(pageErrors, `uncaught page error on ${route}`).toEqual([]);
        const rootChildren = await page.locator('#root > *').count();
        expect(rootChildren, `blank page (empty #root) on ${route}`).toBeGreaterThan(0);

        const denied = await page.getByText('Access restricted', { exact: false }).count() > 0;

        if (expectAccess) {
          expect(denied, `unexpected DENIAL for ${role.key} on ${route}`).toBe(false);
          // Route renders its expected title/section. Prefer real heading
          // elements (PageHeader renders an <h1>); fall back to text scoped to
          // <main>. Never use an unscoped page-wide text match: the sidebar's
          // mobile-only brand header ("Operations Portal", lg:hidden) sits
          // earlier in the DOM and made `.first()` select a hidden element —
          // the /control-tower false negative.
          const headingVisible =
            (await page.getByRole('heading', { name: heading }).first().isVisible().catch(() => false)) ||
            (await page.locator('main').getByText(heading).first().isVisible().catch(() => false));
          expect(headingVisible, `expected heading ${heading} not visible on ${route}`).toBe(true);
        } else {
          expect(denied, `unexpected ACCESS for ${role.key} on ${route} — guard did not deny`).toBe(true);
        }
      });
    }
  });
}
