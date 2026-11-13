import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Locale } from '../../../generated/prisma/client.js';
import { EmailField, NameField, NewPasswordField } from './fields.js';
import { UserDto } from './user.dto.js';

export class RegisterDto {
  @EmailField()
  email: string;

  @NewPasswordField()
  password: string;

  @NameField()
  firstName: string;

  @NameField()
  lastName: string;

  @ApiProperty({ enum: Locale, required: false })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  /** Must be true: the terms of service and privacy policy have to be accepted. */
  @Equals(true)
  acceptTerms: boolean;
}

export class LoginDto {
  @EmailField()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class EmailDto {
  @EmailField()
  email: string;
}

export class TokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;
}

export class ResetPasswordDto extends TokenDto {
  @NewPasswordField()
  password: string;
}

export class SessionDto {
  accessToken: string;
  /** Lifetime of the access token in seconds. */
  expiresIn: number;
  user: UserDto;
}
