import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Signed-in users only. Visitors are sent to sign in and return afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isSignedIn()) return true;
  return inject(Router).createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Pages that make no sense once signed in (sign-in, registration). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isSignedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;
};

/**
 * Hides administration pages from other users. This is a convenience only:
 * the API enforces the same rule on every request.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/dashboard']);
};

/** Accepts only in-app paths, so a crafted link cannot redirect elsewhere after sign-in. */
export function safeReturnUrl(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}
