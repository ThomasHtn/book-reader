import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { COMMAND_INTERVAL_MS, CommandGate } from '@core/reader/command-gate';
import { paginateGrid } from '@core/reader/grid-math';
import { visibleRange } from '@core/reader/page-math';
import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
import { sortLibrary } from '@core/reader/reading-progress';
import { BookCard } from '@shared/book-card/book-card';
import { NavBar } from '@shared/nav-bar/nav-bar';
import { StatusScreen } from '@shared/status-screen/status-screen';

/** Route `/livres`: three title blocks per row, paged by whole rows with the same two bars as the text. */
@Component({
  selector: 'app-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookCard, NavBar, StatusScreen],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    @if (data.unreachable()) {
      <app-status-screen (retry)="data.retry()" />
    } @else {
      <button type="button" class="button--settings" aria-label="Réglages" (click)="openAdmin()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94L14.4 2.81a.49.49 0 0 0-.48-.41h-3.84a.49.49 0 0 0-.48.41L9.25 5.35c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.59.22L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.09.62-.09.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.03-1.58ZM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2Z"
          />
        </svg>
      </button>
      <div class="screen">
        <div class="page-head page-head--grid">
          <h1 class="page-title">Mes livres</h1>
          <p class="page-indicator" aria-live="polite">{{ indicator() }}</p>
        </div>
        <main>
          <div class="book-grid-viewport" #viewport>
            <div class="book-grid" #grid [style.transform]="transform()">
              @for (entry of entries(); track entry.book.id; let index = $index) {
                <app-book-card
                  [title]="entry.book.title"
                  [author]="entry.book.author"
                  [current]="entry.current"
                  [finished]="entry.finished"
                  [attr.inert]="cardPages()[index] === page() ? null : ''"
                  (activate)="open(entry.book.id)"
                />
              }
            </div>
          </div>
        </main>
        @if (pages() > 1) {
          <footer class="nav-footer">
            <div class="nav-row">
              @if (page() > 0) {
                <app-nav-bar
                  direction="previous"
                  name="Titres précédents"
                  (activate)="previous(false)"
                />
              }
              @if (page() < pages() - 1) {
                <app-nav-bar direction="next" name="Titres suivants" (activate)="next(false)" />
              }
            </div>
          </footer>
        }
      </div>
    }
  `,
})
export class Library {
  protected readonly data = inject(ReaderData);

  private readonly store = inject(ProgressStore);

  private readonly router = inject(Router);

  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  private readonly gate = new CommandGate(COMMAND_INTERVAL_MS, () => performance.now());

  private readonly resized = signal(0);

  protected readonly entries = computed(() =>
    sortLibrary(this.data.books() ?? [], (id) => this.store.progressOf(id)),
  );

  protected readonly page = signal(0);

  protected readonly cardPages = signal<number[]>([]);

  private readonly offsets = signal<readonly number[]>([0]);

  protected readonly pages = computed(() => this.offsets().length);

  protected readonly transform = computed(
    () => `translateY(${-(this.offsets()[this.page()] ?? 0)}px)`,
  );

  protected readonly indicator = computed(() => {
    const range = visibleRange(this.cardPages(), this.page());
    return range ? `Titres ${range.first} à ${range.last} sur ${this.cardPages().length}` : '';
  });

  constructor() {
    const observer = new ResizeObserver(() => this.resized.update((count) => count + 1));
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    afterRenderEffect(() => {
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

  protected open(bookId: string): void {
    void this.router.navigateByUrl(`/lire/${bookId}`);
  }

  protected openAdmin(): void {
    void this.router.navigateByUrl('/admin');
  }

  protected previous(repeated: boolean): void {
    if (this.page() > 0 && this.gate.accept(repeated)) {
      this.page.update((page) => page - 1);
    }
  }

  protected next(repeated: boolean): void {
    if (this.page() < this.pages() - 1 && this.gate.accept(repeated)) {
      this.page.update((page) => page + 1);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next(event.repeat);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous(event.repeat);
    }
  }

  private measure(viewport: HTMLElement): void {
    const grid = this.grid()?.nativeElement;
    const height = viewport.clientHeight;
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
    );
    this.offsets.set(offsets);
    this.cardPages.set([...pages]);
    this.page.update((page) => Math.min(page, offsets.length - 1));
  }
}
