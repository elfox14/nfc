const fs = require('fs');

function refactor() {
  const content = fs.readFileSync('server.js', 'utf8');
  const lines = content.split('\n');
  
  const b1Start = lines.findIndex(l => l.includes('const storage = multer.memoryStorage();'));
  const b1End = lines.findIndex(l => l.includes('// --- AUTHENTICATION ROUTES (MODULAR) ---'));
  
  const b2Start = lines.findIndex(l => l.includes('// Get User Profile/Designs'));
  const b2End = lines.findIndex(l => l.includes('app.get(\'/robots.txt\', (req, res) => {'));

  if (b1Start === -1 || b1End === -1 || b2Start === -1 || b2End === -1) {
    console.error('Could not find bounds:', { b1Start, b1End, b2Start, b2End });
    process.exit(1);
  }

  const b1Lines = lines.slice(b1Start, b1End);
  const b2Lines = lines.slice(b2Start, b2End);
  
  let combinedLines = b1Lines.concat(b2Lines);

  let extractedContent = combinedLines.join('\n');
  
  // Replace app.method( with router.method(
  extractedContent = extractedContent
    .replaceAll("app.post('/api/", "router.post('/")
    .replaceAll("app.get('/api/", "router.get('/")
    .replaceAll("app.patch('/api/", "router.patch('/")
    .replaceAll("app.delete('/api/", "router.delete('/");
    
  // Replace db references with getDb()
  extractedContent = extractedContent
    .replace(/!db/g, '!getDb()')
    .replace(/db\.collection/g, 'getDb().collection')
    .replace(/if \(doc\.ownerId !== req\.user\.userId && db\)/g, 'if (doc.ownerId !== req.user.userId && getDb())');

  // Fix uploadDir path
  extractedContent = extractedContent.replace(
    /const uploadDir = path\.join\(__dirname, 'uploads'\);/g,
    "const uploadDir = path.join(__dirname, '..', 'uploads');"
  );
  
  // Actually uploadDir is defined in server.js, and used in b1Lines. 
  // Let's explicitly define it in the routes file since it might be missing from the extracted block.
  
  const routerFileContent = `const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const EmailService = require('../email-service');
const verifyToken = require('../auth-middleware');
const rateLimit = require('express-rate-limit');

const uploadDir = path.join(__dirname, '..', 'uploads');

module.exports = function createDesignsRouter({ 
  getDb, 
  designsCollectionName, 
  usersCollectionName, 
  requestsCollectionName,
  absoluteBaseUrl,
  publicUploadLimiter 
}) {
  const router = express.Router();

${extractedContent}

  return router;
};
`;

  fs.writeFileSync('routes/designs.routes.js', routerFileContent);
  console.log('Created routes/designs.routes.js');

  const newServerContent = [
    ...lines.slice(0, b1Start),
    '// --- DESIGNS & UPLOADS ROUTES (MODULAR) ---',
    'const createDesignsRouter = require(\'./routes/designs.routes\');',
    'app.use(\'/api\', createDesignsRouter({ ',
    '  getDb: () => db, ',
    '  designsCollectionName, ',
    '  usersCollectionName, ',
    '  requestsCollectionName,',
    '  absoluteBaseUrl,',
    '  publicUploadLimiter',
    '}));',
    '',
    ...lines.slice(b1End, b2Start),
    ...lines.slice(b2End)
  ].join('\n');

  fs.writeFileSync('server.js', newServerContent);
  console.log('Updated server.js');
}

refactor();
