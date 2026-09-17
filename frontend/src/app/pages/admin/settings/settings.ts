import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { AdminApi } from '@core/admin/admin-api';
import { AdminMessage, failureMessage, successMessage } from '@core/admin/admin-message';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { FontTier, ReaderSettings, Theme } from '@core/http/api.model';

/** Remote calibration: font tier and theme, previewed at the scale of the current screen. */
@Component({
  selector: 'app-admin-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
})
export class Settings {
  private readonly api = inject(AdminApi);

  protected readonly tiers: readonly FontTier[] = [48, 72, 100, 140];

  protected readonly themes: readonly { value: Theme; label: string }[] = [
    { value: 'dark-on-light', label: 'Noir sur blanc' },
    { value: 'light-on-dark', label: 'Blanc sur noir' },
    { value: 'yellow-on-black', label: 'Jaune sur noir' },
  ];

  private readonly current = httpResource<ReaderSettings>(() => API_ENDPOINTS.settings);

  protected readonly tier = linkedSignal<FontTier>(() =>
    this.current.hasValue() ? this.current.value().fontTier : 100,
  );

  protected readonly theme = linkedSignal<Theme>(() =>
    this.current.hasValue() ? this.current.value().theme : 'dark-on-light',
  );

  protected readonly saving = signal(false);

  protected readonly message = signal<AdminMessage | null>(null);

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.api.saveSettings({ fontTier: this.tier(), theme: this.theme() });
      this.message.set(
        successMessage('Réglages enregistrés, appliqués à la liseuse dans les dix secondes'),
      );
    } catch (error) {
      this.message.set(failureMessage(error));
    }
    this.saving.set(false);
  }
}
