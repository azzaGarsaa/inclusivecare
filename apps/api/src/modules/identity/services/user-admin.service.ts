import { Injectable } from '@nestjs/common';
import { Page } from '../../../common/dto/pagination.dto.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { Role, UserStatus } from '../../../generated/prisma/client.js';
import { AuditService } from '../../audit/audit.service.js';
import type { AuthenticatedUser, RequestOrigin } from '../authenticated-user.js';
import type { ListUsersQueryDto } from '../dto/admin-users.dto.js';
import { UserDto } from '../dto/user.dto.js';
import { UsersRepository, UserWithRoles } from '../repositories/users.repository.js';
import { TokenService } from './token.service.js';

/** User management for administrators. Every change is written to the audit log. */
@Injectable()
export class UserAdminService {
  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<Page<UserDto>> {
    const { search, role, status } = query;
    const [users, total] = await this.users.list({ search, role, status }, query.skip, query.pageSize);
    return new Page(
      users.map((user) => UserDto.from(user)),
      total,
      query,
    );
  }

  async get(id: string): Promise<UserDto> {
    return UserDto.from(await this.requireUser(id));
  }

  async setRoles(actor: AuthenticatedUser, id: string, roles: Role[], origin: RequestOrigin): Promise<UserDto> {
    const target = await this.requireOtherUser(actor, id);

    // Everyone keeps the base role; elevated roles are added on top of it.
    const next = [...new Set([Role.USER, ...roles])];
    const updated = await this.users.replaceRoles(id, next, actor.id);

    await this.audit.record({
      actorId: actor.id,
      action: 'user.roles.updated',
      targetType: 'user',
      targetId: id,
      metadata: { from: target.roles.map((r) => r.role), to: next },
      ipAddress: origin.ipAddress,
    });
    return UserDto.from(updated);
  }

  async setStatus(
    actor: AuthenticatedUser,
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
    origin: RequestOrigin,
  ): Promise<UserDto> {
    const target = await this.requireOtherUser(actor, id);

    if (target.status === UserStatus.PENDING_VERIFICATION) {
      throw AppException.conflict(ErrorCode.EmailNotVerified, 'This account has not confirmed its email address yet.');
    }
    if (target.status === status) return UserDto.from(target);

    const updated = await this.users.update(id, { status });
    if (status === UserStatus.SUSPENDED) await this.tokens.revokeAllForUser(id);

    await this.audit.record({
      actorId: actor.id,
      action: status === UserStatus.SUSPENDED ? 'user.suspended' : 'user.reactivated',
      targetType: 'user',
      targetId: id,
      ipAddress: origin.ipAddress,
    });
    return UserDto.from(updated);
  }

  private async requireUser(id: string): Promise<UserWithRoles> {
    const user = await this.users.findById(id);
    if (!user) throw AppException.notFound('User not found.');
    return user;
  }

  /**
   * Administrators cannot change their own roles or status. This rules out
   * locking oneself out and guarantees at least one administrator remains.
   */
  private async requireOtherUser(actor: AuthenticatedUser, id: string): Promise<UserWithRoles> {
    if (actor.id === id) {
      throw AppException.conflict(ErrorCode.CannotModifySelf, 'You cannot change your own roles or status.');
    }
    return this.requireUser(id);
  }
}
