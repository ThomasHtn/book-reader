/**
 * Administrator key of the app under test: the demo key of backend/.env.example, which compose.yaml starts with.
 */
export const E2E_ADMIN_KEY =
  process.env['E2E_ADMIN_KEY'] ?? 'book-reader-demo-admin-key-0123456789';
