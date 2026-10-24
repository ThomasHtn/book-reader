import { DestroyRef, DOCUMENT, inject, Service } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { APP_RELOAD } from './app-updater.constants';
import { isIdleLongEnough } from './app-updater.utils';

/**
 * How often idleness is checked once a version is ready; a reload may lag idleness by this much.
 */
const IDLE_CHECK_MS = 60_000;

/**
 * How often the service worker asks the server for a new version, on top of its own checks at start.
 */
const UPDATE_CHECK_MS = 30 * 60_000;

/**
 * Applies new application versions without ever interrupting reading: the service worker downloads
 * them in the background, the page reloads once nobody pressed a key or clicked for ten minutes.
 * Reading position survives the reload since it is saved on every page.
 */
@Service()
export class AppUpdater {
  /**
   * Wires everything at once; does nothing in development, where the service worker is off.
   */
  constructor() {
    const updates = inject(SwUpdate);
    if (!updates.isEnabled) {
      return;
    }
    const document = inject(DOCUMENT);
    const reload = inject(APP_RELOAD);
    let lastCommandAt = Date.now();
    let versionReady = false;

    // Capture phase, so a component stopping propagation still counts as activity.
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
      // A failed check (offline) is retried at the next interval.
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
