/**
 * Development seed. Every person here is fictional.
 * Run with: npm run db:seed -w api
 */
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { Locale, PrismaClient, Role, UserStatus } from '../src/generated/prisma/client.js';

const DEV_PASSWORD = 'InclusiveCare-dev-2026';

const USERS: { email: string; firstName: string; lastName: string; locale: Locale; roles: Role[] }[] = [
  {
    email: 'admin@inclusivecare.local',
    firstName: 'Salma',
    lastName: 'Admin',
    locale: Locale.en,
    roles: [Role.USER, Role.ADMIN],
  },
  {
    email: 'moderator@inclusivecare.local',
    firstName: 'Youssef',
    lastName: 'Moderator',
    locale: Locale.ar,
    roles: [Role.USER, Role.MODERATOR],
  },
  {
    email: 'amina@inclusivecare.local',
    firstName: 'Amina',
    lastName: 'Trabelsi',
    locale: Locale.fr,
    roles: [Role.USER],
  },
  { email: 'james@inclusivecare.local', firstName: 'James', lastName: 'Walker', locale: Locale.en, roles: [Role.USER] },
  { email: 'leila@inclusivecare.local', firstName: 'ليلى', lastName: 'منصور', locale: Locale.ar, roles: [Role.USER] },
];

if (process.env.NODE_ENV === 'production') {
  throw new Error('The development seed must not run in production.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });

  for (const { roles, ...user } of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      // Re-running the seed puts the demo accounts back in a known state.
      update: { ...user, status: UserStatus.ACTIVE },
      create: {
        ...user,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        roles: { create: roles.map((role) => ({ role })) },
      },
    });
  }

  console.log(`Seeded ${USERS.length} users. Password for all of them: ${DEV_PASSWORD}`);
} finally {
  await prisma.$disconnect();
}
