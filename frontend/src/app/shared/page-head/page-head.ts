import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Head line above the book list: an optional title on the left, the page indicator on the right
 * ("Titres 1 à 9 sur 12"), announced politely on each turn. Anything projected follows the indicator,
 * such as the caregiver's gear. The reader has its own head line, with "Mes livres" and the book.
 */
@Component({
  selector: 'app-page-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-head.html',
  styleUrl: './page-head.scss',
})
export class PageHead {
  /**
   * Screen title, such as "Mes livres".
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
