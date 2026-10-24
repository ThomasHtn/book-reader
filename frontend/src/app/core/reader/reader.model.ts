import { BookSummary } from '@core/http/api.model';

/**
 * Page turn asked by a footer bar or a key.
 */
export type PageCommand = 'previous' | 'next';

/**
 * Stored under `reader.progress.<bookId>` (specification section 8).
 */
export interface ReadingProgress {
  /**
   * Index in `BookContent.blocks` of the block holding the page's first character.
   */
  readonly blockIndex: number;

  /**
   * Offset in characters of that first character inside its block.
   */
  readonly charOffset: number;

  /**
   * Whether the last page was reached; a finished book reopens at its start.
   */
  readonly finished: boolean;

  /**
   * ISO-8601 instant of the last page turn, which orders "Mes livres".
   */
  readonly updatedAt: string;
}

/**
 * First character of a page, independent of tier and theme (spec section 5.3).
 */
export interface TextPosition {
  /**
   * Index in `BookContent.blocks`.
   */
  readonly blockIndex: number;

  /**
   * Offset in characters inside that block.
   */
  readonly charOffset: number;
}

/**
 * A row of "Mes livres" (spec section 5.4).
 */
export interface LibraryEntry {
  /**
   * Book the row opens.
   */
  readonly book: BookSummary;

  /**
   * Whether this is the book being read, shown first and tagged.
   */
  readonly current: boolean;

  /**
   * Whether the book was read to the end or marked as read.
   */
  readonly finished: boolean;
}

/**
 * Page count of each chapter; `undefined` for a chapter not laid out yet under the current layout.
 */
export type MeasuredCounts = readonly (number | undefined)[];
