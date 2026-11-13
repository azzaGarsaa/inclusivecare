import { HttpErrorResponse } from '@angular/common/http';

/** Error codes the interface has a translated message for (see `errors.*` in the i18n files). */
const KNOWN_CODES = new Set([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'INVALID_CREDENTIALS',
  'EMAIL_NOT_VERIFIED',
  'ACCOUNT_SUSPENDED',
  'TOKEN_INVALID',
  'WRONG_PASSWORD',
  'CANNOT_MODIFY_SELF',
  'LAST_ADMIN',
]);

/** The API's error code, or NETWORK / UNKNOWN when there is none. */
export function errorCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'UNKNOWN';
  if (error.status === 0) return 'NETWORK';
  const code: unknown = error.error?.error?.code;
  return typeof code === 'string' && KNOWN_CODES.has(code) ? code : 'UNKNOWN';
}

/** Translation key of the message to show for a failed request. */
export function errorKey(error: unknown): string {
  return `errors.${errorCode(error)}`;
}
