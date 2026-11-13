import { renderAuthMail } from './templates.js';

describe('renderAuthMail', () => {
  const link = 'https://app.example.test/auth/verify-email?token=abc';

  it('escapes user-provided names in the HTML body', () => {
    const { html, text } = renderAuthMail('verifyEmail', 'en', '<script>alert(1)</script>', link);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(text).toContain(link);
  });

  it('marks Arabic emails as right-to-left', () => {
    const { html } = renderAuthMail('resetPassword', 'ar', 'Leïla', link);
    expect(html).toContain('lang="ar" dir="rtl"');
  });

  it.each(['en', 'fr', 'ar'] as const)('has a subject for every kind of email in %s', (locale) => {
    for (const kind of ['verifyEmail', 'resetPassword', 'alreadyRegistered'] as const) {
      expect(renderAuthMail(kind, locale, 'A', link).subject.length).toBeGreaterThan(0);
    }
  });
});
