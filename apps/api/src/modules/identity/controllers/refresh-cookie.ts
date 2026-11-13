import type { Request, Response } from 'express';

export const REFRESH_COOKIE = 'ic_refresh';

/**
 * The refresh token lives in a cookie JavaScript cannot read, and the browser
 * only sends it to the auth endpoints. SameSite=Strict keeps other sites from
 * triggering a refresh or logout on the user's behalf.
 */
const options = (secure: boolean) => ({ httpOnly: true, secure, sameSite: 'strict', path: '/api/v1/auth' }) as const;

export function readRefreshCookie(request: Request): string | undefined {
  const value: unknown = request.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value ? value : undefined;
}

export function setRefreshCookie(response: Response, token: string, maxAgeMs: number, secure: boolean): void {
  response.cookie(REFRESH_COOKIE, token, { ...options(secure), maxAge: maxAgeMs });
}

export function clearRefreshCookie(response: Response, secure: boolean): void {
  response.clearCookie(REFRESH_COOKIE, options(secure));
}
