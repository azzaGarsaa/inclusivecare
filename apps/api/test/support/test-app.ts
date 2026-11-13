import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { Role, UserStatus } from '../../src/generated/prisma/client.js';
import { Mailer, MailMessage } from '../../src/modules/mail/mailer.js';

export const PASSWORD = 'correct horse battery staple';

/** Keeps emails in memory so tests can read the links users would receive. */
export class CapturingMailer extends Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  /** The token from the link in the most recent email sent to this address. */
  lastTokenFor(email: string): string {
    const message = this.sent.findLast((m) => m.to === email);
    const token = message?.text.match(/token=([\w-]+)/)?.[1];
    if (!token) throw new Error(`No email with a token was sent to ${email}`);
    return decodeURIComponent(token);
  }
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  mailer: CapturingMailer;
  /** A new client with its own cookie jar, like a separate browser. */
  browser(): TestAgent;
  /** Empties every table. Call before each test. */
  reset(): Promise<void>;
  createUser(options?: { email?: string; roles?: Role[]; status?: UserStatus }): Promise<{ id: string; email: string }>;
  /** Signs in and returns the browser plus its access token. */
  signIn(email: string): Promise<{ browser: TestAgent; accessToken: string }>;
  close(): Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const mailer = new CapturingMailer();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Mailer)
    .useValue(mailer)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  // Hashing is deliberately slow, so one hash is shared by all test users.
  const passwordHash = await argon2.hash(PASSWORD);
  let counter = 0;

  const browser = () => request.agent(app.getHttpServer());

  return {
    app,
    prisma,
    mailer,
    browser,

    async reset() {
      mailer.sent.length = 0;
      await prisma.$executeRaw`TRUNCATE TABLE users, audit_logs CASCADE`;
    },

    async createUser({ email, roles = [Role.USER], status = UserStatus.ACTIVE } = {}) {
      counter += 1;
      const user = await prisma.user.create({
        data: {
          email: email ?? `user${counter}@example.test`,
          passwordHash,
          firstName: 'Test',
          lastName: `User ${counter}`,
          status,
          emailVerifiedAt: status === UserStatus.PENDING_VERIFICATION ? null : new Date(),
          roles: { create: roles.map((role) => ({ role })) },
        },
      });
      return { id: user.id, email: user.email };
    },

    async signIn(email) {
      const agent = browser();
      const response = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD }).expect(200);
      return { browser: agent, accessToken: response.body.data.accessToken as string };
    },

    close: () => app.close(),
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
