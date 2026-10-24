import { AdminBook } from '@core/admin/admin.model';

import { MATCHES } from './admin-library.constants';
import { bookMeta, fold } from './admin-library.utils';

/**
 * Catalogue book added just before midnight UTC, already the next day in Paris.
 */
const BOOK: AdminBook = {
  id: 'b1',
  title: 'Le Horla',
  author: 'Guy de Maupassant',
  source: 'catalogue',
  sourceUrl: null,
  active: true,
  blockCount: 10,
  activatedAt: '2026-09-16T22:30:00Z',
  createdAt: '2026-09-16T22:30:00Z',
  finishedAt: null,
};

describe('fold', () => {
  it('drops case and diacritics', () => {
    expect(fold('Baudélaire À')).toBe('baudelaire a');
  });
});

describe('MATCHES', () => {
  it('sorts books by state', () => {
    const withdrawn = { ...BOOK, active: false, finishedAt: '2026-09-20T10:00:00Z' };

    expect(MATCHES.all(withdrawn)).toBe(true);
    expect(MATCHES.active(BOOK)).toBe(true);
    expect(MATCHES.active(withdrawn)).toBe(false);
    expect(MATCHES.withdrawn(withdrawn)).toBe(true);
    expect(MATCHES.finished(withdrawn)).toBe(true);
    expect(MATCHES.finished(BOOK)).toBe(false);
  });
});

describe('bookMeta', () => {
  it('gives author, origin and the date of addition on French time', () => {
    expect(bookMeta(BOOK)).toBe('Guy de Maupassant, catalogue, ajouté le 17 septembre 2026');
    expect(bookMeta({ ...BOOK, source: 'upload' })).toContain(', dépôt, ');
  });
});
