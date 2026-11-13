import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Locale, Role, UserStatus } from '../../../generated/prisma/client.js';
import type { UserWithRoles } from '../repositories/users.repository.js';
import { NameField, NewPasswordField } from './fields.js';

export const FONT_SCALES = [100, 112, 125, 150] as const;
export const CONTRAST_MODES = ['default', 'high'] as const;

export class AccessibilityDto {
  /** Text size as a percentage of the default. */
  @ApiProperty({ enum: FONT_SCALES })
  @IsIn(FONT_SCALES)
  fontScale: (typeof FONT_SCALES)[number];

  @ApiProperty({ enum: CONTRAST_MODES })
  @IsIn(CONTRAST_MODES)
  contrast: (typeof CONTRAST_MODES)[number];

  @IsBoolean()
  reducedMotion: boolean;

  @IsBoolean()
  simplified: boolean;
}

export class UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  @ApiProperty({ enum: Locale })
  locale: Locale;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ enum: Role, isArray: true })
  roles: Role[];

  @ApiProperty({ type: AccessibilityDto, nullable: true })
  accessibility: AccessibilityDto | null;

  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  lastLoginAt: Date | null;

  static from(user: UserWithRoles): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      locale: user.locale,
      status: user.status,
      roles: user.roles.map((r) => r.role),
      accessibility: (user.accessibility as AccessibilityDto | null) ?? null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

export class UpdateProfileDto {
  @IsOptional()
  @NameField()
  firstName?: string;

  @IsOptional()
  @NameField()
  lastName?: string;

  @ApiProperty({ enum: Locale, required: false })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword: string;

  @NewPasswordField()
  newPassword: string;
}

export class DeleteAccountDto {
  /** Asked again so that an unattended session cannot delete the account. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
