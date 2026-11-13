import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { testSession } from './testing';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  /** Lets the promise-based refresh inside the interceptor settle. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  it('adds the access token to API calls', () => {
    auth.setSession(testSession('access-1').data);
    client.get('/api/v1/me').subscribe();

    const request = http.expectOne('/api/v1/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush({});
  });

  it('leaves the auth endpoints and other URLs alone', () => {
    auth.setSession(testSession('access-1').data);
    client.post('/api/v1/auth/login', {}).subscribe();
    client.get('/i18n/en.json').subscribe();

    for (const url of ['/api/v1/auth/login', '/i18n/en.json']) {
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('refreshes the session and retries once after a 401', async () => {
    auth.setSession(testSession('expired').data);
    const response = firstValueFrom(client.get('/api/v1/me'));

    http.expectOne('/api/v1/me').flush({}, { status: 401, statusText: '' });
    http.expectOne('/api/v1/auth/refresh').flush(testSession('fresh'));
    await settle();

    const retry = http.expectOne('/api/v1/me');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush({ ok: true });
    expect(await response).toEqual({ ok: true });
  });

  it('sends the user to sign in when the session cannot be refreshed', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.setSession(testSession('expired').data);
    const response = firstValueFrom(client.get('/api/v1/me')).catch((error: unknown) => error);

    http.expectOne('/api/v1/me').flush({}, { status: 401, statusText: '' });
    http.expectOne('/api/v1/auth/refresh').flush({}, { status: 401, statusText: '' });
    await response;

    expect(auth.isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/', expired: 1 },
    });
  });

  it('passes other errors through untouched', async () => {
    const response = firstValueFrom(client.get('/api/v1/admin/users')).catch(
      (error: { status: number }) => error.status,
    );
    http.expectOne('/api/v1/admin/users').flush({}, { status: 403, statusText: '' });
    expect(await response).toBe(403);
  });
});
