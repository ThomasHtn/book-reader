import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { AMOUR, E2E_ADMIN_KEY, LE_HORLA } from './support/books';
import { buildEpub } from './support/epub';

/** Minimum delay between two reader commands, plus a margin. */
const COMMAND_GAP_MS = 450;

/** Poll cadence of books and settings, plus a margin. */
const POLL_MS = 12_000;

const FAKE_ENTRY = {
  entryId: 'https://www.ebooksgratuits.com/details.php?book=476',
  title: 'Le Horla',
  author: 'Guy de Maupassant',
  summary: 'La première nouvelle, qui donne son titre au recueil.',
  state: 'not-imported',
};

test.describe.configure({ mode: 'serial' });

/**
 * Specification section 12: one reader session from an empty library to the end of a book. The catalogue
 * site is never contacted: its search is intercepted, and its activation uploads the same EPUB instead.
 */
test('reader journey', async ({ page }) => {
  const readerIndicator = page.locator('.toolbar [aria-live]');
  const bars = page.locator('button.nav-bar');

  await test.step('starts on an empty "Mes livres"', async () => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/livres$/);
    await expect(page.getByRole('heading', { name: 'Mes livres' })).toBeVisible();
    await expect(page.locator('button.row')).toHaveCount(0);
    await expectAccessible(page);
  });

  await test.step('activates a catalogue book from the backoffice', async () => {
    await page.route('**/api/admin/catalogue?*', (route) => route.fulfill({ json: [FAKE_ENTRY] }));
    await page.route('**/api/admin/books/from-catalogue', async (route) => {
      const upload = await page.request.post('/api/admin/books/upload', {
        headers: { 'X-Admin-Key': E2E_ADMIN_KEY },
        multipart: {
          file: {
            name: 'le-horla.epub',
            mimeType: 'application/epub+zip',
            buffer: buildEpub(LE_HORLA),
          },
        },
      });
      await route.fulfill({
        status: upload.status(),
        contentType: 'application/json',
        body: await upload.text(),
      });
    });

    await page.goto('/admin');
    await expectAccessible(page);
    await page.getByLabel("Clé d'administration").fill('wrong-key-for-the-journey');
    await page.getByRole('button', { name: 'Entrer' }).click();
    await expect(page.getByRole('alert')).toHaveText('Clé incorrecte');
    await page.getByLabel("Clé d'administration").fill(E2E_ADMIN_KEY);
    await page.getByRole('button', { name: 'Entrer' }).click();

    await page.getByLabel('Titre ou auteur').fill('Horla');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    const card = page.locator('.a-card', { hasText: 'Le Horla' });
    await expectAccessible(page);
    await card.getByRole('button', { name: 'Activer' }).click();
    await expect(card).toContainText('Livre activé');
    await expect(card).toContainText('Déjà active');
  });

  await test.step('uploads a second book and visits every backoffice section', async () => {
    await page.getByRole('link', { name: 'Dépôt' }).click();
    await page.getByLabel('Choisir un fichier EPUB').setInputFiles({
      name: 'amour.epub',
      mimeType: 'application/epub+zip',
      buffer: buildEpub(AMOUR),
    });
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.getByText('Livre ajouté et activé : Amour')).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('link', { name: 'Bibliothèque' }).click();
    await expect(page.locator('.a-item')).toHaveCount(2);
    await expectAccessible(page);

    await page.getByRole('link', { name: 'Réglages' }).click();
    await expect(page.getByRole('button', { name: '100' })).toHaveAttribute('aria-pressed', 'true');
    await expectAccessible(page);
  });

  let horlaUrl = '';

  await test.step('opens a book and reads ten pages', async () => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/livres$/);
    await page.locator('button.row', { hasText: 'Le Horla' }).click();
    await expect(page).toHaveURL(/\/lire\//);
    horlaUrl = new URL(page.url()).pathname;
    await expect(readerIndicator).toHaveText(/^Page 1( sur \d+)?$/);
    await expect(bars.first()).toHaveAttribute('aria-disabled', 'true');

    for (let turn = 0; turn < 10; turn++) {
      await page.keyboard.press(turn % 2 === 0 ? 'ArrowRight' : 'Space');
      await page.waitForTimeout(COMMAND_GAP_MS);
    }
    await expect(readerIndicator).toHaveText(/^Page 11 sur \d+$/);
    await expectAccessible(page);
  });

  await test.step('goes back to the list, where the book is current', async () => {
    await page.getByRole('button', { name: 'Mes livres' }).click();
    await expect(page).toHaveURL(/\/livres$/);
    const first = page.locator('button.row').first();
    await expect(first).toContainText('Le Horla');
    await expect(first).toHaveClass(/row--current/);
    await expectAccessible(page);
  });

  await test.step('switches to another book, then comes back to the same page', async () => {
    await page.locator('button.row', { hasText: 'Amour' }).click();
    await expect(readerIndicator).toHaveText(/^Page 1( sur \d+)?$/);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(COMMAND_GAP_MS);
    await page.getByRole('button', { name: 'Mes livres' }).click();
    await expect(page.locator('button.row').first()).toContainText('Amour');

    await page.locator('button.row', { hasText: 'Le Horla' }).click();
    await expect(readerIndicator).toHaveText(/^Page 11 sur \d+$/);
  });

  await test.step('resumes after a reload and from the home route', async () => {
    await page.reload();
    await expect(readerIndicator).toHaveText(/^Page 11 sur \d+$/);
    await page.goto('/');
    await expect(page).toHaveURL(new RegExp(`${horlaUrl}$`));
    await expect(readerIndicator).toHaveText(/^Page 11 sur \d+$/);
  });

  await test.step('applies a new tier without reloading, keeping the position', async () => {
    const before = await storedProgress(page, horlaUrl);
    const totalBefore = Number((await readerIndicator.textContent())!.match(/sur (\d+)/)![1]);
    const saved = await page.request.put('/api/admin/settings', {
      headers: { 'X-Admin-Key': E2E_ADMIN_KEY },
      data: { fontTier: 140, theme: 'yellow-on-black' },
    });
    expect(saved.ok()).toBe(true);

    await expect(page.locator('html')).toHaveAttribute('data-tier', '140', { timeout: POLL_MS });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'yellow-on-black');
    await expect
      .poll(async () =>
        Number(((await readerIndicator.textContent()) ?? '').match(/sur (\d+)/)?.[1] ?? 0),
      )
      .toBeGreaterThan(totalBefore);
    expect(await storedProgress(page, horlaUrl)).toMatchObject({
      blockIndex: before.blockIndex,
      charOffset: before.charOffset,
    });
    await expectAccessible(page);
  });

  await test.step('shows the unavailable screen while the server is down, then recovers alone', async () => {
    await page.route('**/api/**', (route) => route.abort('connectionrefused'));
    await page.reload();
    await expect(
      page.getByText('Le service est indisponible, nouvel essai dans quelques secondes.'),
    ).toBeVisible();
    await expectAccessible(page);

    await page.unroute('**/api/**');
    await expect(readerIndicator).toHaveText(/^Page \d+/, { timeout: POLL_MS });
  });

  await test.step('marks the book finished on its last page, and unmarks it when turning back', async () => {
    await page.evaluate(async (path) => {
      const id = path.split('/').pop()!;
      const book = await (await fetch(`/api/books/${id}`)).json();
      localStorage.setItem(
        `reader.progress.${id}`,
        JSON.stringify({
          blockIndex: book.blocks.length - 1,
          charOffset: 0,
          finished: false,
          updatedAt: new Date().toISOString(),
        }),
      );
    }, horlaUrl);
    await page.reload();
    await expect(readerIndicator).toHaveText(/^Page \d+/);

    for (
      let turn = 0;
      turn < 60 && (await bars.last().getAttribute('aria-disabled')) !== 'true';
      turn++
    ) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(COMMAND_GAP_MS);
    }
    await expect(bars.last()).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText('Fin du livre')).toBeInViewport();
    expect((await storedProgress(page, horlaUrl)).finished).toBe(true);

    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await storedProgress(page, horlaUrl)).finished).toBe(false);
  });
});

async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

async function storedProgress(
  page: Page,
  readerPath: string,
): Promise<{ blockIndex: number; charOffset: number; finished: boolean }> {
  return page.evaluate(
    (path) =>
      JSON.parse(localStorage.getItem(`reader.progress.${path.split('/').pop()}`) ?? 'null'),
    readerPath,
  );
}
