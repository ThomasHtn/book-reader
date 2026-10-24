/**
 * Minimum delay between two accepted reader commands (specification 5.1).
 */
export const COMMAND_INTERVAL_MS = 400;

/**
 * Refresh cadence of books and settings, also the retry cadence when the server is unreachable.
 */
export const POLL_INTERVAL_MS = 10_000;
