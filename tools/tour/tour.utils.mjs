import { createRequire } from 'node:module';

import { ADMIN_KEY, APP_URL, RESUME_BLOCK } from './tour.constants.mjs';

/**
 * Playwright comes from the frontend workspace, which already pins it for the e2e tests.
 */
export const { chromium } = createRequire(new URL('../../frontend/package.json', import.meta.url))(
  'playwright',
);

/**
 * Search results served in place of the catalogue site, which the tour never contacts.
 */
export const CATALOGUE_RESULTS = [
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
  {
    entryId: 'https://www.ebooksgratuits.com/details.php?book=1203',
    title: 'Une vie',
    author: 'Guy de Maupassant',
    summary: 'Jeanne, de ses rêves de jeune fille aux désillusions d’une vie entière.',
    state: 'not-imported',
  },
];

/**
 * Returns the identifier of an active book by its title.
 */
export async function bookId(title) {
  const books = await (await fetch(`${APP_URL}/api/books`)).json();
  const book = books.find((candidate) => candidate.title === title);
  if (!book) throw new Error(`No book titled ${title}: run seed.mjs first`);
  return book.id;
}

/**
 * Opens a browser context in French, with the backoffice key remembered, Le Horla in progress and
 * Amour finished, and the catalogue search answered locally.
 */
export async function openContext(browser, options) {
  const [horla, amour] = await Promise.all([bookId('Le Horla'), bookId('Amour')]);
  // The service worker would answer navigations itself, out of reach of the routes below.
  const context = await browser.newContext({
    locale: 'fr-FR',
    colorScheme: 'light',
    serviceWorkers: 'block',
    ...options,
  });
  await context.addInitScript(
    ([key, current, finished, block]) => {
      const progress = (blockIndex, done, daysAgo) =>
        JSON.stringify({
          blockIndex,
          charOffset: 0,
          finished: done,
          updatedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
        });
      // Init scripts run on every navigation: seed once, then let the reader save her own position.
      if (localStorage.getItem('tour.seeded')) return;
      localStorage.setItem('tour.seeded', '1');
      localStorage.setItem('admin.key', key);
      localStorage.setItem(`reader.progress.${current}`, progress(block, false, 0));
      localStorage.setItem(`reader.progress.${finished}`, progress(0, true, 3));
    },
    [ADMIN_KEY, horla, amour, RESUME_BLOCK],
  );
  await context.route('**/api/admin/catalogue?*', (route) =>
    route.fulfill({ json: CATALOGUE_RESULTS }),
  );
  return context;
}
