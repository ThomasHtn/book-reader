import { BookSummary } from '@core/http/api.model';

/** Stored under `reader.progress.<bookId>` (specification section 8). */
export interface ReadingProgress {
  readonly blockIndex: number;
  readonly charOffset: number;
  readonly finished: boolean;
  readonly updatedAt: string;
}

/** First character of a page, independent of tier and theme. */
export interface TextPosition {
  readonly blockIndex: number;
  readonly charOffset: number;
}

/** A row of "Mes livres". */
export interface LibraryEntry {
  readonly book: BookSummary;
  readonly current: boolean;
  readonly finished: boolean;
}

const BOOK_START: TextPosition = { blockIndex: 0, charOffset: 0 };

/**
 * Reads a stored progress, treating anything malformed as absent.
 *
 * @param raw - Stored JSON.
 * @returns Progress, or `undefined`.
 */
export function parseProgress(raw: string | null): ReadingProgress | undefined {
  if (raw === null) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isProgress(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Applies the caregiver's read mark: a book marked after its last reading counts as just finished.
 *
 * @param progress - Stored progress.
 * @param finishedAt - When the book was marked as read, or `null`.
 * @returns Progress to act upon.
 */
export function withReadMark(
  progress: ReadingProgress | undefined,
  finishedAt: string | null,
): ReadingProgress | undefined {
  if (
    finishedAt === null ||
    (progress && Date.parse(progress.updatedAt) >= Date.parse(finishedAt))
  ) {
    return progress;
  }
  // Normalised like ProgressStore dates, so string ordering in sortLibrary holds.
  return { ...BOOK_START, finished: true, updatedAt: new Date(finishedAt).toISOString() };
}

/**
 * Returns where a book opens: its stored position, or its start when finished, unknown or out of range.
 *
 * @param progress - Stored progress.
 * @param blockCount - Number of blocks of the book as received.
 * @returns Position to show.
 */
export function startPosition(
  progress: ReadingProgress | undefined,
  blockCount: number,
): TextPosition {
  if (!progress || progress.finished || progress.blockIndex >= blockCount) {
    return BOOK_START;
  }
  return { blockIndex: progress.blockIndex, charOffset: progress.charOffset };
}

/**
 * Orders "Mes livres": read books (or marked as read) by last reading, then never opened ones by activation.
 *
 * @param books - Active books.
 * @param progressOf - Stored progress of a book.
 * @returns Rows in display order.
 */
export function sortLibrary(
  books: readonly BookSummary[],
  progressOf: (bookId: string) => ReadingProgress | undefined,
): LibraryEntry[] {
  const withProgress = books.map((book) => ({
    book,
    progress: withReadMark(progressOf(book.id), book.finishedAt),
  }));
  const read = withProgress
    .filter((entry) => entry.progress !== undefined)
    .sort((a, b) => compareDesc(a.progress!.updatedAt, b.progress!.updatedAt));
  const neverOpened = withProgress
    .filter((entry) => entry.progress === undefined)
    .sort((a, b) => compareDesc(a.book.activatedAt, b.book.activatedAt));
  return [...read, ...neverOpened].map((entry, index) => ({
    book: entry.book,
    current: index === 0 && entry.progress !== undefined && !entry.progress.finished,
    finished: entry.progress?.finished ?? false,
  }));
}

/**
 * Decides whether `/` resumes a book.
 *
 * @param lastBookId - Stored `reader.lastBookId`.
 * @param books - Active books.
 * @param progressOf - Stored progress of a book.
 * @returns Book to resume, or `null` to show "Mes livres".
 */
export function resumableBookId(
  lastBookId: string | null,
  books: readonly BookSummary[],
  progressOf: (bookId: string) => ReadingProgress | undefined,
): string | null {
  const book = books.find((candidate) => candidate.id === lastBookId);
  if (!book) {
    return null;
  }
  return withReadMark(progressOf(book.id), book.finishedAt)?.finished ? null : book.id;
}

function compareDesc(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0;
}

function isProgress(value: unknown): value is ReadingProgress {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    isNonNegativeInteger(candidate['blockIndex']) &&
    isNonNegativeInteger(candidate['charOffset']) &&
    typeof candidate['finished'] === 'boolean' &&
    typeof candidate['updatedAt'] === 'string'
  );
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
