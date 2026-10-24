import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NavBar } from './nav-bar';
import { NavBarDirection } from './nav-bar.model';

/**
 * Host binding the bar's direction and counting its activations.
 */
@Component({
  imports: [NavBar],
  template: `<app-nav-bar [direction]="direction()" (activate)="activations = activations + 1" />`,
})
class Host {
  /**
   * Direction bound to the bar.
   */
  public readonly direction = signal<NavBarDirection>('next');

  /**
   * Number of `activate` events received.
   */
  public activations = 0;
}

describe('NavBar', () => {
  /**
   * Renders the host and returns its button.
   */
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, button, host: fixture.componentInstance };
  }

  it('shows an arrow then the label, with an explicit accessible name', () => {
    const { button } = render();

    expect(button.type).toBe('button');
    expect(button.textContent?.trim()).toBe('Suivant');
    expect(button.getAttribute('aria-label')).toBe('Page suivante');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.classList).toContain('nav-bar--next');
  });

  it('labels the previous bar', () => {
    const { fixture, button, host } = render();
    host.direction.set('previous');
    fixture.detectChanges();

    expect(button.textContent?.trim()).toBe('Précédent');
    expect(button.getAttribute('aria-label')).toBe('Page précédente');
    expect(button.classList).toContain('nav-bar--prev');
  });

  it('labels the way back to the list by its visible text alone, without an arrow', () => {
    const { fixture, button, host } = render();
    host.direction.set('exit');
    fixture.detectChanges();

    expect(button.textContent?.trim()).toBe('Mes livres');
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.querySelector('svg')).toBeNull();
    expect(button.classList).toContain('nav-bar--exit');
  });

  it('emits on click', () => {
    const { button, host } = render();
    button.click();
    expect(host.activations).toBe(1);
  });
});
