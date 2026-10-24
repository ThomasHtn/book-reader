import { httpResource, HttpResourceRef } from '@angular/common/http';
import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Service,
  Signal,
  signal,
} from '@angular/core';

import { BookSummary, ReaderSettings } from '@core/http/api.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { POLL_INTERVAL_MS } from './reader.constants';

/**
 * Books and display settings, polled every ten seconds so the always-on PC follows the backoffice.
 * The browser revalidates with the ETag, so an unchanged poll costs a 304.
 */
@Service()
export class ReaderData {
  /**
   * Raw book list request, reloaded by the poll; its value is lost on error, hence `books`.
   */
  private readonly booksResource = httpResource<BookSummary[]>(() => API_ENDPOINTS.books);

  /**
   * Raw settings request, reloaded by the poll alongside the books.
   */
  private readonly settingsResource = httpResource<ReaderSettings>(() => API_ENDPOINTS.settings);

  /**
   * Last valid book list, kept through failed polls so "Mes livres" stays available offline.
   */
  public readonly books = lastValidValue(this.booksResource);

  /**
   * Last valid settings, so a failed poll never resets the font tier.
   */
  public readonly settings = lastValidValue(this.settingsResource);

  /**
   * Whether the settings answered or failed at least once, so the reader lays its first page out at the
   * right font tier, or without it when the server does not give one.
   */
  public readonly settingsSettled = computed(
    () => this.settings() !== undefined || this.settingsResource.error() !== undefined,
  );

  /**
   * Whether the book list never loaded because the server does not answer.
   */
  public readonly unreachable = computed(
    () => this.books() === undefined && this.booksResource.error() !== undefined,
  );

  /**
   * Mirrors the font tier on `<html>` for `tokens.css` and starts the poll for the app's lifetime.
   */
  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => {
      const settings = this.settings();
      if (settings) {
        root.dataset['tier'] = String(settings.fontTier);
      }
    });
    const timer = setInterval(() => this.retry(), POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /**
   * Reloads books and settings now.
   */
  public retry(): void {
    this.booksResource.reload();
    this.settingsResource.reload();
  }
}

/**
 * Keeps the last successful value of a resource. Filled by an effect rather than a lazy `linkedSignal`,
 * so a response nobody reads yet (the list while a book is open) survives a later failed poll.
 */
function lastValidValue<T>(resource: HttpResourceRef<T | undefined>): Signal<T | undefined> {
  const latest = signal<T | undefined>(undefined);
  effect(() => {
    if (resource.hasValue()) {
      latest.set(resource.value());
    }
  });
  return latest.asReadonly();
}
