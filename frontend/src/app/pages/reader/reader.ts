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
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { BookContent } from '@core/http/api.model';
import { Chapter, chapterOfBlock, splitIntoChapters } from '@core/reader/chapters';
import { COMMAND_INTERVAL_MS, CommandGate } from '@core/reader/command-gate';
import {
  bookPageNumber,
  bookPageTotal,
  Location,
  nextLocation,
  PendingLocation,
  previousLocation,
} from '@core/reader/page-math';
import { ProgressStore } from '@core/reader/progress-store';
import { POLL_INTERVAL_MS, ReaderData } from '@core/reader/reader-data';
import { startPosition, TextPosition } from '@core/reader/reading-progress';
import { NavBar } from '@shared/nav-bar/nav-bar';
import { StatusScreen } from '@shared/status-screen/status-screen';
import { CHAPTER_LAYOUT_FACTORY, ChapterContent, ChapterLayout } from './chapter-layout';

/** Delay before counting other chapters, so the first page is painted before any extra layout. */
const COUNT_START_DELAY_MS = 100;

/**
 * Route `/lire/:id`: three commands only, all in the footer (Mes livres, Précédent, Suivant); the
 * text owns everything above them. The current chapter is laid out in columns; the other chapters
 * are counted one by one in a hidden twin for "Page 12 sur 840".
 */
