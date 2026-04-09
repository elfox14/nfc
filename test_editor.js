const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const basePath = 'file:///' + __dirname.replace(/\\/g, '/') + '/editor.html';
    
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto(basePath, { waitUntil: 'load' });
    
    console.log('--- Page Loaded ---');
    await page.waitForTimeout(1000);
    
    console.log('Clicking Show Gallery button directly...');
    await page.evaluate(() => {
        try {
            document.getElementById('show-gallery-btn').click();
        } catch (e) {
            console.error('Click error:', e);
        }
    });
    
    await page.waitForTimeout(500);
    await browser.close();
})();
