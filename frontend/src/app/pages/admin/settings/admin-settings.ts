import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';

import { LucideLoaderCircle, LucideRotateCw, LucideSave } from '@lucide/angular';

import { AdminApi } from '@core/admin/admin-api';
import { AdminMessage, failureMessage, successMessage } from '@core/admin/admin-message';
import { FONT_TIERS, FontTier, ReaderSettings } from '@core/http/api.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

/**
 * Remote calibration of the reader's font tier, previewed at the scale of the current screen.
 */
@Component({
  selector: 'app-admin-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideLoaderCircle, LucideRotateCw, LucideSave],
  templateUrl: './admin-settings.html',
})
export class AdminSettings {
  /**
   * Admin endpoints; saving settings needs the admin key.
   */
  private readonly api = inject(AdminApi);

  /**
   * Font tiers the reader supports, in pixels.
   */
  protected readonly tiers = FONT_TIERS;

  /**
   * Settings the reader currently applies, read from the public endpoint.
   */
  protected readonly current = httpResource<ReaderSettings>(() => API_ENDPOINTS.settings);

  /**
   * Tier being chosen, reset to the server's; the template hides the 100 fallback so it is never saved.
   */
  protected readonly tier = linkedSignal<FontTier>(() =>
    this.current.hasValue() ? this.current.value().fontTier : 100,
  );

  /**
   * True while the save request runs; blocks a second press.
   */
  protected readonly saving = signal(false);

  /**
   * Outcome of the last save.
   */
  protected readonly message = signal<AdminMessage | null>(null);

  /**
   * Saves the chosen tier; the reader picks it up at its next ten-second poll.
   */
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