@Component({
  selector: 'app-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavBar, StatusScreen],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    @if (unavailable()) {
      <app-status-screen (retry)="retry()" />
    } @else {
      <button
        type="button"
        class="button--restart"
        aria-label="Revenir au début du livre"
        (click)="restart()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <div
        class="screen"
        [style.visibility]="location() ? null : 'hidden'"
        (contextmenu)="$event.preventDefault()"
      >
        <div class="page-head">
          <p class="page-indicator" aria-live="polite">{{ indicator() }}</p>
        </div>
        <main>
          <h1 class="visually-hidden">{{ title() }}</h1>
          <section class="paged reading" lang="fr" aria-label="Texte du livre" tabindex="-1" #text>
            <div class="paged-viewport" #viewport>
              <div class="paged-columns" #columns></div>
            </div>
            <div class="paged-viewport paged-viewport--measure" aria-hidden="true" #measureViewport>
              <div class="paged-columns" #measureColumns></div>
            </div>
          </section>
        </main>
        <footer class="nav-footer">
          <div class="nav-row nav-row--exit">
            <button type="button" class="nav-bar nav-bar--exit" (click)="openLibrary()">
              <span>Mes livres</span>
            </button>
            @if (!isFirst()) {
              <app-nav-bar direction="previous" (activate)="onBar('previous')" />
            }
            @if (!isLast()) {
              <app-nav-bar direction="next" (activate)="onBar('next')" />
            }
          </div>
        </footer>
      </div>
    }
  `,
})
export class Reader {
  /** Book identifier, bound from the route. */
  public readonly id = input.required<string>();

  private readonly data = inject(ReaderData);

  private readonly store = inject(ProgressStore);

  private readonly router = inject(Router);

  private readonly document = inject(DOCUMENT);

  private readonly layoutFactory = inject(CHAPTER_LAYOUT_FACTORY);

  private readonly book = httpResource<BookContent>(() => API_ENDPOINTS.book(this.id()));

  private readonly text = viewChild<ElementRef<HTMLElement>>('text');

  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  private readonly columns = viewChild<ElementRef<HTMLElement>>('columns');

  private readonly measureViewport = viewChild<ElementRef<HTMLElement>>('measureViewport');

  private readonly measureColumns = viewChild<ElementRef<HTMLElement>>('measureColumns');

  private readonly gate = new CommandGate(COMMAND_INTERVAL_MS, () => Date.now());

  protected readonly title = computed(() => (this.book.hasValue() ? this.book.value().title : ''));

  protected readonly location = signal<Location | null>(null);

  private readonly counts = signal<(number | undefined)[]>([]);

  private readonly chapterPages = signal(0);

  private content: BookContent | null = null;

  private chapters: Chapter[] = [];

  private position: TextPosition = { blockIndex: 0, charOffset: 0 };

  private visibleLayout: ChapterLayout | null = null;

  private measureLayout: ChapterLayout | null = null;

  private layoutKey = '';

  private generation = 0;

  private relayoutScheduled = false;

  protected readonly unavailable = computed(() => {
    const error = this.book.error();
    return error !== undefined && statusOf(error) !== 404;
  });

  protected readonly isFirst = computed(() => {
    const location = this.location();
    return !location || (location.chapter === 0 && location.page === 0);
  });

  protected readonly isLast = computed(() => {
    const location = this.location();
    return !location || nextLocation(location, this.chapterPages(), this.counts().length) === null;
  });

  protected readonly indicator = computed(() => {
    const location = this.location();
    if (!location) {
      return '';
    }
    const number = bookPageNumber(this.counts(), location.chapter, location.page);
    if (number === undefined) {
      return '';
    }
    const total = bookPageTotal(this.counts());
    return total === undefined ? `Page ${number}` : `Page ${number} sur ${total}`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const observer = new ResizeObserver(() => this.scheduleRelayout());
    destroyRef.onDestroy(() => {
      observer.disconnect();
      this.generation++;
    });

    effect(() => {
      const error = this.book.error();
      if (error !== undefined && statusOf(error) === 404) {
        void this.router.navigateByUrl('/livres', { replaceUrl: true });
      }
    });

    effect((onCleanup) => {
      if (this.unavailable()) {
        const timer = setInterval(() => this.book.reload(), POLL_INTERVAL_MS);
        onCleanup(() => clearInterval(timer));
      }
    });

    effect(() => {
      this.data.settings();
      this.scheduleRelayout();
    });

    afterRenderEffect(() => {
      const book = this.book.hasValue() ? this.book.value() : undefined;
      const viewport = this.viewport()?.nativeElement;
      if (book && viewport && book !== this.content) {
        observer.observe(viewport);
        void this.open(book);
      }
    });
  }

  protected onBar(direction: 'previous' | 'next'): void {
    this.command(direction, false);
    this.text()?.nativeElement.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey || event.metaKey || this.unavailable()) {
      return;
    }
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      this.command('next', event.repeat);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.command('previous', event.repeat);
    }
  }

  protected openLibrary(): void {
    void this.router.navigateByUrl('/livres');
  }

  protected restart(): void {
    if (!this.location()) {
      return;
    }
    this.layoutAt({ blockIndex: 0, charOffset: 0 });
    this.save();
    this.text()?.nativeElement.focus();
  }

  protected retry(): void {
    this.book.reload();
  }

  private async open(book: BookContent): Promise<void> {
    this.content = book;
    await (this.document.fonts?.ready ?? Promise.resolve());
    this.visibleLayout = this.layoutFactory(
      this.viewport()!.nativeElement,
      this.columns()!.nativeElement,
    );
    this.measureLayout = this.layoutFactory(
      this.measureViewport()!.nativeElement,
      this.measureColumns()!.nativeElement,
    );
    this.chapters = splitIntoChapters(book.blocks);
    this.store.markOpened(book.id);
    this.layoutAt(startPosition(this.store.progressOf(book.id), book.blocks.length));
    this.save();
  }

  private command(direction: 'previous' | 'next', repeated: boolean): void {
    const location = this.location();
    if (!location || !this.gate.accept(repeated)) {
      return;
    }
    const target =
      direction === 'next'
        ? nextLocation(location, this.chapterPages(), this.chapters.length)
        : previousLocation(location);
    if (target) {
      this.goTo(target);
      this.save();
    }
  }

  private goTo(target: PendingLocation): void {
    const layout = this.visibleLayout!;
    if (target.chapter !== this.location()?.chapter) {
      this.renderChapter(target.chapter);
    }
    const page = target.page === 'last' ? this.chapterPages() - 1 : target.page;
    layout.show(page);
    this.location.set({ chapter: target.chapter, page });
    this.position = layout.positionOfPage(page);
  }

  /** Lays the chapter of a position out again and shows the page holding it; restarts the page count. */
  private layoutAt(position: TextPosition): void {
    const chapter = chapterOfBlock(this.chapters, position.blockIndex);
    this.counts.set(this.chapters.map(() => undefined));
    this.renderChapter(chapter);
    const page = Math.min(this.visibleLayout!.pageOf(position), this.chapterPages() - 1);
    this.visibleLayout!.show(page);
    this.location.set({ chapter, page });
    this.position = position;
    this.layoutKey = this.currentLayoutKey();
    this.countOtherChapters(chapter);
  }

  private renderChapter(chapter: number): void {
    const pages = this.visibleLayout!.render(this.contentOf(chapter));
    this.chapterPages.set(pages);
    this.counts.update((counts) =>
      counts.map((count, index) => (index === chapter ? pages : count)),
    );
  }

  /** Counts the other chapters one per task, previous ones first, abandoning on any new layout. */
  private countOtherChapters(current: number): void {
    const generation = ++this.generation;
    const order = this.chapters
      .map((_, index) => index)
      .filter((index) => index !== current)
      .sort((a, b) => (a < current ? 0 : 1) - (b < current ? 0 : 1) || a - b);
    const step = (position: number) => {
      if (generation !== this.generation || position >= order.length) {
        return;
      }
      const chapter = order[position];
      const pages = this.measureLayout!.render(this.contentOf(chapter));
      this.counts.update((counts) =>
        counts.map((count, index) => (index === chapter ? pages : count)),
      );
      setTimeout(() => step(position + 1));
    };
    setTimeout(() => step(0), COUNT_START_DELAY_MS);
  }

  private contentOf(chapter: number): ChapterContent {
    const { firstBlock, blockCount } = this.chapters[chapter];
    const book = this.content!;
    return {
      blocks: book.blocks.slice(firstBlock, firstBlock + blockCount),
      firstBlock,
      titlePage: chapter === 0 ? { title: book.title, author: book.author } : null,
      endOfBook: chapter === this.chapters.length - 1,
    };
  }

  private save(): void {
    this.store.save(this.content!.id, this.position, this.isLast());
  }

  /** Coalesces resize and settings notifications into one layout, skipped when nothing changed. */
  private scheduleRelayout(): void {
    if (this.relayoutScheduled) {
      return;
    }
    this.relayoutScheduled = true;
    setTimeout(() => {
      this.relayoutScheduled = false;
      if (this.location() && this.currentLayoutKey() !== this.layoutKey) {
        this.layoutAt(this.position);
      }
    });
  }

  private currentLayoutKey(): string {
    const viewport = this.viewport()?.nativeElement;
    const settings = this.data.settings();
    return `${viewport?.clientWidth}x${viewport?.clientHeight}:${settings?.fontTier}`;
  }
}

function statusOf(error: unknown): number | undefined {
  return (error as { status?: number }).status;
}
