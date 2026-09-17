import { httpResource, HttpResourceRef } from '@angular/common/http';
import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Service,
  signal,
  Signal,
} from '@angular/core';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { BookSummary, ReaderSettings } from '@core/http/api.model';

/** Refresh cadence of books and settings, also the retry cadence when the server is unreachable. */
export const POLL_INTERVAL_MS = 10_000;

/**
 * Books and display settings, polled every ten seconds so the always-on PC follows the backoffice.
 * The browser revalidates with the ETag, so an unchanged poll costs a 304.
 */
@Service()
export class ReaderData {
  private readonly booksResource = httpResource<BookSummary[]>(() => API_ENDPOINTS.books);

  private readonly settingsResource = httpResource<ReaderSettings>(() => API_ENDPOINTS.settings);

  /** Last valid book list, kept through failed polls so "Mes livres" stays available offline. */
  public readonly books = lastValidValue(this.booksResource);

  /** Last valid settings. */
  public readonly settings = lastValidValue(this.settingsResource);

  /** Whether the book list never loaded because the server does not answer. */
  public readonly unreachable = computed(
    () => this.books() === undefined && this.booksResource.error() !== undefined,
  );

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => {
      const settings = this.settings();
      if (settings) {
        root.dataset['tier'] = String(settings.fontTier);
        root.dataset['theme'] = settings.theme;
      }
    });
    const timer = setInterval(() => this.retry(), POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /** Reloads books and settings now. */
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
