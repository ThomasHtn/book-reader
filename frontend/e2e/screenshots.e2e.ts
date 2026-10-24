import { expect, Page, test } from '@playwright/test';

import type { CatalogueEntry } from '../src/app/core/admin/admin.model';
import { seedProgress, uploadBook } from './support/api';
import { AMOUR, LE_HORLA } from './support/books';
import { E2E_ADMIN_KEY } from './support/env';

/**
 * Folder the README embeds, relative to `frontend`.
 */
const OUTPUT = '../docs/screenshots';

/**
 * Captured screens: her PC and a phone, each with where the pointer rests on "Mes livres", below the
 * grid, where nothing reacts to hovering.
 */
const VIEWPORTS = [
  { name: '1920', size: { width: 1920, height: 1080 }, listRestY: 900 },
  { name: '400', size: { width: 400, height: 860 }, listRestY: 840 },
] as const;

/**
 * Search results served in place of the catalogue: one book already active, two not imported yet.
 */
const CATALOGUE_RESULTS: CatalogueEntry[] = [
  {
    entryId: 'https://www.ebooksgratuits.com/details.php?book=476',
    title: 'Le Horla',
    author: 'Guy de Maupassant',
    summary: 'Le journal d’un homme qui sent une présence invisible s’emparer de sa maison.',
    state: 'active',
  },
  {
    entryId: 'https://www.ebooksgratuits.com/details.php?book=1201',
    title: 'Bel-Ami',
    author: 'Guy de Maupassant',
    summary: 'L’ascension d’un séducteur sans scrupules dans le Paris de la presse.',
    state: 'not-imported',
  },
  {
    entryId: 'https://www.ebooksgratuits.com/details.php?book=1202',
    title: 'Pierre et Jean',
    author: 'Guy de Maupassant',
    summary: 'Deux frères qu’un héritage inattendu dresse l’un contre l’autre.',
    state: 'not-imported',
  },
];

/**
 * README captures; run on demand with SCREENSHOTS=1 npx playwright test e2e/screenshots.e2e.ts.
 */
test.skip(!process.env['SCREENSHOTS'], 'Captures are generated on demand only');

test('README screenshots', async ({ page }) => {
  const books: {
    /**
     * Book identifier.
     */
    id: string;

    /**
     * Title, matched to skip books already uploaded by an earlier run.
     */
    title: string;
  }[] = await (await page.request.get('/api/books')).json();
  for (const book of [LE_HORLA, AMOUR]) {
    if (!books.some((existing) => existing.title === book.title)) {
      await uploadBook(page.request, book);
    }
  }
  const horla = (
    (await (await page.request.get('/api/books')).json()) as {
      /**
       * Book identifier.
       */
      id: string;

      /**
       * Title, matched to find Le Horla.
       */
      title: string;
    }[]
  ).find((book) => book.title === 'Le Horla')!;

  await page.request.put('/api/admin/settings', {
    headers: { 'X-Admin-Key': E2E_ADMIN_KEY },
    data: { fontTier: 32 },
  });
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport.size);
    await openAt(page, horla.id, 6);
    await page.screenshot({ path: `${OUTPUT}/lecture-${viewport.name}.png` });
  }

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport.size);
    await page.goto('/livres');
    await expect(page.locator('button.book-card')).toHaveCount(2);
    await page.mouse.move(viewport.size.width / 2, viewport.listRestY);
    await page.screenshot({ path: `${OUTPUT}/livres-${viewport.name}.png` });
  }

  const phone = VIEWPORTS[1];
  await page.setViewportSize(phone.size);
  await page.evaluate((key) => localStorage.setItem('admin.key', key), E2E_ADMIN_KEY);
  // The search is intercepted, so the catalogue site is never contacted.
  await page.route('**/api/admin/catalogue?*', (route) =>
    route.fulfill({ json: CATALOGUE_RESULTS }),
  );
  await page.goto('/admin/catalogue');
  await page.getByLabel('Titre ou auteur').fill('Maupassant');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.locator('.a-card')).toHaveCount(CATALOGUE_RESULTS.length);
  await page.screenshot({ path: `${OUTPUT}/admin-catalogue-${phone.name}.png` });

  await page.goto('/admin/bibliotheque');
  await expect(page.getByText('Le Horla', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${OUTPUT}/admin-bibliotheque-${phone.name}.png` });

  await page.goto('/admin/reglages');
  await expect(page.getByRole('button', { name: '32' })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `${OUTPUT}/admin-reglages-${phone.name}.png` });
});

/**
 * Opens a book at a block, with the pointer resting on the text where nothing reacts to hovering.
 */
async function openAt(page: Page, bookId: string, blockIndex: number): Promise<void> {
  await page.goto('/livres');
  await seedProgress(page, bookId, blockIndex);
  await page.goto(`/lire/${bookId}`);
  await expect(page.locator('.reader [aria-live]')).toHaveText(/^Pages? \d+( et \d+)? sur \d+$/);
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
}
