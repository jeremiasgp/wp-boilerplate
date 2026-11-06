import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, basename } from 'node:path';
import test from 'node:test';
import { initializeEnvironment, parseEnvironment, validateEnvironment } from './environment.mjs';
import { context, reset, setup } from './dev.mjs';

const examplePath = new URL('../.env.example', import.meta.url);

function fixture(t) {
  const tempRoot = realpathSync(tmpdir());
  const dir = mkdtempSync(resolve(tempRoot, 'wp-starter-test-'));
  t.after(() => {
    const target = realpathSync(dir);
    assert.equal(dirname(target), tempRoot);
    assert.ok(basename(target).startsWith('wp-starter-test-'));
    rmSync(target, { recursive: true, force: true });
  });
  return { dir, envPath: resolve(dir, '.env') };
}

test('first initialization generates distinct secrets; reruns preserve exact configuration', (t) => {
  const { envPath } = fixture(t);
  const first = initializeEnvironment(envPath, examplePath);
  const original = readFileSync(envPath, 'utf8');
  const second = initializeEnvironment(envPath, examplePath);
  assert.deepEqual(first, second);
  assert.equal(readFileSync(envPath, 'utf8'), original);
  const passwords = ['DB_PASSWORD', 'DB_ROOT_PASSWORD', 'WP_ADMIN_PASSWORD'].map((key) => first[key]);
  assert.equal(new Set(passwords).size, 3);
  for (const password of passwords) assert.match(password, /^[a-f0-9]{48}$/);
  assert.match(first.COMPOSE_PROJECT_NAME, /^wp-starter-[a-f0-9]{8}$/);
});

test('existing incomplete environment is never silently rewritten', (t) => {
  const { envPath } = fixture(t);
  const original = readFileSync(examplePath, 'utf8');
  writeFileSync(envPath, original);
  assert.throws(() => initializeEnvironment(envPath, examplePath), /Missing/);
  assert.equal(readFileSync(envPath, 'utf8'), original);
});

test('dotenv parser accepts quoted titles and CRLF, rejects duplicates and interpolation', () => {
  assert.deepEqual(parseEnvironment('\uFEFF# comment\r\nWP_TITLE="A reusable site"\r\nHTTP_PORT=8080\r\n'), {
    WP_TITLE: 'A reusable site', HTTP_PORT: '8080',
  });
  assert.throws(() => parseEnvironment('HTTP_PORT=8080\nHTTP_PORT=8081'), /Duplicate/);
  assert.throws(() => parseEnvironment('WP_TITLE=$(echo secret)'), /interpolation/);
  assert.throws(() => parseEnvironment('WP_TITLE=`command`'), /interpolation/);
  assert.throws(() => parseEnvironment('export HTTP_PORT=8080'), /syntax/);
});

test('alternate environment option works through Node without colliding with Node env-file handling', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./dev.mjs', import.meta.url)), 'help', '--env', '.env.verify'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage:/);
});

test('environment validation rejects unsafe names, external URLs and mismatched ports', (t) => {
  const { envPath } = fixture(t);
  const values = initializeEnvironment(envPath, examplePath);
  assert.throws(() => validateEnvironment({ ...values, COMPOSE_PROJECT_NAME: '../other-project' }), /COMPOSE_PROJECT_NAME/);
  assert.throws(() => validateEnvironment({ ...values, WP_URL: 'http://example.com:8080' }), /WP_URL/);
  assert.throws(() => validateEnvironment({ ...values, HTTP_PORT: '9000' }), /WP_URL/);
  assert.throws(() => validateEnvironment({ ...values, DB_USER: 'root;DROP DATABASE' }), /DB_USER/);
});

test('WP-CLI forwarding preserves arguments and explicit project scope', (t) => {
  const { envPath } = fixture(t);
  const values = initializeEnvironment(envPath, examplePath);
  let recorded;
  const ctx = context(envPath, (args, options) => { recorded = { args, options }; return { status: 0 }; });
  ctx.wp(['option', 'update', 'blogname', 'A title; with spaces']);
  assert.equal(recorded.args[recorded.args.indexOf('--project-name') + 1], values.COMPOSE_PROJECT_NAME);
  assert.equal(recorded.args[recorded.args.indexOf('--env-file') + 1], envPath);
  assert.deepEqual(recorded.args.slice(-4), ['option', 'update', 'blogname', 'A title; with spaces']);
});

test('reset cancellation executes nothing; exact project confirmation deletes only scoped volumes', async () => {
  const calls = [];
  const ctx = { values: { COMPOSE_PROJECT_NAME: 'isolated-fixture' }, compose: (args) => calls.push(args) };
  await assert.rejects(reset(ctx, async () => 'yes'), /cancelled/);
  assert.equal(calls.length, 0);
  await assert.rejects(reset(ctx, async () => 'reset another-project'), /cancelled/);
  assert.equal(calls.length, 0);
  await reset(ctx, async () => 'reset isolated-fixture');
  assert.deepEqual(calls, [['down', '--volumes', '--remove-orphans']]);
});

test('setup reruns preserve installed settings and send private install config over stdin', async (t) => {
  const { envPath } = fixture(t);
  initializeEnvironment(envPath, examplePath);
  writeFileSync(envPath, readFileSync(envPath, 'utf8').replace('WP_TITLE="WordPress Starter"', 'WP_TITLE="A team\'s site"'));
  const calls = [];
  let installed = false;
  const runner = (args, options) => {
    calls.push({ args, options });
    if (args.includes('is-installed')) return { status: installed ? 0 : 1, stdout: '' };
    if (options.input?.includes('core install:')) installed = true;
    return { status: 0, stdout: '' };
  };
  await setup(envPath, runner);
  const values = parseEnvironment(readFileSync(envPath, 'utf8'));
  const installation = calls.find(({ options }) => options.input?.includes('core install:'));
  assert.ok(installation.options.input.includes(`admin_password: '${values.WP_ADMIN_PASSWORD}'`));
  assert.ok(installation.options.input.includes("title: 'A team''s site'"));
  assert.ok(!installation.args.some((arg) => arg.includes(values.WP_ADMIN_PASSWORD)));
  assert.ok(installation.args.some((arg) => arg.includes('umask 077')));
  assert.ok(!installation.args.some((arg) => arg.includes('--prompt')));
  assert.equal(calls.filter(({ args }) => args.includes('activate')).length, 2);
  const firstLength = calls.length;
  await setup(envPath, runner);
  const secondCalls = calls.slice(firstLength);
  assert.ok(!secondCalls.some(({ args }) => args.includes('activate') || args.includes('update')));
  assert.equal(calls.filter(({ options }) => options.input?.includes('core install:')).length, 1);
});
