import { defineConfig, devices } from '@playwright/test';

/**
 * On CI an HTML report is kept and a stray `test.only` fails the run.
 */
const ci = !!process.env['CI'];

/**
 * End-to-end journey of specification section 12, against the whole app from its images: `make reset`,
 * `make up`, then `npm run e2e`, or the delivery workflow. The journey starts from an empty library.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  // One serial journey: each step builds on the library the previous one left.
  fullyParallel: false,
  workers: 1,
  forbidOnly: ci,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:8000',
    locale: 'fr-FR',
    // The service worker would answer requests that `page.route` then never sees.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
