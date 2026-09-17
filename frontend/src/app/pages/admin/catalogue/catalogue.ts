import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminApi } from '@core/admin/admin-api';
import { failureReason } from '@core/admin/admin-errors';
import { AdminMessage, failureMessage, successMessage } from '@core/admin/admin-message';
import { CatalogueEntry, CatalogueEntryState } from '@core/admin/admin.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

/** Live search in Ebooks libres et gratuits, and activation of its books. */
@Component({
  selector: 'app-admin-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogue.html',
})
export class Catalogue {
  private readonly api = inject(AdminApi);

  protected readonly query = signal('');

  private readonly submitted = signal<string | null>(null);

  protected readonly results = httpResource<CatalogueEntry[]>(() => {
    const query = this.submitted();
    return query === null ? undefined : { url: API_ENDPOINTS.admin.catalogue, params: { query } };
  });

  protected readonly searchFailure = computed(() => {
    const error = this.results.error();
    if (error === undefined) {
      return null;
    }
    const reason = failureReason(error);
    return reason.charAt(0).toUpperCase() + reason.slice(1);
  });

  private readonly states = signal<Record<string, CatalogueEntryState>>({});

  protected readonly busy = signal<Record<string, boolean>>({});

  protected readonly messages = signal<Record<string, AdminMessage>>({});

  protected search(event: Event): void {
    event.preventDefault();
    const query = this.query().trim();
    if (!query) {
      return;
    }
    if (query === this.submitted()) {
      this.results.reload();
    } else {
      this.submitted.set(query);
    }
  }

  protected retry(): void {
    this.results.reload();
  }

  protected stateOf(entry: CatalogueEntry): CatalogueEntryState {
    return this.states()[entry.entryId] ?? entry.state;
  }

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
