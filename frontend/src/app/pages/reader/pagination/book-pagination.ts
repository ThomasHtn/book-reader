import { computed, signal } from '@angular/core';

import { BookContent } from '@core/http/api.model';
import { ProgressStore } from '@core/reader/progress-store';
import { PageCommand, TextPosition } from '@core/reader/reader.model';

import {
  chapterContent,
  chapterOfBlock,
  isChapterStart,
  splitIntoChapters,
} from './chapters.utils';
import { foliosOf } from './folios.utils';
import { estimatePageCounts } from './page-count.utils';
import { nextLocation, previousLocation, viewStart } from './page-math.utils';
import {
  Chapter,
  ChapterLayout,
  Folios,
  LayoutKey,
  PageLocation,
  PendingLocation,
} from './pagination.model';

/**
 * Pages of one opened book: the chapter laid out, the view shown and the page numbers over the whole
 * book. Only the shown chapter is laid out; the others keep a measured or an estimated count (spec 5.2).
 */
export class BookPagination {
  /**
   * Left page of the view, `null` until the first layout.
   */
  private readonly shown = signal<PageLocation | null>(null);

  /**
   * Page count of the chapter laid out now.
   */
  private readonly chapterPages = signal(0);

  /**
   * Pages shown side by side, as the layout found them at its last render.
   */
  private readonly perView = signal(1);

  /**
   * Page count of every chapter, measured or estimated.
   */
  private readonly pageCounts = signal<number[]>([]);

  /**
   * Chapters of the book, laid out one at a time.
   */
  private readonly chapters: readonly Chapter[];

  /**
   * Counts measured under the current layout, persisted per book.
   */
  private measured: (number | undefined)[] = [];

  /**
   * First character of the view, saved on each turn and restored after a relayout (spec 5.3).
   */
  private firstCharacter: TextPosition = { blockIndex: 0, charOffset: 0 };

  /**
   * Layout the current page counts belong to.
   */
  private key: LayoutKey = { value: '', persisted: false };

  /**
   * Left page of the view, `null` until the first layout.
   */
  public readonly location = this.shown.asReadonly();

  /**
   * Whether the view is the first of the book, or nothing is shown yet.
   */
  public readonly isFirst = computed(() => {
    const location = this.shown();
    return !location || (location.chapter === 0 && location.page === 0);
  });

  /**
   * Whether the view is the last of the book, or nothing is shown yet.
   */
  public readonly isLast = computed(() => {
    const location = this.shown();
    return (
      !location ||
      nextLocation(location, this.chapterPages(), this.chapters.length, this.perView()) === null
    );
  });

  /**
   * Numbers of the pages shown, over the whole book; `null` until the first layout.
   */
  public readonly folios = computed<Folios | null>(() => {
    const location = this.shown();
    const counts = this.pageCounts();
    return location && counts.length > 0
      ? foliosOf(counts, location, this.chapterPages(), this.perView())
      : null;
  });

  /**
   * Cuts the book into chapters; nothing is laid out before `open`.
   */
  constructor(
    public readonly content: BookContent,
    private readonly layout: ChapterLayout,
    private readonly store: ProgressStore,
  ) {
    this.chapters = splitIntoChapters(content.blocks);
  }

  /**
   * Returns the first character of the view.
   *
   * @returns Position to save.
   */
  public position(): TextPosition {
    return this.firstCharacter;
  }

  /**
   * Lays the book out for the first time. A chapter's start opens on its first page, or a fresh book
   * would skip a title page filling a page alone.
   *
   * @param position - Position to show.
   * @param key - Current layout.
   */
  public open(position: TextPosition, key: LayoutKey): void {
    const chapter = chapterOfBlock(this.chapters, position.blockIndex);
    this.layOut(position, isChapterStart(this.chapters[chapter], position), key);
  }

  /**
   * Lays the book out again at the same position when the layout changed; a view at the start of its
   * chapter stays there, so the title page is not mistaken for the page after it.
   *
   * @param key - Current layout.
   */
  public relayout(key: LayoutKey): void {
    const location = this.shown();
    if (location && key.value !== this.key.value) {
      this.layOut(this.firstCharacter, location.page === 0, key);
    }
  }

  /**
   * Moves to the previous or next view, across chapters.
   *
   * @param command - Direction.
   * @returns Whether the view changed.
   */
  public turn(command: PageCommand): boolean {
    const location = this.shown();
    if (!location) {
      return false;
    }
    const target =
      command === 'next'
        ? nextLocation(location, this.chapterPages(), this.chapters.length, this.perView())
        : previousLocation(location, this.perView());
    if (target) {
      this.goTo(target);
    }
    return target !== null;
  }

  /**
   * Shows a target view, laying its chapter out first when it changes, which resolves `last` to the
   * left page of the chapter's last view.
   */
  private goTo(target: PendingLocation): void {
    if (target.chapter !== this.shown()?.chapter) {
      this.renderChapter(target.chapter);
    }
    const page =
      target.page === 'last' ? viewStart(this.chapterPages() - 1, this.perView()) : target.page;
    this.layout.show(page);
    this.shown.set({ chapter: target.chapter, page });
    this.firstCharacter = this.layout.positionOfPage(page);
  }

  /**
   * Lays the chapter of a position out, shows the view holding it and estimates the other chapters.
   */
  private layOut(position: TextPosition, atChapterStart: boolean, key: LayoutKey): void {
    this.key = key;
    // Counts measured earlier under this exact layout skip the estimate for their chapters.
    this.measured = key.persisted
      ? this.store.pageCountsOf(this.content.id, key.value, this.chapters.length)
      : this.chapters.map(() => undefined);
    const chapter = chapterOfBlock(this.chapters, position.blockIndex);
    this.renderChapter(chapter);
    this.pageCounts.set(
      estimatePageCounts(this.content, this.chapters, this.measured, this.layout.geometry()),
    );
    const page = atChapterStart
      ? 0
      : viewStart(Math.min(this.layout.pageOf(position), this.chapterPages() - 1), this.perView());
    this.layout.show(page);
    this.shown.set({ chapter, page });
    this.firstCharacter = position;
  }

  /**
   * Lays a chapter out and records its page count in place of any estimate.
   */
  private renderChapter(chapter: number): void {
    const pages = this.layout.render(chapterContent(this.content, this.chapters, chapter));
    this.chapterPages.set(pages);
    this.perView.set(this.layout.pagesPerView());
    this.pageCounts.update((counts) =>
      counts.map((count, index) => (index === chapter ? pages : count)),
    );
    if (this.measured[chapter] !== pages) {
      this.measured[chapter] = pages;
      if (this.key.persisted) {
        this.store.savePageCounts(this.content.id, this.key.value, this.measured);
      }
    }
  }
}
