import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * Shown while the server does not answer; the caller also retries on its own every ten seconds.
 */
@Component({
  selector: 'app-status-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-screen.html',
})
export class StatusScreen {
  /**
   * Asked by the user, ahead of the caller's automatic retry.
   */
  public readonly retry = output<void>();
}
