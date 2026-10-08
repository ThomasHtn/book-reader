import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/**
 * Browser `localStorage`, `null` where it is unavailable; a token so tests provide their own.
 */
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

/**
 * Reads an entry, treating any storage failure as absence.
 *
 * @param storage - Storage from `BROWSER_STORAGE`.
 * @param key - Entry key.
 * @returns Stored value, or `null`.
 */
export function readItem(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Writes an entry on a best-effort basis: quota or privacy settings may refuse it silently.
 *
 * @param storage - Storage from `BROWSER_STORAGE`.
 * @param key - Entry key.
 * @param value - Value to store.
 */
export function writeItem(storage: Storage | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Callers treat stored data as optional.
  }
}

/**
 * Removes an entry, ignoring storage failures.
 *
 * @param storage - Storage from `BROWSER_STORAGE`.
 * @param key - Entry key.
 */
export function removeItem(storage: Storage | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing stored, or nothing reachable.
  }
}
