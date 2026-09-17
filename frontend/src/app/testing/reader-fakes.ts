import { signal } from '@angular/core';
import { BookSummary, ReaderSettings } from '@core/http/api.model';
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
}

/** Builds an active book. */
export function book(id: string, activatedAt = '2026-09-01T00:00:00Z'): BookSummary {
  return { id, title: `Titre ${id}`, author: `Auteur ${id}`, activatedAt };
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
