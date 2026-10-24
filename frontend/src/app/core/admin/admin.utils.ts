/**
 * Tells whether the server refused the administrator key.
 *
 * @param status - HTTP status of a failed call.
 * @returns `true` for 401 and 403.
 */
export function isRefusedKey(status: number | undefined): boolean {
  return status === 401 || status === 403;
}
