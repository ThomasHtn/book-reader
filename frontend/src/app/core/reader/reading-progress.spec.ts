import { BookSummary } from '@core/http/api.model';
import {
  ReadingProgress,
  parseProgress,
  readingProgressPercent,
  resumableBookId,
  sortLibrary,
  startPosition,
} from './reading-progress';

const book = (id: string, activatedAt: string): BookSummary => ({
  id,
  title: `Titre ${id}`,
  author: 'Auteur',
  activatedAt,
});

const progress = (updatedAt: string, finished = false): ReadingProgress => ({
  blockIndex: 3,
  charOffset: 12,
  finished,
  updatedAt,
});

describe('parseProgress', () => {
  it('reads a stored progress', () => {
    expect(
      parseProgress(
        '{"blockIndex":3,"charOffset":12,"finished":false,"updatedAt":"2026-09-17T10:00:00Z"}',
      ),
    ).toEqual(progress('2026-09-17T10:00:00Z'));
  });

  it('treats missing or corrupt data as no progress', () => {
    expect(parseProgress(null)).toBeUndefined();
    expect(parseProgress('not json')).toBeUndefined();
    expect(
      parseProgress('{"blockIndex":-1,"charOffset":0,"finished":false,"updatedAt":"x"}'),
    ).toBeUndefined();
    expect(
      parseProgress('{"blockIndex":"3","charOffset":0,"finished":false,"updatedAt":"x"}'),
    ).toBeUndefined();
    expect(parseProgress('[]')).toBeUndefined();
  });
});

describe('startPosition', () => {
  it('resumes at the stored position', () => {
    expect(startPosition(progress('t'), 10)).toEqual({ blockIndex: 3, charOffset: 12 });
  });

  it('starts at the beginning for a never opened or finished book', () => {
    expect(startPosition(undefined, 10)).toEqual({ blockIndex: 0, charOffset: 0 });
    expect(startPosition(progress('t', true), 10)).toEqual({ blockIndex: 0, charOffset: 0 });
  });

  it('starts at the beginning when the block index exceeds the book', () => {
    expect(startPosition(progress('t'), 3)).toEqual({ blockIndex: 0, charOffset: 0 });
  });
});

describe('readingProgressPercent', () => {
  it('rounds the current block over the total', () => {
    expect(readingProgressPercent({ blockIndex: 0, charOffset: 0 }, 5)).toBe(20);
    expect(readingProgressPercent({ blockIndex: 4, charOffset: 0 }, 5)).toBe(100);
  });
});

describe('sortLibrary', () => {
  const books = [
    book('never-old', '2026-01-01T00:00:00Z'),
    book('read-old', '2026-02-01T00:00:00Z'),
    book('never-new', '2026-03-01T00:00:00Z'),
    book('read-new', '2026-01-15T00:00:00Z'),
    book('finished', '2026-01-20T00:00:00Z'),
  ];
  const stored: Record<string, ReadingProgress> = {
    'read-old': progress('2026-09-01T00:00:00Z'),
    'read-new': progress('2026-09-10T00:00:00Z'),
    finished: progress('2026-09-05T00:00:00Z', true),
  };

  it('lists read books by last reading, finished ones included, then never opened ones by activation', () => {
    const entries = sortLibrary(books, (id) => stored[id]);

    expect(entries.map((entry) => entry.book.id)).toEqual([
      'read-new',
      'finished',
      'read-old',
      'never-new',
      'never-old',
    ]);
  });

  it('marks only the first row as current, when it is in progress', () => {
    const entries = sortLibrary(books, (id) => stored[id]);

    expect(entries.map((entry) => entry.current)).toEqual([true, false, false, false, false]);
    expect(entries.map((entry) => entry.finished)).toEqual([false, true, false, false, false]);
  });

  it('marks no row as current when the last read book is finished', () => {
    const entries = sortLibrary(books, (id) => (id === 'finished' ? stored[id] : undefined));

    expect(entries[0].book.id).toBe('finished');
    expect(entries.some((entry) => entry.current)).toBe(false);
  });
});

describe('resumableBookId', () => {
  const books = [book('a', '2026-01-01T00:00:00Z')];

  it('resumes the last opened book when it is active and not finished', () => {
    expect(resumableBookId('a', books, () => progress('t'))).toBe('a');
  });

  it('does not resume a finished, withdrawn or unknown book', () => {
    expect(resumableBookId('a', books, () => progress('t', true))).toBeNull();
    expect(resumableBookId('gone', books, () => progress('t'))).toBeNull();
    expect(resumableBookId(null, books, () => progress('t'))).toBeNull();
  });

  it('resumes a last opened book without stored progress at its first page', () => {
    expect(resumableBookId('a', books, () => undefined)).toBe('a');
  });
});
