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
import { Location, nextLocation, PendingLocation, previousLocation } from '@core/reader/page-math';
import { ProgressStore } from '@core/reader/progress-store';
import { POLL_INTERVAL_MS, ReaderData } from '@core/reader/reader-data';
import { readingProgressPercent, startPosition, TextPosition } from '@core/reader/reading-progress';
import { NavBar } from '@shared/nav-bar/nav-bar';
import { StatusScreen } from '@shared/status-screen/status-screen';
import { CHAPTER_LAYOUT_FACTORY, ChapterContent, ChapterLayout } from './chapter-layout';

/**
 * Route `/lire/:id`: three commands only, all in the footer (Mes livres, Précédent, Suivant); the
 * text owns everything above them. The current chapter is laid out in columns.
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

  private readonly gate = new CommandGate(COMMAND_INTERVAL_MS, () => Date.now());

  protected readonly title = computed(() => (this.book.hasValue() ? this.book.value().title : ''));

  protected readonly location = signal<Location | null>(null);

  private readonly chapterPages = signal(0);

  private content: BookContent | null = null;

  private chapters: Chapter[] = [];

  private position: TextPosition = { blockIndex: 0, charOffset: 0 };

  private visibleLayout: ChapterLayout | null = null;

  private layoutKey = '';

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
    return !location || nextLocation(location, this.chapterPages(), this.chapters.length) === null;
  });

  protected readonly indicator = computed(() => {
    if (!this.location() || !this.content) {
      return '';
    }
    return `${readingProgressPercent(this.position, this.content.blocks.length)} %`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const observer = new ResizeObserver(() => this.scheduleRelayout());
    destroyRef.onDestroy(() => observer.disconnect());

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

  /** Lays the chapter of a position out again and shows the page holding it. */
  private layoutAt(position: TextPosition): void {
    const chapter = chapterOfBlock(this.chapters, position.blockIndex);
    this.renderChapter(chapter);
    const page = Math.min(this.visibleLayout!.pageOf(position), this.chapterPages() - 1);
    this.visibleLayout!.show(page);
    this.location.set({ chapter, page });
    this.position = position;
    this.layoutKey = this.currentLayoutKey();
  }

  private renderChapter(chapter: number): void {
    this.chapterPages.set(this.visibleLayout!.render(this.contentOf(chapter)));
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
