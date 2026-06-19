/**
 * FT Operations Portal — Role-Based Screenshot UX Audit
 * ======================================================
 * Captures screenshots for each role across all key pages.
 *
 * USAGE:
 *   # 1. Start the dev server (or point VITE_APP_URL at staging)
 *   npm run dev
 *
 *   # 2. Set env vars (copy .env.example or set manually)
 *   export VITE_APP_URL=http://localhost:5173
 *   export TEST_ADMIN_EMAIL=admin.test@example.com
 *   export TEST_ADMIN_PASSWORD=...
 *   # ... (see playwright.config.ts for full list)
 *
 *   # 3. Run
 *   npx playwright test scripts/playwright/ux-audit-screenshots.spec.ts
 *
 * Screenshots land in: docs/ux-audit/screenshots/{role}/
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.VITE_APP_URL ?? 'http://localhost:5173';
const SS_DIR = path.join(process.cwd(), 'docs/ux-audit/screenshots');

interface RoleConfig {
  key: string;
  email: string;
  password: string;
  /** Primary module route for this role */
  moduleRoute: string;
  /** Detail page route (if available and accessible) */
  detailRoute?: string;
  /** Create/new page route (if available) */
  newRoute?: string;
  /** Report route accessible to this role */
  reportRoute?: string;
}

const ROLES: RoleConfig[] = [
  {
    key: 'admin',
    email: process.env.TEST_ADMIN_EMAIL ?? '',
    password: process.env.TEST_ADMIN_PASSWORD ?? '',
    moduleRoute: '/projects',
    detailRoute: undefined, // populated dynamically
    newRoute: '/projects/new',
    reportRoute: '/reports/executive',
  },
  {
    key: 'operations_manager',
    email: process.env.TEST_OPS_EMAIL ?? '',
    password: process.env.TEST_OPS_PASSWORD ?? '',
    moduleRoute: '/control-tower',
    newRoute: undefined,
    reportRoute: '/reports/executive',
  },
  {
    key: 'sales_user',
    email: process.env.TEST_SALES_EMAIL ?? '',
    password: process.env.TEST_SALES_PASSWORD ?? '',
    moduleRoute: '/sales',
    newRoute: '/quotations/new',
    reportRoute: '/reports/sales',
  },
  {
    key: 'procurement_user',
    email: process.env.TEST_PROCUREMENT_EMAIL ?? '',
    password: process.env.TEST_PROCUREMENT_PASSWORD ?? '',
    moduleRoute: '/procurement',
    newRoute: '/procurement/requests',
    reportRoute: '/reports/procurement',
  },
  {
    key: 'store_user',
    email: process.env.TEST_STORE_EMAIL ?? '',
    password: process.env.TEST_STORE_PASSWORD ?? '',
    moduleRoute: '/store',
    reportRoute: '/reports/store',
  },
  {
    key: 'factory_user',
    email: process.env.TEST_FACTORY_EMAIL ?? '',
    password: process.env.TEST_FACTORY_PASSWORD ?? '',
    moduleRoute: '/factory',
    reportRoute: '/reports/factory',
  },
  {
    key: 'afs_user',
    email: process.env.TEST_AFS_EMAIL ?? '',
    password: process.env.TEST_AFS_PASSWORD ?? '',
    moduleRoute: '/dubai-afs',
    reportRoute: '/reports/afs',
  },
  {
    key: 'qc_user',
    email: process.env.TEST_QC_EMAIL ?? '',
    password: process.env.TEST_QC_PASSWORD ?? '',
    moduleRoute: '/material-qc',
    reportRoute: '/reports/qc',
  },
];

function ssPath(role: string, name: string): string {
  const dir = path.join(SS_DIR, role);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${name}.png`);
}

async function login(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect or error
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async function captureScreen(page: Page, name: string, role: string): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: ssPath(role, name), fullPage: false });
}

async function visitAndCapture(
  page: Page,
  route: string,
  name: string,
  role: string,
  waitMs = 1000
): Promise<void> {
  await page.goto(`${BASE_URL}${route}`);
  await page.waitForTimeout(waitMs);
  await captureScreen(page, name, role);
}

// ── Test suite ────────────────────────────────────────────────────────────────

for (const roleConfig of ROLES) {
  test.describe(`Role: ${roleConfig.key}`, () => {
    let context: BrowserContext;
    let page: Page;
    let loginSuccess = false;

    test.beforeAll(async ({ browser }) => {
      if (!roleConfig.email || !roleConfig.password) {
        console.warn(`⚠ Skipping ${roleConfig.key}: no credentials in env`);
        return;
      }
      context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      page = await context.newPage();
      loginSuccess = await login(page, roleConfig.email, roleConfig.password);
    });

    test.afterAll(async () => {
      if (context) await context.close();
    });

    test('01 — login result / landing page', async () => {
      if (!loginSuccess) {
        await page.screenshot({ path: ssPath(roleConfig.key, '01-login-failed') });
        expect(loginSuccess, `Login failed for ${roleConfig.key}`).toBe(true);
        return;
      }
      await captureScreen(page, '01-landing', roleConfig.key);
    });

    test('02 — sidebar', async () => {
      if (!loginSuccess) return;
      // Sidebar is always visible on desktop
      await captureScreen(page, '02-sidebar', roleConfig.key);
    });

    test('03 — dashboard or My Work', async () => {
      if (!loginSuccess) return;
      await visitAndCapture(page, '/', '03-dashboard', roleConfig.key);
    });

    test('04 — main module list page', async () => {
      if (!loginSuccess) return;
      await visitAndCapture(page, roleConfig.moduleRoute, '04-module-list', roleConfig.key);
    });

    test('05 — new/create page (if available)', async () => {
      if (!loginSuccess || !roleConfig.newRoute) return;
      await visitAndCapture(page, roleConfig.newRoute, '05-new-page', roleConfig.key);
    });

    test('06 — report page (if accessible)', async () => {
      if (!loginSuccess || !roleConfig.reportRoute) return;
      await visitAndCapture(page, roleConfig.reportRoute, '06-report', roleConfig.key);
    });

    test('07 — action inbox', async () => {
      if (!loginSuccess) return;
      await visitAndCapture(page, '/inbox', '07-inbox', roleConfig.key);
    });

    test('08 — access-denied state (restricted route)', async () => {
      if (!loginSuccess) return;
      // Try to access a route this role shouldn't have
      const restrictedRoute = roleConfig.key === 'admin' ? '/admin/users' : '/admin/users';
      if (roleConfig.key !== 'admin') {
        await visitAndCapture(page, restrictedRoute, '08-access-denied', roleConfig.key);
      }
    });

    test('09 — reports hub (/reports)', async () => {
      if (!loginSuccess) return;
      await visitAndCapture(page, '/reports', '09-reports-hub', roleConfig.key);
    });

    test('10 — notifications', async () => {
      if (!loginSuccess) return;
      await visitAndCapture(page, '/notifications', '10-notifications', roleConfig.key);
    });
  });
}
