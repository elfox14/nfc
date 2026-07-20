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
  const versions: Array<{ id: string; name: string; source: string; createdAt: string; state: any }> = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') await route.fallback();
    else await route.abort();
  });
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/api/auth/refresh')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, accessToken: 'e2e-access-token', user: { userId: 'e2e-user', email: 'editor@example.com', isVerified: true } }) });
      return;
    }
    if (url.includes('/api/get-design/e2e-saved-card')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inputs: {
            'input-name_ar': 'الكارت المحفوظ من لوحة التحكم',
            'input-tagline_ar': 'مدير التشغيل',
            'input-logo': 'mc-prime-nfc.png',
            'logo-size': 22,
            'toggle-phone-buttons': false
          },
          dynamic: {
            phones: [{
              id: 'saved-phone',
              value: '01062071741',
              placement: 'front',
              position: { x: 14, y: -6 }
            }],
            social: [],
            staticSocial: {}
          },
          imageUrls: {},
          positions: {
            'card-logo': { x: 18, y: -10 },
            'card-name': { x: -12, y: 7 }
          },
          placements: { logo: 'front', name: 'front', tagline: 'front', qr: 'back' },
          visibilities: { logo: true, name: true, tagline: true, phones: true, qr: true }
        })
      });
      return;
    }
    if (url.includes('/api/save-design')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, id: 'e2e-card' }) });
      return;
    }
    if (url.includes('/api/design/e2e-card/versions/') && url.endsWith('/restore') && method === 'POST') {
      const versionId = url.split('/versions/')[1].split('/')[0];
      const version = versions.find(item => item.id === versionId);
      await route.fulfill({
        status: version ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(version ? {
          success: true,
          state: version.state,
          restoredVersion: version,
          safetyVersion: { id: 'safety-e2e', name: 'قبل الاستعادة', source: 'pre-restore', createdAt: new Date().toISOString() }
        } : { error: 'Version not found' })
      });
      return;
    }
    if (url.includes('/api/design/e2e-card/versions/') && method === 'DELETE') {
      const versionId = url.split('/versions/')[1].split('?')[0];
      const index = versions.findIndex(item => item.id === versionId);
      if (index >= 0) versions.splice(index, 1);
      await route.fulfill({ status: index >= 0 ? 200 : 404, contentType: 'application/json', body: JSON.stringify(index >= 0 ? { success: true } : { error: 'Version not found' }) });
      return;
    }
    if (url.includes('/api/design/e2e-card/versions/') && method === 'GET') {
      const versionId = url.split('/versions/')[1].split('?')[0];
      const version = versions.find(item => item.id === versionId);
      await route.fulfill({ status: version ? 200 : 404, contentType: 'application/json', body: JSON.stringify(version ? { success: true, version } : { error: 'Version not found' }) });
      return;
    }
    if (url.includes('/api/design/e2e-card/versions') && method === 'POST') {
      const payload = route.request().postDataJSON();
      const version = {
        id: `cloud-${versions.length + 1}`,
        name: payload.name,
        source: payload.source || 'manual',
        createdAt: new Date().toISOString(),
        state: payload.state
      };
      versions.unshift(version);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, cloud: true, version }) });
      return;
    }
    if (url.includes('/api/design/e2e-card/versions') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, cloud: true, versions: versions.map(({ state, ...version }) => version) })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, designs: [] }) });
  });
  await page.goto('/nfc/editor.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-editor-workspace', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-production', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-save-monitor', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-asset-manager', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-template-manager', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-version-manager', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-productivity-tools', 'ready');
});


