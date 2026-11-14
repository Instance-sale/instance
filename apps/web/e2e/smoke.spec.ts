import { test, expect } from '@playwright/test';

test.describe('Instance Web Smoke Tests', () => {
  test('renders login page with email input and authentication controls', async ({ page }) => {
    await page.goto('/login');

    // Verify page URL and essential form elements
    await expect(page).toHaveURL(/.*\/login/);
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });

  test('redirects unauthenticated access from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');

    // Unauthenticated user should be redirected to /login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('redirects unauthenticated access from /setup to /login', async ({ page }) => {
    await page.goto('/setup');

    // Setup onboarding requires authentication
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('renders signup page successfully', async ({ page }) => {
    await page.goto('/signup');

    await expect(page).toHaveURL(/.*\/signup/);
  });

  test('loads locale-prefixed login route', async ({ page }) => {
    await page.goto('/en/login');

    await expect(page).toHaveURL(/.*\/en\/login/);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('gracefully handles not-found route', async ({ page }) => {
    const response = await page.goto('/non-existent-smoke-route');

    // Next.js will return 404 or redirect to localized 404
    expect(response?.status()).toBe(404);
  });
});
