import { defineConfig, devices } from '@playwright/test';

/**
 * FT Operations Portal — Playwright configuration
 *
 * Run from project root:
 *   npx playwright test
 *
 * Required env vars:
 *   VITE_APP_URL         — e.g. http://localhost:5173 or your staging URL
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 *   TEST_OPS_EMAIL / TEST_OPS_PASSWORD
 *   TEST_SALES_EMAIL / TEST_SALES_PASSWORD
 *   TEST_PROCUREMENT_EMAIL / TEST_PROCUREMENT_PASSWORD
 *   TEST_STORE_EMAIL / TEST_STORE_PASSWORD
 *   TEST_FACTORY_EMAIL / TEST_FACTORY_PASSWORD
 *   TEST_AFS_EMAIL / TEST_AFS_PASSWORD
 *   TEST_QC_EMAIL / TEST_QC_PASSWORD
 */

export default defineConfig({
  testDir: './scripts/playwright',
  outputDir: './docs/ux-audit/playwright-output',
  timeout: 30_000,
  retries: 1,
  workers: 1, // serial — screenshots per role in order

  use: {
    baseURL: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'on',
    video: 'off',
    trace: 'off',
    // Use system Chromium if PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is set
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
