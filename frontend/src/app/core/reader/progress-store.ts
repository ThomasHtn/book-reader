import { DOCUMENT, inject, InjectionToken, Service } from '@angular/core';
import { MeasuredCounts, parsePageCounts, serializePageCounts } from './page-count';
import { parseProgress, ReadingProgress, TextPosition } from './reading-progress';

/** Browser `localStorage`, `null` where it is unavailable. */
export const BROWSER_STORAGE = new InjectionToken<Storage | null>('BROWSER_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});

const LAST_BOOK_KEY = 'reader.lastBookId';
const PROGRESS_KEY_PREFIX = 'reader.progress.';
const PAGES_KEY_PREFIX = 'reader.pages.';

/**
 * Reading progress in `localStorage` only (specification section 8). Losing it is accepted, so every
 * storage failure degrades to "no progress" instead of breaking the reader.
 */
@Service()
export class ProgressStore {
  private readonly storage = inject(BROWSER_STORAGE);

  /**
   * Returns the last opened book.
   *
   * @returns Book identifier, or `null`.
   */
  public lastBookId(): string | null {
    return this.read(LAST_BOOK_KEY);
  }

  /**
   * Returns the stored progress of a book.
   *
   * @param bookId - Book identifier.
   * @returns Progress, or `undefined` when absent or corrupt.
   */
  public progressOf(bookId: string): ReadingProgress | undefined {
    return parseProgress(this.read(PROGRESS_KEY_PREFIX + bookId));
  }

  /**
   * Records that a book was opened.
   *
   * @param bookId - Book identifier.
   */
  public markOpened(bookId: string): void {
    this.write(LAST_BOOK_KEY, bookId);
  }

  /**
   * Saves the first character of the displayed page.
   *
   * @param bookId - Book identifier.
   * @param position - Position of the page.
   * @param finished - Whether the last page of the book is displayed.
   */
  public save(bookId: string, position: TextPosition, finished: boolean): void {
    const progress: ReadingProgress = {
      ...position,
      finished,
      updatedAt: new Date().toISOString(),
    };
    this.write(PROGRESS_KEY_PREFIX + bookId, JSON.stringify(progress));
  }

  /**
   * Returns the page counts measured for a book under a layout.
   *
   * @param bookId - Book identifier.
   * @param layout - Layout key (viewport size and font tier).
   * @param chapterCount - Number of chapters of the book.
   * @returns One entry per chapter, `undefined` where unknown.
   */
  public pageCountsOf(
    bookId: string,
    layout: string,
    chapterCount: number,
  ): (number | undefined)[] {
    return parsePageCounts(this.read(PAGES_KEY_PREFIX + bookId), layout, chapterCount);
  }

  /**
   * Saves the page counts measured for a book, replacing those of any other layout.
   *
   * @param bookId - Book identifier.
   * @param layout - Layout key.
   * @param counts - Measured counts.
   */
  public savePageCounts(bookId: string, layout: string, counts: MeasuredCounts): void {
    this.write(PAGES_KEY_PREFIX + bookId, serializePageCounts(layout, counts));
  }

  private read(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      // Quota or privacy settings: progress is best effort by design.
    }
  }
}
