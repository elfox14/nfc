require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const express = require('express');

module.exports = function applySecurity(app) {
  // ???????? ??? env? ?? ????? ?????? trust proxy
  if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true' ||
      process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  // Helmet - ???? ???? HTTP
  app.use(helmet());

  // Content Security Policy - ????? ??????? ???? ??????? ??? ??????
  try {
    app.use(
      helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
          "script-src": ["'self'", "'unsafe-inline'"], // ???? 'unsafe-inline' ?? ??????? ?? ????
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'", "https:"],
        },
      })
    );
  } catch (e) {
    // ??? ??????? helmet ????? ?????? ????? ??? ????? ????? ???? ?? CSP ??? ??????
    console.warn('CSP init warning', e && e.message);
  }

  // Body parsers ?? ????
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // ????? ??? NoSQL Injection
  app.use(mongoSanitize());

  // ????? XSS
  app.use(xss());

  // ??? HTTP Parameter Pollution
  app.use(hpp());

  // CORS ?????
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const corsOptions = {
    origin: function(origin, callback) {
      // ?????? ???????? ???? origin (curl/postman)? ???? ??? ??? ???? ?????
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  };

  app.use(cors(corsOptions));

  // Rate limiting ???
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(generalLimiter);

  // HSTS ? ??????? ?????? ??? Helmet
  try {
    app.use(helmet.hsts({ maxAge: 90 * 24 * 60 * 60, includeSubDomains: true, preload: true }));
  } catch (e) {
    console.warn('HSTS init warning', e && e.message);
  }

  // ??????: auth-specific rate limiter ?????? ???? routes/auth.js
};
