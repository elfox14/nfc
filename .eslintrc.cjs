module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },
  globals: {
    Blob: 'readonly',
    fetch: 'readonly',
    FormData: 'readonly'
  },
  ignorePatterns: [
    'coverage/',
    'dist/',
    'node_modules/',
    'e2e/',
    '*.original.js',
    'script-*.js',
    'sw.js'
  ],
  overrides: [
    {
      files: ['test/**/*.js'],
      env: { browser: true, jest: true }
    }
  ],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
  }
};
