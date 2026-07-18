import { test, expect, type Page } from '@playwright/test';

test.setTimeout(25_000);

async function openBrandKit(page: Page, isMobile: boolean) {
  if (!isMobile) {
    await page.locator('#editor-brand-kit-btn').click();
    return;
  }

  await expect(page.locator('#editor-brand-kit-btn')).toBeHidden();
  await page.locator('#toolbar-more-btn').click();
  const menuButton = page.locator('#editor-brand-kit-menu-btn');
  await expect(menuButton).toBeVisible();
  await menuButton.click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authUser', JSON.stringify({
      userId: 'e2e-user',
      email: 'editor@example.com',
      name: 'Editor User',
      isVerified: true
    }));
    localStorage.setItem('mcprime_cookie_consent', JSON.stringify({
      accepted: false,
      version: 1,
      timestamp: new Date().toISOString()
    }));
    sessionStorage.setItem('authAccessToken', 'e2e-access-token');
  });

  const templates: any[] = [];
  const kit = {
    kitId: 'kit-e2e',
    name: 'MC PRIME Identity',
    description: 'Shared company identity',
    permission: 'owner',
    members: [],
    identity: {
      logos: [{ id: 'logo-1', name: 'Primary logo', variant: 'primary', url: '/nfc/logo.svg' }],
      colors: [
        { id: 'color-1', name: 'Primary', role: 'primary', value: '#123456' },
        { id: 'color-2', name: 'Secondary', role: 'secondary', value: '#234567' },
        { id: 'color-3', name: 'Accent', role: 'accent', value: '#45aacc' },
        { id: 'color-4', name: 'Background', role: 'background', value: '#f4f7fa' },
        { id: 'color-5', name: 'Text', role: 'text', value: '#ffffff' }
      ],
      fonts: [
        { id: 'font-1', name: 'Heading', role: 'heading', family: "'Cairo', sans-serif" },
        { id: 'font-2', name: 'Body', role: 'body', family: "'Tajawal', sans-serif" },
        { id: 'font-3', name: 'Accent', role: 'accent', family: "'Poppins', sans-serif" }
      ]
    },
    templates
  };

  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') await route.fallback();
    else await route.abort();
  });

  await page.route('**/api/**', async route => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/api/auth/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          accessToken: 'e2e-access-token',
          user: { userId: 'e2e-user', email: 'editor@example.com', isVerified: true }
        })
      });
      return;
    }
    if (url.endsWith('/api/brand-kits') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, kits: [kit] })
      });
      return;
    }
    if (url.includes('/api/brand-kits/kit-e2e/templates') && method === 'POST') {
      const payload = route.request().postDataJSON();
      const template = {
        id: `template-${templates.length + 1}`,
        name: payload.name,
        description: payload.description,
        design: payload.design,
        preview: payload.preview
      };
      templates.push(template);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, template })
      });
      return;
    }
    if (url.includes('/api/save-design')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'e2e-card' })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, designs: [] })
    });
  });

  await page.goto('/nfc/editor.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-editor-workspace', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-brand-kit-client', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-brand-kit', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-output-warning', 'removed');
  await expect(page.locator('#editor-brand-kit-menu-btn')).toBeAttached();
});

test('applies shared identity while preserving personal content', async ({ page, isMobile }) => {
  await page.evaluate(() => (window as any).EditorWorkspace.select('name'));
  const name = page.locator('#input-name_ar');
  await name.fill('الاسم الشخصي محفوظ');

  await openBrandKit(page, isMobile);
  await expect(page.locator('#editor-brand-kit-modal')).toBeVisible();
  await expect(page.locator('#editor-brand-kit-modal')).toContainText('MC PRIME Identity');
  await page.locator('[data-brand-editor-action="apply-all"]').click();

  await expect(page.locator('#front-bg-start')).toHaveValue('#123456');
  await expect(page.locator('#front-bg-end')).toHaveValue('#234567');
  await expect(page.locator('#name-font')).toHaveValue("'Cairo', sans-serif");
  await expect(name).toHaveValue('الاسم الشخصي محفوظ');

  const state = await page.evaluate(() => (window as any).StateManager.getStateObject());
  expect(state.inputs['input-name_ar']).toBe('الاسم الشخصي محفوظ');
  expect(state.inputs['input-logo']).toContain('/nfc/logo.svg');
});

test('saves the current visual direction as a shared company template', async ({ page, isMobile }) => {
  await page.evaluate(() => (window as any).EditorWorkspace.select('name'));
  await page.locator('#input-name_ar').fill('بيانات لا تدخل القالب');
  await openBrandKit(page, isMobile);
  await expect(page.locator('#editor-brand-kit-modal')).toBeVisible();

  const form = page.locator('[data-brand-editor-form="save-template"]');
  await form.locator('input[name="name"]').fill('قالب الشركة الرئيسي');
  await form.locator('input[name="description"]').fill('القالب المعتمد للفريق');
  const requestPromise = page.waitForRequest(request =>
    request.method() === 'POST' && request.url().includes('/api/brand-kits/kit-e2e/templates')
  );
  await form.locator('.brand-kit-primary').click();
  const request = await requestPromise;
  const payload = request.postDataJSON();

  expect(payload.name).toBe('قالب الشركة الرئيسي');
  expect(payload.design.inputs['input-name_ar']).toBeUndefined();
  expect(payload.design.inputs['front-bg-start']).toBeDefined();
  await expect(page.locator('#editor-brand-kit-modal')).toContainText('قالب الشركة الرئيسي');
});
