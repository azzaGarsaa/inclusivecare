import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto.js';
import { Role, UserStatus } from '../../../generated/prisma/client.js';
import { Trim } from './fields.js';

export class ListUsersQueryDto extends PageQueryDto {
  /** Matches part of the email, first name or last name. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ enum: UserStatus, required: false })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateRolesDto {
  @ApiProperty({ enum: Role, isArray: true })
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(Role, { each: true })
  roles: Role[];
}

const SETTABLE_STATUSES = [UserStatus.ACTIVE, UserStatus.SUSPENDED] as const;

export class UpdateStatusDto {
  @ApiProperty({ enum: SETTABLE_STATUSES })
  @IsIn(SETTABLE_STATUSES)
  status: (typeof SETTABLE_STATUSES)[number];
}
