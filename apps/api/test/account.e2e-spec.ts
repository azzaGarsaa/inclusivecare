import { Role } from '../src/generated/prisma/client.js';
import { bearer, createTestApp, PASSWORD, TestApp } from './support/test-app.js';

const ME = '/api/v1/me';

describe('My account', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  it('requires a valid access token', async () => {
    await t.browser().get(ME).expect(401);
    await t.browser().get(ME).set(bearer('not-a-token')).expect(401);
  });

  it('returns and updates the profile', async () => {
    const user = await t.createUser();
    const { browser, accessToken } = await t.signIn(user.email);

    const profile = await browser.get(ME).set(bearer(accessToken)).expect(200);
    expect(profile.body.data).toMatchObject({ id: user.id, email: user.email, accessibility: null });

    const updated = await browser
      .patch(ME)
      .set(bearer(accessToken))
      .send({ firstName: '  Leïla ', locale: 'ar' })
      .expect(200);
    expect(updated.body.data).toMatchObject({ firstName: 'Leïla', locale: 'ar' });
  });

  it('does not let a user change their own email, roles or status', async () => {
    const user = await t.createUser();
    const { browser, accessToken } = await t.signIn(user.email);

    await browser
      .patch(ME)
      .set(bearer(accessToken))
      .send({ roles: ['ADMIN'] })
      .expect(400);
    await browser.patch(ME).set(bearer(accessToken)).send({ status: 'ACTIVE' }).expect(400);
    await browser.patch(ME).set(bearer(accessToken)).send({ email: 'other@example.test' }).expect(400);
  });

  it('saves accessibility settings and validates them', async () => {
    const user = await t.createUser();
    const { browser, accessToken } = await t.signIn(user.email);
    const settings = { fontScale: 125, contrast: 'high', reducedMotion: true, simplified: false };

    const saved = await browser.put(`${ME}/accessibility`).set(bearer(accessToken)).send(settings).expect(200);
    expect(saved.body.data.accessibility).toEqual(settings);

    await browser
      .put(`${ME}/accessibility`)
      .set(bearer(accessToken))
      .send({ ...settings, fontScale: 999 })
      .expect(400);
  });

  it('changes the password, keeps this device signed in and signs out the others', async () => {
    const user = await t.createUser();
    const here = await t.signIn(user.email);
    const elsewhere = await t.signIn(user.email);
    const newPassword = 'another long passphrase';

    const wrong = await here.browser
      .post(`${ME}/password`)
      .set(bearer(here.accessToken))
      .send({ currentPassword: 'not my password', newPassword })
      .expect(400);
    expect(wrong.body.error.code).toBe('WRONG_PASSWORD');

    await here.browser
      .post(`${ME}/password`)
      .set(bearer(here.accessToken))
      .send({ currentPassword: PASSWORD, newPassword })
      .expect(200);

    await here.browser.post('/api/v1/auth/refresh').expect(200);
    await elsewhere.browser.post('/api/v1/auth/refresh').expect(401);
    await t.browser().post('/api/v1/auth/login').send({ email: user.email, password: newPassword }).expect(200);
  });

  it('deletes the account, erases personal data and frees the email address', async () => {
    const user = await t.createUser({ email: 'leaving@example.test' });
    const { browser, accessToken } = await t.signIn(user.email);

    await browser.post(`${ME}/delete`).set(bearer(accessToken)).send({ password: 'wrong password' }).expect(400);
    await browser.post(`${ME}/delete`).set(bearer(accessToken)).send({ password: PASSWORD }).expect(204);

    await browser.get(ME).set(bearer(accessToken)).expect(401);
    await browser.post('/api/v1/auth/refresh').expect(401);
    await t.browser().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);

    const row = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.email).not.toContain('leaving');
    expect(row.firstName).toBe('Deleted');
    expect(row.deletedAt).not.toBeNull();

    await t
      .browser()
      .post('/api/v1/auth/register')
      .send({ email: user.email, password: PASSWORD, firstName: 'New', lastName: 'Person', acceptTerms: true })
      .expect(204);
    expect(await t.prisma.user.count({ where: { email: user.email } })).toBe(1);
  });

  it('refuses to delete the last administrator', async () => {
    const admin = await t.createUser({ roles: [Role.USER, Role.ADMIN] });
    const { browser, accessToken } = await t.signIn(admin.email);

    const response = await browser.post(`${ME}/delete`).set(bearer(accessToken)).send({ password: PASSWORD });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LAST_ADMIN');
  });
});
