const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testUpload() {
    const svgPath = path.join(__dirname, 'malicious.svg');
    if (!fs.existsSync(svgPath)) {
        console.error('Test SVG not found.');
        return;
    }

    const formData = new FormData();
    formData.append('logo', fs.createReadStream(svgPath), 'malicious.svg');

    try {
        const fetchToUse = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

        // Create a mock token for bypass if verifyToken allows it, or we just test the logic directly 
        // Actually, let's just bypass verifyToken for this test by hitting the endpoint if it's open, 
        // or we might get a 401. Let's see what happens.

        const response = await fetchToUse('http://localhost:3000/api/upload-logo', { // Using local port Assuming 3000
            method: 'POST',
            body: formData,
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response: ${text}`);

    } catch (err) {
        console.error('Error during test:', err);
    }
}

testUpload();
