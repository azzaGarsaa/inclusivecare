import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.js';

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

/** An expected failure with a code the client can act on. */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message, status);
  }

  static badRequest(code: ErrorCode, message: string, details?: unknown) {
    return new AppException(HttpStatus.BAD_REQUEST, code, message, details);
  }

  static unauthenticated(message = 'Authentication is required.', code: ErrorCode = ErrorCode.Unauthenticated) {
    return new AppException(HttpStatus.UNAUTHORIZED, code, message);
  }

  static forbidden(message = 'You are not allowed to do this.', code: ErrorCode = ErrorCode.Forbidden) {
    return new AppException(HttpStatus.FORBIDDEN, code, message);
  }

  static notFound(message = 'Resource not found.') {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, message);
  }

  static conflict(code: ErrorCode, message: string) {
    return new AppException(HttpStatus.CONFLICT, code, message);
  }
}
