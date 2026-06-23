#!/usr/bin/env node
/**
 * capture-all-role-pages.mjs
 *
 * Playwright-based screenshot baseline tool.
 * Logs into the FT Operations Portal as each configured account and
 * captures screenshots of every accessible static route.
 *
 * Usage:
 *   node tools/screenshots/capture-all-role-pages.mjs [--account <key>] [--dry-run]
 *
 * Prerequisites:
 *   - .env.screenshots.local must exist (copy .env.screenshots.example and fill in)
 *   - App dev server must be running at APP_BASE_URL (npm run dev)
 *   - Playwright installed: npm install @playwright/test
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

import { ACCOUNTS, resolveCredentials } from './screenshot-accounts.mjs';
import { getStaticRoutesForRole } from './screenshot-routes.mjs';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const ENV_FILE = path.join(ROOT, '.env.screenshots.local');
const OUTPUT_ROOT = path.join(ROOT, 'docs', 'artifact-context', 'screenshots');
const AUTH_DIR = path.join(OUTPUT_ROOT, '.auth');
const RESULTS_FILE = path.join(__dirname, 'screenshot-run-results.json');

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------
if (!fs.existsSync(ENV_FILE)) {
  console.error(`[capture] ERROR: ${ENV_FILE} not found.`);
  console.error('  Copy .env.screenshots.example to .env.screenshots.local and fill in credentials.');
  process.exit(1);
}
dotenvConfig({ path: ENV_FILE });

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const accountFilter = args.includes('--account') ? args[args.indexOf('--account') + 1] : null;
const dryRun = args.includes('--dry-run');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safeName(routePath) {
  return routePath === '/' ? 'root' : routePath.replace(/^\//, '').replace(/\//g, '--').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function waitForApp(maxWaitMs = 30000) {
  const { default: http } = await import('http');
  const url = new URL(BASE_URL);
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 1000));
    const ok = await new Promise((resolve) => {
      const req = http.get({ hostname: url.hostname, port: url.port || 5173, path: '/' }, () => resolve(true));
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    process.stdout.write('.');
  }
  return false;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
let devModeDetected = null; // cached after first probe

async function probeDevMode(context) {
  if (devModeDetected !== null) return devModeDetected;
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    // In dev mode, /login immediately redirects to the app
    devModeDetected = !url.includes('/login');
    console.log(`[probe] Dev mode: ${devModeDetected} (landed at ${url})`);
  } catch {
    devModeDetected = false;
  } finally {
    await page.close();
  }
  return devModeDetected;
}

async function login(page, email, password, accountKey, isDevMode) {
  if (isDevMode) {
    // Dev mode auto-authenticates as admin — just navigate to root and wait
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);
    console.log(`[${accountKey}] Dev mode — auto-authenticated, landed at ${page.url()}`);
    return;
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Login page shows a loading spinner until auth state resolves — wait for the form to appear
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from /login
  try {
    await page.waitForFunction(
      () => !window.location.pathname.startsWith('/login'),
      { timeout: 20000 },
    );
  } catch {
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Login failed — still at ${currentUrl}. Check credentials for account "${accountKey}".`);
    }
  }
}

// ---------------------------------------------------------------------------
// Capture one account
// ---------------------------------------------------------------------------
async function captureAccount(browser, account, env, isDevMode) {
  const creds = resolveCredentials(account, env);
  if (!creds && !isDevMode) {
    console.warn(`[${account.key}] SKIP — credentials not set (${account.emailEnvKey} / ${account.passwordEnvKey})`);
    return { account: account.key, status: 'skipped_no_creds', screenshots: [] };
  }

  const routes = getStaticRoutesForRole(account.role);
  if (routes.length === 0) {
    console.warn(`[${account.key}] SKIP — no static routes for role "${account.role}"`);
    return { account: account.key, status: 'skipped_no_routes', screenshots: [] };
  }

  // In dev mode, all accounts see the same admin view — skip duplicates beyond the first
  if (isDevMode && account.key !== 'admin') {
    console.log(`[${account.key}] SKIP — dev mode (all accounts share admin view; captured under "admin")`);
    return { account: account.key, status: 'skipped_dev_mode_duplicate', screenshots: [] };
  }

  console.log(`\n[${account.key}] Starting — role: ${account.role}, routes: ${routes.length}${isDevMode ? ' (dev mode — admin view)' : ''}`);

  const authPath = path.join(AUTH_DIR, `${account.key}.json`);
  ensureDir(AUTH_DIR);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    storageState: !isDevMode && fs.existsSync(authPath) ? authPath : undefined,
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(15000);

  // Attempt login
  let loginOk = false;
  if (!isDevMode && fs.existsSync(authPath)) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    loginOk = !page.url().includes('/login');
  }

  if (!loginOk) {
    if (dryRun) {
      console.log(`[${account.key}] DRY-RUN: would log in as ${creds?.email ?? '(dev mode)'}`);
    } else {
      console.log(`[${account.key}] ${isDevMode ? 'Dev mode login…' : 'Logging in…'}`);
      await login(page, creds?.email ?? '', creds?.password ?? '', account.key, isDevMode);
      if (!isDevMode) {
        await context.storageState({ path: authPath });
      }
      console.log(`[${account.key}] Login OK. Detected URL: ${page.url()}`);
    }
  } else {
    console.log(`[${account.key}] Reusing saved auth state`);
  }

  const screenshots = [];
  let captured = 0;
  let errored = 0;

  for (const route of routes) {
    const moduleDir = path.join(OUTPUT_ROOT, account.key, route.moduleSlug);
    ensureDir(moduleDir);
    const filename = `${safeName(route.path)}.png`;
    const filePath = path.join(moduleDir, filename);
    const relPath = path.relative(ROOT, filePath);

    if (dryRun) {
      console.log(`  [DRY-RUN] ${route.path} → ${relPath}`);
      screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status: 'dry_run' });
      continue;
    }

    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });

      // Short settle for any animations
      await page.waitForTimeout(600);

      // Check for redirect to login / 404 / access denied
      const finalUrl = page.url();
      const redirectedToLogin = finalUrl.includes('/login');
      const accessDenied = await page.$('[data-testid="access-denied"], [data-testid="not-found"]').catch(() => null);

      if (redirectedToLogin) {
        console.warn(`  [${route.path}] REDIRECT→LOGIN (session expired?)`);
        screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status: 'redirect_login' });
        errored++;
        continue;
      }

      await page.screenshot({ path: filePath, fullPage: false });
      const statusNote = accessDenied ? 'access_denied_visible' : 'ok';
      console.log(`  ✓ ${route.path} [${statusNote}]`);
      screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status: statusNote });
      captured++;
    } catch (err) {
      console.error(`  ✗ ${route.path} — ${err.message}`);
      screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status: 'error', error: err.message });
      errored++;
    }
  }

  await context.close();
  console.log(`[${account.key}] Done: ${captured} captured, ${errored} errors`);

  return {
    account: account.key,
    label: account.label,
    role: account.role,
    status: 'complete',
    captured,
    errored,
    screenshots,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== FT Operations Portal — Screenshot Baseline Capture ===');
  console.log(`BASE_URL : ${BASE_URL}`);
  console.log(`DRY-RUN  : ${dryRun}`);
  if (accountFilter) console.log(`FILTER   : ${accountFilter}`);

  // Wait for app
  if (!dryRun) {
    process.stdout.write('Waiting for app server');
    const up = await waitForApp(45000);
    process.stdout.write('\n');
    if (!up) {
      console.error('ERROR: App server did not respond. Start it with: npm run dev');
      process.exit(1);
    }
    console.log('App server is up.');
  }

  const accounts = accountFilter
    ? ACCOUNTS.filter((a) => a.key === accountFilter)
    : ACCOUNTS;

  if (accounts.length === 0) {
    console.error(`No account found with key "${accountFilter}"`);
    process.exit(1);
  }

  ensureDir(OUTPUT_ROOT);

  const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browserOptions = fs.existsSync(chromiumPath)
    ? { executablePath: chromiumPath }
    : {};

  const browser = await chromium.launch({ headless: true, ...browserOptions });

  // Probe whether the app is running in dev mode (no Supabase configured)
  const probeContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const isDevMode = await probeDevMode(probeContext);
  await probeContext.close();

  if (isDevMode) {
    console.log('\nNOTE: App is in dev mode (no Supabase configured). All routes will be captured');
    console.log('      under the "admin" account using the auto-authenticated admin profile.');
    console.log('      For per-role screenshots, configure VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env\n');
  }

  const allResults = [];
  const startTime = Date.now();

  for (const account of accounts) {
    const result = await captureAccount(browser, account, process.env, isDevMode).catch((err) => {
      console.error(`[${account.key}] FATAL: ${err.message}`);
      return { account: account.key, status: 'fatal_error', error: err.message, screenshots: [] };
    });
    allResults.push(result);
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalCaptured = allResults.reduce((s, r) => s + (r.captured || 0), 0);
  const totalErrored = allResults.reduce((s, r) => s + (r.errored || 0), 0);

  console.log(`\n=== Run complete in ${elapsed}s — ${totalCaptured} captured, ${totalErrored} errors ===`);

  // Save results JSON (gitignored)
  if (!dryRun) {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify({ runAt: new Date().toISOString(), elapsed, totalCaptured, totalErrored, accounts: allResults }, null, 2));
    console.log(`Results saved to ${path.relative(ROOT, RESULTS_FILE)}`);
  }

  return allResults;
}

main().then((results) => {
  // Generate index after capture
  const anyErrors = results.some((r) => (r.errored || 0) > 0 || r.status === 'fatal_error');
  process.exit(anyErrors ? 1 : 0);
}).catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
