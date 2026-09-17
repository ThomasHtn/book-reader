import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/** Shown while the server does not answer; the caller also retries on its own every ten seconds. */
@Component({
  selector: 'app-status-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="status">
      <p>Le service est indisponible, nouvel essai dans quelques secondes.</p>
      <button type="button" class="button" (click)="retry.emit()">Réessayer</button>
    </main>
  `,
})
export class StatusScreen {
  public readonly retry = output<void>();
}
