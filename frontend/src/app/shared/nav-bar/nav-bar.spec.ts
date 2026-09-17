import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavBar } from './nav-bar';

@Component({
  imports: [NavBar],
  template: `<app-nav-bar
    [direction]="direction()"
    [disabled]="disabled()"
    (activate)="activations = activations + 1"
  />`,
})
class Host {
  public readonly direction = signal<'previous' | 'next'>('next');
  public readonly disabled = signal(false);
  public activations = 0;
}

describe('NavBar', () => {
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

  it('emits on click while enabled', () => {
    const { button, host } = render();
    button.click();
    expect(host.activations).toBe(1);
  });

  it('stays in place and focusable when disabled, but does nothing', () => {
    const { fixture, button, host } = render();
    host.disabled.set(true);
    fixture.detectChanges();

    button.click();

    expect(host.activations).toBe(0);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});
