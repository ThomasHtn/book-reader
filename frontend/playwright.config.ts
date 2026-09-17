import { defineConfig, devices } from '@playwright/test';
import { E2E_ADMIN_KEY } from './e2e/support/books';

const ci = !!process.env['CI'];

/**
 * End-to-end journey of specification section 12. Needs the backend jar built (`./mvnw package`) and an
 * empty PostgreSQL 17 database, E2E_DB_URL (default: localhost:55432/book_reader, book_reader/book_reader).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4200',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: [
    {
      command: 'java -jar ../backend/target/book-reader-0.0.1-SNAPSHOT.jar',
      url: 'http://localhost:8080/actuator/health',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        DB_URL: process.env['E2E_DB_URL'] ?? 'jdbc:postgresql://localhost:55432/book_reader',
        DB_USERNAME: process.env['E2E_DB_USERNAME'] ?? 'book_reader',
        DB_PASSWORD: process.env['E2E_DB_PASSWORD'] ?? 'book_reader',
        ADMIN_API_KEY: E2E_ADMIN_KEY,
        API_DOCS_ENABLED: 'false',
      },
    },
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      timeout: 180_000,
      reuseExistingServer: !ci,
    },
  ],
});
