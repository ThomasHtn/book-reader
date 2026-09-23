import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { LucideLoaderCircle, LucideRotateCw, LucideSave } from '@lucide/angular';
import { AdminApi } from '@core/admin/admin-api';
import { AdminMessage, failureMessage, successMessage } from '@core/admin/admin-message';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { FontTier, ReaderSettings } from '@core/http/api.model';

/** Remote calibration: font tier, previewed at the scale of the current screen. */
@Component({
  selector: 'app-admin-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideLoaderCircle, LucideRotateCw, LucideSave],
  templateUrl: './settings.html',
})
export class Settings {
  private readonly api = inject(AdminApi);

  protected readonly tiers: readonly FontTier[] = [48, 72, 100, 140];

  protected readonly current = httpResource<ReaderSettings>(() => API_ENDPOINTS.settings);

  /** Only shown once the server answered, so the fallback can never be saved over the real tier. */
  protected readonly tier = linkedSignal<FontTier>(() =>
    this.current.hasValue() ? this.current.value().fontTier : 100,
  );

  protected readonly saving = signal(false);

  protected readonly message = signal<AdminMessage | null>(null);

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.api.saveSettings({ fontTier: this.tier() });
      this.message.set(
        successMessage('Réglages enregistrés, appliqués à la liseuse dans les dix secondes'),
      );
    } catch (error) {
      this.message.set(failureMessage(error));
    }
    this.saving.set(false);
  }
}
