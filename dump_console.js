const { chromium } = require('playwright');
const path = require('path');

(async () => {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await chromium.launch();
        const page = await browser.newPage();

        page.on('console', msg => {
            console.log(`[CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
        });

        page.on('pageerror', error => {
            console.log(`[PAGE ERROR]: ${error.message}`);
        });

        const url = 'file://' + path.resolve('editor.html');
        console.log(`Navigating to ${url}...`);

        await page.goto(url, { waitUntil: 'load' });

        console.log('Page loaded. Waiting 2 seconds for JS execution...');
        await page.waitForTimeout(2000);

        console.log('Done.');
    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
