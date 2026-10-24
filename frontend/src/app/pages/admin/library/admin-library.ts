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

import { AdminBook, AdminMessage, BookPatch } from '@core/admin/admin.model';
import { AdminApi } from '@core/admin/admin-api';
import { failureMessage, successMessage } from '@core/admin/admin-message.utils';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { MATCHES, STATE_FILTERS } from './admin-library.constants';
import { RowAction, StateFilter } from './admin-library.model';
import { bookMeta, fold } from './admin-library.utils';

/**
 * Every imported book, withdrawn ones included: withdraw, reactivate, mark as read, delete, edit.
 */
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
  styleUrl: './admin-library.scss',
})
export class AdminLibrary {
  /**
   * Admin endpoints for book changes.
   */
  private readonly api = inject(AdminApi);

  /**
   * Whole library, reloaded after each successful row action.
   */
  protected readonly books = httpResource<AdminBook[]>(() => API_ENDPOINTS.admin.books);

  /**
   * Buttons of the state filter, exposed to the template.
   */
  protected readonly stateFilters = STATE_FILTERS;

  /**
   * Text filter on title and author, applied as typed.
   */
  protected readonly filterText = signal('');

  /**
   * State filter currently pressed.
   */
  protected readonly stateFilter = signal<StateFilter>('all');

  /**
   * Number of books each state filter keeps, regardless of the text filter.
   */
  protected readonly counts = computed(() => {
    const books = this.books.hasValue() ? this.books.value() : [];
    return Object.fromEntries(
      STATE_FILTERS.map(({ value }) => [value, books.filter(MATCHES[value]).length]),
    ) as Record<StateFilter, number>;
  });

  /**
   * Books passing both the state filter and the accent-insensitive text filter.
   */
  protected readonly visibleBooks = computed(() => {
    const books = this.books.hasValue() ? this.books.value() : [];
    const text = fold(this.filterText().trim());
    const matches = MATCHES[this.stateFilter()];
    return books.filter(
      (book) => matches(book) && (!text || fold(`${book.title} ${book.author}`).includes(text)),
    );
  });

  /**
   * Book whose row waits for the server; all its buttons are disabled meanwhile.
   */
  protected readonly busyId = signal<string | null>(null);

  /**
   * Action in flight on the busy row, so only its button spins.
   */
  private readonly busyAction = signal<RowAction | null>(null);

  /**
   * Book whose row shows the title and author form, at most one at a time.
   */
  protected readonly editingId = signal<string | null>(null);

  /**
   * Book whose row asks to confirm the deletion, which cannot be undone.
   */
  protected readonly confirmingId = signal<string | null>(null);

  /**
   * Title field of the edit form.
   */
  protected readonly title = signal('');

  /**
   * Author field of the edit form.
   */
  protected readonly author = signal('');

  /**
   * Outcome of the last row action, shown above the list.
   */
  protected readonly message = signal<AdminMessage | null>(null);

  /**
   * Line under each title: author, origin and date of addition.
   */
  protected readonly meta = bookMeta;

  /**
   * Opens the edit form prefilled with the current title and author.
   */
  protected edit(book: AdminBook): void {
    this.title.set(book.title);
    this.author.set(book.author);
    this.editingId.set(book.id);
  }

  /**
   * Closes the edit form without saving.
   */
  protected cancel(): void {
    this.editingId.set(null);
  }

  /**
   * Whether this button of this row is the one waiting for the server.
   */
  protected spinning(book: AdminBook, action: RowAction): boolean {
    return this.busyId() === book.id && this.busyAction() === action;
  }

  /**
   * Withdraws the book from the reader's list or puts it back.
   */
  protected setActive(book: AdminBook, active: boolean): Promise<void> {
    return this.change(
      book,
      'active',
      { active },
      `${active ? 'Livre réactivé' : 'Livre retiré'} : ${book.title}`,
    );
  }

  /**
   * Sets or clears the read mark; the reader then treats the book as finished at that date.
   */
  protected setFinished(book: AdminBook, finished: boolean): Promise<void> {
    return this.change(
      book,
      'finished',
      { finished },
      `${finished ? 'Livre marqué comme lu' : 'Livre marqué comme non lu'} : ${book.title}`,
    );
  }

  /**
   * Deletes a book for good, once confirmed.
   */
  protected remove(book: AdminBook): Promise<void> {
    return this.run(
      book,
      'delete',
      async () => {
        await this.api.deleteBook(book.id);
        this.confirmingId.set(null);
      },
      `Livre supprimé : ${book.title}`,
    );
  }

  /**
   * Saves the corrected title and author; both are required.
   */
  protected async save(event: Event, book: AdminBook): Promise<void> {
    event.preventDefault();
    const title = this.title().trim();
    const author = this.author().trim();
    if (!title || !author) {
      return;
    }
    await this.change(book, 'save', { title, author }, 'Titre et auteur enregistrés');
  }

  /**
   * Applies a patch to a book and closes its edit form.
   */
  private change(
    book: AdminBook,
    action: RowAction,
    patch: BookPatch,
    success: string,
  ): Promise<void> {
    return this.run(
      book,
      action,
      async () => {
        await this.api.updateBook(book.id, patch);
        this.editingId.set(null);
      },
      success,
    );
  }

  /**
   * Runs a row action: the row waits, then the list reloads on success or the reason is shown.
   */
  private async run(
    book: AdminBook,
    action: RowAction,
    call: () => Promise<void>,
    success: string,
  ): Promise<void> {
    this.busyId.set(book.id);
    this.busyAction.set(action);
    try {
      await call();
      this.message.set(successMessage(success));
      this.books.reload();
    } catch (error) {
      this.message.set(failureMessage(error));
    }
    this.busyId.set(null);
  }
}
