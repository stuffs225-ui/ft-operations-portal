#!/usr/bin/env node
/**
 * capture-all-role-pages.mjs
 *
 * Playwright-based screenshot baseline — REAL_AUTH only.
 * Logs in as each configured account via Supabase and captures all accessible routes.
 *
 * Usage:
 *   node tools/screenshots/capture-all-role-pages.mjs [options]
 *
 * Options:
 *   --account <key>          Only run one account (by key, e.g. "admin")
 *   --dry-run                Print what would be captured, no browser launched
 *   --allow-dev-mode-admin-only  Allow running in dev mode (not for production baseline)
 *
 * Prerequisites:
 *   - .env.local must contain VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 *   - .env.screenshots.local must contain email/password for each account
 *   - App dev server must be running: npm run dev
 *   - Playwright installed: npm install @playwright/test
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

import { ACCOUNTS, resolveCredentials } from './screenshot-accounts.mjs';
import { getStaticRoutesForRole, getDynamicRoutesForRole } from './screenshot-routes.mjs';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SCREENSHOTS_ENV = path.join(ROOT, '.env.screenshots.local');
const OUTPUT_ROOT = path.join(ROOT, 'docs', 'artifact-context', 'screenshots');
const AUTH_DIR = path.join(OUTPUT_ROOT, '.auth');
const RESULTS_FILE = path.join(__dirname, 'screenshot-run-results.json');

// ---------------------------------------------------------------------------
// Load env files
// ---------------------------------------------------------------------------
// Load .env.local for VITE_ vars (needed only to check if Supabase is configured)
dotenvConfig({ path: path.join(ROOT, '.env.local'), override: false });
dotenvConfig({ path: path.join(ROOT, '.env'), override: false });

if (!fs.existsSync(SCREENSHOTS_ENV)) {
  console.error(`ERROR: ${SCREENSHOTS_ENV} not found.`);
  console.error('  Copy .env.screenshots.example to .env.screenshots.local and fill in credentials.');
  process.exit(1);
}
dotenvConfig({ path: SCREENSHOTS_ENV, override: false });

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';
const IS_CI = !!process.env.CI;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const accountFilter = args.includes('--account') ? args[args.indexOf('--account') + 1] : null;
const dryRun = args.includes('--dry-run');
const allowDevMode = args.includes('--allow-dev-mode-admin-only');

// ---------------------------------------------------------------------------
// Supabase proxy routing (Chromium cannot reach external URLs in this container;
// Node.js can. Route all Supabase requests through Node.js fetch.)
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';

async function installSupabaseProxy(context) {
  if (!SUPABASE_URL) return;
  const pattern = `${SUPABASE_URL}/**`;
  await context.route(pattern, async (route, request) => {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();
    const postData = request.postData();
    try {
      const nodeRes = await fetch(url, {
        method,
        headers: { ...headers, host: new URL(url).host },
        body: postData ?? undefined,
        redirect: 'manual',
      });
      const respBody = await nodeRes.arrayBuffer();
      const respHeaders = {};
      nodeRes.headers.forEach((v, k) => { respHeaders[k] = v; });
      await route.fulfill({
        status: nodeRes.status,
        headers: respHeaders,
        body: Buffer.from(respBody),
      });
    } catch (err) {
      console.warn(`  [proxy] ${method} ${url.slice(0, 80)} — ${err.message}`);
      await route.abort('failed');
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safeName(routePath) {
  if (routePath === '/') return 'root';
  return routePath.replace(/^\//, '').replace(/\//g, '--').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function waitForApp(maxWaitMs = IS_CI ? 90000 : 45000) {
  const { default: http } = await import('http');
  const url = new URL(BASE_URL);
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 1000));
    attempt++;
    const ok = await new Promise((resolve) => {
      const req = http.get(
        { hostname: url.hostname, port: url.port || 5173, path: '/' },
        () => resolve(true),
      );
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    if (IS_CI) {
      console.log(`  Waiting for app… attempt ${attempt}`);
    } else {
      process.stdout.write('.');
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Auth mode detection — REAL_AUTH vs DEV_MODE_ADMIN_ONLY
// ---------------------------------------------------------------------------
async function detectAuthMode(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
  await installSupabaseProxy(context);
  const page = await context.newPage();
  let mode = 'REAL_AUTH';
  try {
    // Use a private context with no storage state
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Wait up to 5s for either the login form or a redirect away from /login
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      mode = 'DEV_MODE_ADMIN_ONLY';
    } else {
      // Check if the login form is visible
      const emailInput = await page.$('input[type="email"]');
      if (!emailInput) {
        // Page loaded but no form visible yet
        await page.waitForSelector('input[type="email"]', { timeout: 10000 }).catch(() => null);
        const url2 = page.url();
        if (!url2.includes('/login')) mode = 'DEV_MODE_ADMIN_ONLY';
      }
    }
  } catch {
    // Timeout or error — assume real auth (will fail later with clearer error)
    mode = 'REAL_AUTH';
  } finally {
    await context.close();
  }
  return mode;
}

// ---------------------------------------------------------------------------
// Login for one account
// ---------------------------------------------------------------------------
async function loginAccount(browser, account, creds) {
  const authPath = path.join(AUTH_DIR, `${account.key}.json`);
  ensureDir(AUTH_DIR);

  // Try reusing saved auth state
  if (fs.existsSync(authPath)) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      ignoreHTTPSErrors: true,
      storageState: authPath,
    });
    await installSupabaseProxy(context);
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(20000);
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);
      const url = page.url();
      if (!url.includes('/login')) {
        // Detect actual role from page
        const detectedRole = await detectRoleFromPage(page);
        const detectedLanding = new URL(url).pathname;
        await context.close();
        return { ok: true, detectedLanding, detectedRole, reused: true, authPath };
      }
    } catch { /* fall through to fresh login */ }
    await context.close();
  }

  // Fresh login
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
  await installSupabaseProxy(context);
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(20000);

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Wait for auth state to resolve (Login page shows spinner until auth check completes)
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
    await page.fill('input[type="email"]', creds.email);
    // Password field type may toggle — wait for it
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.fill('input[type="password"]', creds.password);
    await page.click('button[type="submit"]');

    // Wait for redirect away from /login
    await page.waitForFunction(
      () => !window.location.pathname.startsWith('/login'),
      { timeout: 25000 },
    );

    await page.waitForTimeout(1000);
    const url = page.url();
    const detectedLanding = new URL(url).pathname;
    const detectedRole = await detectRoleFromPage(page);

    // Save storage state
    await context.storageState({ path: authPath });
    await context.close();

    return { ok: true, detectedLanding, detectedRole, reused: false, authPath };
  } catch (err) {
    await context.close();
    return { ok: false, error: err.message, detectedLanding: null, detectedRole: null };
  }
}

