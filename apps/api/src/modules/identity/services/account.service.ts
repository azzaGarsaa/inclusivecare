import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { Prisma, Role, UserStatus } from '../../../generated/prisma/client.js';
import { AuditService } from '../../audit/audit.service.js';
import type { AuthenticatedUser, RequestOrigin } from '../authenticated-user.js';
import { AccessibilityDto, ChangePasswordDto, UpdateProfileDto, UserDto } from '../dto/user.dto.js';
import { UsersRepository, UserWithRoles } from '../repositories/users.repository.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/** Everything a signed-in user can do to their own account. */
@Injectable()
export class AccountService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string): Promise<UserDto> {
    return UserDto.from(await this.requireUser(userId));
  }

  async updateProfile(userId: string, changes: UpdateProfileDto): Promise<UserDto> {
    return UserDto.from(await this.users.update(userId, changes));
  }

  async updateAccessibility(userId: string, settings: AccessibilityDto): Promise<UserDto> {
    const { fontScale, contrast, reducedMotion, simplified } = settings;
    const accessibility = { fontScale, contrast, reducedMotion, simplified };
    return UserDto.from(await this.users.update(userId, { accessibility }));
  }

  /** Signs the user out everywhere; the caller is expected to start a fresh session. */
  async changePassword(userId: string, dto: ChangePasswordDto, origin: RequestOrigin): Promise<void> {
    await this.requirePassword(userId, dto.currentPassword);

    await this.users.update(userId, { passwordHash: await this.passwords.hash(dto.newPassword) });
    await this.tokens.revokeAllForUser(userId);
    await this.audit.record({
      actorId: userId,
      action: 'user.password.changed',
      targetType: 'user',
      targetId: userId,
      ipAddress: origin.ipAddress,
    });
  }

  /**
   * Closes the account and removes what identifies the person. The row stays
   * so that records created later (orders, reviews) keep a valid owner.
   */
  async deleteAccount(actor: AuthenticatedUser, password: string, origin: RequestOrigin): Promise<void> {
    await this.requirePassword(actor.id, password);

    if (actor.roles.includes(Role.ADMIN) && (await this.users.countActiveAdmins()) <= 1) {
      throw AppException.conflict(ErrorCode.LastAdmin, 'The last administrator account cannot be deleted.');
    }

    await this.tokens.revokeAllForUser(actor.id);
    await this.users.update(actor.id, {
      email: `deleted-${actor.id}@deleted.invalid`,
      firstName: 'Deleted',
      lastName: 'User',
      passwordHash: '',
      accessibility: Prisma.DbNull,
      status: UserStatus.DEACTIVATED,
      deletedAt: new Date(),
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'user.account.deleted',
      targetType: 'user',
      targetId: actor.id,
      ipAddress: origin.ipAddress,
    });
  }

  private async requireUser(userId: string): Promise<UserWithRoles> {
    const user = await this.users.findById(userId);
    if (!user) throw AppException.unauthenticated();
    return user;
  }

  private async requirePassword(userId: string, password: string): Promise<void> {
    const user = await this.requireUser(userId);
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      throw AppException.badRequest(ErrorCode.WrongPassword, 'The current password is incorrect.');
    }
  }
}
