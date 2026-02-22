import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/nfc';

test.describe('Homepage', () => {

    test('should load homepage successfully', async ({ page }) => {
        await page.goto(`${BASE_URL}/`);

        await expect(page).toHaveTitle(/MC PRIME/);
    });

    test('should have navigation links', async ({ page }) => {
        await page.goto(`${BASE_URL}/`);

        // Check logo is visible
        await expect(page.locator('.nav-logo img')).toBeVisible();

        // Check CTA button
        const ctaButton = page.locator('.nav-cta');
        await expect(ctaButton).toBeVisible();
    });

    test('should have editor link', async ({ page }) => {
        await page.goto(`${BASE_URL}/`);

        const editorLink = page.locator('a[href*="editor"]').first();
        await expect(editorLink).toBeVisible();
    });
});

test.describe('Editor Page', () => {

    test('should load editor page', async ({ page }) => {
        await page.goto(`${BASE_URL}/editor.html`);

        // Editor should have card preview
        await expect(page.locator('#card-preview')).toBeVisible({ timeout: 10000 });
    });

    test('should have name input field', async ({ page }) => {
        await page.goto(`${BASE_URL}/editor.html`);

        await page.waitForLoadState('networkidle');

        // Check for name input
        const nameInput = page.locator('#input-name_ar, #input-name_en').first();
        await expect(nameInput).toBeVisible({ timeout: 10000 });
    });

    test('should update card preview on name change', async ({ page }) => {
        await page.goto(`${BASE_URL}/editor.html`);

        await page.waitForLoadState('networkidle');

        // Find name input and change value
        const nameInput = page.locator('#input-name_ar').first();

        if (await nameInput.isVisible()) {
            await nameInput.clear();
            await nameInput.fill('اسم تجريبي');

            // Wait for preview to update
            await page.waitForTimeout(500);

            // Check if preview contains the new name
            const preview = page.locator('#card-preview');
            await expect(preview).toContainText('اسم تجريبي');
        }
    });
});

test.describe('Gallery Page', () => {

    test('should load gallery page', async ({ page }) => {
        await page.goto(`${BASE_URL}/gallery.html`);

        await expect(page).toHaveTitle(/MC PRIME|معرض|Gallery/);
    });
});

test.describe('Blog Page', () => {

    test('should load blog page', async ({ page }) => {
        await page.goto(`${BASE_URL}/blog.html`);

        await expect(page).toHaveTitle(/MC PRIME|مدونة|Blog/);
    });

    test('should have blog articles', async ({ page }) => {
        await page.goto(`${BASE_URL}/blog.html`);

        const articles = page.locator('.blog-card, article');
        await expect(articles.first()).toBeVisible({ timeout: 10000 });
    });
});
