import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { testSession, testUser } from '../auth/testing';
import { AccessibilityService, DEFAULT_SETTINGS } from './accessibility.service';

describe('AccessibilityService', () => {
  const root = document.documentElement;

  function create() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(AccessibilityService);
    TestBed.tick();
    return service;
  }

  beforeEach(() => localStorage.clear());

  it('applies the defaults to the document', () => {
    create();
    expect(root.style.fontSize).toBe('100%');
    expect(root.dataset['contrast']).toBe('default');
    expect(root.dataset['reducedMotion']).toBe('false');
  });

  it('applies and remembers a change', async () => {
    const service = create();
    await service.update({ fontScale: 150, contrast: 'high' });
    TestBed.tick();

    expect(root.style.fontSize).toBe('150%');
    expect(root.dataset['contrast']).toBe('high');
    expect(JSON.parse(localStorage.getItem('ic.a11y')!)).toMatchObject({
      fontScale: 150,
      contrast: 'high',
    });
  });

  it('starts from the settings remembered on the device', () => {
    localStorage.setItem('ic.a11y', JSON.stringify({ ...DEFAULT_SETTINGS, simplified: true }));
    expect(create().settings().simplified).toBe(true);
  });

  it('ignores corrupt or tampered stored settings', () => {
    localStorage.setItem('ic.a11y', '{"fontScale": 9000, "contrast": "neon"}');
    expect(create().settings()).toEqual(DEFAULT_SETTINGS);

    localStorage.setItem('ic.a11y', 'not json');
    TestBed.resetTestingModule();
    expect(create().settings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saves to the account when signed in', async () => {
    const service = create();
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).setSession(testSession().data);

    const update = service.update({ reducedMotion: true });
    const request = http.expectOne('/api/v1/me/accessibility');
    expect(request.request.body).toEqual({ ...DEFAULT_SETTINGS, reducedMotion: true });
    request.flush({ data: { ...testUser, accessibility: request.request.body } });
    await update;
    http.verify();
  });

  it('adopts the settings saved on the account after sign-in', () => {
    const service = create();
    const saved = {
      fontScale: 125,
      contrast: 'high',
      reducedMotion: false,
      simplified: false,
    } as const;
    TestBed.inject(AuthService).setSession(
      testSession('t', { ...testUser, accessibility: saved }).data,
    );
    TestBed.tick();

    expect(service.settings()).toEqual(saved);
  });
});
