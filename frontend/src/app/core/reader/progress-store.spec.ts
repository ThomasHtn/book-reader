import { TestBed } from '@angular/core/testing';

import { BROWSER_STORAGE } from '@core/storage/browser-storage';

import { ProgressStore } from './progress-store';

/**
 * In-memory `Storage`, so each test starts from an empty, isolated store.
 */
class MemoryStorage implements Storage {
  /**
   * Stored entries in insertion order.
   */
  private readonly items = new Map<string, string>();
  /**
   * Number of stored entries.
   */
  public get length(): number {
    return this.items.size;
  }
  /**
   * Removes every entry.
   */
  public clear(): void {
    this.items.clear();
  }
  /**
   * Returns an entry, `null` when absent, as `localStorage` does.
   */
  public getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  /**
   * Returns the key at a position, `null` past the end.
   */
  public key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  /**
   * Removes one entry.
   */
  public removeItem(key: string): void {
    this.items.delete(key);
  }
  /**
   * Stores or replaces one entry.
   */
  public setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

/**
 * Storage that throws like a browser with privacy settings or a full quota.
 */
class BrokenStorage extends MemoryStorage {
  /**
   * Fails as a blocked `localStorage` does.
   */
  public override getItem(): string | null {
    throw new DOMException('denied', 'SecurityError');
  }
  /**
   * Fails as a full quota does.
   */
  public override setItem(): void {
    throw new DOMException('full', 'QuotaExceededError');
  }
}

/**
 * Builds a store on the given storage, `null` standing for a browser without one.
 */
function storeWith(storage: Storage | null): ProgressStore {
  TestBed.configureTestingModule({ providers: [{ provide: BROWSER_STORAGE, useValue: storage }] });
  return TestBed.inject(ProgressStore);
}

describe('ProgressStore', () => {
  it('keeps the page counts measured for the current layout of a book', () => {
    const storage = new MemoryStorage();
    const store = storeWith(storage);

    store.savePageCounts('book-1', '800x600:100', [3, undefined]);

    expect(store.pageCountsOf('book-1', '800x600:100', 2)).toEqual([3, undefined]);
    expect(store.pageCountsOf('book-1', '800x600:140', 2)).toEqual([undefined, undefined]);
    expect(storage.getItem('reader.pages.book-1')).not.toBeNull();
  });

  it('remembers the last opened book', () => {
    const storage = new MemoryStorage();
    const store = storeWith(storage);

    store.markOpened('book-1');

    expect(store.lastBookId()).toBe('book-1');
    expect(storage.getItem('reader.lastBookId')).toBe('book-1');
  });

  it('saves the position with its date under the book key', () => {
    const storage = new MemoryStorage();
    const store = storeWith(storage);

    store.save('book-1', { blockIndex: 4, charOffset: 17 }, false);

    const saved = store.progressOf('book-1');
    expect(saved).toEqual({
      blockIndex: 4,
      charOffset: 17,
      finished: false,
      updatedAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(saved!.updatedAt))).toBe(false);
    expect(JSON.parse(storage.getItem('reader.progress.book-1')!).blockIndex).toBe(4);
  });

  it('ignores corrupt progress', () => {
    const storage = new MemoryStorage();
    storage.setItem('reader.progress.book-1', '{oops');
    expect(storeWith(storage).progressOf('book-1')).toBeUndefined();
  });

  it('keeps working without storage or when storage throws', () => {
    for (const storage of [null, new BrokenStorage()]) {
      TestBed.resetTestingModule();
      const store = storeWith(storage);

      expect(() => store.markOpened('book-1')).not.toThrow();
      expect(() => store.save('book-1', { blockIndex: 0, charOffset: 0 }, true)).not.toThrow();
      expect(store.lastBookId()).toBeNull();
      expect(store.progressOf('book-1')).toBeUndefined();
    }
  });
});
