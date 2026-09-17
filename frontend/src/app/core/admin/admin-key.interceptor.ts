import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ADMIN_KEY_HEADER, AdminSession } from './admin-session';

const ADMIN_PREFIX = '/api/admin';

/**
 * Attaches the remembered key to administrative calls, and signs out once the server refuses it
 * (key changed on the server), which brings the sign-in screen back.
 */
export const adminKeyInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(ADMIN_PREFIX)) {
    return next(request);
  }
  const session = inject(AdminSession);
  const key = session.key();
  const explicit = request.headers.has(ADMIN_KEY_HEADER);
  const authorized =
    explicit || key === null ? request : request.clone({ setHeaders: { [ADMIN_KEY_HEADER]: key } });
  return next(authorized).pipe(
    tap({
      error: (error: unknown) => {
        const refused =
          error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
        if (refused && !explicit) {
          session.signOut();
        }
      },
    }),
  );
};
