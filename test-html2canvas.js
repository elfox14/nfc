const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto('http://127.0.0.1:3000/editor.html'); // Ensure local server is running on 3000
    await page.waitForTimeout(2000);

    // Call ExportManager
    await page.evaluate(async () => {
        try {
            await window.ExportManager.captureElement(document.getElementById('card-front-preview'), 2);
            console.log("Capture Successful");
        } catch (e) {
            console.error("Capture Error:", e.message, e.stack);
        }
    });

    await browser.close();
})();
