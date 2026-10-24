import { HttpErrorResponse } from '@angular/common/http';

/**
 * Reads the HTTP status of a failed call.
 *
 * @param error - Error raised by HttpClient or an `httpResource`.
 * @returns Status, 0 when the server did not answer, `undefined` for an error that is not HTTP.
 */
export function httpStatusOf(error: unknown): number | undefined {
  return error instanceof HttpErrorResponse ? error.status : undefined;
}
