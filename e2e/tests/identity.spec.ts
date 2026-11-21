import { expect, Page, test } from '@playwright/test';
import { linkFromLatestEmail } from '../support/mailpit';

// Seeded by `npm run db:seed -w api`.
const ADMIN = { email: 'admin@inclusivecare.local', password: 'InclusiveCare-dev-2026' };

const visitor = {
  firstName: 'Nour',
  lastName: 'Haddad',
  email: `nour.${Date.now()}@example.test`,
  password: 'three quiet green rivers',
};

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe.configure({ mode: 'serial' });

test('a visitor creates an account, confirms the address and signs in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Create an account' }).first().click();

  await page.getByLabel('First name').fill(visitor.firstName);
  await page.getByLabel('Last name').fill(visitor.lastName);
  await page.getByLabel('Email address').fill(visitor.email);
  await page.getByLabel('Password', { exact: true }).fill(visitor.password);
  await page.getByRole('checkbox', { name: /I accept the terms/ }).check();
  await page.getByRole('button', { name: 'Create my account' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Check your inbox' })).toBeVisible();
  await expect(page.getByRole('status').first()).toContainText(visitor.email);

  await page.goto(await linkFromLatestEmail(visitor.email));
  await expect(page.getByText('Your email address is confirmed')).toBeVisible();

  await page.getByRole('main').getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Email address').fill(visitor.email);
  await page.getByLabel('Password', { exact: true }).fill(visitor.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Welcome, ${visitor.firstName}`);
  await expect(page).toHaveTitle('Dashboard | InclusiveCare');

  // The session survives a full page reload (refresh cookie).
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Welcome, ${visitor.firstName}`);

  await page.getByRole('navigation').getByRole('link', { name: 'My account' }).click();
  await page.getByLabel('First name').fill('Noura');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Your information has been saved.')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
});

test('pages for signed-in users send visitors to sign in', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Faccount$/);
});

test('the sign-in form explains what is wrong and where', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Focus lands on the first field to fix, and its error is announced with it.
  const email = page.getByLabel('Email address');
  await expect(email).toBeFocused();
  await expect(email).toHaveAccessibleDescription(/This field is required/);

  await email.fill(visitor.email);
  await page.getByLabel('Password', { exact: true }).fill('definitely the wrong one');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText(/The email address or password is incorrect/);
});

test('keyboard users can skip the header, and focus follows navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await page.getByRole('navigation').getByRole('link', { name: 'Display settings' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Display settings' })).toBeFocused();
});

test('switching to Arabic flips the layout and is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Langue / Language / اللغة').selectOption('ar');

  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('link', { name: 'تسجيل الدخول' }).first()).toBeVisible();
  await expect(page).toHaveTitle('الرئيسية | InclusiveCare');

  await page.reload();
  await expect(html).toHaveAttribute('dir', 'rtl');
});

test('display settings apply immediately and are remembered', async ({ page }) => {
  await page.goto('/accessibility');
  await page.getByRole('radio', { name: 'Largest' }).check();
  await page.getByRole('radio', { name: 'High contrast' }).check();
  await page.getByRole('checkbox', { name: 'Reduce animations' }).check();

  const html = page.locator('html');
  await expect(html).toHaveCSS('font-size', '24px');
  await expect(html).toHaveAttribute('data-contrast', 'high');
  await expect(html).toHaveAttribute('data-reduced-motion', 'true');

  await page.reload();
  await expect(html).toHaveCSS('font-size', '24px');
  await expect(page.getByRole('radio', { name: 'Largest' })).toBeChecked();

  await page.getByRole('button', { name: 'Restore default settings' }).click();
  await expect(html).toHaveCSS('font-size', '16px');
});

test('an administrator finds a user, suspends the account and reactivates it', async ({
  page,
  browser,
}) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await page.getByRole('navigation').getByRole('link', { name: 'Users' }).click();

  await page.getByLabel('Name or email').fill(visitor.email);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('status')).toHaveText('1 users found');
  await page.getByRole('link', { name: 'Noura Haddad' }).click();

  await page.getByRole('button', { name: 'Suspend account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Suspend this account?' });
  await dialog.getByRole('button', { name: 'Suspend account' }).click();
  await expect(page.getByText('The account has been suspended.')).toBeVisible();

  // The suspended user can no longer sign in.
  const other = await browser.newContext({ locale: 'en-US' });
  const otherPage = await other.newPage();
  await signIn(otherPage, visitor.email, visitor.password);
  await expect(otherPage.getByRole('alert')).toHaveText(/This account has been suspended/);
  await other.close();

  await page.getByRole('button', { name: 'Reactivate account' }).click();
  await expect(page.getByText('The account has been reactivated.')).toBeVisible();

  // Administrators cannot edit their own roles.
  await page.goto('/admin/users');
  await page.getByLabel('Name or email').fill(ADMIN.email);
  await page.getByRole('button', { name: 'Search' }).click();
  // Found by email: the demo admin's name may have been edited in a development database.
  await page.getByRole('row', { name: ADMIN.email }).getByRole('link').click();
  await expect(page.getByText('This is your own account.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save roles' })).toHaveCount(0);
});

test('regular users cannot open the administration pages', async ({ page }) => {
  await signIn(page, visitor.email, visitor.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Users' })).toHaveCount(0);

  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/dashboard$/);
});
