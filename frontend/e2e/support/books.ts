import { TestBook } from './epub';
import texts from './maupassant.json' with { type: 'json' };

/**
 * Guy de Maupassant, 1887, public domain: long enough for tens of pages at tier 100.
 */
export const LE_HORLA: TestBook = {
  title: 'Le Horla',
  author: 'Guy de Maupassant',
  chapters: [
    { title: 'Première partie', paragraphs: texts.horla.slice(0, 20) },
    { title: 'Seconde partie', paragraphs: texts.horla.slice(20) },
  ],
};

/**
 * Guy de Maupassant, 1886, public domain.
 */
export const AMOUR: TestBook = {
  title: 'Amour',
  author: 'Guy de Maupassant',
  chapters: [{ title: 'Amour', paragraphs: texts.amour }],
};
