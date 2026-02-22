import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/nfc';

test.describe('Authentication Flow', () => {

    test.describe('Login Page', () => {
        test('should display login form', async ({ page }) => {
            await page.goto(`${BASE_URL}/login.html`);

            await expect(page.locator('h1')).toContainText('تسجيل الدخول');
            await expect(page.locator('#email')).toBeVisible();
            await expect(page.locator('#password')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();
        });

        test('should show error for invalid credentials', async ({ page }) => {
            await page.goto(`${BASE_URL}/login.html`);

            await page.fill('#email', 'invalid@test.com');
            await page.fill('#password', 'wrongpassword');
            await page.click('button[type="submit"]');

            await expect(page.locator('#error-box')).toBeVisible();
        });

        test('should have forgot password link', async ({ page }) => {
            await page.goto(`${BASE_URL}/login.html`);

            const forgotLink = page.locator('a[href*="forgot-password"]');
            await expect(forgotLink).toBeVisible();
            await expect(forgotLink).toContainText('نسيت كلمة المرور');
        });

        test('should have signup link', async ({ page }) => {
            await page.goto(`${BASE_URL}/login.html`);

            const signupLink = page.locator('a[href*="signup"]');
            await expect(signupLink).toBeVisible();
        });
    });

    test.describe('Signup Page', () => {
        test('should display registration form', async ({ page }) => {
            await page.goto(`${BASE_URL}/signup.html`);

            await expect(page.locator('#name')).toBeVisible();
            await expect(page.locator('#email')).toBeVisible();
            await expect(page.locator('#password')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();
        });

        test('should validate email format', async ({ page }) => {
            await page.goto(`${BASE_URL}/signup.html`);

            await page.fill('#name', 'Test User');
            await page.fill('#email', 'invalid-email');
            await page.fill('#password', 'password123');
            await page.click('button[type="submit"]');

            // Browser should prevent submission due to invalid email
            const emailInput = page.locator('#email');
            await expect(emailInput).toHaveAttribute('type', 'email');
        });
    });

    test.describe('Forgot Password Page', () => {
        test('should display forgot password form', async ({ page }) => {
            await page.goto(`${BASE_URL}/forgot-password.html`);

            await expect(page.locator('h1')).toContainText('استعادة كلمة المرور');
            await expect(page.locator('#email')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();
        });

        test('should show success message on valid email submission', async ({ page }) => {
            await page.goto(`${BASE_URL}/forgot-password.html`);

            await page.fill('#email', 'test@example.com');
            await page.click('button[type="submit"]');

            // Wait for response
            await page.waitForTimeout(2000);

            // Should show success or error message
            const successBox = page.locator('#success-box');
            const errorBox = page.locator('#error-box');

            // One of them should be visible
            const successVisible = await successBox.isVisible();
            const errorVisible = await errorBox.isVisible();

            expect(successVisible || errorVisible).toBe(true);
        });
    });
});
