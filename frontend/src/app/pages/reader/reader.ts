import { httpResource } from '@angular/common/http';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { BookContent } from '@core/http/api.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { httpStatusOf } from '@core/http/http-status.utils';
import { CommandGate } from '@core/reader/command-gate';
import { pageCommandOf } from '@core/reader/page-command.utils';
import { ProgressStore } from '@core/reader/progress-store';
import { POLL_INTERVAL_MS } from '@core/reader/reader.constants';
import { PageCommand, TextPosition } from '@core/reader/reader.model';
import { ReaderData } from '@core/reader/reader-data';
import { startPosition, withReadMark } from '@core/reader/reading-progress.utils';
import { layoutKey } from '@core/reader/stored-page-counts.utils';
import { NavBar } from '@shared/nav-bar/nav-bar';
import { PageHead } from '@shared/page-head/page-head';
import { StatusScreen } from '@shared/status-screen/status-screen';

import {
  chapterContent,
  chapterOfBlock,
  isChapterStart,
  splitIntoChapters,
} from './pagination/chapters.utils';
import { bookPageNumber, bookPageTotal, estimatePageCounts } from './pagination/page-count.utils';
import { nextLocation, previousLocation } from './pagination/page-math.utils';
import { CHAPTER_LAYOUT_FACTORY } from './pagination/pagination.constants';
import {
  Chapter,
  ChapterLayout,
  PageLocation,
  PendingLocation,
} from './pagination/pagination.model';

/**
 * A book once opened: its content, cut into chapters, and the layout showing one of them.
 */
interface OpenedBook {
  /**
   * Book as received.
   */
  readonly content: BookContent;
  /**
   * Chapters of the book, laid out one at a time.
   */
  readonly chapters: readonly Chapter[];
  /**
   * Layout of the visible chapter.
   */
  readonly layout: ChapterLayout;
}

/**
 * Route `/lire/:id`: three commands only, all in the footer (Mes livres, Précédent, Suivant); the
 * text owns everything above them. The current chapter is laid out in columns; other chapters are
 * never laid out for "Page 12 sur 840": their counts are remembered once shown, estimated until then.
 */
@Component({
  selector: 'app-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavBar, PageHead, StatusScreen],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './reader.html',
  styleUrl: './reader.scss',
})
export class Reader {
  /**
   * Book identifier, bound from the route.
   */
  public readonly id = input.required<string>();

  /**
   * Polled settings; a tier change lays the book out again at the same position (spec 5.7).
   */
  private readonly data = inject(ReaderData);

  /**
   * Position, read mark and measured page counts, kept in `localStorage`.
   */
  private readonly store = inject(ProgressStore);

  /**
   * Leaves for "Mes livres" on demand or when the book no longer exists.
   */
  private readonly router = inject(Router);

  /**
   * Gives `document.fonts`, awaited before the first layout (spec 5.2).
   */
  private readonly document = inject(DOCUMENT);

  /**
   * Builds the DOM layout; specs swap it for a fake, since jsdom has no layout.
   */
  private readonly layoutFactory = inject(CHAPTER_LAYOUT_FACTORY);

  /**
   * Content of the book of the route.
   */
  private readonly book = httpResource<BookContent>(() => API_ENDPOINTS.book(this.id()));

  /**
   * Reading surface, focused again after each bar click so Space keeps meaning "Suivant" (spec 5.1).
   */
  private readonly text = viewChild<ElementRef<HTMLElement>>('text');

  /**
   * Box of exactly one page; its size is part of the layout key.
   */
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  /**
   * Multi-column container, translated by one column width per page (spec 5.2).
   */
  private readonly columns = viewChild<ElementRef<HTMLElement>>('columns');

  /**
   * Ignores commands under 400 ms apart and held-key repeats (spec 5.1).
   */
  private readonly gate = new CommandGate();

  /**
   * Title for the visually hidden `h1`; the title page shows it to the eye.
   */
  protected readonly title = computed(() => (this.book.hasValue() ? this.book.value().title : ''));

  /**
   * Shown page, `null` until the first layout, which keeps the screen hidden meanwhile.
   */
  protected readonly location = signal<PageLocation | null>(null);

  /**
   * Page count of the chapter laid out now.
   */
  private readonly chapterPages = signal(0);

  /**
   * Page count of every chapter, measured or estimated.
   */
  private readonly pageCounts = signal<number[]>([]);

