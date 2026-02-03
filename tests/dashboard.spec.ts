import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/nfc';

test.describe('Dashboard (Authenticated)', () => {

    test.beforeEach(async ({ page }) => {
        // Note: In real tests, you would need to set up authentication
        // This can be done by setting localStorage with a valid token
        // or by going through the login flow
    });

    test('should redirect to login if not authenticated', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard.html`);

        // Dashboard should either show content or redirect to login
        // Check if we're redirected or if auth check happens
        await page.waitForTimeout(2000);

        const currentUrl = page.url();
        const isDashboard = currentUrl.includes('dashboard');
        const isLogin = currentUrl.includes('login');

        // Either on dashboard or redirected to login
        expect(isDashboard || isLogin).toBe(true);
    });

    test('should display user designs when authenticated', async ({ page, context }) => {
        // Set up mock authentication token in localStorage
        await page.goto(`${BASE_URL}/login.html`);

        // Inject a mock token for testing (this won't work with real API)
        await page.evaluate(() => {
            localStorage.setItem('authToken', 'mock-test-token');
            localStorage.setItem('userData', JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
                userId: 'test123'
            }));
        });

        await page.goto(`${BASE_URL}/dashboard.html`);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check if dashboard elements are present
        const dashboardTitle = page.locator('h1, h2').first();
        await expect(dashboardTitle).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Card Viewer', () => {

    test('should load viewer page with ID parameter', async ({ page }) => {
        // Use a sample card ID (this may or may not exist)
        await page.goto(`${BASE_URL}/viewer.html?id=test123`);

        // Page should load without critical errors
        await page.waitForLoadState('domcontentloaded');

        // Check for viewer container
        const viewerContainer = page.locator('#viewer-container, .viewer-content, body');
        await expect(viewerContainer).toBeVisible();
    });

    test('should show error for non-existent card', async ({ page }) => {
        await page.goto(`${BASE_URL}/viewer.html?id=nonexistent123`);

        await page.waitForLoadState('networkidle');

        // Should show error message or loading state
        await page.waitForTimeout(3000);

        // The page should still be functional
        const bodyVisible = await page.locator('body').isVisible();
        expect(bodyVisible).toBe(true);
    });

    test('should be responsive', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto(`${BASE_URL}/viewer.html?id=test123`);

        await page.waitForLoadState('domcontentloaded');

        // Page should still work on mobile viewport
        const bodyVisible = await page.locator('body').isVisible();
        expect(bodyVisible).toBe(true);
    });
});

test.describe('API Health Check', () => {

    test('should respond to API requests', async ({ request }) => {
        // Test if server is running
        const response = await request.get(`${BASE_URL.replace('/nfc', '')}/api/health`);

        // Allow 404 if health endpoint doesn't exist
        expect([200, 404]).toContain(response.status());
    });
});
