import { safeReturnUrl } from './auth.guards';

describe('safeReturnUrl', () => {
  it('keeps paths inside the application', () => {
    expect(safeReturnUrl('/account')).toBe('/account');
    expect(safeReturnUrl('/admin/users?page=2')).toBe('/admin/users?page=2');
  });

  it('falls back to the dashboard for anything that could leave the site', () => {
    expect(safeReturnUrl('https://evil.example')).toBe('/dashboard');
    expect(safeReturnUrl('//evil.example')).toBe('/dashboard');
    expect(safeReturnUrl('javascript:alert(1)')).toBe('/dashboard');
    expect(safeReturnUrl(undefined)).toBe('/dashboard');
    expect(safeReturnUrl('')).toBe('/dashboard');
  });
});
