import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const Trim = () => Transform(trim);

/** Emails are compared case-insensitively, so they are normalised on the way in. */
export const EmailField = () =>
  applyDecorators(
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsEmail(),
    MaxLength(254),
  );

/**
 * Length is the only rule, following NIST SP 800-63B: composition rules push
 * people towards predictable passwords and get in the way of password managers.
 */
export const NewPasswordField = () => applyDecorators(IsString(), MinLength(10), MaxLength(128));

export const NameField = () => applyDecorators(Trim(), IsString(), MinLength(1), MaxLength(80));
