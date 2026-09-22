import { expect, Page, test } from '@playwright/test';
import { AMOUR, E2E_ADMIN_KEY, LE_HORLA } from './support/books';
import { buildEpub } from './support/epub';

const OUTPUT = '../docs/screenshots';

const THEMES = ['dark-on-light', 'light-on-dark', 'yellow-on-black'] as const;

/** README captures; run on demand with SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts. */
test.skip(!process.env['SCREENSHOTS'], 'Captures are generated on demand only');

test('README screenshots', async ({ page }) => {
  const admin = { 'X-Admin-Key': E2E_ADMIN_KEY };
  const books: { id: string; title: string }[] = await (
    await page.request.get('/api/books')
  ).json();
  for (const book of [LE_HORLA, AMOUR]) {
    if (!books.some((existing) => existing.title === book.title)) {
      await page.request.post('/api/admin/books/upload', {
        headers: admin,
        multipart: {
          file: { name: 'book.epub', mimeType: 'application/epub+zip', buffer: buildEpub(book) },
        },
      });
    }
  }
  const horla = (
    (await (await page.request.get('/api/books')).json()) as { id: string; title: string }[]
  ).find((book) => book.title === 'Le Horla')!;

  for (const theme of THEMES) {
    await page.request.put('/api/admin/settings', {
      headers: admin,
      data: { fontTier: 100, theme },
    });
    for (const width of [1920, 400]) {
      await page.setViewportSize(
        width === 1920 ? { width: 1920, height: 1080 } : { width: 400, height: 860 },
      );
      await openAt(page, horla.id, 6);
      await page.screenshot({ path: `${OUTPUT}/lecture-${width}-${theme}.png` });
    }
  }

  await page.request.put('/api/admin/settings', {
    headers: admin,
    data: { fontTier: 100, theme: 'dark-on-light' },
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/livres');
  await expect(page.locator('button.book-card')).toHaveCount(2);
  await page.mouse.move(960, 900);
  await page.screenshot({ path: `${OUTPUT}/livres-1920.png` });

  await page.setViewportSize({ width: 400, height: 860 });
  await page.evaluate((key) => localStorage.setItem('admin.key', key), E2E_ADMIN_KEY);
  await page.goto('/admin/reglages');
  await expect(page.getByRole('button', { name: '100' })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `${OUTPUT}/admin-reglages-400.png` });
});

async function openAt(page: Page, bookId: string, blockIndex: number): Promise<void> {
  await page.goto('/livres');
  await page.evaluate(
    ([id, block]) => {
      localStorage.setItem(
        `reader.progress.${id}`,
        JSON.stringify({
          blockIndex: block,
          charOffset: 0,
          finished: false,
          updatedAt: new Date().toISOString(),
        }),
      );
    },
    [bookId, blockIndex] as const,
  );
  await page.goto(`/lire/${bookId}`);
  await expect(page.locator('.page-indicator')).toHaveText(/sur \d+/);
  // Rest the pointer on the text, where nothing reacts to hovering.
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
}
