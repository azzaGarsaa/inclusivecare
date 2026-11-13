import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../generated/prisma/client.js';
import { RolesGuard } from './roles.guard.js';

function contextFor(roles: Role[] | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: roles && { id: '1', email: 'a@b.c', roles } }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guardRequiring = (required: Role[] | undefined) => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(required);
    return new RolesGuard(reflector);
  };

  it('lets everyone through when the route declares no roles', () => {
    expect(guardRequiring(undefined).canActivate(contextFor([Role.USER]))).toBe(true);
  });

  it('accepts a user holding one of the required roles', () => {
    const guard = guardRequiring([Role.MODERATOR, Role.ADMIN]);
    expect(guard.canActivate(contextFor([Role.USER, Role.ADMIN]))).toBe(true);
  });

  it('rejects a user without any required role, and requests without a user', () => {
    const guard = guardRequiring([Role.ADMIN]);
    expect(() => guard.canActivate(contextFor([Role.USER, Role.MODERATOR]))).toThrow();
    expect(() => guard.canActivate(contextFor(undefined))).toThrow();
  });
});
