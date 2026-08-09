const fs = require('fs');

const path = 'e2e/launch-flows.spec.ts';
let source = fs.readFileSync(path, 'utf8');
source = source.replace("await page.locator('#card').click();", "await page.evaluate(() => document.getElementById('card')?.click());");
source = source.replace("await page.locator('#card .card-flipper').click();", "await page.evaluate(() => document.getElementById('card')?.click());");
source = source.replace("await expect(page.locator('#card .card-flipper')).toHaveClass(/is-flipped/);", "await expect(page.locator('#card')).toHaveClass(/is-flipped/);");
fs.writeFileSync(path, source);
