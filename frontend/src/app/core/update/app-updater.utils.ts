import { IDLE_BEFORE_UPDATE_MS } from './app-updater.constants';

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
