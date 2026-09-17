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
import { pageAt, pageCount, visibleRange } from '@core/reader/page-math';
import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
import { sortLibrary } from '@core/reader/reading-progress';
import { NavBar } from '@shared/nav-bar/nav-bar';
import { StatusScreen } from '@shared/status-screen/status-screen';

/** Route `/livres`: one unbreakable row per book, paginated by the same bars and columns as the text. */
@Component({
  selector: 'app-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavBar, StatusScreen],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    @if (data.unreachable()) {
      <app-status-screen (retry)="data.retry()" />
    } @else {
      <div class="screen">
        <app-nav-bar
          direction="previous"
          name="Titres précédents"
          [disabled]="page() === 0"
          (activate)="previous(false)"
        />
        <main class="center">
          <div class="toolbar">
            <h1 class="page-indicator">Mes livres</h1>
            <div class="page-indicator" aria-live="polite">{{ indicator() }}</div>
          </div>
          <div class="paged">
            <div class="paged-viewport" #viewport>
              <div class="paged-columns" #columns [style.transform]="transform()">
                @for (entry of entries(); track entry.book.id; let index = $index) {
                  <button
                    type="button"
                    class="row"
                    [class.row--current]="entry.current"
                    [class.row--finished]="entry.finished"
                    [attr.inert]="rowPages()[index] === page() ? null : ''"
                    (click)="open(entry.book.id)"
                  >
                    <span class="title"
                      >{{ entry.book.title
                      }}<span class="author">{{ entry.book.author }}</span></span
                    >
                    @if (entry.finished) {
                      <span class="tag">Terminé</span>
                    }
                  </button>
                }
              </div>
            </div>
          </div>
        </main>
        <app-nav-bar
          direction="next"
          name="Titres suivants"
          [disabled]="page() >= pages() - 1"
          (activate)="next(false)"
        />
      </div>
    }
  `,
})
export class Library {
  protected readonly data = inject(ReaderData);

  private readonly store = inject(ProgressStore);

  private readonly router = inject(Router);

  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  private readonly columns = viewChild<ElementRef<HTMLElement>>('columns');

  private readonly gate = new CommandGate(COMMAND_INTERVAL_MS, () => performance.now());

  private readonly resized = signal(0);

  protected readonly entries = computed(() =>
    sortLibrary(this.data.books() ?? [], (id) => this.store.progressOf(id)),
  );

  protected readonly page = signal(0);

  protected readonly pages = signal(1);

  protected readonly rowPages = signal<number[]>([]);

  private readonly columnWidth = signal(0);

  protected readonly transform = computed(
    () => `translateX(${-this.page() * this.columnWidth()}px)`,
  );

  protected readonly indicator = computed(() => {
    const range = visibleRange(this.rowPages(), this.page());
    return range ? `Titres ${range.first} à ${range.last} sur ${this.rowPages().length}` : '';
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
    const columns = this.columns()?.nativeElement;
    const width = viewport.clientWidth;
    if (!columns || width <= 0) {
      this.rowPages.set(this.entries().map(() => 0));
      return;
    }
    columns.style.setProperty('--column-width', `${width}px`);
    const origin = columns.getBoundingClientRect().left + this.page() * this.columnWidth();
    const rows = [...columns.querySelectorAll<HTMLElement>('.row')];
    const pages = pageCount(columns.scrollWidth, width);
    this.columnWidth.set(width);
    this.pages.set(pages);
    this.rowPages.set(rows.map((row) => pageAt(row.getBoundingClientRect().left - origin, width)));
    this.page.update((page) => Math.min(page, pages - 1));
  }
}
