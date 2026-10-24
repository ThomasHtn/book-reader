import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PageHead } from './page-head';

/**
 * Host binding the head line's inputs and projecting a button into it.
 */
@Component({
  imports: [PageHead],
  template: `
    <app-page-head [heading]="heading()" [indicator]="indicator()" [wide]="wide()">
      <button type="button">Réglages</button>
    </app-page-head>
  `,
})
class Host {
  /**
   * Title bound to the head line.
   */
  public readonly heading = signal<string | undefined>('Mes livres');

  /**
   * Indicator bound to the head line.
   */
  public readonly indicator = signal('Titres 1 à 6 sur 7');

  /**
   * Width variant bound to the head line.
   */
  public readonly wide = signal(true);
}

describe('PageHead', () => {
  /**
   * Renders the host and returns its header.
   */
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    return { fixture, header, host: fixture.componentInstance };
  }

  it('shows the title, then the indicator announced politely, then the projected content', () => {
    const { header } = render();

    expect(header.querySelector('h1')?.textContent?.trim()).toBe('Mes livres');
    const indicator = header.querySelector('[aria-live="polite"]');
    expect(indicator?.textContent?.trim()).toBe('Titres 1 à 6 sur 7');
    expect(header.lastElementChild?.textContent?.trim()).toBe('Réglages');
    expect(header.classList).toContain('page-head--wide');
  });

  it('leaves the title out and keeps the reading width for the reader', () => {
    const { fixture, header, host } = render();
    host.heading.set(undefined);
    host.wide.set(false);
    host.indicator.set('Page 12 sur 840');
    fixture.detectChanges();

    expect(header.querySelector('h1')).toBeNull();
    expect(header.querySelector('[aria-live]')?.textContent?.trim()).toBe('Page 12 sur 840');
    expect(header.classList).not.toContain('page-head--wide');
  });
});
