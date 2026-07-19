// Role-based E2E smoke matrix.
// Drives the app once per role (via the dev role override localStorage('ft_dev_role'),
// mock mode only) and visits that role's landing route + key pages, capturing
// uncaught page errors and console errors. Prints a per-route pass/fail matrix.
//
// Usage: BASE=http://localhost:5173 node tools/e2e/role-smoke-matrix.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Per role: the routes a real user of that role actually reaches.
const MATRIX = {
  admin:              ['/', '/admin-dashboard', '/reference-lists', '/custom-fields', '/settings', '/audit-log'],
  operations_manager: ['/', '/control-tower', '/reference-lists', '/custom-fields', '/reports'],
  sales_user:         ['/', '/sales', '/quotations', '/hot-projects', '/custom-fields'],
  sales_coordinator:  ['/', '/sales-coordinator', '/quotations', '/custom-fields'],
  procurement_user:   ['/', '/procurement', '/procurement/requests', '/procurement/purchase-orders', '/reference-lists', '/custom-fields'],
  factory_user:       ['/', '/factory', '/factory/requirements', '/factory/raw-material-requests', '/reference-lists'],
  store_user:         ['/', '/store', '/store/receipts', '/custody', '/reference-lists', '/custom-fields'],
  qc_user:            ['/', '/qc', '/material-qc/inspections', '/project-qc/inspections', '/reference-lists'],
  afs_user:           ['/', '/dubai-afs', '/dubai-afs/predelivery-reports', '/reference-lists'],
  viewer:             ['/', '/management-dashboard', '/reports'],
};

const browser = await chromium.launch({ executablePath: CHROME });
let totalFail = 0;
const summary = [];

for (const [role, routes] of Object.entries(MATRIX)) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((r) => { try { localStorage.setItem('ft_dev_role', r); } catch { /* noop */ } }, role);
  const page = await ctx.newPage();
  let roleFail = 0;

  for (const route of routes) {
    const errors = [];
    const consoleErrors = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(900);
      const rooted = await page.locator('#root *').count() > 0;
      // "Access denied" or RequireRole fallback text is an intentional guard, not a crash.
      const denied = await page.getByText(/access denied|not authori[sz]ed|don.?t have permission/i).count() > 0;
      const ok = rooted && errors.length === 0;
      if (!ok) { roleFail++; totalFail++; }
      const flags = [
        denied ? 'guard' : '',
        consoleErrors.length ? `console:${consoleErrors.length}` : '',
      ].filter(Boolean).join(' ');
      console.log(`  ${ok ? 'OK  ' : 'FAIL'} [${role}] ${route} ${flags}`);
      if (errors.length) console.log(`        pageerr: ${errors[0].slice(0, 140)}`);
    } catch (e) {
      roleFail++; totalFail++;
      console.log(`  FAIL [${role}] ${route} — ${String(e).split('\n')[0]}`);
    }
  }
  summary.push(`${role}: ${roleFail === 0 ? 'OK' : roleFail + ' fail'}`);
  await ctx.close();
}

console.log('\n=== SUMMARY ===');
for (const s of summary) console.log('  ' + s);
console.log(totalFail === 0 ? '\nALL_ROLES_OK' : `\nTOTAL_FAILURES=${totalFail}`);
await browser.close();
process.exit(totalFail === 0 ? 0 : 1);
