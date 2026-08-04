const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

describe('production dependency security policy', () => {
  const packageJson = require('../package.json');
  const workflow = fs.readFileSync(
    path.join(projectRoot, '.github', 'workflows', 'ci.yml'),
    'utf8'
  );

  test('audits production dependencies at high severity', () => {
    expect(packageJson.scripts['audit:prod']).toBe(
      'npm audit --omit=dev --audit-level=high'
    );
  });

  test('also audits the development toolchain at high severity', () => {
    expect(packageJson.scripts['audit:all']).toBe('npm audit --audit-level=high');
    expect(workflow).toContain('run: npm run audit:all');
  });

  test('uses the locked dependency graph and enforces the production audit in CI', () => {
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm run audit:prod');
    expect(workflow).not.toContain('npm audit --audit-level=critical');
  });

  test('does not ship unused vulnerable Redis dependency chains', () => {
    expect(packageJson.dependencies).not.toHaveProperty('ioredis');
    expect(packageJson.dependencies).not.toHaveProperty('rate-limit-redis');
  });
});
