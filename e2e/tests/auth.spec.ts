import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login page renders correctly', async ({ page }) => {
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid username or password/i)).toBeVisible({ timeout: 5000 });
  });

  test('redirects reception user to /reception', async ({ page }) => {
    await page.fill('#username', 'reception');
    await page.fill('#password', 'reception123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/reception', { timeout: 10000 });
    expect(page.url()).toContain('/reception');
  });

  test('redirects nurse user to /nurse', async ({ page }) => {
    await page.fill('#username', 'nurse1');
    await page.fill('#password', 'nurse123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/nurse', { timeout: 10000 });
    expect(page.url()).toContain('/nurse');
  });

  test('redirects admin user to /admin', async ({ page }) => {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 10000 });
    expect(page.url()).toContain('/admin');
  });

  test('protected route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/reception');
    await expect(page).toHaveURL(/\/login/);
  });
});
