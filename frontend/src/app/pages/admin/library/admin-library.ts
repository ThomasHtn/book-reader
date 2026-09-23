import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideBookCheck,
  LucideBookX,
  LucideEye,
  LucideEyeOff,
  LucideLoaderCircle,
  LucidePencil,
  LucideRotateCw,
  LucideSave,
  LucideSearch,
  LucideTrash,
  LucideX,
} from '@lucide/angular';
import { AdminApi } from '@core/admin/admin-api';
import { AdminMessage, failureMessage, successMessage } from '@core/admin/admin-message';
import { AdminBook, BookPatch } from '@core/admin/admin.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

/** State filter of the library list. */
type StateFilter = 'all' | 'active' | 'withdrawn' | 'finished';

const STATE_FILTERS: readonly { value: StateFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'withdrawn', label: 'Retirés' },
  { value: 'finished', label: 'Lus' },
];

const MATCHES: Record<StateFilter, (book: AdminBook) => boolean> = {
  all: () => true,
  active: (book) => book.active,
  withdrawn: (book) => !book.active,
  finished: (book) => Boolean(book.finishedAt),
};

/** Row action in flight, so only the pressed button spins while the whole row waits. */
type RowAction = 'active' | 'finished' | 'save' | 'delete';

/** Lower case without diacritics, so "baudélaire" finds "Baudelaire". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Every imported book: withdraw, reactivate, mark as read, delete, correct title and author. */
@Component({
  selector: 'app-admin-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideBookCheck,
    LucideBookX,
    LucideEye,
    LucideEyeOff,
    LucideLoaderCircle,
    LucidePencil,
    LucideRotateCw,
    LucideSave,
    LucideSearch,
    LucideTrash,
    LucideX,
  ],
  templateUrl: './admin-library.html',
})
export class AdminLibrary {
  private readonly api = inject(AdminApi);

  protected readonly books = httpResource<AdminBook[]>(() => API_ENDPOINTS.admin.books);

  protected readonly stateFilters = STATE_FILTERS;

  protected readonly filterText = signal('');

  protected readonly stateFilter = signal<StateFilter>('all');

  protected readonly counts = computed(() => {
    const books = this.books.hasValue() ? this.books.value() : [];
    return Object.fromEntries(
      STATE_FILTERS.map(({ value }) => [value, books.filter(MATCHES[value]).length]),
    ) as Record<StateFilter, number>;
  });

  protected readonly visibleBooks = computed(() => {
    const books = this.books.hasValue() ? this.books.value() : [];
    const text = fold(this.filterText().trim());
    const matches = MATCHES[this.stateFilter()];
    return books.filter(
      (book) => matches(book) && (!text || fold(`${book.title} ${book.author}`).includes(text)),
    );
  });

  protected readonly busyId = signal<string | null>(null);

  private readonly busyAction = signal<RowAction | null>(null);

  protected readonly editingId = signal<string | null>(null);

  protected readonly confirmingId = signal<string | null>(null);

  protected readonly title = signal('');

  protected readonly author = signal('');

  protected readonly message = signal<AdminMessage | null>(null);

  protected meta(book: AdminBook): string {
    const source = book.source === 'catalogue' ? 'catalogue' : 'dépôt';
    return `${book.author}, ${source}, ajouté le ${DATE_FORMAT.format(new Date(book.createdAt))}`;
  }

  protected edit(book: AdminBook): void {
    this.title.set(book.title);
    this.author.set(book.author);
    this.editingId.set(book.id);
  }

  protected cancel(): void {
    this.editingId.set(null);
  }

  protected spinning(book: AdminBook, action: RowAction): boolean {
    return this.busyId() === book.id && this.busyAction() === action;
  }

  protected setActive(book: AdminBook, active: boolean): Promise<void> {
    return this.change(
      book,
      'active',
      { active },
      `${active ? 'Livre réactivé' : 'Livre retiré'} : ${book.title}`,
    );
  }

  protected setFinished(book: AdminBook, finished: boolean): Promise<void> {
    return this.change(
      book,
      'finished',
      { finished },
      `${finished ? 'Livre marqué comme lu' : 'Livre marqué comme non lu'} : ${book.title}`,
    );
  }

  protected async remove(book: AdminBook): Promise<void> {
    this.busyId.set(book.id);
    this.busyAction.set('delete');
    try {
      await this.api.deleteBook(book.id);
      this.message.set(successMessage(`Livre supprimé : ${book.title}`));
      this.confirmingId.set(null);
      this.books.reload();
    } catch (error) {
      this.message.set(failureMessage(error));
    }
    this.busyId.set(null);
  }

  protected async save(event: Event, book: AdminBook): Promise<void> {
    event.preventDefault();
    const title = this.title().trim();
    const author = this.author().trim();
    if (!title || !author) {
      return;
    }
    await this.change(book, 'save', { title, author }, 'Titre et auteur enregistrés');
  }

  private async change(
    book: AdminBook,
    action: RowAction,
    patch: BookPatch,
    success: string,
  ): Promise<void> {
    this.busyId.set(book.id);
    this.busyAction.set(action);
    try {
      await this.api.updateBook(book.id, patch);
      this.message.set(successMessage(success));
      this.editingId.set(null);
      this.books.reload();
    } catch (error) {
      this.message.set(failureMessage(error));
    }
    this.busyId.set(null);
  }
}
