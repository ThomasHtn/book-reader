import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ACCESSIBLE_NAMES, LABELS } from './nav-bar.constants';
import { NavBarDirection } from './nav-bar.model';

/**
 * "Mes livres", "Précédent" or "Suivant" bar, sitting in the footer. It is rendered only when there is
 * somewhere to go, so it carries no disabled state: its caller drops it from the DOM instead.
 */
@Component({
  selector: 'app-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar {
  /**
   * Which bar it is: sets the arrow side, the label and the default accessible name.
   */
  public readonly direction = input.required<NavBarDirection>();

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
  protected readonly label = computed(() => LABELS[this.direction()]);

  /**
   * Name read by screen readers, more explicit than the visible label.
   */
  protected readonly accessibleName = computed(
    () => this.name() ?? ACCESSIBLE_NAMES[this.direction()],
  );
}
