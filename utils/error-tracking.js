const express = require('express');
const rateLimit = require('express-rate-limit');

const MAX_ERROR_BUFFER = 100;
const errorBuffer = [];

function redactSensitiveValue(value) {
  if (typeof value !== 'string') return value;

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/\b(password|token|secret|authorization|cookie)=([^&\s"'<>]+)/gi, '$1=[redacted]')
    .replace(/\b[A-Fa-f0-9]{48,}\b/g, '[redacted-secret]');
}

function redactSensitiveData(value) {
  if (Array.isArray(value)) return value.map(redactSensitiveData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, childValue]) => {
      if (/password|token|secret|authorization|cookie|email/i.test(key)) {
        return [key, '[redacted]'];
      }
      return [key, redactSensitiveData(childValue)];
    }));
  }
  return redactSensitiveValue(value);
}

function trackError(error, context = {}) {
  const safeContext = redactSensitiveData(context);
  const entry = {
    timestamp: new Date().toISOString(),
    message: redactSensitiveValue(error.message || String(error)),
    stack: redactSensitiveValue(error.stack?.split('\n').slice(0, 5).join('\n')),
    ...safeContext,
  };
  errorBuffer.push(entry);
  if (errorBuffer.length > MAX_ERROR_BUFFER) errorBuffer.shift();
  console.error(`[ErrorTracker] ${entry.timestamp} | ${safeContext.route || 'unknown'} | ${entry.message}`);
}

function registerClientErrorRoute(app) {
  const clientErrorLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: '',
  });

  app.post('/api/client-error', clientErrorLimiter, express.json({ limit: '4kb' }), (req, res) => {
    const { message, source, line, col, url: pageUrl } = req.body || {};
    if (!message) return res.status(400).end();
    console.error(`[ClientError] ${redactSensitiveValue(message)} | ${redactSensitiveValue(source || '')}:${line || 0} | ${redactSensitiveValue(pageUrl || '')}`);
    trackError(new Error(message), { route: 'CLIENT', source, line, col, pageUrl });
    res.status(204).end();
  });
}

module.exports = {
  errorBuffer,
  MAX_ERROR_BUFFER,
  trackError,
  registerClientErrorRoute,
  redactSensitiveData,
  redactSensitiveValue
};
