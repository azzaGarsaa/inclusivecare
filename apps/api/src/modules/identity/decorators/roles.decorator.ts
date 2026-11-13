import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/** Restricts a route or controller to users holding at least one of the roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
