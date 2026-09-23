import { BookSummary } from '@core/http/api.model';
import {
  ReadingProgress,
  parseProgress,
  resumableBookId,
  sortLibrary,
  startPosition,
  withReadMark,
} from './reading-progress';

const book = (id: string, activatedAt: string, finishedAt: string | null = null): BookSummary => ({
  id,
  title: `Titre ${id}`,
  author: 'Auteur',
  activatedAt,
  finishedAt,
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

describe('withReadMark', () => {
  it('keeps the stored progress when the book is not marked as read', () => {
    expect(withReadMark(progress('2026-09-17T10:00:00.000Z'), null)).toEqual(
      progress('2026-09-17T10:00:00.000Z'),
    );
    expect(withReadMark(undefined, null)).toBeUndefined();
  });

  it('turns a book marked as read after the last reading into a finished book', () => {
    expect(
      withReadMark(progress('2026-09-17T10:00:00.000Z'), '2026-09-18T08:00:00.123456Z'),
    ).toEqual({
      blockIndex: 0,
      charOffset: 0,
      finished: true,
      updatedAt: '2026-09-18T08:00:00.123Z',
    });
    expect(withReadMark(undefined, '2026-09-18T08:00:00Z')?.finished).toBe(true);
  });

  it('lets a reading after the mark win', () => {
    expect(withReadMark(progress('2026-09-19T10:00:00.000Z'), '2026-09-18T08:00:00Z')).toEqual(
      progress('2026-09-19T10:00:00.000Z'),
    );
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

  it('lists a book marked as read as finished, by the date of the mark', () => {
    const marked = [...books, book('marked', '2026-01-01T00:00:00Z', '2026-09-07T00:00:00Z')];
    const entries = sortLibrary(marked, (id) => stored[id]);

    expect(entries.map((entry) => entry.book.id).slice(0, 4)).toEqual([
      'read-new',
      'marked',
      'finished',
      'read-old',
    ]);
    expect(entries[1].finished).toBe(true);
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

  it('does not resume a book marked as read since the last reading', () => {
    const marked = [book('a', '2026-01-01T00:00:00Z', '2026-09-18T00:00:00Z')];
    expect(resumableBookId('a', marked, () => progress('2026-09-17T00:00:00Z'))).toBeNull();
    expect(resumableBookId('a', marked, () => progress('2026-09-19T00:00:00Z'))).toBe('a');
  });

  it('resumes a last opened book without stored progress at its first page', () => {
    expect(resumableBookId('a', books, () => undefined)).toBe('a');
  });
});
