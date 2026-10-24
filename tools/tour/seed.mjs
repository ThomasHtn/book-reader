/**
 * Fills the tour library through the backoffice API: Le Horla and Amour with their real text, six
 * other public-domain titles to fill the shelf, then the default font tier. Safe to run twice.
 * Usage: node seed.mjs
 */
import { readFileSync } from 'node:fs';

import { buildEpub } from '../../frontend/e2e/support/epub.ts';
import { ADMIN_KEY, APP_URL, DEFAULT_TIER } from './tour.constants.mjs';

/**
 * Maupassant's texts the e2e tests already carry, public domain.
 */
const texts = JSON.parse(
  readFileSync(new URL('../../frontend/e2e/support/maupassant.json', import.meta.url), 'utf8'),
);

/**
 * Books in upload order: the last one uploaded is the newest on the shelf.
 */
const BOOKS = [
  ['Madame Bovary', 'Gustave Flaubert'],
  ['Germinal', 'Émile Zola'],
  ['Le Comte de Monte-Cristo', 'Alexandre Dumas'],
  ['Lettres de mon moulin', 'Alphonse Daudet'],
  ['Le Tour du monde en quatre-vingts jours', 'Jules Verne'],
  ['Boule de suif', 'Guy de Maupassant'],
].map(([title, author]) => ({
  title,
  author,
  // Never opened in the tour: one paragraph naming the book stands for its text.
  chapters: [{ title, paragraphs: [`${title}, de ${author}.`] }],
}));
BOOKS.push(
  {
    title: 'Amour',
    author: 'Guy de Maupassant',
    chapters: [{ title: 'Amour', paragraphs: texts.amour }],
  },
  {
    title: 'Le Horla',
    author: 'Guy de Maupassant',
    chapters: [
      { title: 'Première partie', paragraphs: texts.horla.slice(0, 20) },
      { title: 'Seconde partie', paragraphs: texts.horla.slice(20) },
    ],
  },
);

/**
 * Headers of every backoffice call.
 */
const ADMIN = { 'X-Admin-Key': ADMIN_KEY };

const existing = new Set(
  (await (await fetch(`${APP_URL}/api/books`)).json()).map((book) => book.title),
);
for (const book of BOOKS.filter((candidate) => !existing.has(candidate.title))) {
  const form = new FormData();
  form.append('file', new Blob([buildEpub(book)], { type: 'application/epub+zip' }), 'book.epub');
  const response = await fetch(`${APP_URL}/api/admin/books/upload`, {
    method: 'POST',
    headers: ADMIN,
    body: form,
  });
  if (!response.ok) throw new Error(`Upload of ${book.title} failed: ${response.status}`);
}

const settings = await fetch(`${APP_URL}/api/admin/settings`, {
  method: 'PUT',
  headers: { ...ADMIN, 'content-type': 'application/json' },
  body: JSON.stringify({ fontTier: DEFAULT_TIER }),
});
if (!settings.ok) throw new Error(`Settings failed: ${settings.status}`);
console.log(`${BOOKS.length} books, tier ${DEFAULT_TIER}`);
