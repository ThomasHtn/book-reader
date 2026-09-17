import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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

/** Every imported book: withdraw, reactivate, correct title and author. */
@Component({
  selector: 'app-admin-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-library.html',
})
export class AdminLibrary {
  private readonly api = inject(AdminApi);

  protected readonly books = httpResource<AdminBook[]>(() => API_ENDPOINTS.admin.books);

  protected readonly activeCount = computed(() =>
    this.books.hasValue() ? this.books.value().filter((book) => book.active).length : 0,
  );

  protected readonly busyId = signal<string | null>(null);

  protected readonly editingId = signal<string | null>(null);

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

  protected setActive(book: AdminBook, active: boolean): Promise<void> {
    return this.change(
      book,
      { active },
      `${active ? 'Livre réactivé' : 'Livre retiré'} : ${book.title}`,
    );
  }

  protected async save(event: Event, book: AdminBook): Promise<void> {
    event.preventDefault();
    const title = this.title().trim();
    const author = this.author().trim();
    if (!title || !author) {
      return;
    }
    await this.change(book, { title, author }, 'Titre et auteur enregistrés');
  }

  private async change(book: AdminBook, patch: BookPatch, success: string): Promise<void> {
    this.busyId.set(book.id);
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
