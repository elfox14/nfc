const fs = require('fs');

const path = 'e2e/launch-flows.spec.ts';
let source = fs.readFileSync(path, 'utf8');
source = source.replace("await page.locator('#card').click();", "await page.locator('#card .card-flipper').click();");
source = source.replace("await expect(page.locator('#card')).toHaveClass(/is-flipped/);", "await expect(page.locator('#card .card-flipper')).toHaveClass(/is-flipped/);");
fs.writeFileSync(path, source);
