import { test, expect } from '@playwright/test';

test.setTimeout(30_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authUser', JSON.stringify({
      userId: 'owner-user',
      email: 'owner@example.com',
      name: 'Workspace Owner',
      isVerified: true
    }));
    localStorage.setItem('mcprime_cookie_consent', JSON.stringify({
      accepted: false,
      version: 1,
      timestamp: new Date().toISOString()
    }));
    sessionStorage.setItem('authAccessToken', 'workspace-e2e-token');
  });

  let status = 'draft';
  const entries: any[] = [];
  let sequence = 0;

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
          accessToken: 'workspace-e2e-token',
          user: { userId: 'owner-user', email: 'owner@example.com', isVerified: true }
        })
      });
      return;
    }
    if (url.includes('/api/get-design/card-review')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inputs: {
            'input-name_ar': 'تصميم الفريق',
            'input-name_en': 'Team design',
            'front-bg-start': '#123456'
          },
          placements: {},
          visibilities: {},
          dynamic: { phones: [], social: [], staticSocial: {} }
        })
      });
      return;
    }
    if (url.includes('/api/design-workflow/card-review/comments/') && method === 'PATCH') {
      const entryId = url.split('/comments/')[1].split('?')[0];
      const entry = entries.find(item => item.entryId === entryId);
      if (entry) entry.resolved = route.request().postDataJSON().resolved;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      return;
    }
    if (url.endsWith('/api/design-workflow/card-review/comments') && method === 'POST') {
      const payload = route.request().postDataJSON();
      entries.push({
        entryId: `comment-${++sequence}`,
        kind: 'comment',
        text: payload.text,
        elementId: payload.elementId,
        authorName: 'Workspace Owner',
        resolved: false,
        createdAt: new Date().toISOString()
      });
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, entry: entries.at(-1) }) });
      return;
    }
    if (url.endsWith('/api/design-workflow/card-review/submit') && method === 'POST') {
      status = 'in_review';
      entries.push({ entryId: `activity-${++sequence}`, kind: 'activity', action: 'submitted', authorName: 'Workspace Owner', createdAt: new Date().toISOString() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status }) });
      return;
    }
    if (url.endsWith('/api/design-workflow/card-review/decision') && method === 'POST') {
      const payload = route.request().postDataJSON();
      status = payload.action === 'approve' ? 'approved' : 'changes_requested';
      entries.push({ entryId: `activity-${++sequence}`, kind: 'activity', action: status, authorName: 'Workspace Owner', createdAt: new Date().toISOString() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status }) });
      return;
    }
    if (url.endsWith('/api/design-workflow/card-review/publish') && method === 'POST') {
      status = 'published';
      entries.push({ entryId: `activity-${++sequence}`, kind: 'activity', action: 'published', authorName: 'Workspace Owner', createdAt: new Date().toISOString() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status }) });
      return;
    }
    if (url.endsWith('/api/design-workflow/card-review') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          design: { shortId: 'card-review', workflow: { status, revision: 1 } },
          workspace: { workspaceId: 'workspace-e2e', name: 'MC PRIME Review Team' },
          permission: 'owner',
          capabilities: { edit: true, review: true, publish: true },
          entries
        })
      });
      return;
    }
    if (url.includes('/api/save-design')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, id: 'card-review' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, designs: [] }) });
  });

  await page.goto('/nfc/editor.html?id=card-review', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-editor-workspace', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-workspace-client', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-editor-review-workflow-loader', 'ready');
  await expect(page.locator('#editor-review-workflow-btn')).toBeAttached();
});

test('comments, submits, approves and publishes a shared design', async ({ page }) => {
  await page.evaluate(() => (window as any).EditorWorkspace.select('name'));
  await page.locator('#editor-review-workflow-btn').click({ force: true });
  await expect(page.locator('#workspace-review-modal')).toBeVisible();
  await expect(page.locator('#workspace-review-modal')).toContainText('MC PRIME Review Team');
  await expect(page.locator('.workspace-status')).toContainText('مسودة');

  const commentForm = page.locator('[data-review-form="comment"]');
  await commentForm.locator('textarea').fill('راجع حجم الاسم قبل النشر');
  await commentForm.locator('button[type="submit"]').click();
  await expect(page.locator('.workspace-comment')).toContainText('راجع حجم الاسم قبل النشر');
  await expect(page.locator('.workspace-comment-element')).toContainText('name');
  await expect(page.locator('.workspace-launcher-badge')).toHaveText('1');

  page.once('dialog', dialog => dialog.accept('جاهز للمراجعة'));
  await page.locator('[data-review-action="submit"]').click();
  await expect(page.locator('.workspace-status')).toContainText('قيد المراجعة');

  page.once('dialog', dialog => dialog.accept('تمت المراجعة'));
  await page.locator('[data-review-action="approve"]').click();
  await expect(page.locator('.workspace-status')).toContainText('معتمد');

  await page.locator('[data-review-action="publish"]').click();
  await expect(page.locator('.workspace-status')).toContainText('منشور');
  await expect(page.locator('html')).toHaveAttribute('data-editor-review-status', 'published');
  await expect(page.locator('.workspace-activity-list')).toContainText('تم نشر التصميم');
});

test('keeps the review launcher usable on mobile layouts', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile project only');
  const launcher = page.locator('#editor-review-workflow-btn');
  await expect(launcher).toBeVisible();
  const box = await launcher.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(36);
  expect(box?.height).toBeGreaterThanOrEqual(36);
  await launcher.click();
  await expect(page.locator('#workspace-review-modal')).toBeVisible();
});
