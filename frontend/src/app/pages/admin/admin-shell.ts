import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideArrowLeft,
  LucideLibrary,
  LucideLogIn,
  LucideLogOut,
  LucideSearch,
  LucideSettings,
  LucideUpload,
} from '@lucide/angular';
import { AdminSession, SignInOutcome } from '@core/admin/admin-session';

const SIGN_IN_ERRORS: Record<Exclude<SignInOutcome, 'ok'>, string> = {
  invalid: 'Clé incorrecte',
  locked: "Trop d'essais, réessayez dans une minute",
  unreachable: 'Serveur injoignable',
};

/**
 * Route `/admin`: sign-in screen, then header, sections and tabs. Mobile first, system colour scheme;
 * its stylesheet, Tailwind included, only loads with this lazy route.
 */
@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideArrowLeft,
    LucideLibrary,
    LucideLogIn,
    LucideLogOut,
    LucideSearch,
    LucideSettings,
    LucideUpload,
  ],
  styleUrl: './admin.css',
  templateUrl: './admin-shell.html',
})
export class AdminShell {
  protected readonly session = inject(AdminSession);

  protected readonly keyInput = signal('');

  protected readonly checking = signal(false);

  protected readonly error = signal<string | null>(null);

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    root.dataset['density'] = 'admin';
    inject(DestroyRef).onDestroy(() => delete root.dataset['density']);
  }

  protected async signIn(event: Event): Promise<void> {
    event.preventDefault();
    const key = this.keyInput().trim();
    if (!key || this.checking()) {
      return;
    }
    this.checking.set(true);
    const outcome = await this.session.signIn(key);
    this.checking.set(false);
    this.error.set(outcome === 'ok' ? null : SIGN_IN_ERRORS[outcome]);
    if (outcome === 'ok') {
      this.keyInput.set('');
    }
  }
}
