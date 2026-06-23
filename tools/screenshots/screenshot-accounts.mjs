/**
 * Account registry for screenshot capture.
 * Credentials are loaded from .env.screenshots.local — never hardcoded here.
 */

export const ACCOUNTS = [
  {
    key: 'admin',
    label: 'Admin',
    role: 'admin',
    emailEnvKey: 'SCREENSHOT_ADMIN_EMAIL',
    passwordEnvKey: 'SCREENSHOT_ADMIN_PASSWORD',
    expectedLanding: '/admin-dashboard',
  },
  {
    key: 'stuffs',
    label: 'Owner (Stuffs)',
    role: 'admin',
    emailEnvKey: 'SCREENSHOT_STUFFS_EMAIL',
    passwordEnvKey: 'SCREENSHOT_STUFFS_PASSWORD',
    expectedLanding: '/admin-dashboard',
  },
  {
    key: 'coo',
    label: 'Operations Manager (COO)',
    role: 'operations_manager',
    emailEnvKey: 'SCREENSHOT_COO_EMAIL',
    passwordEnvKey: 'SCREENSHOT_COO_PASSWORD',
    expectedLanding: '/control-tower',
  },
  {
    key: 'ops',
    label: 'Operations Manager (OPS)',
    role: 'operations_manager',
    emailEnvKey: 'SCREENSHOT_OPS_EMAIL',
    passwordEnvKey: 'SCREENSHOT_OPS_PASSWORD',
    expectedLanding: '/control-tower',
  },
  {
    key: 'testsales',
    label: 'Sales User',
    role: 'sales_user',
    emailEnvKey: 'SCREENSHOT_TESTSALES_EMAIL',
    passwordEnvKey: 'SCREENSHOT_TESTSALES_PASSWORD',
    expectedLanding: '/sales',
  },
  {
    key: 'sales_test',
    label: 'Sales Test User',
    role: 'sales_user',
    emailEnvKey: 'SCREENSHOT_SALES_TEST_EMAIL',
    passwordEnvKey: 'SCREENSHOT_SALES_TEST_PASSWORD',
    expectedLanding: '/sales',
  },
  {
    key: 'procurement',
    label: 'Procurement User',
    role: 'procurement_user',
    emailEnvKey: 'SCREENSHOT_PROCUREMENT_EMAIL',
    passwordEnvKey: 'SCREENSHOT_PROCUREMENT_PASSWORD',
    expectedLanding: '/procurement',
  },
  {
    key: 'factory',
    label: 'Factory User',
    role: 'factory_user',
    emailEnvKey: 'SCREENSHOT_FACTORY_EMAIL',
    passwordEnvKey: 'SCREENSHOT_FACTORY_PASSWORD',
    expectedLanding: '/factory',
  },
  {
    key: 'store',
    label: 'Store/Warehouse User',
    role: 'store_user',
    emailEnvKey: 'SCREENSHOT_STORE_EMAIL',
    passwordEnvKey: 'SCREENSHOT_STORE_PASSWORD',
    expectedLanding: '/store',
  },
  {
    key: 'qc',
    label: 'QC User',
    role: 'qc_user',
    emailEnvKey: 'SCREENSHOT_QC_EMAIL',
    passwordEnvKey: 'SCREENSHOT_QC_PASSWORD',
    expectedLanding: '/qc',
  },
  {
    key: 'afs',
    label: 'AFS (Dubai After-Sales) User',
    role: 'afs_user',
    emailEnvKey: 'SCREENSHOT_AFS_EMAIL',
    passwordEnvKey: 'SCREENSHOT_AFS_PASSWORD',
    expectedLanding: '/dubai-afs',
  },
  {
    key: 'viewer',
    label: 'Viewer (Management Dashboard)',
    role: 'viewer',
    emailEnvKey: 'SCREENSHOT_VIEWER_EMAIL',
    passwordEnvKey: 'SCREENSHOT_VIEWER_PASSWORD',
    expectedLanding: '/management-dashboard',
  },
];

/**
 * Resolve credentials from environment variables.
 * Returns null if either env var is missing.
 */
export function resolveCredentials(account, env) {
  const email = env[account.emailEnvKey];
  const password = env[account.passwordEnvKey];
  if (!email || !password) return null;
  return { email, password };
}
