const { test, expect } = require('@playwright/test');

const baseURL = process.env.EDITOR_PRODUCTION_URL || 'https://www.mcprim.com/nfc';

const editors = [
  { path: '/editor.html', lang: 'ar' },
  { path: '/editor-en.html', lang: 'en' }
];

for (const editor of editors) {
  test(`Editor 2 production smoke (${editor.lang})`, async ({ page }) => {
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
    });

    await page.goto(`${baseURL}${editor.path}?smoke=${Date.now()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });

    await expect(page.locator('html')).toHaveAttribute('lang', editor.lang);
    await expect(page.locator('#pro-toolbar')).toBeVisible();
    await expect(page.locator('#panel-design')).toBeAttached();
    await expect(page.locator('#panel-elements')).toBeAttached();

    await page.waitForFunction(() => {
      return Boolean(window.EditorV2Bootstrap && window.EditorV2Health);
    }, { timeout: 30_000 });

    const health = await page.evaluate(async () => {
      if (window.EditorV2Bootstrap?.load) window.EditorV2Bootstrap.load();
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return window.EditorV2Health.check();
    });

    expect(health.ready, JSON.stringify(health, null, 2)).toBe(true);
    expect(health.missing).toEqual([]);

    await expect(page.locator('html')).toHaveAttribute('data-editor-v2-ready', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-editor-v2-bootstrap', /2026/);
    await expect(page.locator('#editor-context-inspector')).toBeAttached();
    await expect(page.locator('#editor-simple-mode')).toBeAttached();
    await expect(page.locator('link[data-editor-design-system]')).toHaveCount(1);

    const relevantFailures = failedRequests.filter((entry) => /editor-(context|design|onboarding|simple|smart|publish|v2)/i.test(entry));
    expect(relevantFailures, relevantFailures.join('\n')).toEqual([]);

    const relevantErrors = consoleErrors.filter((entry) => /EditorV2|Editor 2|Failed to load/i.test(entry));
    expect(relevantErrors, relevantErrors.join('\n')).toEqual([]);
  });
}
