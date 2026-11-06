import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createProject, main } from './create.mjs';
import { loadEnvironment } from './environment.mjs';

function fixture(t) {
  const parent = realpathSync(tmpdir());
  const directory = mkdtempSync(resolve(parent, 'wp-generator-test-'));
  t.after(() => {
    const target = realpathSync(directory);
    assert.equal(dirname(target), parent);
    assert.ok(basename(target).startsWith('wp-generator-test-'));
    rmSync(target, { recursive: true, force: true });
  });
  return directory;
}

test('generated projects contain reusable source and independent environments, without local artifacts', (t) => {
  const parent = fixture(t);
  const calls = [];
  const first = createProject(resolve(parent, 'site with spaces'), { port: '8091', run: (args) => calls.push(args) });
  const second = createProject(resolve(parent, 'second'), { skipSetup: true, run: () => {} });
  for (const path of ['.agents/skills/wp-project-init/SKILL.md', '.env.example', 'composer.lock', 'scripts/create.test.mjs', 'wp-content/themes/starter-theme/theme.json']) {
    assert.ok(existsSync(resolve(first, path)), path);
  }
  for (const path of ['.git', 'vendor', '.cache', '.env.verify', 'CONTEXT.md', 'VERIFICATION.md']) {
    assert.ok(!existsSync(resolve(first, path)), path);
  }
  const a = loadEnvironment(resolve(first, '.env'));
  const b = loadEnvironment(resolve(second, '.env'));
  assert.equal(a.WP_URL, 'http://localhost:8091');
  assert.equal(a.HTTP_PORT, '8091');
  assert.notEqual(a.COMPOSE_PROJECT_NAME, b.COMPOSE_PROJECT_NAME);
  assert.notEqual(a.DB_PASSWORD, b.DB_PASSWORD);
  assert.notEqual(a.WP_ADMIN_PASSWORD, b.WP_ADMIN_PASSWORD);
  assert.deepEqual(calls.map((args) => args.at(-1)), ['verify-static', 'scripts/create.test.mjs', 'setup', 'verify']);
});

test('existing destinations and invalid options are rejected without modifying files', (t) => {
  const directory = fixture(t);
  const marker = resolve(directory, 'keep.txt');
  writeFileSync(marker, 'keep');
  assert.throws(() => createProject(directory), /already exists/);
  assert.equal(readFileSync(marker, 'utf8'), 'keep');
  const target = resolve(directory, 'new');
  assert.throws(() => createProject(target, { port: '80' }), /port/);
  assert.throws(() => main([target, '--unknown']), /option/);
  assert.throws(() => main([target, '--port']), /option/);
  assert.ok(!existsSync(target));
  const root = fileURLToPath(new URL('../', import.meta.url));
  assert.throws(() => createProject(resolve(root, 'generated-project-test')), /outside/);
});

test('skip setup avoids Docker; a failed setup preserves files and explains recovery', (t) => {
  const directory = fixture(t);
  const calls = [];
  createProject(resolve(directory, 'offline'), { skipSetup: true, run: (args) => calls.push(args) });
  assert.equal(calls.length, 2);
  const failed = resolve(directory, 'failed');
  assert.throws(() => createProject(failed, { run: (args) => {
    if (args.includes('setup')) throw new Error('Docker unavailable');
  } }), /retained.*[\s\S]*npm run setup/);
  assert.ok(existsSync(resolve(failed, '.env')));
  assert.ok(existsSync(resolve(failed, 'compose.yaml')));
});
