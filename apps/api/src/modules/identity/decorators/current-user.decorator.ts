import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser, RequestOrigin } from '../authenticated-user.js';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
  return request.user;
});

export const Origin = createParamDecorator((_data: unknown, context: ExecutionContext): RequestOrigin => {
  const request = context.switchToHttp().getRequest<Request>();
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent']?.slice(0, 300),
  };
});
