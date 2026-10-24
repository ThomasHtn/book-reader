import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { ProgressStore } from '@core/reader/progress-store';
import { PageCommand } from '@core/reader/reader.model';
import { ReaderData } from '@core/reader/reader-data';
import { sortLibrary } from '@core/reader/reading-progress.utils';
import { BookCard } from '@shared/book-card/book-card';
import { PageHead } from '@shared/page-head/page-head';
import { PageTurns } from '@shared/page-turns/page-turns';
import { StatusScreen } from '@shared/status-screen/status-screen';

import { assignCoverTones } from './cover-tone.utils';
import { paginateGrid, visibleRange } from './grid.utils';
import { GRID_COLUMNS, MAX_ROWS_PER_PAGE } from './library.constants';

/**
 * Route `/livres`: three title blocks per row, paged by whole rows with the same two bars as the text.
 */
@Component({
  selector: 'app-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookCard, PageHead, PageTurns, StatusScreen],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library {
  /**
   * Polled list and settings; also says when the server is unreachable.
   */
  protected readonly data = inject(ReaderData);

  /**
   * Progress per book, which orders the list and marks current and finished books.
   */
  private readonly store = inject(ProgressStore);

  /**
   * Opens a book or the backoffice.
   */
  private readonly router = inject(Router);

  /**
   * Gives `document.fonts` and the focused element.
   */
  private readonly document = inject(DOCUMENT);

  /**
   * Lets a page turn run code after the render that applies it.
   */
  private readonly injector = inject(Injector);

  /**
   * Clipping box one page high; its height decides how many rows fit.
   */
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  /**
   * Grid of cards, translated vertically by whole rows.
   */
  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  /**
   * Bumped by the resize observer so the render effect measures again.
   */
  private readonly resized = signal(0);

  /**
   * Books in list order: last read first, then never opened, newest first (spec 5.4).
   */
  protected readonly entries = computed(() =>
    sortLibrary(this.data.books() ?? [], (id) => this.store.progressOf(id)),
  );

  /**
   * Current and finished books show no cloth, so they neither take a tone nor block one.
   */
  protected readonly tones = computed(() =>
    assignCoverTones(
      this.entries().map((entry) => (entry.current || entry.finished ? null : entry.book.id)),
      GRID_COLUMNS,
    ),
  );

  /**
   * Zero-based page of titles shown.
   */
  protected readonly page = signal(0);

  /**
   * Page of each card, in list order; cards off the shown page are made `inert`.
   */
  protected readonly cardPages = signal<number[]>([]);

  /**
   * Vertical translation of the grid for each page, in CSS pixels.
   */
  private readonly offsets = signal<readonly number[]>([0]);

  /**
   * Number of pages of titles; the footer shows only past one (spec 5.1).
   */
  protected readonly pages = computed(() => this.offsets().length);

  /**
   * Translation showing the current page: the list is paged, never scrolled.
   */
  protected readonly transform = computed(
    () => `translateY(${-(this.offsets()[this.page()] ?? 0)}px)`,
  );

  /**
   * "Titres 1 à 6 sur 7", announced politely on each turn (spec 5.4).
   */
  protected readonly indicator = computed(() => {
    const range = visibleRange(this.cardPages(), this.page());
    return range ? `Titres ${range.first} à ${range.last} sur ${this.cardPages().length}` : '';
  });

  /**
   * Measures the grid again after any render where the list, the tier or the viewport size changed.
   */
  constructor() {
    const observer = new ResizeObserver(() => this.resized.update((count) => count + 1));
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    // Cards first laid out in the fallback font grow when Luciole arrives: measure them again then.
    void this.document.fonts?.ready.then(() => this.resized.update((count) => count + 1));
    afterRenderEffect(() => {
      // Read only to subscribe: each of these can change the rows.
      this.entries();
      this.data.settings();
      this.resized();
      const viewport = this.viewport()?.nativeElement;
      if (viewport) {
        observer.observe(viewport);
        this.measure(viewport);
      }
    });
  }

  /**
   * Opens a book; the reader resumes it where it was left (spec 5.4).
   */
  protected open(bookId: string): void {
    void this.router.navigateByUrl(`/lire/${bookId}`);
  }

  /**
   * Gear button for the caregiver, the reader side's only way to `/admin` (spec 14).
   */
  protected openAdmin(): void {
    void this.router.navigateByUrl('/admin');
  }

  /**
   * Shows the previous or next page of titles, from a footer bar or an arrow key.
   */
  protected turn(command: PageCommand): void {
    const target = this.page() + (command === 'next' ? 1 : -1);
    const focused = this.document.activeElement;
    this.page.set(Math.min(Math.max(target, 0), this.pages() - 1));
    afterNextRender(() => this.keepFocus(focused), { injector: this.injector });
  }

  /**
   * Moves the focus to the first title shown when the focused title went inert or the bar vanished,
   * so the keyboard never falls back to the top of the document.
   */
  private keepFocus(focused: Element | null): void {
    if (focused instanceof HTMLElement && focused.isConnected && !focused.closest('[inert]')) {
      return;
    }
    const first = this.grid()
      ?.nativeElement.querySelectorAll<HTMLElement>('.book-card')
      .item(this.cardPages().indexOf(this.page()));
    first?.focus();
  }

  /**
   * Pages the cards by whole rows from their rendered boxes (spec 5.4).
   */
  private measure(viewport: HTMLElement): void {
    const grid = this.grid()?.nativeElement;
    const height = viewport.clientHeight;
    // Empty list or no layout yet: a single page holding every card.
    if (!grid || height <= 0) {
      this.offsets.set([0]);
      this.cardPages.set(this.entries().map(() => 0));
      return;
    }
    // The grid is translated, so read every top relative to the first card rather than the viewport.
    const cards = [...grid.querySelectorAll<HTMLElement>('.book-card')];
    const origin = grid.getBoundingClientRect().top;
    const { offsets, pages } = paginateGrid(
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { top: box.top - origin, height: box.height };
      }),
      height,
      MAX_ROWS_PER_PAGE,
    );
    this.offsets.set(offsets);
    this.cardPages.set([...pages]);
    // A shorter list or a larger tier may remove the page shown.
    this.page.update((page) => Math.min(page, offsets.length - 1));
  }
}
