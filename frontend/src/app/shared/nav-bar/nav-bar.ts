import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Full-height "Précédent" or "Suivant" bar. When there is nowhere to go it stays in place with
 * `aria-disabled` rather than `disabled`, so it keeps its focus and its silhouette.
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
      [attr.aria-disabled]="disabled() ? 'true' : null"
      (click)="onClick()"
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path
          [attr.d]="direction() === 'previous' ? 'M70 10 L30 50 L70 90' : 'M30 10 L70 50 L30 90'"
        />
      </svg>
      <span>{{ label() }}</span>
    </button>
  `,
})
export class NavBar {
  public readonly direction = input.required<'previous' | 'next'>();

  public readonly disabled = input(false);

  /** Accessible name, "Page précédente" by default; the list says "Titres précédents". */
  public readonly name = input<string>();

  public readonly activate = output<void>();

  protected readonly label = computed(() =>
    this.direction() === 'previous' ? 'Précédent' : 'Suivant',
  );

  protected readonly accessibleName = computed(
    () => this.name() ?? (this.direction() === 'previous' ? 'Page précédente' : 'Page suivante'),
  );

  protected onClick(): void {
    if (!this.disabled()) {
      this.activate.emit();
    }
  }
}
