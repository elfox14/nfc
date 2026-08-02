'use strict';

const supertest = require('supertest');
const { createCsrfToken, CSRF_HEADER_NAME } = require('../utils/csrf-protection');

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

module.exports = function csrfTestRequest(app) {
  const client = supertest(app);

  return new Proxy(client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (!UNSAFE_METHODS.has(property) || typeof value !== 'function') return value;

      return (...args) => value.apply(target, args).set(
        CSRF_HEADER_NAME,
        createCsrfToken(process.env.COOKIE_SIGNING_SECRET)
      );
    }
  });
};
