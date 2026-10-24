import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { LucideDownload, LucideLoaderCircle, LucideRotateCw, LucideSearch } from '@lucide/angular';

import { AdminMessage, CatalogueEntry, CatalogueEntryState } from '@core/admin/admin.model';
import { AdminApi } from '@core/admin/admin-api';
import { failureMessage, failureReason, successMessage } from '@core/admin/admin-message.utils';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

/**
 * Live search in Ebooks libres et gratuits, and activation of its books into the library.
 */
@Component({
  selector: 'app-admin-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideDownload, LucideLoaderCircle, LucideRotateCw, LucideSearch],
  templateUrl: './admin-catalogue.html',
  styleUrl: './admin-catalogue.scss',
})
export class AdminCatalogue {
  /**
   * Admin endpoints; activation downloads and converts the EPUB server-side.
   */
  private readonly api = inject(AdminApi);

  /**
   * Text in the search field, not yet sent.
   */
  protected readonly query = signal('');

  /**
   * Last query sent, `null` before the first search so nothing is requested on load.
   */
  protected readonly submitted = signal<string | null>(null);

  /**
   * Catalogue entries matching the submitted query, relayed live by the backend.
   */
  protected readonly results = httpResource<CatalogueEntry[]>(() => {
    const query = this.submitted();
    return query === null ? undefined : { url: API_ENDPOINTS.admin.catalogue, params: { query } };
  });

  /**
   * Capitalised reason of a failed search, `null` when the search did not fail.
   */
  protected readonly searchFailure = computed(() => {
    const error = this.results.error();
    if (error === undefined) {
      return null;
    }
    const reason = failureReason(error);
    return reason.charAt(0).toUpperCase() + reason.slice(1);
  });

  /**
   * States changed by an activation, by entry id; they override the state the search returned.
   */
  private readonly states = signal<Record<string, CatalogueEntryState>>({});

  /**
   * Entries whose activation is in flight, by entry id.
   */
  protected readonly busy = signal<Record<string, boolean>>({});

  /**
   * Outcome of the last activation of each entry, by entry id.
   */
  protected readonly messages = signal<Record<string, AdminMessage>>({});

  /**
   * Sends the query, forgetting the outcomes shown so far; the same query again reloads, since the resource would not refetch on its own.
   */
  protected search(event: Event): void {
    event.preventDefault();
    const query = this.query().trim();
    if (!query) {
      return;
    }
    // Fresh results bring fresh states: outcomes of the previous search would stick to the wrong cards.
    this.states.set({});
    this.messages.set({});
    if (query === this.submitted()) {
      this.results.reload();
    } else {
      this.submitted.set(query);
    }
  }

  /**
   * Repeats the failed search.
   */
  protected retry(): void {
    this.results.reload();
  }

  /**
   * Current state of an entry, activations made on this page included.
   */
  protected stateOf(entry: CatalogueEntry): CatalogueEntryState {
    return this.states()[entry.entryId] ?? entry.state;
  }

  /**
   * Imports the entry into the library and reports the outcome on its card.
   */
  protected async activate(entry: CatalogueEntry): Promise<void> {
    this.busy.update((busy) => ({ ...busy, [entry.entryId]: true }));
    let message: AdminMessage;
    try {
      await this.api.importEntry(entry.entryId);
      this.states.update((states) => ({ ...states, [entry.entryId]: 'active' }));
      message = successMessage('Livre activé');
    } catch (error) {
      message = failureMessage(error);
    }
    this.busy.update((busy) => ({ ...busy, [entry.entryId]: false }));
    this.messages.update((messages) => ({ ...messages, [entry.entryId]: message }));
  }
}