// ---------------------------------------------------------------------------
// Detect role label from page UI (sidebar badge / user chip)
// ---------------------------------------------------------------------------
async function detectRoleFromPage(page) {
  try {
    // Try common selectors for role display in the header/sidebar
    const selectors = [
      '[data-testid="user-role"]',
      '[data-testid="role-badge"]',
      '.role-badge',
      '[class*="badgeClass"]',
    ];
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) return (await el.innerText()).trim();
    }
    // Fallback: look for text that matches known role labels
    const bodyText = await page.evaluate(() => document.body.innerText);
    const roleLabels = [
      'Admin', 'Operations Manager', 'Sales User', 'Sales Coordinator',
      'Procurement User', 'Factory User', 'Store User', 'QC User',
      'AFS User', 'Viewer',
    ];
    for (const label of roleLabels) {
      if (bodyText.includes(label)) return label;
    }
  } catch { /* ignore */ }
  return null;
}

// ---------------------------------------------------------------------------
// Capture all routes for one logged-in account
// ---------------------------------------------------------------------------
async function captureRoutes(browser, account, env, loginResult) {
  // Build route list: static + dynamic (if sample IDs provided)
  const role = account.intendedRole;
  const staticRoutes = getStaticRoutesForRole(role);
  const dynamicRoutes = getDynamicRoutesForRole(role, env);
  const routes = [...staticRoutes, ...dynamicRoutes];

  // In dry-run mode skip all browser interaction
  if (dryRun) {
    const screenshots = [];
    for (const route of routes) {
      const moduleDir = path.join(OUTPUT_ROOT, account.key, route.moduleSlug);
      const filename = `${safeName(route.path)}.png`;
      const filePath = path.join(moduleDir, filename);
      const relPath = path.relative(ROOT, filePath);
      console.log(`  [DRY-RUN] ${route.path} → ${relPath}`);
      screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status: 'dry_run' });
    }
    return { screenshots, captured: 0, errored: 0, skippedDynamic: 0, accessRestricted: 0 };
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true,
    storageState: loginResult.authPath,
  });
  await installSupabaseProxy(context);
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(15000);

  const screenshots = [];
  let captured = 0;
  let errored = 0;
  let skippedDynamic = 0;
  let accessRestricted = 0;

  for (const route of routes) {
    const moduleDir = path.join(OUTPUT_ROOT, account.key, route.moduleSlug);
    ensureDir(moduleDir);
    const filename = `${safeName(route.path)}.png`;
    const filePath = path.join(moduleDir, filename);
    const relPath = path.relative(ROOT, filePath);

    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(500);

      const finalUrl = page.url();

      // Session expired check
      if (finalUrl.includes('/login')) {
        console.warn(`  [${route.path}] Session expired — redirected to login`);
        screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status: 'session_expired' });
        errored++;
        continue;
      }

      // Detect access-restricted render (RequireRole 403 panel)
      const shieldEl = await page.$('svg.lucide-shield-alert, [class*="ShieldAlert"]').catch(() => null);
      const accessDeniedText = await page.evaluate(() => {
        return document.body.innerText.includes('Access restricted') ||
               document.body.innerText.includes('don\'t have permission');
      });
      const isAccessRestricted = !!(shieldEl || accessDeniedText);

      await page.screenshot({ path: filePath, fullPage: false });

      const status = isAccessRestricted ? 'access_restricted' : 'captured';
      if (isAccessRestricted) {
        accessRestricted++;
        console.log(`  ⚠ ${route.path} [access_restricted]`);
      } else {
        captured++;
        console.log(`  ✓ ${route.path}`);
      }
      screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status });
    } catch (err) {
      console.error(`  ✗ ${route.path} — ${err.message.split('\n')[0]}`);
      screenshots.push({ route: route.path, name: route.name, module: route.moduleSlug, file: relPath, status: 'error', error: err.message.split('\n')[0] });
      errored++;
    }
  }

  await context.close();
  return { screenshots, captured, errored, skippedDynamic, accessRestricted };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== FT Operations Portal — Screenshot Baseline Capture (REAL_AUTH) ===');
  console.log(`BASE_URL : ${BASE_URL}`);
  console.log(`DRY-RUN  : ${dryRun}`);
  if (accountFilter) console.log(`FILTER   : ${accountFilter}`);

  const accounts = accountFilter
    ? ACCOUNTS.filter((a) => a.key === accountFilter)
    : ACCOUNTS;

  if (accounts.length === 0) {
    console.error(`No account found with key "${accountFilter}"`);
    process.exit(1);
  }

  // Wait for dev server
  if (!dryRun) {
    process.stdout.write('Waiting for app server');
    const up = await waitForApp();
    process.stdout.write('\n');
    if (!up) {
      console.error('ERROR: App server not responding. Start with: npm run dev');
      process.exit(1);
    }
    console.log('App server is up.');
  }

  ensureDir(OUTPUT_ROOT);

  const chromiumPath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browserOptions = fs.existsSync(chromiumPath) ? { executablePath: chromiumPath } : {};
  // ignoreHTTPSErrors: needed because the container intercepts TLS with a custom CA that
  // Chromium doesn't trust (while curl/Node.js use the system store via NODE_EXTRA_CA_CERTS).
  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'], ...browserOptions });

  // ── REAL_AUTH check ──────────────────────────────────────────────────────
  let authMode = 'REAL_AUTH';
  if (!dryRun) {
    console.log('Checking auth mode…');
    authMode = await detectAuthMode(browser);
    console.log(`Auth mode: ${authMode}`);

    if (authMode === 'DEV_MODE_ADMIN_ONLY') {
      if (!allowDevMode) {
        await browser.close();
        console.error('\nFATAL: App is in DEV_MODE_ADMIN_ONLY — real Supabase auth is not active.');
        console.error('  This baseline requires REAL_AUTH.');
        console.error('  Ensure .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set.');
        console.error('  Restart the dev server after updating .env.local.');
        console.error('  To override (not recommended): add --allow-dev-mode-admin-only flag.');
        process.exit(2);
      } else {
        console.warn('WARNING: Running in DEV_MODE_ADMIN_ONLY (override flag provided).');
        console.warn('  Screenshots will be admin-only and not role-differentiated.');
      }
    }
  }

  const allResults = [];
  const startTime = Date.now();
  let totalCaptured = 0;
  let totalErrors = 0;
  let loginSuccesses = 0;
  let loginFailures = 0;

  for (const account of accounts) {
    const creds = resolveCredentials(account, process.env);
    if (!creds) {
      console.warn(`\n[${account.key}] SKIP — credentials not configured`);
      allResults.push({ account: account.key, status: 'skipped_no_creds', screenshots: [] });
      continue;
    }

    const routes = getStaticRoutesForRole(account.intendedRole);
    console.log(`\n[${account.key}] Starting — intended role: ${account.intendedRole}, routes: ${routes.length}`);

    // Login
    let loginResult;
    if (dryRun) {
      loginResult = { ok: true, detectedLanding: account.expectedLanding, detectedRole: account.intendedRole, authPath: path.join(AUTH_DIR, `${account.key}.json`) };
    } else {
      console.log(`[${account.key}] Logging in…`);
      loginResult = await loginAccount(browser, account, creds).catch((err) => ({
        ok: false,
        error: err.message,
        detectedLanding: null,
        detectedRole: null,
      }));

      if (!loginResult.ok) {
        console.error(`[${account.key}] LOGIN FAILED: ${loginResult.error}`);
        loginFailures++;
        allResults.push({
          account: account.key, label: account.label,
          intendedRole: account.intendedRole,
          loginStatus: 'failed', loginError: loginResult.error,
          detectedLanding: null, detectedRole: null,
          status: 'login_failed', screenshots: [],
        });
        continue;
      }

      loginSuccesses++;
      const reused = loginResult.reused ? ' (reused auth)' : '';
      console.log(`[${account.key}] Login OK${reused}. Landing: ${loginResult.detectedLanding} | Detected role: ${loginResult.detectedRole ?? 'unknown'}`);
    }

    // Capture
    const captureResult = await captureRoutes(browser, account, process.env, loginResult).catch((err) => {
      console.error(`[${account.key}] CAPTURE ERROR: ${err.message}`);
      return { screenshots: [], captured: 0, errored: 1, skippedDynamic: 0, accessRestricted: 0 };
    });

    totalCaptured += captureResult.captured;
    totalErrors += captureResult.errored;
    console.log(`[${account.key}] Done: ${captureResult.captured} captured, ${captureResult.accessRestricted} restricted, ${captureResult.errored} errors`);

    allResults.push({
      account: account.key,
      label: account.label,
      intendedRole: account.intendedRole,
      detectedLanding: loginResult.detectedLanding,
      detectedRole: loginResult.detectedRole,
      loginStatus: 'ok',
      status: 'complete',
      captured: captureResult.captured,
      accessRestricted: captureResult.accessRestricted,
      errored: captureResult.errored,
      screenshots: captureResult.screenshots,
    });
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Run complete in ${elapsed}s — ${totalCaptured} captured, ${totalErrors} errors ===`);
  console.log(`Login: ${loginSuccesses} succeeded, ${loginFailures} failed`);

  if (!dryRun) {
    let currentSha = 'unknown';
    try {
      const { execSync } = await import('child_process');
      currentSha = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch { /* not a git repo or git unavailable */ }

    const results = {
      runAt: new Date().toISOString(),
      sha: currentSha,
      authMode,
      elapsed,
      totalCaptured,
      totalErrors,
      loginSuccesses,
      loginFailures,
      accounts: allResults,
    };
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`Results: ${path.relative(ROOT, RESULTS_FILE)}`);

    // Write a CI-friendly summary line for log scanning
    if (IS_CI) {
      console.log(`\n::notice::Screenshot baseline: ${totalCaptured} captured, ${loginFailures} login failures, ${totalErrors} errors (auth_mode=${authMode})`);
    }
  }

  return { totalCaptured, totalErrors, loginFailures };
}

main().then(({ totalErrors, loginFailures }) => {
  process.exit(totalErrors > 0 || loginFailures > 0 ? 1 : 0);
}).catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
