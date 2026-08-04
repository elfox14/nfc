'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'coverage/',
      'dist/',
      'node_modules/',
      'e2e/',
      '*.original.js',
      'script-*.js',
      'sw.js'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        Blob: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest
      }
    }
  }
];
