import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

test.describe('happy path: create project → generate → see creatives', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('user creates a project and generates creatives with images', async ({
    page,
  }) => {
    const projectName = `E2E Sleep Ring ${Date.now()}`;

    await page.goto('/projects/new');
    await page.getByLabel(/^Name/i).fill(projectName);
    await page
      .getByLabel(/Offer description/i)
      .fill('Smart sleep tracker ring, 14-day battery, AI sleep coach.');
    await page
      .getByLabel(/Target audience/i)
      .fill('Adults 30-55 with mild insomnia, Oura/Apple Watch users.');
    await page.getByLabel(/Ad network/i).selectOption('TABOOLA');
    await page.getByRole('button', { name: /Create project/i }).click();

    await page.waitForURL(/\/dashboard/);
    await page.getByRole('link', { name: projectName }).first().click();
    await page.waitForURL(/\/projects\/[^/]+$/);

    await page.locator('#provider').selectOption('GEMINI');
    await page.locator('#n').fill('2');
    await page.getByRole('button', { name: /Generate 2/i }).click();

    const succeededBadge = page.locator('text=SUCCEEDED').first();
    await expect(succeededBadge).toBeVisible({ timeout: 120_000 });

    const firstImage = page.locator('article img').first();
    await expect(firstImage).toBeVisible();
    await expect(firstImage).toHaveAttribute('src', /^https?:\/\//);
  });
});