  /**
   * Counts measured under the current layout, persisted per book.
   */
  private measured: (number | undefined)[] = [];

  /**
   * Set as soon as a book starts opening, so a later render does not open it twice.
   */
  private opened: OpenedBook | null = null;

  /**
   * First character of the shown page, saved on each turn and restored after a relayout (spec 5.3).
   */
  private position: TextPosition = { blockIndex: 0, charOffset: 0 };

  /**
   * Layout key the current page counts belong to.
   */
  private lastLayoutKey = '';

  /**
   * Whether a relayout is already queued, so a burst of notifications runs only one.
   */
  private relayoutScheduled = false;

  /**
   * Whether the book cannot be loaded for another reason than not existing.
   */
  protected readonly unreachable = computed(() => {
    const error = this.book.error();
    return error !== undefined && httpStatusOf(error) !== 404;
  });

  /**
   * Whether to drop the "Précédent" bar: first page of the book, or nothing shown yet.
   */
  protected readonly isFirst = computed(() => {
    const location = this.location();
    return !location || (location.chapter === 0 && location.page === 0);
  });

  /**
   * Whether to drop the "Suivant" bar; saving there also marks the book finished (spec 4).
   */
  protected readonly isLast = computed(() => {
    const location = this.location();
    const chapterCount = this.opened?.chapters.length ?? 0;
    return !location || nextLocation(location, this.chapterPages(), chapterCount) === null;
  });

  /**
   * "Page 12 sur 840" over the whole book, announced politely on each turn (spec 5.1).
   */
  protected readonly indicator = computed(() => {
    const location = this.location();
    const counts = this.pageCounts();
    if (!location || counts.length === 0) {
      return '';
    }
    const number = bookPageNumber(counts, location.chapter, location.page);
    return `Page ${number} sur ${bookPageTotal(counts)}`;
  });

  /**
   * Wires relayouts on resize and settings, the redirect of a missing book and the retry poll.
   */
  constructor() {
    const destroyRef = inject(DestroyRef);
    const observer = new ResizeObserver(() => this.scheduleRelayout());
    destroyRef.onDestroy(() => observer.disconnect());

    // A deleted or unknown book sends back to the list, without a message (spec 5.6).
    effect(() => {
      const error = this.book.error();
      if (error !== undefined && httpStatusOf(error) === 404) {
        void this.router.navigateByUrl('/livres', { replaceUrl: true });
      }
    });

    // While unreachable, retry at the pace of the data poll (spec 5.6).
    effect((onCleanup) => {
      if (this.unreachable()) {
        const timer = setInterval(() => this.book.reload(), POLL_INTERVAL_MS);
        onCleanup(() => clearInterval(timer));
      }
    });

    // A settings change may bring a new tier, hence a new layout.
    effect(() => {
      this.data.settings();
      this.scheduleRelayout();
    });

    // The view children exist only after a render; each loaded book object is opened once.
    afterRenderEffect(() => {
      const book = this.book.hasValue() ? this.book.value() : undefined;
      const viewport = this.viewport()?.nativeElement;
      const columns = this.columns()?.nativeElement;
      if (book && viewport && columns && book !== this.opened?.content) {
        observer.observe(viewport);
        void this.open(book, viewport, columns);
      }
    });
  }

  /**
   * Turns the page from a footer bar, then gives the focus back to the text so Space keeps working.
   */
  protected onBar(command: PageCommand): void {
    this.turn(command, false);
    this.text()?.nativeElement.focus();
  }

  /**
   * Turns the page from the arrows and Space, intercepted at document level (specification 5.1).
   */
  protected onKeydown(event: KeyboardEvent): void {
    const command = pageCommandOf(event, true);
    if (command && !this.unreachable()) {
      event.preventDefault();
      this.turn(command, event.repeat);
    }
  }

  /**
   * "Mes livres": the only way out of the reader (spec 4).
   */
  protected openLibrary(): void {
    void this.router.navigateByUrl('/livres');
  }

  /**
   * Retries at once from the status screen, ahead of the ten-second poll.
   */
  protected retry(): void {
    this.book.reload();
  }

