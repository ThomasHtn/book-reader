import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { PageCommand } from '@core/reader/reader.model';

/**
 * "Précédent" or "Suivant" bar, sitting in the footer. It is rendered only when there is somewhere to
 * go, so it carries no disabled state: its caller drops it from the DOM instead.
 */
@Component({
  selector: 'app-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-bar.html',
})
export class NavBar {
  /**
   * Which bar it is: sets the arrow side, the label and the default accessible name.
   */
  public readonly direction = input.required<PageCommand>();

  /**
   * Accessible name, "Page précédente" by default; the list says "Titres précédents".
   */
  public readonly name = input<string>();

  /**
   * Emitted on click; the caller turns the page.
   */
  public readonly activate = output<void>();

  /**
   * Visible label, next to the arrow.
   */
  protected readonly label = computed(() =>
    this.direction() === 'previous' ? 'Précédent' : 'Suivant',
  );

  /**
   * Name read by screen readers, more explicit than the visible label.
   */
  protected readonly accessibleName = computed(
    () => this.name() ?? (this.direction() === 'previous' ? 'Page précédente' : 'Page suivante'),
  );
}
