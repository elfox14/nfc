import { expect, test } from '@playwright/test';

test('mobile editor exposes both faces, autosave, QR, publishing and downloads', async ({ page }) => {
  await page.goto('/nfc/editor.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#card-front-preview')).toBeAttached();
  await expect(page.locator('#card-back-preview')).toBeAttached();
  await expect(page.locator('#autosave-indicator')).toHaveCount(1);
  await expect(page.locator('#autosave-indicator')).toBeAttached();
  await expect(page.locator('#qr-code-accordion')).toBeAttached();
  await expect(page.locator('#save-share-btn')).toBeAttached();
  await expect(page.locator('.mobile-action-btn[data-trigger-id="save-to-cloud-btn"]')).toBeAttached();
  await expect(page.locator('.mobile-action-btn[data-trigger-id="share-card-btn"]')).toBeAttached();
  await expect(page.locator('[data-trigger-id="download-vcf"]')).toBeAttached();
  await expect(page.locator('[data-trigger-id="download-qrcode"]')).toBeAttached();

  await expect(page.locator('#flip-card-btn-mobile')).toBeVisible();
  await page.locator('#flip-card-btn-mobile').click();
  await expect(page.locator('.card-flipper')).toHaveClass(/is-flipped/);
  await expect(page.locator('#toolbar-face-back')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#flip-card-btn-mobile').click();
  await expect(page.locator('.card-flipper')).not.toHaveClass(/is-flipped/);
  await expect(page.locator('#toolbar-face-front')).toHaveAttribute('aria-pressed', 'true');
});