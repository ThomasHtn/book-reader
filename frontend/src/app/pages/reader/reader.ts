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
import { ProgressStore } from '@core/reader/progress-store';
import { POLL_INTERVAL_MS } from '@core/reader/reader.constants';
import { PageCommand } from '@core/reader/reader.model';
import { ReaderData } from '@core/reader/reader-data';
import { startPosition, withReadMark } from '@core/reader/reading-progress.utils';
import { layoutKey } from '@core/reader/stored-page-counts.utils';
import { NavBar } from '@shared/nav-bar/nav-bar';
import { PageTurns } from '@shared/page-turns/page-turns';
import { StatusScreen } from '@shared/status-screen/status-screen';

import { BookPagination } from './pagination/book-pagination';
import { indicatorOf } from './pagination/folios.utils';
import { CHAPTER_LAYOUT_FACTORY } from './pagination/pagination.constants';
import { LayoutKey } from './pagination/pagination.model';

/**
 * Route `/lire/:id`: three commands only (Mes livres in the head line, Précédent and Suivant in the
 * footer); a running head and the page numbers frame the text. `BookPagination` lays the current
 * chapter out, two facing pages on a wide screen; this component loads the book, saves the reading
 * position and lays the book out again when the screen or the font tier changes.
 */
@Component({
  selector: 'app-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavBar, PageTurns, StatusScreen],
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
   * Reading surface, focused again after each page turn so Space keeps meaning "Suivant" (spec 5.1).
   */
  private readonly text = viewChild<ElementRef<HTMLElement>>('text');

  /**
   * Box of one view; its size is part of the layout key.
   */
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  /**
   * Multi-column container, translated by whole pages (spec 5.2).
   */
  private readonly columns = viewChild<ElementRef<HTMLElement>>('columns');

  /**
   * Pages of the opened book, set as soon as it starts opening so a later render does not open it twice.
   */
  private readonly pagination = signal<BookPagination | null>(null);

  /**
   * Pending relayout, so a burst of notifications runs only one.
   */
  private relayoutTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Book title, on the left of the running head.
   */
  protected readonly title = computed(() => (this.book.hasValue() ? this.book.value().title : ''));

  /**
   * Author, after the title in the running head.
   */
  protected readonly author = computed(() =>
    this.book.hasValue() ? this.book.value().author : '',
  );

  /**
   * Shown view, `null` until the first layout, which keeps the screen hidden meanwhile.
   */
  protected readonly location = computed(() => this.pagination()?.location() ?? null);

  /**
   * Whether to drop the "Précédent" bar: first page of the book, or nothing shown yet.
   */
  protected readonly isFirst = computed(() => this.pagination()?.isFirst() ?? true);

  /**
   * Whether to drop the "Suivant" bar; saving there also marks the book finished (spec 4).
   */
  protected readonly isLast = computed(() => this.pagination()?.isLast() ?? true);

  /**
   * Numbers of the pages shown, over the whole book; `null` until the first layout.
   */
  protected readonly folios = computed(() => this.pagination()?.folios() ?? null);

  /**
   * "Page 12 sur 840", or "Pages 12 et 13 sur 840" on facing pages, announced on each turn (spec 5.1).
   */
  protected readonly indicator = computed(() => {
    const folios = this.folios();
    return folios ? indicatorOf(folios) : '';
  });

  /**
   * Whether the book cannot be loaded for another reason than not existing.
   */
  protected readonly unreachable = computed(() => {
    const error = this.book.error();
    return error !== undefined && httpStatusOf(error) !== 404;
  });

  /**
   * Wires relayouts on resize and settings, the redirect of a missing book and the retry poll.
   */
  constructor() {
    const destroyRef = inject(DestroyRef);
    const observer = new ResizeObserver(() => this.scheduleRelayout());
    destroyRef.onDestroy(() => {
      observer.disconnect();
      clearTimeout(this.relayoutTimer);
    });

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

    // The view children exist only after a render; each loaded book object is opened once, at the
    // font tier of the settings, so the first layout is not redone a moment later.
    afterRenderEffect(() => {
      const book = this.book.hasValue() ? this.book.value() : undefined;
      const viewport = this.viewport()?.nativeElement;
      const columns = this.columns()?.nativeElement;
      if (
        book &&
        viewport &&
        columns &&
        this.data.settingsSettled() &&
        book !== this.pagination()?.content
      ) {
        observer.observe(viewport);
        void this.open(new BookPagination(book, this.layoutFactory(viewport, columns), this.store));
      }
    });
  }

  /**
   * Turns the page from the footer, then gives the focus back to the text so Space keeps working.
   */
  protected onTurn(command: PageCommand): void {
    const pagination = this.pagination();
    if (pagination?.turn(command)) {
      this.save(pagination);
    }
    this.text()?.nativeElement.focus();
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
   * Opens a book where it was left, once the fonts are ready so the first layout is the right one; a
   * finished book reopens at its first page and only a page turn starts a new reading.
   */
  private async open(pagination: BookPagination): Promise<void> {
    const { content } = pagination;
    this.pagination.set(pagination);
    await (this.document.fonts?.ready ?? Promise.resolve());
    this.store.markOpened(content.id);
    const progress = withReadMark(this.store.progressOf(content.id), content.finishedAt);
    pagination.open(startPosition(progress, content.blocks.length), this.currentLayoutKey());
    // A finished book stays finished until a page is turned: opening it by mistake changes nothing.
    if (!progress?.finished) {
      this.save(pagination);
    }
  }

  /**
   * Persists the position; on the last page it also marks the book finished (spec 4).
   */
  private save(pagination: BookPagination): void {
    this.store.save(pagination.content.id, pagination.position(), pagination.isLast());
  }

  /**
   * Coalesces resize and settings notifications into one relayout, skipped when nothing changed.
   */
  private scheduleRelayout(): void {
    if (this.relayoutTimer !== undefined) {
      return;
    }
    this.relayoutTimer = setTimeout(() => {
      this.relayoutTimer = undefined;
      this.pagination()?.relayout(this.currentLayoutKey());
    });
  }

  /**
   * Viewport size and tier: page counts hold only for the layout they were measured under (spec 5.2).
   * Counts are stored per tier, so none is read or written before the settings are known.
   */
  private currentLayoutKey(): LayoutKey {
    const viewport = this.viewport()?.nativeElement;
    const settings = this.data.settings();
    return {
      value: layoutKey(viewport?.clientWidth ?? 0, viewport?.clientHeight ?? 0, settings?.fontTier),
      persisted: settings !== undefined,
    };
  }
}
