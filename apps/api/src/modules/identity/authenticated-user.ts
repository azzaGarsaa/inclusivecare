import type { Role } from '../../generated/prisma/client.js';

/** The signed-in user as attached to each request by JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: Role[];
}

/** Where a request came from; stored with sessions and audit entries. */
export interface RequestOrigin {
  ipAddress?: string;
  userAgent?: string;
}
