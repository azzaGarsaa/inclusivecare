import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API } from '../api/models';
import { AuthService } from './auth.service';

/**
 * Adds the access token to API calls. When the API answers 401 the token has
 * usually just expired, so the session is refreshed and the call retried once.
 * If that fails too, the user is sent to the sign-in page and brought back
 * to where they were afterwards.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API) || request.url.startsWith(`${API}/auth/`)) {
    return next(request);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  const authorized = (req: HttpRequest<unknown>) => {
    const token = auth.token();
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  };

  return next(authorized(request)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(auth.refresh()).pipe(
        switchMap((refreshed) => {
          if (refreshed) return next(authorized(request));
          void router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url, expired: 1 },
          });
          return throwError(() => error);
        }),
      );
    }),
  );
};
