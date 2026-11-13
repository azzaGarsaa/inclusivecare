import { UserStatus } from '../src/generated/prisma/client.js';
import { createTestApp, PASSWORD, TestApp } from './support/test-app.js';

const AUTH = '/api/v1/auth';

const registration = {
  email: 'amina@example.test',
  password: PASSWORD,
  firstName: 'Amina',
  lastName: 'Ben Salah',
  locale: 'fr',
  acceptTerms: true,
};

describe('Authentication', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  describe('registration and email verification', () => {
    it('creates a pending account, records consent and emails a confirmation link', async () => {
      await t.browser().post(`${AUTH}/register`).send(registration).expect(204);

      const user = await t.prisma.user.findUniqueOrThrow({
        where: { email: registration.email },
        include: { roles: true, consents: true },
      });
      expect(user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.roles.map((r) => r.role)).toEqual(['USER']);
      expect(user.consents.map((c) => c.type).sort()).toEqual(['PRIVACY_POLICY', 'TERMS_OF_SERVICE']);

      expect(t.mailer.sent).toHaveLength(1);
      expect(t.mailer.sent[0].subject).toBe('Confirmez votre adresse e-mail');
    });

    it('normalises the email address', async () => {
      await t
        .browser()
        .post(`${AUTH}/register`)
        .send({ ...registration, email: '  Amina@Example.TEST ' })
        .expect(204);
      expect(await t.prisma.user.count({ where: { email: 'amina@example.test' } })).toBe(1);
    });

    it('refuses sign-in until the address is confirmed, then allows it', async () => {
      const browser = t.browser();
      await browser.post(`${AUTH}/register`).send(registration).expect(204);

      const credentials = { email: registration.email, password: registration.password };
      const before = await browser.post(`${AUTH}/login`).send(credentials).expect(403);
      expect(before.body.error.code).toBe('EMAIL_NOT_VERIFIED');

      const token = t.mailer.lastTokenFor(registration.email);
      await browser.post(`${AUTH}/verify-email`).send({ token }).expect(204);

      const after = await browser.post(`${AUTH}/login`).send(credentials).expect(200);
      expect(after.body.data.user).toMatchObject({ email: registration.email, status: 'ACTIVE', roles: ['USER'] });
      expect(after.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('accepts a confirmation link only once', async () => {
      await t.browser().post(`${AUTH}/register`).send(registration).expect(204);
      const token = t.mailer.lastTokenFor(registration.email);

      await t.browser().post(`${AUTH}/verify-email`).send({ token }).expect(204);
      const again = await t.browser().post(`${AUTH}/verify-email`).send({ token }).expect(400);
      expect(again.body.error.code).toBe('TOKEN_INVALID');
    });

    it('does not reveal that an address is already registered', async () => {
      const existing = await t.createUser({ email: registration.email });

      await t.browser().post(`${AUTH}/register`).send(registration).expect(204);

      expect(await t.prisma.user.count()).toBe(1);
      expect(t.mailer.sent).toHaveLength(1);
      expect(t.mailer.sent[0].to).toBe(existing.email);
      expect(t.mailer.sent[0].text).not.toContain('token=');
    });

    it('rejects invalid input with one entry per field', async () => {
      const response = await t
        .browser()
        .post(`${AUTH}/register`)
        .send({ ...registration, email: 'nope', password: 'short', acceptTerms: false, role: 'ADMIN' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((d: { field: string }) => d.field).sort();
      expect(fields).toEqual(['acceptTerms', 'email', 'password', 'role']);
    });
  });

  describe('sign-in', () => {
    it('gives the same answer for a wrong password and an unknown address', async () => {
      const user = await t.createUser();

      const wrong = await t.browser().post(`${AUTH}/login`).send({ email: user.email, password: 'wrong password!' });
      const unknown = await t
        .browser()
        .post(`${AUTH}/login`)
        .send({ email: 'nobody@example.test', password: PASSWORD });

      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body).toEqual(unknown.body);
      expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('sets the refresh token in a cookie scripts cannot read', async () => {
      const user = await t.createUser();
      const response = await t.browser().post(`${AUTH}/login`).send({ email: user.email, password: PASSWORD });

      const cookie = (response.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toMatch(/^ic_refresh=/);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
      expect(JSON.stringify(response.body)).not.toContain(cookie.split(';')[0].split('=')[1]);
    });

    it('refuses a suspended account', async () => {
      const user = await t.createUser({ status: UserStatus.SUSPENDED });
      const response = await t.browser().post(`${AUTH}/login`).send({ email: user.email, password: PASSWORD });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('session refresh', () => {
    const cookieOf = (response: { headers: Record<string, unknown> }) =>
      (response.headers['set-cookie'] as string[])[0].split(';')[0];

    it('issues a new access token and replaces the refresh token', async () => {
      const user = await t.createUser();
      const { browser } = await t.signIn(user.email);

      const first = await browser.post(`${AUTH}/refresh`).expect(200);
      const second = await browser.post(`${AUTH}/refresh`).expect(200);

      expect(first.body.data.accessToken).toEqual(expect.any(String));
      expect(cookieOf(first)).not.toBe(cookieOf(second));
    });

    it('answers 401 without a refresh cookie', async () => {
      const response = await t.browser().post(`${AUTH}/refresh`).expect(401);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });

    it('tolerates two tabs refreshing at the same moment', async () => {
      const user = await t.createUser();
      const login = await t.browser().post(`${AUTH}/login`).send({ email: user.email, password: PASSWORD });
      const original = cookieOf(login);

      const winner = await t.browser().post(`${AUTH}/refresh`).set('Cookie', original).expect(200);
      await t.browser().post(`${AUTH}/refresh`).set('Cookie', original).expect(401);

      // The session survives: the token handed to the first tab still works.
      await t.browser().post(`${AUTH}/refresh`).set('Cookie', cookieOf(winner)).expect(200);
    });

    it('revokes the whole session when an old refresh token is replayed', async () => {
      const user = await t.createUser();
      const login = await t.browser().post(`${AUTH}/login`).send({ email: user.email, password: PASSWORD });
      const stolen = cookieOf(login);

      const legitimate = await t.browser().post(`${AUTH}/refresh`).set('Cookie', stolen).expect(200);
      // Move the rotation into the past, beyond the multi-tab grace window.
      await t.prisma.refreshToken.updateMany({
        where: { revokedAt: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      await t.browser().post(`${AUTH}/refresh`).set('Cookie', stolen).expect(401);
      await t.browser().post(`${AUTH}/refresh`).set('Cookie', cookieOf(legitimate)).expect(401);
    });

    it('rejects an expired refresh token', async () => {
      const user = await t.createUser();
      const { browser } = await t.signIn(user.email);
      await t.prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      await browser.post(`${AUTH}/refresh`).expect(401);
    });

    it('ends the session on sign-out', async () => {
      const user = await t.createUser();
      const { browser } = await t.signIn(user.email);

      await browser.post(`${AUTH}/logout`).expect(204);
      await browser.post(`${AUTH}/refresh`).expect(401);
    });
  });

  describe('password reset', () => {
    it('sets a new password, signs out existing sessions and works once', async () => {
      const user = await t.createUser();
      const { browser: oldSession } = await t.signIn(user.email);

      await t.browser().post(`${AUTH}/forgot-password`).send({ email: user.email }).expect(204);
      const token = t.mailer.lastTokenFor(user.email);
      const password = 'a brand new passphrase';

      await t.browser().post(`${AUTH}/reset-password`).send({ token, password }).expect(204);

      await oldSession.post(`${AUTH}/refresh`).expect(401);
      await t.browser().post(`${AUTH}/login`).send({ email: user.email, password: PASSWORD }).expect(401);
      await t.browser().post(`${AUTH}/login`).send({ email: user.email, password }).expect(200);
      await t.browser().post(`${AUTH}/reset-password`).send({ token, password }).expect(400);

      const audit = await t.prisma.auditLog.findMany({ where: { action: 'user.password.reset' } });
      expect(audit).toHaveLength(1);
    });

    it('answers 204 and sends nothing for an unknown address', async () => {
      await t.browser().post(`${AUTH}/forgot-password`).send({ email: 'nobody@example.test' }).expect(204);
      expect(t.mailer.sent).toHaveLength(0);
    });

    it('rejects an expired reset link', async () => {
      const user = await t.createUser();
      await t.browser().post(`${AUTH}/forgot-password`).send({ email: user.email }).expect(204);
      const token = t.mailer.lastTokenFor(user.email);
      await t.prisma.oneTimeToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      await t.browser().post(`${AUTH}/reset-password`).send({ token, password: 'a brand new passphrase' }).expect(400);
    });
  });
});
