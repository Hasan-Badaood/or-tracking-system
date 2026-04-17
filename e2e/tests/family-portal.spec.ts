import { test, expect } from '@playwright/test';

test.describe('Family portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/family');
  });

  test('family portal page loads', async ({ page }) => {
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('shows visit ID input on load', async ({ page }) => {
    const visitIdInput = page.locator('#visitId, input[placeholder*="VT-"]').first();
    await expect(visitIdInput).toBeVisible({ timeout: 5000 });
  });

  test('shows send verification code button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /send verification code/i })).toBeVisible({ timeout: 5000 });
  });

  test('shows error for unknown visit ID', async ({ page }) => {
    const visitIdInput = page.locator('#visitId, input[placeholder*="VT-"]').first();
    await visitIdInput.fill('VT-00000000-999');

    // Fill email so the server proceeds to the visit lookup (email is required)
    const emailInput = page.locator('#email, input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('test@example.com');
    }

    await page.getByRole('button', { name: /send verification code/i }).click();

    // Should show some error about not finding the visit
    await expect(
      page.getByText(/could not find|no family contact|visit not found|check the visit id|email or phone/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test('has a link back to staff login', async ({ page }) => {
    // The family portal has a "Clinical staff? Sign in here" link pointing to /login
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible({ timeout: 5000 });
    await expect(loginLink).toHaveAttribute('href', '/login');
  });
});
