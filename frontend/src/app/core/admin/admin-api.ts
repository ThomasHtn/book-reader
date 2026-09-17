import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { ReaderSettings } from '@core/http/api.model';
import { firstValueFrom } from 'rxjs';
import { AdminBook, BookPatch } from './admin.model';

/** Backoffice mutations; lists are read through `httpResource` in the views. */
@Service()
export class AdminApi {
  private readonly http = inject(HttpClient);

  /**
   * Downloads, converts and activates a catalogue entry, or reactivates it.
   *
   * @param entryId - Entry identifier from the search.
   * @returns Activated book.
   */
  public importEntry(entryId: string): Promise<AdminBook> {
    return firstValueFrom(
      this.http.post<AdminBook>(API_ENDPOINTS.admin.fromCatalogue, { entryId }),
    );
  }

  /**
   * Converts and activates an uploaded EPUB.
   *
   * @param file - EPUB file.
   * @returns Imported book.
   */
  public upload(file: File): Promise<AdminBook> {
    const body = new FormData();
    body.append('file', file);
    return firstValueFrom(this.http.post<AdminBook>(API_ENDPOINTS.admin.upload, body));
  }

  /**
   * Changes title, author or activation of a book.
   *
   * @param bookId - Book identifier.
   * @param patch - Fields to change.
   * @returns Book after the change.
   */
  public updateBook(bookId: string, patch: BookPatch): Promise<AdminBook> {
    return firstValueFrom(this.http.patch<AdminBook>(API_ENDPOINTS.admin.book(bookId), patch));
  }

  /**
   * Replaces the display settings.
   *
   * @param settings - New settings.
   * @returns Settings after the change.
   */
  public saveSettings(settings: ReaderSettings): Promise<ReaderSettings> {
    return firstValueFrom(this.http.put<ReaderSettings>(API_ENDPOINTS.admin.settings, settings));
  }
}
