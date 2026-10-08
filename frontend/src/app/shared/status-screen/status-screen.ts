import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * Shown while the server does not answer; the caller also retries on its own every ten seconds.
 */
@Component({
  selector: 'app-status-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Own landmark and heading: it replaces the whole screen while the server is down (spec 5.6). -->
    <main class="status">
      <h1>Le service est indisponible, nouvel essai dans quelques secondes.</h1>
      <button type="button" class="button" (click)="retry.emit()">Réessayer</button>
    </main>
  `,
})
export class StatusScreen {
  /**
   * Asked by the user, ahead of the caller's automatic retry.
   */
  public readonly retry = output<void>();
}
