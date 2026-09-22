import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * "Précédent" or "Suivant" bar, sitting in the footer. It is rendered only when there is somewhere to
 * go, so it carries no disabled state: its caller drops it from the DOM instead.
 */
@Component({
  selector: 'app-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="nav-bar"
      [class.nav-bar--prev]="direction() === 'previous'"
      [class.nav-bar--next]="direction() === 'next'"
      [attr.aria-label]="accessibleName()"
      (click)="activate.emit()"
    >
      @if (direction() === 'previous') {
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M70 10 L30 50 L70 90" />
        </svg>
      }
      <span>{{ label() }}</span>
      @if (direction() === 'next') {
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M30 10 L70 50 L30 90" />
        </svg>
      }
    </button>
  `,
})
export class NavBar {
  public readonly direction = input.required<'previous' | 'next'>();

  /** Accessible name, "Page précédente" by default; the list says "Titres précédents". */
  public readonly name = input<string>();

  public readonly activate = output<void>();

  protected readonly label = computed(() =>
    this.direction() === 'previous' ? 'Précédent' : 'Suivant',
  );

  protected readonly accessibleName = computed(
    () => this.name() ?? (this.direction() === 'previous' ? 'Page précédente' : 'Page suivante'),
  );
}
