import { signal } from '@angular/core';
import { BookSummary, ReaderSettings } from '@core/http/api.model';
import { MeasuredCounts } from '@core/reader/page-count';
import { ReadingProgress, TextPosition } from '@core/reader/reading-progress';

/** Test double of ReaderData driven by writable signals. */
export class FakeReaderData {
  public readonly books = signal<BookSummary[] | undefined>(undefined);
  public readonly settings = signal<ReaderSettings | undefined>(undefined);
  public readonly unreachable = signal(false);
  public retries = 0;

  public retry(): void {
    this.retries++;
  }
}

/** Test double of ProgressStore backed by plain maps. */
export class FakeProgressStore {
  public last: string | null = null;
  public readonly progress = new Map<string, ReadingProgress>();
  public readonly pageCounts = new Map<string, { layout: string; counts: MeasuredCounts }>();
  public readonly saves: { bookId: string; position: TextPosition; finished: boolean }[] = [];

  public lastBookId(): string | null {
    return this.last;
  }

  public progressOf(bookId: string): ReadingProgress | undefined {
    return this.progress.get(bookId);
  }

  public markOpened(bookId: string): void {
    this.last = bookId;
  }

  public save(bookId: string, position: TextPosition, finished: boolean): void {
    this.saves.push({ bookId, position, finished });
  }

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

  public savePageCounts(bookId: string, layout: string, counts: MeasuredCounts): void {
    this.pageCounts.set(bookId, { layout, counts: [...counts] });
  }
}

/** Builds an active book. */
export function book(id: string, activatedAt = '2026-09-01T00:00:00Z'): BookSummary {
  return { id, title: `Titre ${id}`, author: `Auteur ${id}`, activatedAt, finishedAt: null };
}

/** jsdom has no ResizeObserver; layout-driven code only needs one that never fires. */
export function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      public observe = vi.fn();
      public disconnect = vi.fn();
    },
  );
}
