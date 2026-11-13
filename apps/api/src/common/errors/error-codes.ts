/**
 * Stable, machine-readable error codes. The web app translates them, so a
 * code must never be renamed once released.
 */
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  Unauthenticated: 'UNAUTHENTICATED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  RateLimited: 'RATE_LIMITED',
  InternalError: 'INTERNAL_ERROR',

  InvalidCredentials: 'INVALID_CREDENTIALS',
  EmailNotVerified: 'EMAIL_NOT_VERIFIED',
  AccountSuspended: 'ACCOUNT_SUSPENDED',
  TokenInvalid: 'TOKEN_INVALID',
  WrongPassword: 'WRONG_PASSWORD',
  CannotModifySelf: 'CANNOT_MODIFY_SELF',
  LastAdmin: 'LAST_ADMIN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
