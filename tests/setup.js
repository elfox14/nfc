// tests/setup.js
/**
 * Jest Test Setup
 * إعداد بيئة الاختبار
 */

require('dotenv').config({ path: '.env.test' });

// Mock console functions في الاختبارات
global.console = {
    ...console,
    // Suppress console.log في الاختبارات
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep error and warn
    error: console.error,
    warn: console.warn,
};

// Global timeout للاختبارات التي تتعامل مع DB
jest.setTimeout(10000);

// Cleanup بعد كل الاختبارات
afterAll(async () => {
    // إغلاق جميع الاتصالات المفتوحة
    await new Promise(resolve => setTimeout(resolve, 500));
});
