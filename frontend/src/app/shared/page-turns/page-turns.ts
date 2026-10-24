import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CommandGate } from '@core/reader/command-gate';
import { pageCommandOf } from '@core/reader/page-command.utils';
import { PageCommand } from '@core/reader/reader.model';
import { NavBar } from '@shared/nav-bar/nav-bar';

/**
 * Footer of "Mes livres" and of the reader: "Précédent" under the left half, "Suivant" under the
 * right one, an absent bar leaving its half empty. It also takes the arrow keys (and Space where it
 * means "Suivant") and lets through only one command every 400 ms (spec 5.1).
 */
@Component({
  selector: 'footer[app-page-turns]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavBar],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './page-turns.html',
  styleUrl: './page-turns.scss',
})
export class PageTurns {
  /**
   * Whether there is a previous page; without one the left half stays empty.
   */
  public readonly hasPrevious = input.required<boolean>();

  /**
   * Whether there is a next page; without one the right half stays empty.
   */
  public readonly hasNext = input.required<boolean>();

  /**
   * Whether Space turns to the next page, as in the reader; in the list it opens the focused title.
   */
  public readonly spaceTurnsPage = input(false, { transform: booleanAttribute });

  /**
   * What "Précédent" turns, read after its label; the bar's default when absent.
   */
  public readonly previousContext = input<string>();

  /**
   * What "Suivant" turns, read after its label; the bar's default when absent.
   */
  public readonly nextContext = input<string>();

  /**
   * Emitted for each accepted command, towards a page that exists.
   */
  public readonly turn = output<PageCommand>();

  /**
   * Ignores commands under 400 ms apart and held-key repeats (spec 5.1).
   */
  private readonly gate = new CommandGate();

  /**
   * Turns the page from a bar.
   */
  protected onBar(command: PageCommand): void {
    this.request(command, false);
  }

  /**
   * Turns the page from a key, intercepted at document level; the key never scrolls anything.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const command = pageCommandOf(event, this.spaceTurnsPage());
    if (command) {
      event.preventDefault();
      this.request(command, event.repeat);
    }
  }

  /**
   * Emits a command when its page exists and the gate lets it through.
   */
  private request(command: PageCommand, repeated: boolean): void {
    const exists = command === 'next' ? this.hasNext() : this.hasPrevious();
    if (exists && this.gate.accept(repeated)) {
      this.turn.emit(command);
    }
  }
}
