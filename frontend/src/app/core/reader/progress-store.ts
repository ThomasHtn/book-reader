import { inject, Service } from '@angular/core';

import { BROWSER_STORAGE, readItem, writeItem } from '@core/storage/browser-storage';

import { parseProgress, ReadingProgress, TextPosition } from './reading-progress';
import { MeasuredCounts, parsePageCounts, serializePageCounts } from './stored-page-counts';

/**
 * Book `/` resumes (spec section 8).
 */
const LAST_BOOK_KEY = 'reader.lastBookId';

/**
 * Prefix of one `ReadingProgress` entry per book, completed by the book identifier.
 */
const PROGRESS_KEY_PREFIX = 'reader.progress.';

/**
 * Prefix of one entry of measured chapter page counts per book (spec section 5.2).
 */
const PAGES_KEY_PREFIX = 'reader.pages.';

/**
 * Reading progress in `localStorage` only (specification section 8). Losing it is accepted, so every
 * storage failure degrades to "no progress" instead of breaking the reader.
 */
@Service()
export class ProgressStore {
  /**
   * Browser storage, `null` when unavailable, in which case nothing is remembered.
   */
  private readonly storage = inject(BROWSER_STORAGE);

  /**
   * Returns the last opened book.
   *
   * @returns Book identifier, or `null`.
   */
  public lastBookId(): string | null {
    return readItem(this.storage, LAST_BOOK_KEY);
  }

  /**
   * Returns the stored progress of a book.
   *
   * @param bookId - Book identifier.
   * @returns Progress, or `undefined` when absent or corrupt.
   */
  public progressOf(bookId: string): ReadingProgress | undefined {
    return parseProgress(readItem(this.storage, PROGRESS_KEY_PREFIX + bookId));
  }

  /**
   * Records that a book was opened.
   *
   * @param bookId - Book identifier.
   */
  public markOpened(bookId: string): void {
    writeItem(this.storage, LAST_BOOK_KEY, bookId);
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
    writeItem(this.storage, PROGRESS_KEY_PREFIX + bookId, JSON.stringify(progress));
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
    return parsePageCounts(readItem(this.storage, PAGES_KEY_PREFIX + bookId), layout, chapterCount);
  }

  /**
   * Saves the page counts measured for a book, replacing those of any other layout.
   *
   * @param bookId - Book identifier.
   * @param layout - Layout key.
   * @param counts - Measured counts.
   */
  public savePageCounts(bookId: string, layout: string, counts: MeasuredCounts): void {
    writeItem(this.storage, PAGES_KEY_PREFIX + bookId, serializePageCounts(layout, counts));
  }
}
