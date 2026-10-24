import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { httpStatusOf } from '@core/http/http-status.utils';
import { BROWSER_STORAGE, readItem, removeItem, writeItem } from '@core/storage/browser-storage';

import { ADMIN_KEY_HEADER } from './admin.constants';
import { SignInOutcome } from './admin.model';
import { isRefusedKey } from './admin.utils';

/**
 * `localStorage` entry holding the key between visits.
 */
const KEY_STORAGE_KEY = 'admin.key';

/**
 * Administrator key, typed once and remembered in the browser (specification section 9).
 */
@Service()
export class AdminSession {
  /**
   * Client used for the key check, which sends its own header.
   */
  private readonly http = inject(HttpClient);

  /**
   * Browser storage that remembers the key, `null` when unavailable.
   */
  private readonly storage = inject(BROWSER_STORAGE);

  /**
   * Writable key, seeded from storage so a returning caregiver stays signed in.
   */
  private readonly current = signal<string | null>(readItem(this.storage, KEY_STORAGE_KEY));

  /**
   * Remembered key, `null` when signed out.
   */
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
      const status = httpStatusOf(error);
      return status === 429 ? 'locked' : isRefusedKey(status) ? 'invalid' : 'unreachable';
    }
    this.current.set(key);
    // When storage refuses it, the key is simply asked again next visit.
    writeItem(this.storage, KEY_STORAGE_KEY, key);
    return 'ok';
  }

  /**
   * Forgets the key.
   */
  public signOut(): void {
    this.current.set(null);
    removeItem(this.storage, KEY_STORAGE_KEY);
  }
}
