/**
 * Account registry for screenshot capture.
 * Credentials come from .env.screenshots.local — never hardcoded here.
 * Intended roles are best-guesses; the tool records detected landing pages.
 */

export const ACCOUNTS = [
  {
    key: 'admin',
    label: 'Admin',
    intendedRole: 'admin',
    emailEnvKey: 'SCREENSHOT_ADMIN_EMAIL',
    passwordEnvKey: 'SCREENSHOT_ADMIN_PASSWORD',
    expectedLanding: '/admin-dashboard',
  },
  {
    key: 'stuffs',
    label: 'Owner (Stuffs)',
    intendedRole: 'admin',
    emailEnvKey: 'SCREENSHOT_STUFFS_EMAIL',
    passwordEnvKey: 'SCREENSHOT_STUFFS_PASSWORD',
    expectedLanding: '/admin-dashboard',
  },
  {
    key: 'coo',
    label: 'COO / Operations Manager',
    intendedRole: 'operations_manager',
    emailEnvKey: 'SCREENSHOT_COO_EMAIL',
    passwordEnvKey: 'SCREENSHOT_COO_PASSWORD',
    expectedLanding: '/control-tower',
  },
  {
    key: 'ops',
    label: 'Operations Manager',
    intendedRole: 'operations_manager',
    emailEnvKey: 'SCREENSHOT_OPS_EMAIL',
    passwordEnvKey: 'SCREENSHOT_OPS_PASSWORD',
    expectedLanding: '/control-tower',
  },
  {
    key: 'sales-test',
    label: 'Sales Test (naffco.local)',
    intendedRole: 'sales_user',
    emailEnvKey: 'SCREENSHOT_SALES_TEST_EMAIL',
    passwordEnvKey: 'SCREENSHOT_SALES_TEST_PASSWORD',
    expectedLanding: '/sales',
  },
  {
    key: 'testsales',
    label: 'Test Sales User',
    intendedRole: 'sales_user',
    emailEnvKey: 'SCREENSHOT_TESTSALES_EMAIL',
    passwordEnvKey: 'SCREENSHOT_TESTSALES_PASSWORD',
    expectedLanding: '/sales',
    note: 'Verify role from app behavior — may be sales_coordinator',
  },
  {
    key: 'procurement',
    label: 'Procurement User',
    intendedRole: 'procurement_user',
    emailEnvKey: 'SCREENSHOT_PROCUREMENT_EMAIL',
    passwordEnvKey: 'SCREENSHOT_PROCUREMENT_PASSWORD',
    expectedLanding: '/procurement',
  },
  {
    key: 'factory',
    label: 'Factory User',
    intendedRole: 'factory_user',
    emailEnvKey: 'SCREENSHOT_FACTORY_EMAIL',
    passwordEnvKey: 'SCREENSHOT_FACTORY_PASSWORD',
    expectedLanding: '/factory',
  },
  {
    key: 'store',
    label: 'Store / Warehouse User',
    intendedRole: 'store_user',
    emailEnvKey: 'SCREENSHOT_STORE_EMAIL',
    passwordEnvKey: 'SCREENSHOT_STORE_PASSWORD',
    expectedLanding: '/store',
  },
  {
    key: 'qc',
    label: 'QC User',
    intendedRole: 'qc_user',
    emailEnvKey: 'SCREENSHOT_QC_EMAIL',
    passwordEnvKey: 'SCREENSHOT_QC_PASSWORD',
    expectedLanding: '/qc',
  },
  {
    key: 'afs',
    label: 'AFS User',
    intendedRole: 'afs_user',
    emailEnvKey: 'SCREENSHOT_AFS_EMAIL',
    passwordEnvKey: 'SCREENSHOT_AFS_PASSWORD',
    expectedLanding: '/dubai-afs',
  },
  {
    key: 'viewer',
    label: 'Viewer (Management)',
    intendedRole: 'viewer',
    emailEnvKey: 'SCREENSHOT_VIEWER_EMAIL',
    passwordEnvKey: 'SCREENSHOT_VIEWER_PASSWORD',
    expectedLanding: '/management-dashboard',
  },
];

export function resolveCredentials(account, env) {
  const email = env[account.emailEnvKey];
  const password = env[account.passwordEnvKey];
  if (!email || !password) return null;
  return { email, password };
}
