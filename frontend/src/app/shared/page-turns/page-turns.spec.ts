import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PageCommand } from '@core/reader/reader.model';

import { PageTurns } from './page-turns';

/**
 * Host binding which pages exist and recording the commands received.
 */
@Component({
  imports: [PageTurns],
  template: `<footer
    app-page-turns
    [hasPrevious]="hasPrevious()"
    [hasNext]="hasNext()"
    [spaceTurnsPage]="space()"
    nextContext="titres suivants"
    (turn)="turns.push($event)"
  ></footer>`,
})
class Host {
  /**
   * Whether a previous page exists.
   */
  public readonly hasPrevious = signal(true);

  /**
   * Whether a next page exists.
   */
  public readonly hasNext = signal(true);

  /**
   * Whether Space turns the page.
   */
  public readonly space = signal(false);

  /**
   * Commands received, in order.
   */
  public readonly turns: PageCommand[] = [];
}

describe('PageTurns', () => {
  /**
   * Fake clock read by the gate, moved by hand.
   */
  let now: number;

  beforeEach(() => {
    now = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  /**
   * Renders the host and returns it with its two halves.
   */
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const halves = () => Array.from(element.querySelectorAll('footer > div'));
    return { fixture, host: fixture.componentInstance, halves };
  }

  /**
   * Presses a key on the document and says whether its default action was prevented.
   */
  function press(key: string, init: KeyboardEventInit = {}): boolean {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, ...init });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it('keeps each bar in its own half, leaving an absent one empty', () => {
    const { fixture, host, halves } = render();
    expect(halves().map((half) => half.textContent?.trim())).toEqual(['Précédent', 'Suivant']);

    host.hasPrevious.set(false);
    fixture.detectChanges();

    expect(halves().map((half) => half.textContent?.trim())).toEqual(['', 'Suivant']);
    expect(halves()[1].querySelector('button')?.getAttribute('aria-label')).toBe(
      'Suivant, titres suivants',
    );
  });

  it('emits the bar clicked, one command every 400 ms', () => {
    const { host, halves } = render();
    const next = halves()[1].querySelector('button')!;

    next.click();
    next.click();
    now += 400;
    halves()[0].querySelector('button')!.click();

    expect(host.turns).toEqual(['next', 'previous']);
  });

  it('turns with the arrows, and with Space only where it means "Suivant"', () => {
    const { fixture, host } = render();

    expect(press('ArrowRight')).toBe(true);
    now += 400;
    expect(press(' ')).toBe(false);
    host.space.set(true);
    fixture.detectChanges();
    expect(press(' ')).toBe(true);
    now += 400;
    expect(press('ArrowRight', { altKey: true })).toBe(false);

    expect(host.turns).toEqual(['next', 'next']);
  });

  it('ignores held keys and commands towards a page that does not exist', () => {
    const { fixture, host } = render();
    host.hasNext.set(false);
    fixture.detectChanges();

    expect(press('ArrowRight')).toBe(true);
    press('ArrowLeft', { repeat: true });

    expect(host.turns).toEqual([]);
  });
});
