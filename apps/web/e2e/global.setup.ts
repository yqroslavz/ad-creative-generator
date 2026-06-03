import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for Playwright sign-in.',
    );
  }

  await clerkSetup();
  await page.goto('/');
  await clerk.signIn({
    page,
    signInParams: { strategy: 'password', identifier: email, password },
  });
  await page.goto('/dashboard');
  await page.waitForURL(/\/dashboard/);
  await page.context().storageState({ path: authFile });
});
