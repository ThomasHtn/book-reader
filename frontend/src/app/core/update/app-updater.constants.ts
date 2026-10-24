import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/**
 * Inactivity after which a downloaded version is applied (specification 5.7).
 */
export const IDLE_BEFORE_UPDATE_MS = 10 * 60_000;

/**
 * Reloads the page; a token so tests never reload the test runner.
 */
export const APP_RELOAD = new InjectionToken<() => void>('APP_RELOAD', {
  providedIn: 'root',
  factory: () => {
    const location = inject(DOCUMENT).defaultView?.location;
    return () => location?.reload();
  },
});
