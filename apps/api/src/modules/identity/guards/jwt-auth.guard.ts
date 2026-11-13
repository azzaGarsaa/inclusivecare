import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from '../../../common/errors/app.exception.js';
import { UserStatus } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../authenticated-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { TokenService } from '../services/token.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw AppException.unauthenticated();

    const userId = await this.tokens.verifyAccessToken(token);
    if (!userId) throw AppException.unauthenticated();

    // Loaded on every request rather than trusted from the token, so that a
    // suspension or a role change takes effect immediately.
    const user = await this.users.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) throw AppException.unauthenticated();

    request.user = { id: user.id, email: user.email, roles: user.roles.map((r) => r.role) };
    return true;
  }
}
