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
    if (url.includes('/api/save-design')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, id: 'e2e-card' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, designs: [] }) });
  });
  await page.goto('/nfc/editor.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-editor-workspace', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-production', 'ready');
});

test('selects a layer and exposes contextual transform controls', async ({ page }) => {
  await page.evaluate(() => (window as any).EditorWorkspace.select('name'));
  await expect(page.locator('.editor-transform-panel')).toBeVisible();
  await page.locator('[data-transform-appearance="scale"]').evaluate((element: HTMLInputElement) => {
    element.value = '125';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#card-name')).toHaveAttribute('data-editor-scale', '1.25');
});

test('opens professional preview and restores both card faces', async ({ page }) => {
  await page.evaluate(() => (window as any).EditorPreview.open());
  await expect(page.locator('#editor-professional-preview')).toBeVisible();
  await expect(page.locator('.editor-preview-stage #card-front-preview')).toBeVisible();
  await page.locator('[data-preview-device="mobile"]').click();
  await page.locator('[data-preview-face="back"]').click();
  await expect(page.locator('.editor-preview-stage')).toHaveAttribute('data-face', 'back');
  await page.locator('.editor-preview-close').click();
  await expect(page.locator('#cards-wrapper #card-front-preview')).toBeAttached();
  await expect(page.locator('#cards-wrapper #card-back-preview')).toBeAttached();
});

test('protects unsaved work and confirms a cloud save', async ({ page }) => {
  const name = page.locator('#input-name_ar');
  await name.fill('اختبار الحفظ الإنتاجي');
  await expect(page.locator('html')).toHaveAttribute('data-editor-dirty', 'true');

  const unloadPrevented = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(unloadPrevented).toBe(true);

  await page.evaluate(async () => {
    await fetch('/api/save-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: { 'input-name_ar': 'اختبار الحفظ الإنتاجي' } })
    });
  });

  await expect(page.locator('html')).toHaveAttribute('data-editor-dirty', 'false');
  await expect(page.locator('#autosave-indicator')).toHaveAttribute('data-production-state', 'saved-cloud');
});

test('keeps a local draft while offline', async ({ page, context }) => {
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.locator('#input-name_ar').fill('نسخة محلية دون اتصال');

  await expect(page.locator('html')).toHaveAttribute('data-editor-dirty', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-editor-offline', 'true');
  await expect(page.locator('#autosave-indicator')).toHaveAttribute('data-production-state', 'saved-local');

  await page.waitForFunction(() => Boolean(localStorage.getItem('mcprime:editor-draft:v1:new:ar')));
  const hasDraft = await page.evaluate(() => Boolean(localStorage.getItem('mcprime:editor-draft:v1:new:ar')));
  expect(hasDraft).toBe(true);
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
});

test('keeps the mobile bottom sheet usable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile project only');
  await page.evaluate(() => (window as any).EditorWorkspace.select('qr'));
  await expect(page.locator('#panel-elements')).toHaveClass(/active-view/);
  await expect(page.locator('#panel-elements > .editor-sheet-handle')).toBeVisible();
});
