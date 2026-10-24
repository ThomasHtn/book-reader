import { signal } from '@angular/core';

import { BookSummary, ReaderSettings } from '@core/http/api.model';

import { MeasuredCounts, ReadingProgress, TextPosition } from './reader.model';

/**
 * Test double of ReaderData driven by writable signals, so a spec sets what the poll would bring.
 */
export class FakeReaderData {
  /**
   * Book list, `undefined` until the spec stands for a first answer.
   */
  public readonly books = signal<BookSummary[] | undefined>(undefined);

  /**
   * Display settings, `undefined` until the spec stands for a first answer.
   */
  public readonly settings = signal<ReaderSettings | undefined>(undefined);

  /**
   * Set by the spec to show the unreachable server screen.
   */
  public readonly unreachable = signal(false);

  /**
   * Number of `retry()` calls, asserted by the specs.
   */
  public retries = 0;

  /**
   * Counts the call instead of reloading anything.
   */
  public retry(): void {
    this.retries++;
  }
}

/**
 * Test double of ProgressStore backed by plain maps the specs read and seed directly.
 */
export class FakeProgressStore {
  /**
   * Last opened book, as `reader.lastBookId` would hold it.
   */
  public last: string | null = null;

  /**
   * Stored progress by book identifier.
   */
  public readonly progress = new Map<string, ReadingProgress>();

  /**
   * Measured page counts by book identifier, with the layout they belong to.
   */
  public readonly pageCounts = new Map<
    string,
    {
      /**
       * Layout key the counts were measured under.
       */
      layout: string;

      /**
       * One count per chapter, `undefined` where unknown.
       */
      counts: MeasuredCounts;
    }
  >();

  /**
   * Every `save()` call in order, so specs can check what each page turn recorded.
   */
  public readonly saves: {
    /**
     * Book saved.
     */
    bookId: string;

    /**
     * First character of the page shown.
     */
    position: TextPosition;

    /**
     * Whether the last page was shown.
     */
    finished: boolean;
  }[] = [];

  /**
   * Returns `last`.
   */
  public lastBookId(): string | null {
    return this.last;
  }

  /**
   * Reads `progress`.
   */
  public progressOf(bookId: string): ReadingProgress | undefined {
    return this.progress.get(bookId);
  }

  /**
   * Updates `last`.
   */
  public markOpened(bookId: string): void {
    this.last = bookId;
  }

  /**
   * Records the call in `saves` without touching `progress`.
   */
  public save(bookId: string, position: TextPosition, finished: boolean): void {
    this.saves.push({ bookId, position, finished });
  }

  /**
   * Mirrors the real store: counts of another layout or chapter split are unknown.
   */
  public pageCountsOf(
    bookId: string,
    layout: string,
    chapterCount: number,
  ): (number | undefined)[] {
    const stored = this.pageCounts.get(bookId);
    return stored?.layout === layout && stored.counts.length === chapterCount
      ? [...stored.counts]
      : Array.from({ length: chapterCount });
  }

  /**
   * Replaces the counts of a book in `pageCounts`.
   */
  public savePageCounts(bookId: string, layout: string, counts: MeasuredCounts): void {
    this.pageCounts.set(bookId, { layout, counts: [...counts] });
  }
}

/**
 * Builds an active, unmarked book.
 */
export function book(id: string, activatedAt = '2026-09-01T00:00:00Z'): BookSummary {
  return { id, title: `Titre ${id}`, author: `Auteur ${id}`, activatedAt, finishedAt: null };
}

/**
 * jsdom has no ResizeObserver; layout-driven code only needs one that never fires.
 */
export function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      /**
       * Accepts any element and never reports a size.
       */
      public observe = vi.fn();

      /**
       * Spy, so specs can check the observer is released.
       */
      public disconnect = vi.fn();
    },
  );
}
