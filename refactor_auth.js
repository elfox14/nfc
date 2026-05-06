const fs = require('fs');

function refactor() {
  const content = fs.readFileSync('server.js', 'utf8');
  const lines = content.split('\n');
  const startLine = lines.findIndex(l => l.includes('// --- AUTHENTICATION ROUTES ---'));
  const endLine = lines.findIndex(l => l.includes('// Get User Profile/Designs'));

  if (startLine === -1 || endLine === -1) {
    console.error('Could not find start or end bounds in server.js');
    process.exit(1);
  }

  const authBlockLines = lines.slice(startLine, endLine);
  
  // Create routes/auth.routes.js
  const routerFileContent = `const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const EmailService = require('../email-service');
const { createAccessToken, createRefreshToken, hashToken } = require('../utils/tokens');
const verifyToken = require('../auth-middleware');

module.exports = function createAuthRouter({ getDb, usersCollectionName, authLimiter }) {
  const router = express.Router();

  // Rate Limiting is already applied in server.js globally for some paths, but we can re-apply if needed
  // For now, we just map the routes over.

${authBlockLines.join('\n').replaceAll("app.post('/api/auth/", "router.post('/").replaceAll("app.get('/api/auth/", "router.get('/")}

  return router;
};
`;

  fs.writeFileSync('routes/auth.routes.js', routerFileContent);
  console.log('Created routes/auth.routes.js');

  // Remove the block from server.js
  const newServerContent = [
    ...lines.slice(0, startLine),
    '// --- AUTHENTICATION ROUTES (MODULAR) ---',
    'const createAuthRouter = require(\'./routes/auth.routes\');',
    'app.use(\'/api/auth\', createAuthRouter({ ',
    '  getDb: () => db, ',
    '  usersCollectionName, ',
    '  authLimiter',
    '}));',
    '',
    ...lines.slice(endLine)
  ].join('\n');

  fs.writeFileSync('server.js', newServerContent);
  console.log('Updated server.js');
}

refactor();
