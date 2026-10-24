import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { tap } from 'rxjs';

import { httpStatusOf } from '@core/http/http-status.utils';

import { ADMIN_KEY_HEADER } from './admin.constants';
import { isRefusedKey } from './admin.utils';
import { AdminSession } from './admin-session';

/**
 * URL prefix of the routes guarded by `X-Admin-Key`; public `GET /api/**` calls stay keyless.
 */
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
        if (isRefusedKey(httpStatusOf(error)) && !explicit) {
          session.signOut();
        }
      },
    }),
  );
};
