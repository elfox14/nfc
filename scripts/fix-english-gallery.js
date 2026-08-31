const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. FIX gallery-en.html HTML structure
const galleryEnHtmlPath = path.join(rootDir, 'gallery-en.html');
let galleryEnHtml = fs.readFileSync(galleryEnHtmlPath, 'utf8');

// Ensure correct gallery-container, gallery-header, demo-notice in gallery-en.html
const targetNavEnd = `        </div>
    </nav>

        <div class="category-filters">`;

const fixedNavEnd = `        </div>
    </nav>

    <div class="gallery-container">
        <div class="gallery-header">
            <h1>Design Gallery</h1>
            <p>Get inspired for your next digital business card from a curated collection of executive smart card templates crafted by our users.</p>
        </div>

        <!-- Demo Notice (shown when using fallback) -->
        <div id="demo-notice" class="demo-notice" style="display: none;">
            <i class="fas fa-info-circle"></i>
            <p>Displaying demo templates. The server is currently offline; please check back later for live designs.</p>
        </div>

        <!-- Category Filters -->
        <div class="category-filters">`;

if (galleryEnHtml.includes(targetNavEnd)) {
    galleryEnHtml = galleryEnHtml.replace(targetNavEnd, fixedNavEnd);
    fs.writeFileSync(galleryEnHtmlPath, galleryEnHtml, 'utf8');
    console.log('✓ Fixed gallery-en.html structure and headers.');
} else {
    // Regex replace to ensure container and headers are properly present
    galleryEnHtml = galleryEnHtml.replace(
        /<\/nav>\s*<div class="category-filters">/,
        `</nav>

    <div class="gallery-container">
        <div class="gallery-header">
            <h1>Design Gallery</h1>
            <p>Get inspired for your next digital business card from a curated collection of executive smart card templates crafted by our users.</p>
        </div>

        <!-- Demo Notice (shown when using fallback) -->
        <div id="demo-notice" class="demo-notice" style="display: none;">
            <i class="fas fa-info-circle"></i>
            <p>Displaying demo templates. The server is currently offline; please check back later for live designs.</p>
        </div>

        <!-- Category Filters -->
        <div class="category-filters">`
    );
    fs.writeFileSync(galleryEnHtmlPath, galleryEnHtml, 'utf8');
    console.log('✓ Regex fixed gallery-en.html structure and headers.');
}


// 2. FIX js/gallery-en-52a66378a0b5.js
const galleryEnJsPath = path.join(rootDir, 'js', 'gallery-en-52a66378a0b5.js');
let galleryEnJs = fs.readFileSync(galleryEnJsPath, 'utf8');

// Fix URLs from /nfc/viewer-en.html to relative viewer-en.html
galleryEnJs = galleryEnJs
    .replace(/\/nfc\/viewer-en\.html/g, 'viewer-en.html')
    .replace(/\/nfc\/editor-en\.html/g, 'editor-en.html');

// Add defensive null checks for demoNotice and other DOM elements
galleryEnJs = galleryEnJs.replace(
    /demoNotice\.style\.display = 'flex';/g,
    "if (demoNotice) demoNotice.style.display = 'flex';"
);
galleryEnJs = galleryEnJs.replace(
    /demoNotice\.style\.display = 'none';/g,
    "if (demoNotice) demoNotice.style.display = 'none';"
);

fs.writeFileSync(galleryEnJsPath, galleryEnJs, 'utf8');
console.log('✓ Fixed js/gallery-en-52a66378a0b5.js with relative links and safe null checks.');


// 3. FIX js/gallery-da13eb694fad.js
const galleryArJsPath = path.join(rootDir, 'js', 'gallery-da13eb694fad.js');
let galleryArJs = fs.readFileSync(galleryArJsPath, 'utf8');

galleryArJs = galleryArJs
    .replace(/\/nfc\/viewer\.html/g, 'viewer.html')
    .replace(/\/nfc\/editor\.html/g, 'editor.html');

galleryArJs = galleryArJs.replace(
    /demoNotice\.style\.display = 'flex';/g,
    "if (demoNotice) demoNotice.style.display = 'flex';"
);
galleryArJs = galleryArJs.replace(
    /demoNotice\.style\.display = 'none';/g,
    "if (demoNotice) demoNotice.style.display = 'none';"
);

fs.writeFileSync(galleryArJsPath, galleryArJs, 'utf8');
console.log('✓ Fixed js/gallery-da13eb694fad.js with relative links and safe null checks.');
