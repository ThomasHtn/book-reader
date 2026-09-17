import texts from './maupassant.json' with { type: 'json' };
import { TestBook } from './epub';

/** Guy de Maupassant, 1887, public domain: long enough for tens of pages at tier 100. */
export const LE_HORLA: TestBook = {
  title: 'Le Horla',
  author: 'Guy de Maupassant',
  chapters: [
    { title: 'Première partie', paragraphs: texts.horla.slice(0, 20) },
    { title: 'Seconde partie', paragraphs: texts.horla.slice(20) },
  ],
};

/** Guy de Maupassant, 1886, public domain. */
export const AMOUR: TestBook = {
  title: 'Amour',
  author: 'Guy de Maupassant',
  chapters: [{ title: 'Amour', paragraphs: texts.amour }],
};

/** Administrator key the backend is started with for end-to-end runs. */
export const E2E_ADMIN_KEY =
  process.env['E2E_ADMIN_KEY'] ?? 'e2e-admin-key-0123456789abcdef0123456';
