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
  LucideLoaderCircle,
  LucideLogIn,
  LucideLogOut,
  LucideSearch,
  LucideSettings,
  LucideUpload,
} from '@lucide/angular';

import { SignInOutcome } from '@core/admin/admin.model';
import { AdminSession } from '@core/admin/admin-session';

/**
 * French message shown under the key field for each refused sign-in.
 */
const SIGN_IN_ERRORS: Record<Exclude<SignInOutcome, 'ok'>, string> = {
  invalid: 'Clé incorrecte',
  locked: "Trop d'essais, réessayez dans une minute",
  unreachable: 'Serveur injoignable',
};

/**
 * Route `/admin`: sign-in screen, then header and sections; its stylesheet only loads with this
 * lazy route, and applies to every view under it, hence `ViewEncapsulation.None`.
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
    LucideLoaderCircle,
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
  /**
   * Holds the admin key; its presence switches the sign-in screen for the backoffice.
   */
  protected readonly session = inject(AdminSession);

  /**
   * Key typed so far, cleared once accepted so it never lingers in the DOM.
   */
  protected readonly keyInput = signal('');

  /**
   * True while the server checks the key; blocks double submissions.
   */
  protected readonly checking = signal(false);

  /**
   * Reason of the last refused key, `null` when there is none to show.
   */
  protected readonly error = signal<string | null>(null);

  /**
   * Switches `<html>` to the backoffice density for the lifetime of this route.
   */
  constructor() {
    const root = inject(DOCUMENT).documentElement;
    root.dataset['density'] = 'admin';
    inject(DestroyRef).onDestroy(() => delete root.dataset['density']);
  }

  /**
   * Checks the typed key against the server and shows why it was refused.
   */
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