test('loads the exact saved card selected from the dashboard', async ({ page }) => {
  await page.goto('/nfc/editor.html?id=e2e-saved-card', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('data-editor-design-load', 'loaded');
  await expect(page.locator('#input-name_ar')).toHaveValue('الكارت المحفوظ من لوحة التحكم');
  await expect(page.locator('#input-tagline_ar')).toHaveValue('مدير التشغيل');
  await expect(page.locator('#card-name')).toContainText('الكارت المحفوظ من لوحة التحكم');
  await expect(page.locator('#card-logo')).toHaveAttribute('data-x', '18');
  await expect(page.locator('#card-name')).toHaveAttribute('data-x', '-12');
  await expect(page.locator('#card-front-content')).not.toHaveClass(/editor-default-front-layout/);
  await expect(page.locator('#card-back-content')).not.toHaveClass(/editor-default-back-layout/);
  await expect(page.locator('#editor-design-load-status')).toHaveCount(0);

  const identity = await page.evaluate(() => ({
    currentDesignId: (window as any).Config.currentDesignId,
    editingDesignId: localStorage.getItem('nfc:editingDesignId')
  }));
  expect(identity).toEqual({
    currentDesignId: 'e2e-saved-card',
    editingDesignId: 'e2e-saved-card'
  });
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

test('previews and applies a professional template without replacing content', async ({ page }) => {
  const name = await openNameEditor(page);
  await name.fill('بيانات المستخدم محفوظة');
  await page.evaluate(() => (window as any).EditorWorkspace.setLibraryView('templates'));
  await expect(page.locator('#editor-template-manager-panel')).toBeVisible();

  const originalBackground = await page.locator('#front-bg-start').inputValue();
  await page.locator('[data-template-id="medical-trust"] .editor-template-secondary').click();
  await expect(page.locator('#editor-template-modal')).toBeVisible();
  await expect(page.locator('.editor-template-modal-face')).toHaveCount(2);
  await expect(page.locator('#front-bg-start')).toHaveValue(originalBackground);

  await page.locator('#editor-template-modal [data-template-apply]').click();
  await expect(page.locator('#front-bg-start')).toHaveValue('#063b46');
  await expect(page.locator('#input-name_ar')).toHaveValue('بيانات المستخدم محفوظة');
  await expect(page.locator('#editor-template-toast')).toBeVisible();
});

test('saves the current visual design as a personal template', async ({ page }) => {
  await page.evaluate(() => (window as any).EditorWorkspace.setLibraryView('templates'));
  await page.locator('.editor-template-save-current').click();
  await expect(page.locator('#editor-template-save-dialog')).toBeVisible();
  await page.locator('#editor-personal-template-name').fill('قالب الاختبار الشخصي');
  await page.locator('#editor-template-save-dialog button[type="submit"]').click();

  await expect(page.locator('[data-personal-template="true"]')).toContainText('قالب الاختبار الشخصي');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mcprime-editor-personal-templates-v1') || '[]'));
  expect(saved).toHaveLength(1);
  expect(saved[0].design.inputs['input-name_ar']).toBeUndefined();
});

test('creates, compares, and restores a cloud design version', async ({ page }) => {
  await page.evaluate(() => window.history.replaceState({}, '', '/nfc/editor.html?id=e2e-card'));
  const name = await openNameEditor(page);
  await name.fill('النسخة السحابية الأولى');

  await page.locator('#editor-versions-btn').click();
  await expect(page.locator('#editor-version-popover')).toBeVisible();
  await page.locator('.editor-cloud-version-form input').fill('قبل تحديث الاسم');
  await page.locator('.editor-cloud-version-form button[type="submit"]').click();
  await expect(page.locator('.editor-cloud-version-row')).toHaveCount(1);
  await expect(page.locator('.editor-version-sync-badge')).toContainText('سحابي');

  await name.fill('الاسم بعد التعديل');
  await page.locator('[data-version-action="compare"]').click();
  await expect(page.locator('.editor-version-comparison')).toBeVisible();
  await expect(page.locator('.editor-version-change-count')).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-version-action="restore"]').click();
  await expect(name).toHaveValue('النسخة السحابية الأولى');
  await expect(page.locator('html')).toHaveAttribute('data-editor-dirty', 'false');

  const localBackup = await page.evaluate(() => localStorage.getItem('mcprime-editor-versions-v2:e2e-card:ar'));
  expect(localBackup).toContain('cloud-1');
});

test('groups, distributes, copies, and moves multiple layers across card faces', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const manager = (window as any).EditorProductivityTools;
    manager.select(['logo', 'name', 'tagline'], { expandGroups: false, primary: 'logo' });
    const before = manager.getState();
    const group = manager.group();
    const distributed = manager.distribute('horizontal');
    manager.select(['logo'], { expandGroups: false, primary: 'logo' });
    const copied = Boolean(manager.copy());
    manager.select(['name'], { expandGroups: false, primary: 'name' });
    const pasted = manager.paste();
    manager.select(['logo'], { expandGroups: false, primary: 'logo' });
    const moved = manager.moveToOtherFace();
    await new Promise(resolve => setTimeout(resolve, 120));
    return {
      beforeCount: before.selected.length,
      groupMembers: group?.members || [],
      distributed,
      copied,
      pasted,
      moved,
      face: manager.getState().face,
      savedGroups: JSON.parse((document.getElementById('editor-layer-groups') as HTMLInputElement).value || '[]'),
      backPlacement: (document.querySelector('input[name="placement-logo"][value="back"]') as HTMLInputElement)?.checked
    };
  });

  expect(result).toMatchObject({
    beforeCount: 3,
    groupMembers: expect.arrayContaining(['logo', 'name', 'tagline']),
    distributed: true,
    copied: true,
    pasted: true,
    moved: true,
    face: 'back',
    backPlacement: true
  });
  expect(result.savedGroups[0].members).toEqual(expect.arrayContaining(['logo', 'name', 'tagline']));

  await page.evaluate(() => {
    (window as any).EditorWorkspace.setFace('front');
    (window as any).EditorProductivityTools.select(['name'], { expandGroups: false, primary: 'name' });
    const element = document.querySelector('[data-editor-selectable="name"]');
    element?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 160, clientY: 140 }));
  });
  const contextMenu = page.locator('#editor-productivity-context-menu');
  await expect(contextMenu).toBeVisible();
  await expect(contextMenu.locator('[data-productivity-action="copy"]')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('keeps the mobile bottom sheet usable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile project only');
  await page.evaluate(() => (window as any).EditorWorkspace.select('qr'));
  await expect(page.locator('#panel-elements')).toHaveClass(/active-view/);
  await expect(page.locator('#panel-elements > .editor-sheet-handle')).toBeVisible();
});
