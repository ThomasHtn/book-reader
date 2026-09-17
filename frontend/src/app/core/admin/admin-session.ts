import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { BROWSER_STORAGE } from '@core/reader/progress-store';
import { firstValueFrom } from 'rxjs';

/** Header carrying the administrator key. */
export const ADMIN_KEY_HEADER = 'X-Admin-Key';

const KEY_STORAGE_KEY = 'admin.key';

/** Outcome of a sign-in attempt. */
export type SignInOutcome = 'ok' | 'invalid' | 'locked' | 'unreachable';

/** Administrator key, typed once and remembered in the browser (specification section 9). */
@Service()
export class AdminSession {
  private readonly http = inject(HttpClient);

  private readonly storage = inject(BROWSER_STORAGE);

  private readonly current = signal<string | null>(this.read());

  /** Remembered key, `null` when signed out. */
  public readonly key = this.current.asReadonly();

  /**
   * Checks a key against the server and remembers it when accepted.
   *
   * @param key - Key typed by the caregiver.
   * @returns Outcome to show on the sign-in screen.
   */
  public async signIn(key: string): Promise<SignInOutcome> {
    try {
      await firstValueFrom(
        this.http.get(API_ENDPOINTS.admin.session, { headers: { [ADMIN_KEY_HEADER]: key } }),
      );
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      return status === 429
        ? 'locked'
        : status === 401 || status === 403
          ? 'invalid'
          : 'unreachable';
    }
    this.current.set(key);
    try {
      this.storage?.setItem(KEY_STORAGE_KEY, key);
    } catch {
      // Not remembered: the key is asked again next visit.
    }
    return 'ok';
  }

  /** Forgets the key. */
  public signOut(): void {
    this.current.set(null);
    try {
      this.storage?.removeItem(KEY_STORAGE_KEY);
    } catch {
      // Nothing stored.
    }
  }

  private read(): string | null {
    try {
      return this.storage?.getItem(KEY_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
}
