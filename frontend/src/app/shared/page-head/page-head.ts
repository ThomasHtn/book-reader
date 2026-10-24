import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Head line above a screen's content: an optional title on the left, the page indicator on the right
 * ("Page 12 sur 840", "Titres 1 à 6 sur 7"), announced politely on each turn. Anything projected
 * follows the indicator, such as the caregiver's gear on the list.
 */
@Component({
  selector: 'app-page-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-head.html',
  styleUrl: './page-head.scss',
})
export class PageHead {
  /**
   * Screen title, such as "Mes livres"; the reader has none, its title page says it.
   */
  public readonly heading = input<string>();

  /**
   * Position in the screen's pages, small and muted: a state, never a command.
   */
  public readonly indicator = input.required<string>();

  /**
   * As wide as the book grid rather than the reading column, with room for the corner gear.
   */
  public readonly wide = input(false, { transform: booleanAttribute });
}