  /**
   * Opens a book where it was left, once the fonts are ready so the first layout is the right one.
   */
  private async open(
    book: BookContent,
    viewport: HTMLElement,
    columns: HTMLElement,
  ): Promise<void> {
    const opened: OpenedBook = {
      content: book,
      chapters: splitIntoChapters(book.blocks),
      layout: this.layoutFactory(viewport, columns),
    };
    this.opened = opened;
    await (this.document.fonts?.ready ?? Promise.resolve());
    this.store.markOpened(book.id);
    const progress = withReadMark(this.store.progressOf(book.id), book.finishedAt);
    this.layoutAt(opened, startPosition(progress, book.blocks.length));
    this.save(opened);
  }

  /**
   * Moves to the previous or next page, across chapters, unless the command comes too fast.
   */
  private turn(command: PageCommand, repeated: boolean): void {
    const location = this.location();
    const opened = this.opened;
    if (!location || !opened || !this.gate.accept(repeated)) {
      return;
    }
    const target =
      command === 'next'
        ? nextLocation(location, this.chapterPages(), opened.chapters.length)
        : previousLocation(location);
    if (target) {
      this.goTo(opened, target);
      this.save(opened);
    }
  }

  /**
   * Shows a target page, laying its chapter out first when it changes, which resolves `last`.
   */
  private goTo(opened: OpenedBook, target: PendingLocation): void {
    if (target.chapter !== this.location()?.chapter) {
      this.renderChapter(opened, target.chapter);
    }
    const page = target.page === 'last' ? this.chapterPages() - 1 : target.page;
    opened.layout.show(page);
    this.location.set({ chapter: target.chapter, page });
    this.position = opened.layout.positionOfPage(page);
  }

  /**
   * Lays the chapter of a position out again, shows the page holding it and estimates the others.
   */
  private layoutAt(opened: OpenedBook, position: TextPosition): void {
    const { content, chapters, layout } = opened;
    this.lastLayoutKey = this.currentLayoutKey();
    // Counts measured earlier under this exact layout skip the estimate for their chapters.
    this.measured = this.countsPersist()
      ? this.store.pageCountsOf(content.id, this.lastLayoutKey, chapters.length)
      : chapters.map(() => undefined);
    const chapter = chapterOfBlock(chapters, position.blockIndex);
    this.renderChapter(opened, chapter);
    this.pageCounts.set(estimatePageCounts(content, chapters, this.measured, layout.geometry()));
    // A chapter's start is its first page, or a fresh book would skip a title page filling a page alone.
    const page = isChapterStart(chapters[chapter], position)
      ? 0
      : Math.min(layout.pageOf(position), this.chapterPages() - 1);
    layout.show(page);
    this.location.set({ chapter, page });
    this.position = position;
  }

  /**
   * Lays a chapter out and records its page count in place of any estimate.
   */
  private renderChapter({ content, chapters, layout }: OpenedBook, chapter: number): void {
    const pages = layout.render(chapterContent(content, chapters, chapter));
    this.chapterPages.set(pages);
    this.pageCounts.update((counts) =>
      counts.map((count, index) => (index === chapter ? pages : count)),
    );
    if (this.measured[chapter] !== pages) {
      this.measured[chapter] = pages;
      if (this.countsPersist()) {
        this.store.savePageCounts(content.id, this.lastLayoutKey, this.measured);
      }
    }
  }

  /**
   * Counts are stored per tier, so none is read or written before the settings are known.
   */
  private countsPersist(): boolean {
    return this.data.settings() !== undefined;
  }

  /**
   * Persists the position; on the last page it also marks the book finished (spec 4).
   */
  private save(opened: OpenedBook): void {
    this.store.save(opened.content.id, this.position, this.isLast());
  }

  /**
   * Coalesces resize and settings notifications into one layout, skipped when nothing changed.
   */
  private scheduleRelayout(): void {
    if (this.relayoutScheduled) {
      return;
    }
    this.relayoutScheduled = true;
    setTimeout(() => {
      this.relayoutScheduled = false;
      const opened = this.opened;
      if (opened && this.location() && this.currentLayoutKey() !== this.lastLayoutKey) {
        this.layoutAt(opened, this.position);
      }
    });
  }

  /**
   * Viewport size and tier: page counts hold only for the layout they were measured under (spec 5.2).
   */
  private currentLayoutKey(): string {
    const viewport = this.viewport()?.nativeElement;
    return layoutKey(
      viewport?.clientWidth ?? 0,
      viewport?.clientHeight ?? 0,
      this.data.settings()?.fontTier,
    );
  }
}
