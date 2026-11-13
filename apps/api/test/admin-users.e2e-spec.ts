import { Role, UserStatus } from '../src/generated/prisma/client.js';
import { bearer, createTestApp, PASSWORD, TestApp } from './support/test-app.js';

const USERS = '/api/v1/admin/users';

describe('Admin: user management', () => {
  let t: TestApp;
  let adminId: string;
  let adminToken: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
    const admin = await t.createUser({ email: 'admin@example.test', roles: [Role.USER, Role.ADMIN] });
    adminId = admin.id;
    adminToken = (await t.signIn(admin.email)).accessToken;
  });
  afterAll(() => t.close());

  describe('access control', () => {
    it('is closed to visitors, regular users and moderators', async () => {
      const user = await t.createUser();
      const moderator = await t.createUser({ roles: [Role.USER, Role.MODERATOR] });
      const userToken = (await t.signIn(user.email)).accessToken;
      const moderatorToken = (await t.signIn(moderator.email)).accessToken;

      await t.browser().get(USERS).expect(401);

      for (const token of [userToken, moderatorToken]) {
        const list = await t.browser().get(USERS).set(bearer(token));
        expect(list.status).toBe(403);
        expect(list.body.error.code).toBe('FORBIDDEN');
        await t
          .browser()
          .put(`${USERS}/${user.id}/roles`)
          .set(bearer(token))
          .send({ roles: ['ADMIN'] })
          .expect(403);
        await t
          .browser()
          .patch(`${USERS}/${adminId}/status`)
          .set(bearer(token))
          .send({ status: 'SUSPENDED' })
          .expect(403);
      }
    });
  });

  describe('listing', () => {
    it('paginates, searches and filters', async () => {
      await t.createUser({ email: 'nadia@example.test' });
      await t.createUser({ email: 'karim@example.test', roles: [Role.USER, Role.MODERATOR] });
      await t.createUser({ email: 'pending@example.test', status: UserStatus.PENDING_VERIFICATION });

      const page = await t.browser().get(USERS).query({ pageSize: 2 }).set(bearer(adminToken)).expect(200);
      expect(page.body.data).toHaveLength(2);
      expect(page.body.meta).toEqual({ page: 1, pageSize: 2, total: 4, totalPages: 2 });

      const search = await t.browser().get(USERS).query({ search: 'NADIA' }).set(bearer(adminToken)).expect(200);
      expect(search.body.data.map((u: { email: string }) => u.email)).toEqual(['nadia@example.test']);

      const moderators = await t.browser().get(USERS).query({ role: 'MODERATOR' }).set(bearer(adminToken)).expect(200);
      expect(moderators.body.data.map((u: { email: string }) => u.email)).toEqual(['karim@example.test']);

      const pending = await t
        .browser()
        .get(USERS)
        .query({ status: 'PENDING_VERIFICATION' })
        .set(bearer(adminToken))
        .expect(200);
      expect(pending.body.meta.total).toBe(1);

      await t.browser().get(USERS).query({ pageSize: 1000 }).set(bearer(adminToken)).expect(400);
    });

    it('answers 404 for an unknown user and 400 for a malformed id', async () => {
      await t.browser().get(`${USERS}/7b0c1c2e-6f0f-4d6e-9d55-0a4f3f1f9b11`).set(bearer(adminToken)).expect(404);
      await t.browser().get(`${USERS}/42`).set(bearer(adminToken)).expect(400);
    });
  });

  describe('roles', () => {
    it('grants a role that takes effect immediately and is audited', async () => {
      const user = await t.createUser();
      const userToken = (await t.signIn(user.email)).accessToken;
      await t.browser().get(USERS).set(bearer(userToken)).expect(403);

      const response = await t
        .browser()
        .put(`${USERS}/${user.id}/roles`)
        .set(bearer(adminToken))
        .send({ roles: ['ADMIN'] })
        .expect(200);
      expect(response.body.data.roles.sort()).toEqual(['ADMIN', 'USER']);

      // Same access token as before: roles are read on every request.
      await t.browser().get(USERS).set(bearer(userToken)).expect(200);

      const [entry] = await t.prisma.auditLog.findMany({ where: { action: 'user.roles.updated' } });
      expect(entry).toMatchObject({ actorId: adminId, targetId: user.id });
      expect(entry.metadata).toEqual({ from: ['USER'], to: ['USER', 'ADMIN'] });
    });

    it('removes elevated roles but always keeps USER', async () => {
      const moderator = await t.createUser({ roles: [Role.USER, Role.MODERATOR] });

      const response = await t
        .browser()
        .put(`${USERS}/${moderator.id}/roles`)
        .set(bearer(adminToken))
        .send({ roles: ['USER'] })
        .expect(200);
      expect(response.body.data.roles).toEqual(['USER']);
    });

    it('rejects unknown roles', async () => {
      const user = await t.createUser();
      await t
        .browser()
        .put(`${USERS}/${user.id}/roles`)
        .set(bearer(adminToken))
        .send({ roles: ['ROOT'] })
        .expect(400);
      await t.browser().put(`${USERS}/${user.id}/roles`).set(bearer(adminToken)).send({ roles: [] }).expect(400);
    });

    it('stops administrators from changing their own roles or status', async () => {
      const roles = await t
        .browser()
        .put(`${USERS}/${adminId}/roles`)
        .set(bearer(adminToken))
        .send({ roles: ['USER'] });
      expect(roles.status).toBe(409);
      expect(roles.body.error.code).toBe('CANNOT_MODIFY_SELF');

      await t
        .browser()
        .patch(`${USERS}/${adminId}/status`)
        .set(bearer(adminToken))
        .send({ status: 'SUSPENDED' })
        .expect(409);
    });
  });

  describe('suspension', () => {
    it('cuts off access at once and can be reversed', async () => {
      const user = await t.createUser();
      const session = await t.signIn(user.email);
      await session.browser.get('/api/v1/me').set(bearer(session.accessToken)).expect(200);

      await t
        .browser()
        .patch(`${USERS}/${user.id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'SUSPENDED' })
        .expect(200);

      await session.browser.get('/api/v1/me').set(bearer(session.accessToken)).expect(401);
      await session.browser.post('/api/v1/auth/refresh').expect(401);
      const login = await t.browser().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
      expect(login.body.error.code).toBe('ACCOUNT_SUSPENDED');

      await t
        .browser()
        .patch(`${USERS}/${user.id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'ACTIVE' })
        .expect(200);
      await t.browser().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);

      const actions = (await t.prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } })).map((a) => a.action);
      expect(actions).toEqual(['user.suspended', 'user.reactivated']);
    });

    it('cannot activate an account that never confirmed its email', async () => {
      const pending = await t.createUser({ status: UserStatus.PENDING_VERIFICATION });
      await t
        .browser()
        .patch(`${USERS}/${pending.id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'ACTIVE' })
        .expect(409);
    });
  });
});
