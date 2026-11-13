import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { testSession, testUser } from './testing';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts signed out', () => {
    expect(auth.isSignedIn()).toBe(false);
    expect(auth.token()).toBeNull();
  });

  it('keeps the user and the access token after signing in, but stores no token', async () => {
    const login = auth.login({ email: testUser.email, password: 'secret-password' });
    http.expectOne('/api/v1/auth/login').flush(testSession());
    await login;

    expect(auth.user()).toEqual(testUser);
    expect(auth.token()).toBe('access-1');
    expect(auth.isAdmin()).toBe(false);
    expect(JSON.stringify({ ...localStorage })).not.toContain('access-1');
  });

  it('recognises administrators', () => {
    auth.setSession(testSession('t', { ...testUser, roles: ['USER', 'ADMIN'] }).data);
    expect(auth.isAdmin()).toBe(true);
  });

  it('does not call the API at startup for a visitor who never signed in', async () => {
    await auth.restore();
    http.expectNone('/api/v1/auth/refresh');
  });

  it('restores the session at startup when one probably exists', async () => {
    auth.setSession(testSession().data);
    auth.clear();
    localStorage.setItem('ic.session', '1');

    const restore = auth.restore();
    http.expectOne('/api/v1/auth/refresh').flush(testSession('access-2'));
    await restore;

    expect(auth.token()).toBe('access-2');
  });

  it('shares one refresh request between simultaneous callers', async () => {
    const first = auth.refresh();
    const second = auth.refresh();
    http.expectOne('/api/v1/auth/refresh').flush(testSession('access-2'));

    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });

  it('signs out locally when the refresh is refused', async () => {
    auth.setSession(testSession().data);

    const refresh = auth.refresh();
    http
      .expectOne('/api/v1/auth/refresh')
      .flush({ error: { code: 'TOKEN_INVALID' } }, { status: 401, statusText: '' });

    expect(await refresh).toBe(false);
    expect(auth.isSignedIn()).toBe(false);
    expect(localStorage.getItem('ic.session')).toBeNull();
  });

  it('signs out locally even if the logout call fails', async () => {
    auth.setSession(testSession().data);

    const logout = auth.logout().catch(() => undefined);
    http.expectOne('/api/v1/auth/logout').error(new ProgressEvent('error'));
    await logout;

    expect(auth.isSignedIn()).toBe(false);
  });
});
