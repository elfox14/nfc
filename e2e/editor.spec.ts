import { test, expect } from '@playwright/test';

test.setTimeout(25_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authUser', JSON.stringify({ userId: 'e2e-user', email: 'editor@example.com', isVerified: true }));
    sessionStorage.setItem('authAccessToken', 'e2e-access-token');
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') await route.continue();
    else await route.abort();
  });
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    if (url.includes('/api/auth/refresh')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, accessToken: 'e2e-access-token', user: { userId: 'e2e-user', email: 'editor@example.com', isVerified: true } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, designs: [] }) });
  });
  await page.goto('/nfc/editor.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-editor-workspace', 'ready');
});

test('selects a layer and exposes contextual transform controls', async ({ page }) => {
  await page.evaluate(() => window.EditorWorkspace.select('name'));
  await expect(page.locator('.editor-transform-panel')).toBeVisible();
  await page.locator('[data-transform-appearance="scale"]').evaluate((element: HTMLInputElement) => {
    element.value = '125';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#card-name')).toHaveAttribute('data-editor-scale', '1.25');
});

test('opens professional preview and restores both card faces', async ({ page }) => {
  await page.locator('#preview-mode-btn').click();
  await expect(page.locator('#editor-professional-preview')).toBeVisible();
  await expect(page.locator('.editor-preview-stage #card-front-preview')).toBeVisible();
  await page.locator('[data-preview-device="mobile"]').click();
  await page.locator('[data-preview-face="back"]').click();
  await expect(page.locator('.editor-preview-stage')).toHaveAttribute('data-face', 'back');
  await page.locator('.editor-preview-close').click();
  await expect(page.locator('#cards-wrapper #card-front-preview')).toBeAttached();
  await expect(page.locator('#cards-wrapper #card-back-preview')).toBeAttached();
});

test('keeps the mobile bottom sheet usable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile project only');
  await page.evaluate(() => window.EditorWorkspace.select('qr'));
  await expect(page.locator('#panel-elements')).toHaveClass(/active-view/);
  await expect(page.locator('#panel-elements > .editor-sheet-handle')).toBeVisible();
});
