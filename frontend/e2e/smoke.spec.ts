import { test, expect } from '@playwright/test';

test.describe('Public site', () => {
  test('landing page loads with the primary CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /host anything/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /start hosting/i }).first()).toBeVisible();
  });

  test('header navigation links to pricing, services, docs, status', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Pricing' }).click();
    await expect(page).toHaveURL(/\/pricing$/);

    await page.getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL(/\/services$/);

    await page.getByRole('link', { name: 'Docs' }).click();
    await expect(page).toHaveURL(/\/docs$/);

    await page.getByRole('link', { name: 'Status' }).click();
    await expect(page).toHaveURL(/\/status$/);
  });

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email or username/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });

  test('register page renders the sign-up form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
  });

  test('protected routes redirect unauthenticated visitors to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
