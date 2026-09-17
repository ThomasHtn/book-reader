import { DestroyRef, DOCUMENT, inject, InjectionToken, Service } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/** Inactivity after which a downloaded version is applied (specification 5.7). */
export const IDLE_BEFORE_UPDATE_MS = 10 * 60_000;

const IDLE_CHECK_MS = 60_000;

const UPDATE_CHECK_MS = 30 * 60_000;

/** Reloads the page; a token so tests never reload the test runner. */
export const APP_RELOAD = new InjectionToken<() => void>('APP_RELOAD', {
  providedIn: 'root',
  factory: () => {
    const location = inject(DOCUMENT).defaultView?.location;
    return () => location?.reload();
  },
});

/**
 * Tells whether the reader has been left alone long enough to reload.
 *
 * @param lastCommandAt - Time of the last key press or click.
 * @param now - Current time.
 * @returns `true` after ten minutes without any command.
 */
export function isIdleLongEnough(lastCommandAt: number, now: number): boolean {
  return now - lastCommandAt >= IDLE_BEFORE_UPDATE_MS;
}

/**
 * Applies new application versions without ever interrupting reading: the service worker downloads
 * them in the background, the page reloads once nobody pressed a key or clicked for ten minutes.
 * Reading position survives the reload since it is saved on every page.
 */
@Service()
export class AppUpdater {
  constructor() {
    const updates = inject(SwUpdate);
    if (!updates.isEnabled) {
      return;
    }
    const document = inject(DOCUMENT);
    const reload = inject(APP_RELOAD);
    let lastCommandAt = Date.now();
    let versionReady = false;

    const onCommand = () => (lastCommandAt = Date.now());
    document.addEventListener('keydown', onCommand, true);
    document.addEventListener('pointerdown', onCommand, true);
    const subscription = updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        versionReady = true;
      }
    });
    const idleTimer = setInterval(() => {
      if (versionReady && isIdleLongEnough(lastCommandAt, Date.now())) {
        versionReady = false;
        reload();
      }
    }, IDLE_CHECK_MS);
    const checkTimer = setInterval(
      () => void updates.checkForUpdate().catch(() => false),
      UPDATE_CHECK_MS,
    );

    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onCommand, true);
      document.removeEventListener('pointerdown', onCommand, true);
      subscription.unsubscribe();
      clearInterval(idleTimer);
      clearInterval(checkTimer);
    });
  }
}
