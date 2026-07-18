import { test, expect, type Page } from '@playwright/test';

test.setTimeout(25_000);

async function openNameEditor(page: Page) {
  await page.evaluate(() => (window as any).EditorWorkspace.select('name'));
  const name = page.locator('#input-name_ar');
  await expect(name).toBeVisible();
  return name;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authUser', JSON.stringify({ userId: 'e2e-user', email: 'editor@example.com', isVerified: true }));
    localStorage.setItem('mcprime_cookie_consent', JSON.stringify({ accepted: false, version: 1, timestamp: new Date().toISOString() }));
    sessionStorage.setItem('authAccessToken', 'e2e-access-token');
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') await route.fallback();
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
  await expect(page.locator('html')).toHaveAttribute('data-editor-save-monitor', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-asset-manager', 'ready');
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
  await page.locator('[data-preview-device="mobile"]').click({ force: true });
  await page.locator('[data-preview-face="back"]').click({ force: true });
  await expect(page.locator('.editor-preview-stage')).toHaveAttribute('data-face', 'back');
  await page.locator('.editor-preview-close').click({ force: true });
  await expect(page.locator('#cards-wrapper #card-front-preview')).toBeAttached();
  await expect(page.locator('#cards-wrapper #card-back-preview')).toBeAttached();
});

test('preprocesses oversized images and exposes professional crop controls', async ({ page }) => {
  await expect(page.locator('#logo-drop-zone')).toHaveClass(/asset-drop-zone/);
  await expect(page.locator('[data-asset-crop-toolbar]')).toBeAttached();
  await expect(page.locator('[data-crop-action="rotate-left"]')).toBeAttached();
  await expect(page.locator('[data-crop-action="zoom-in"]')).toBeAttached();

  const result = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2600;
    canvas.height = 1800;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#183153');
    gradient.addColorStop(1, '#e6f0f7');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image creation failed')), 'image/jpeg', 0.95);
    });
    const file = new File([blob], 'oversized.jpg', { type: 'image/jpeg' });
    const manager = (window as any).EditorAssetManager;
    const spec = manager.getSpecs().find((item: any) => item.inputId === 'input-logo-upload');
    return manager.processFile(file, spec).then((processed: any) => ({
      originalBytes: file.size,
      processedBytes: processed.file.size,
      processedName: processed.file.name,
      width: processed.width,
      height: processed.height,
      optimized: processed.optimized
    }));
  });

  expect(result.width).toBeLessThanOrEqual(2200);
  expect(result.height).toBeLessThanOrEqual(2200);
  expect(result.optimized).toBe(true);
  expect(result.processedName).toContain('-optimized.');
  expect(result.originalBytes).toBeGreaterThan(0);
  expect(result.processedBytes).toBeGreaterThan(0);
});

test('protects unsaved work and confirms a cloud save', async ({ page }) => {
  const name = await openNameEditor(page);
  await name.fill('اختبار الحفظ الإنتاجي');
  await expect(page.locator('html')).toHaveAttribute('data-editor-dirty', 'true');

  const unloadPrevented = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(unloadPrevented).toBe(true);

  const saveResult = await page.evaluate(async () => {
    const response = await fetch('/api/save-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: { 'input-name_ar': 'اختبار الحفظ الإنتاجي' } })
    });
    await new Promise(resolve => setTimeout(resolve, 75));
    const root = document.documentElement;
    return {
      ok: response.ok,
      status: response.status,
      monitor: root.dataset.editorSaveMonitorState,
      monitorCount: root.dataset.editorSaveMonitorCount,
      dirtyAttribute: root.dataset.editorDirty,
      guard: (window as any).EditorProductionGuard.getState()
    };
  });

  expect(saveResult).toMatchObject({
    ok: true,
    status: 200,
    monitor: 'saved',
    dirtyAttribute: 'false',
    guard: { dirty: false, saving: false }
  });
  await expect(page.locator('#autosave-indicator')).toHaveAttribute('data-production-state', 'saved-cloud');
});

test('keeps a local draft while offline', async ({ page, context }) => {
  const name = await openNameEditor(page);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await name.fill('نسخة محلية دون اتصال');

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
