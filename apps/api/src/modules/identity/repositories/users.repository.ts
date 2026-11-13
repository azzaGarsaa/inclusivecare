import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { ConsentType, Prisma, Role, UserStatus } from '../../../generated/prisma/client.js';
import type { Locale } from '../../../generated/prisma/client.js';

const withRoles = { roles: { select: { role: true } } } satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof withRoles }>;

export interface NewUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  locale: Locale;
  consentVersion: string;
  ipAddress?: string;
}

export interface UserFilter {
  search?: string;
  role?: Role;
  status?: UserStatus;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: withRoles });
  }

  findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null }, include: withRoles });
  }

  /** Creates the account with its default role and the consents given at sign-up. */
  create(user: NewUser): Promise<UserWithRoles> {
    const { consentVersion, ipAddress, ...fields } = user;
    return this.prisma.user.create({
      data: {
        ...fields,
        roles: { create: { role: Role.USER } },
        consents: {
          create: [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY].map((type) => ({
            type,
            version: consentVersion,
            ipAddress,
          })),
        },
      },
      include: withRoles,
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithRoles> {
    return this.prisma.user.update({ where: { id }, data, include: withRoles });
  }

  async list(filter: UserFilter, skip: number, take: number): Promise<[UserWithRoles[], number]> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      status: filter.status,
      roles: filter.role ? { some: { role: filter.role } } : undefined,
      OR: filter.search
        ? (['email', 'firstName', 'lastName'] as const).map((field) => ({
            [field]: { contains: filter.search, mode: 'insensitive' as const },
          }))
        : undefined,
    };
    return this.prisma.$transaction([
      this.prisma.user.findMany({ where, include: withRoles, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.user.count({ where }),
    ]);
  }

  async replaceRoles(userId: string, roles: Role[], grantedById: string): Promise<UserWithRoles> {
    const [, , user] = await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId, role: { notIn: roles } } }),
      this.prisma.userRole.createMany({
        data: roles.map((role) => ({ userId, role, grantedById })),
        skipDuplicates: true,
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: withRoles }),
    ]);
    return user;
  }

  countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: { deletedAt: null, status: UserStatus.ACTIVE, roles: { some: { role: Role.ADMIN } } },
    });
  }
}
