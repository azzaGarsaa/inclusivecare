import { ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';

export interface FieldError {
  field: string;
  /** class-validator rule names (isEmail, minLength…), used as translation keys. */
  rules: string[];
  messages: string[];
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own: FieldError[] = error.constraints
      ? [{ field, rules: Object.keys(error.constraints), messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      AppException.badRequest(ErrorCode.ValidationFailed, 'Some fields are invalid.', flatten(errors)),
  });
}
