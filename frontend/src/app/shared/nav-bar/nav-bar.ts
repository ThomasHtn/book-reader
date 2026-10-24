import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CONTEXTS, LABELS } from './nav-bar.constants';
import { NavBarDirection } from './nav-bar.model';

/**
 * "Précédent" or "Suivant" bar in the footer, or "Mes livres" in the reader's head line. It is rendered
 * only when there is somewhere to go, so it carries no disabled state: its caller drops it from the DOM instead.
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
   * What the bar turns, read after its label: "page précédente" by default, "titres précédents" on the list.
   */
  public readonly context = input<string>();

  /**
   * Emitted on click; the caller turns the page.
   */
  public readonly activate = output<void>();

  /**
   * Visible label, next to the arrow.
   */
  protected readonly label = computed(() => LABELS[this.direction()]);

  /**
   * Name read by screen readers: the visible label first (WCAG 2.5.3, so voice control finds the bar),
   * then what it turns.
   */
  protected readonly accessibleName = computed(() => {
    const context = this.context() ?? CONTEXTS[this.direction()];
    return context ? `${this.label()}, ${context}` : null;
  });
}
