import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/** Browser `localStorage`, `null` where it is unavailable; a token so tests provide their own. */
export const BROWSER_STORAGE = new InjectionToken<Storage | null>('BROWSER_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});
