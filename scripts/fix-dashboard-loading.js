const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. FIX js/dashboard-2fd86ecf204e.js
const dashJsPath = path.join(rootDir, 'js', 'dashboard-2fd86ecf204e.js');
let dashJs = fs.readFileSync(dashJsPath, 'utf8');

// Replace unsafe element access with safe checks
dashJs = dashJs.replace(
    /document\.getElementById\('user-display-name'\)\.textContent\s*=\s*Auth\.user\?\.name\s*\|\|\s*'مستخدم';/,
    `const userDisplay = document.getElementById('user-display-name');
            if (userDisplay) {
                userDisplay.textContent = Auth.user?.name || 'مستخدم';
            }`
);

dashJs = dashJs.replace(
    /window\.location\.href\s*=\s*'\/nfc\/login\.html\?error=AuthNotLoggedIn';/,
    `window.location.href = 'login.html?error=AuthNotLoggedIn&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);`
);

// Safe event listener attachments
dashJs = dashJs.replace(
    /document\.getElementById\('save-privacy-btn'\)\.addEventListener/g,
    `const savePrivacyBtn = document.getElementById('save-privacy-btn'); if (savePrivacyBtn) savePrivacyBtn.addEventListener`
);

dashJs = dashJs.replace(
    /document\.getElementById\('export-account-data-btn'\)\.addEventListener/g,
    `const exportBtn = document.getElementById('export-account-data-btn'); if (exportBtn) exportBtn.addEventListener`
);

dashJs = dashJs.replace(
    /document\.getElementById\('delete-account-btn'\)\.addEventListener/g,
    `const deleteBtn = document.getElementById('delete-account-btn'); if (deleteBtn) deleteBtn.addEventListener`
);

fs.writeFileSync(dashJsPath, dashJs, 'utf8');
console.log('Fixed js/dashboard-2fd86ecf204e.js');

// 2. FIX js/dashboard-en-dbf23d06155e.js
const dashEnJsPath = path.join(rootDir, 'js', 'dashboard-en-dbf23d06155e.js');
let dashEnJs = fs.readFileSync(dashEnJsPath, 'utf8');

dashEnJs = dashEnJs.replace(
    /document\.getElementById\('user-display-name'\)\.textContent\s*=\s*Auth\.user\?\.name\s*\|\|\s*'User';/,
    `const userDisplay = document.getElementById('user-display-name');
            if (userDisplay) {
                userDisplay.textContent = Auth.user?.name || 'User';
            }`
);

dashEnJs = dashEnJs.replace(
    /window\.location\.href\s*=\s*'\/nfc\/login-en\.html\?error=AuthNotLoggedIn';/,
    `window.location.href = 'login-en.html?error=AuthNotLoggedIn&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);`
);

dashEnJs = dashEnJs.replace(
    /document\.getElementById\('save-privacy-btn'\)\.addEventListener/g,
    `const savePrivacyBtn = document.getElementById('save-privacy-btn'); if (savePrivacyBtn) savePrivacyBtn.addEventListener`
);

dashEnJs = dashEnJs.replace(
    /document\.getElementById\('export-account-data-btn'\)\.addEventListener/g,
    `const exportBtn = document.getElementById('export-account-data-btn'); if (exportBtn) exportBtn.addEventListener`
);

dashEnJs = dashEnJs.replace(
    /document\.getElementById\('delete-account-btn'\)\.addEventListener/g,
    `const deleteBtn = document.getElementById('delete-account-btn'); if (deleteBtn) deleteBtn.addEventListener`
);

fs.writeFileSync(dashEnJsPath, dashEnJs, 'utf8');
console.log('Fixed js/dashboard-en-dbf23d06155e.js');

// 3. UPDATE dashboard.html to add #user-display-name
const dashHtmlPath = path.join(rootDir, 'dashboard.html');
let dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');

dashHtml = dashHtml.replace(
    /<h1>تصاميمي<\/h1>/,
    `<h1>مرحباً، <span id="user-display-name" class="user-display-name"></span></h1>`
);

fs.writeFileSync(dashHtmlPath, dashHtml, 'utf8');
console.log('Fixed dashboard.html');

// 4. UPDATE dashboard-en.html to add #user-display-name
const dashEnHtmlPath = path.join(rootDir, 'dashboard-en.html');
let dashEnHtml = fs.readFileSync(dashEnHtmlPath, 'utf8');

dashEnHtml = dashEnHtml.replace(
    /<h1>My Designs<\/h1>/,
    `<h1>Welcome, <span id="user-display-name" class="user-display-name"></span></h1>`
);

fs.writeFileSync(dashEnHtmlPath, dashEnHtml, 'utf8');
console.log('Fixed dashboard-en.html');
