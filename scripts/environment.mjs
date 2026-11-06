import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const secretKeys = ['DB_PASSWORD', 'DB_ROOT_PASSWORD', 'WP_ADMIN_PASSWORD'];

// A deliberately small, documented subset of dotenv. No shell expansion/evaluation.
export function parseEnvironment(source) {
  const values = {};
  for (const [index, original] of source.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = original.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^#'"\r\n]*))$/.exec(line);
    if (!match) throw new Error(`Invalid .env syntax at line ${index + 1}. Use KEY=value or quoted values.`);
    const [, key, doubleQuoted, singleQuoted, plain] = match;
    if (Object.hasOwn(values, key)) throw new Error(`Duplicate .env key: ${key}`);
    const value = doubleQuoted ?? singleQuoted ?? plain.trim();
    if (value.includes('$') || value.includes('`')) {
      throw new Error(`${key}: interpolation and shell expressions are unsupported. Use a literal value.`);
    }
    values[key] = value;
  }
  return values;
}

export function validateEnvironment(values) {
  for (const key of [
    'COMPOSE_PROJECT_NAME', 'HTTP_PORT', 'WP_URL', 'WP_TITLE', 'WP_ADMIN_USER',
    'WP_ADMIN_EMAIL', 'WP_ADMIN_PASSWORD', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_ROOT_PASSWORD',
  ]) {
    if (!values[key]) throw new Error(`Missing ${key}. Run setup or edit your local .env.`);
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(values.COMPOSE_PROJECT_NAME)) {
    throw new Error('COMPOSE_PROJECT_NAME must use 1–48 lowercase letters, digits, underscores or hyphens.');
  }
  if (!/^\d+$/.test(values.HTTP_PORT) || Number(values.HTTP_PORT) < 1024 || Number(values.HTTP_PORT) > 65535) {
    throw new Error('HTTP_PORT must be an integer between 1024 and 65535.');
  }
  let url;
  try { url = new URL(values.WP_URL); } catch { throw new Error('WP_URL must be an absolute local HTTP URL.'); }
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)
    || Number(url.port || 80) !== Number(values.HTTP_PORT)
    || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('WP_URL must be http://localhost:HTTP_PORT or http://127.0.0.1:HTTP_PORT, without a path.');
  }
  for (const key of ['DB_NAME', 'DB_USER']) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(values[key])) throw new Error(`${key} must be a simple identifier (max 32 characters).`);
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(values.WP_ADMIN_USER)) throw new Error('WP_ADMIN_USER contains unsupported characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.WP_ADMIN_EMAIL)) throw new Error('WP_ADMIN_EMAIL must be a valid email address.');
  for (const key of secretKeys) {
    if (values[key].length < 20) throw new Error(`${key} must contain at least 20 characters.`);
  }
  return values;
}

export function initializeEnvironment(envPath, examplePath) {
  const existed = existsSync(envPath);
  let source = readFileSync(existed ? envPath : examplePath, 'utf8');
  const values = parseEnvironment(source);
  // Never silently change credentials associated with an existing database volume.
  if (existed) return validateEnvironment(values);
  if (!values.COMPOSE_PROJECT_NAME) {
    values.COMPOSE_PROJECT_NAME = `wp-starter-${randomBytes(4).toString('hex')}`;
    source = source.replace(/^COMPOSE_PROJECT_NAME=.*$/m, `COMPOSE_PROJECT_NAME=${values.COMPOSE_PROJECT_NAME}`);
  }
  for (const key of secretKeys) {
    if (values[key]) continue;
    const secret = randomBytes(24).toString('hex');
    if (Object.hasOwn(values, key)) {
      source = source.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${secret}`);
    } else {
      source += `\n${key}=${secret}\n`;
    }
    values[key] = secret;
  }
  validateEnvironment(values);
  // Exclusive creation prevents concurrent setup from overwriting credentials.
  writeFileSync(envPath, source, { flag: 'wx', mode: 0o600 });
  return values;
}

export function loadEnvironment(envPath) {
  if (!existsSync(envPath)) throw new Error('Local environment file is missing. Run npm run setup first.');
  return validateEnvironment(parseEnvironment(readFileSync(envPath, 'utf8')));
}
