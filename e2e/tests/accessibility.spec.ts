import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from '../support/a11y';

const ADMIN = { email: 'admin@inclusivecare.local', password: 'InclusiveCare-dev-2026' };

const PUBLIC_PAGES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/accessibility',
  '/no-such-page',
];

for (const lang of ['en', 'fr', 'ar'] as const) {
  test(`public pages have no detectable WCAG violations in ${lang}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('ic.lang', value), lang);
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page.locator('#page-title')).toBeVisible();
      await expectNoAccessibilityViolations(page);
    }
  });
}

test('high-contrast mode has no detectable WCAG violations', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'ic.a11y',
      JSON.stringify({ fontScale: 150, contrast: 'high', reducedMotion: true, simplified: true }),
    ),
  );
  for (const path of ['/', '/auth/register', '/accessibility']) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await expectNoAccessibilityViolations(page);
  }
});

test('form errors and signed-in pages have no detectable WCAG violations', async ({ page }) => {
  // A form showing its validation errors.
  await page.goto('/auth/register');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page.getByText('You need to accept the terms')).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await page.goto('/auth/login');
  await page.getByLabel('Email address').fill(ADMIN.email);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectNoAccessibilityViolations(page);

  // In-app navigation, as a user would do it.
  const nav = page.getByRole('navigation', { name: 'Main navigation' });

  await nav.getByRole('link', { name: 'My account' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My account' })).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await nav.getByRole('link', { name: 'Users' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await page.getByRole('table').getByRole('link').first().click();
  await expect(
    page
      .getByRole('heading', { level: 2, name: 'Roles' })
      .or(page.getByText('This is your own account.')),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});
