import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initializeEnvironment, loadEnvironment, parseEnvironment } from './environment.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedWordPress = '7.1.4';
const skills = ['wp-project-init', 'wp-docker-setup', 'wp-theme-scaffold', 'wp-plugin-scaffold', 'wp-quality-setup', 'wp-project-verify'];

export function execute(args, { capture = false, input, allowFailure = false, env = {} } = {}) {
  const result = spawnSync('docker', args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    shell: false,
    stdio: [input === undefined ? 'inherit' : 'pipe', capture ? 'pipe' : 'inherit', capture ? 'pipe' : 'inherit'],
    input,
  });
  if (result.error) throw new Error(`Cannot execute Docker: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`Docker command failed (exit ${result.status ?? result.signal}).`);
  }
  return result;
}

export function context(envPath, runner = execute) {
  const values = loadEnvironment(envPath);
  const base = ['compose', '--project-directory', root, '--env-file', envPath, '--project-name', values.COMPOSE_PROJECT_NAME, '-f', resolve(root, 'compose.yaml')];
  return {
    values,
    compose: (args, options = {}) => runner([...base, ...args], { ...options, env: { ...values, ...options.env } }),
    wp: (args, options = {}) => runner([...base, 'run', '--rm', '--no-deps', '-T', 'wpcli', ...args], { ...options, env: { ...values, ...options.env } }),
  };
}

function start(ctx) {
  ctx.compose(['config', '--quiet']);
  ctx.compose(['up', '--detach', '--wait', '--wait-timeout', '180', 'db', 'wordpress']);
}

function qualityInstall(ctx) {
  if (!existsSync(resolve(root, 'composer.lock'))) throw new Error('Committed composer.lock is missing; restore it before setup.');
  ctx.compose(['build', 'quality']);
  ctx.compose(['run', '--rm', '--no-deps', '-T', 'quality', 'composer', 'install', '--no-interaction', '--prefer-dist', '--no-progress']);
}

export async function setup(envPath, runner = execute) {
  initializeEnvironment(envPath, resolve(root, '.env.example'));
  const ctx = context(envPath, runner);
  start(ctx);
  const installed = ctx.wp(['core', 'is-installed'], { capture: true, allowFailure: true });
  if (installed.status !== 0) {
    // WP-CLI --prompt echoes values and the reconstructed command on piped stdin.
    // Feed a private config instead; only the fixed shell script enters argv.
    const quoteYaml = (value) => `'${value.replaceAll("'", "''")}'`;
    const config = [
      `url: ${quoteYaml(ctx.values.WP_URL)}`,
      'core install:',
      `  url: ${quoteYaml(ctx.values.WP_URL)}`,
      `  title: ${quoteYaml(ctx.values.WP_TITLE)}`,
      `  admin_user: ${quoteYaml(ctx.values.WP_ADMIN_USER)}`,
      `  admin_email: ${quoteYaml(ctx.values.WP_ADMIN_EMAIL)}`,
      `  admin_password: ${quoteYaml(ctx.values.WP_ADMIN_PASSWORD)}`,
      '',
    ].join('\n');
    const install = 'umask 077; config="$(mktemp /tmp/starter-install.XXXXXX)" || exit 1; '
      + 'trap \'rm -f "$config"\' EXIT HUP INT TERM; '
      + 'cat > "$config" || exit 1; WP_CLI_CONFIG_PATH="$config" wp core install --skip-email';
    ctx.compose(['run', '--rm', '--no-deps', '-T', '--entrypoint', 'sh', 'wpcli', '-c', install], { input: config });
    ctx.wp(['theme', 'activate', 'starter-theme']);
    ctx.wp(['plugin', 'activate', 'starter-plugin']);
    console.log('Installed WordPress and activated the starter theme and plugin.');
  } else {
    console.log('WordPress is already installed; existing settings, content and component activation were preserved.');
  }
  qualityInstall(ctx);
  console.log(`Ready: ${ctx.values.WP_URL}\nAdmin: ${ctx.values.WP_URL}/wp-admin/\nCredentials are in your local environment file.`);
}

function phpFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? phpFiles(path) : entry.isFile() && entry.name.endsWith('.php') ? [path] : [];
  });
}

export function verifyStatic() {
  const required = [
    'AGENTS.md', 'README.md', '.env.example', '.gitignore', 'compose.yaml',
    'scripts/create.mjs', 'scripts/create.test.mjs',
    'composer.json', 'composer.lock', 'phpcs.xml.dist', 'docker/quality/Dockerfile',
    'wp-content/themes/starter-theme/style.css', 'wp-content/themes/starter-theme/theme.json',
    'wp-content/themes/starter-theme/templates/index.html',
    'wp-content/plugins/starter-plugin/starter-plugin.php',
    ...skills.map((skill) => `.agents/skills/${skill}/SKILL.md`),
  ];
  for (const path of required) {
    if (!existsSync(resolve(root, path))) throw new Error(`Required file missing: ${path}`);
  }
  for (const path of ['package.json', 'composer.json', 'composer.lock', 'wp-content/themes/starter-theme/theme.json']) {
    JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  }
  const theme = JSON.parse(readFileSync(resolve(root, 'wp-content/themes/starter-theme/theme.json'), 'utf8'));
  if (theme.version !== 3) throw new Error('theme.json must use schema version 3.');
  const style = readFileSync(resolve(root, 'wp-content/themes/starter-theme/style.css'), 'utf8');
  if (!/Theme Name:\s*\S/.test(style) || !/Text Domain:\s*starter-theme/.test(style)) throw new Error('Invalid theme header.');
  const plugin = readFileSync(resolve(root, 'wp-content/plugins/starter-plugin/starter-plugin.php'), 'utf8');
  if (!/Plugin Name:\s*\S/.test(plugin) || !/defined\( 'ABSPATH' \)/.test(plugin)) throw new Error('Invalid plugin header or missing direct-access guard.');
  for (const skill of skills) {
    const source = readFileSync(resolve(root, `.agents/skills/${skill}/SKILL.md`), 'utf8');
    const frontmatter = /^---\r?\n([\s\S]+?)\r?\n---\r?\n/.exec(source)?.[1];
    if (!frontmatter || !frontmatter.includes(`name: ${skill}`) || !/^description: .+/m.test(frontmatter)) {
      throw new Error(`Invalid skill frontmatter: ${skill}`);
    }
    if (/\bTODO\b|\[insert|\[TBD\]/i.test(source)) throw new Error(`Unfinished skill: ${skill}`);
  }
  // Ensure the committed example contains no real passwords.
  const example = parseEnvironment(readFileSync(resolve(root, '.env.example'), 'utf8'));
  for (const key of ['DB_PASSWORD', 'DB_ROOT_PASSWORD', 'WP_ADMIN_PASSWORD']) {
    if (example[key]) throw new Error(`.env.example must leave ${key} blank.`);
  }
  console.log('PASS: required files, JSON, component headers, skill metadata and environment example.');
}

async function verify(ctx) {
  verifyStatic();
  ctx.compose(['config', '--quiet']);
  if (!existsSync(resolve(root, 'vendor/bin/phpcs'))) throw new Error('Quality dependencies missing. Run npm run quality:install.');
  const quality = (args) => ctx.compose(['run', '--rm', '--no-deps', '-T', 'quality', ...args]);
  quality(['composer', 'validate', '--strict']);
  quality(['php', 'vendor/bin/phpcs', '--config-set', 'installed_paths', '/workspace/vendor/wp-coding-standards/wpcs,/workspace/vendor/phpcsstandards/phpcsutils,/workspace/vendor/phpcsstandards/phpcsextra']);
  const files = phpFiles(resolve(root, 'wp-content/themes/starter-theme')).concat(phpFiles(resolve(root, 'wp-content/plugins/starter-plugin')));
  for (const file of files) quality(['php', '-l', `/workspace/${relative(root, file).split(sep).join('/')}`]);
  quality(['php', 'vendor/bin/phpcs', '--standard=phpcs.xml.dist']);
  ctx.wp(['core', 'is-installed']);
  const version = ctx.wp(['core', 'version'], { capture: true }).stdout.trim();
  if (version !== expectedWordPress) throw new Error(`Core volume contains WordPress ${version}; image expects ${expectedWordPress}. See README upgrade procedure.`);
  ctx.wp(['core', 'verify-checksums', `--version=${expectedWordPress}`, '--exclude=wp-config-docker.php']);
  ctx.wp(['plugin', 'is-active', 'starter-plugin']);
  const stylesheet = ctx.wp(['option', 'get', 'stylesheet'], { capture: true }).stdout.trim();
  if (stylesheet !== 'starter-theme') throw new Error('starter-theme is not active.');
  ctx.wp(['eval', 'if ( ! wp_is_block_theme() ) { WP_CLI::error( "The active theme is not a block theme." ); }']);
  const response = await fetch(ctx.values.WP_URL, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  const body = await response.text();
  if (response.status !== 200 || !/<main\b/i.test(body)) throw new Error(`HTTP smoke check failed (status ${response.status}).`);
  console.log('PASS: Compose, Composer lock, PHP syntax, WPCS, core version/checksums, theme, plugin and HTTP smoke check.');
}

export async function reset(ctx, confirm) {
  const project = ctx.values.COMPOSE_PROJECT_NAME;
  const phrase = `reset ${project}`;
  console.log(`This deletes the database and WordPress runtime volumes for project "${project}", including uploads. Source files and .env remain.`);
  if (await confirm(`Type "${phrase}" to continue: `) !== phrase) {
    throw new Error('Reset cancelled; no Docker commands were run.');
  }
  ctx.compose(['down', '--volumes', '--remove-orphans']);
  console.log('Project runtime deleted. Run npm run setup to create a fresh installation.');
}

export async function main(args = process.argv.slice(2)) {
  const options = [...args];
  let envPath = resolve(root, '.env');
  // Avoid Node's own --env-file flag, which some Node 20 releases scan after argv[1].
  const envFlag = options.indexOf('--env');
  if (envFlag !== -1) {
    if (!options[envFlag + 1]) throw new Error('--env requires a path.');
    envPath = resolve(root, options[envFlag + 1]);
    options.splice(envFlag, 2);
    if (dirname(envPath) !== root || !/^\.env(?:\.[a-zA-Z0-9_-]+)?$/.test(envPath.slice(root.length + 1)) || envPath.endsWith('.example')) {
      throw new Error('Use an ignored .env or .env.NAME file in the starter root.');
    }
  }
  const [command = 'help', ...rest] = options;
  if (command === 'help') {
    console.log('Usage: node scripts/dev.mjs <env-init|setup|start|stop|restart|logs|reset|verify|verify-static|quality-install|wp> [--env .env.NAME]\nWP-CLI: npm run wp -- core version\nNo npm install is required.');
    return;
  }
  if (command !== 'wp' && rest.length) throw new Error(`Unexpected arguments for ${command}.`);
  if (command === 'env-init') {
    initializeEnvironment(envPath, resolve(root, '.env.example'));
    console.log('Local environment ready. Edit it before setup if you need a different port, URL or project name.');
    return;
  }
  if (command === 'verify-static') return verifyStatic();
  if (command === 'setup') return setup(envPath);
  if (!['start', 'stop', 'restart', 'logs', 'reset', 'verify', 'quality-install', 'wp'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const ctx = context(envPath);
  switch (command) {
    case 'start': start(ctx); break;
    case 'stop': ctx.compose(['down', '--remove-orphans']); break;
    case 'restart': ctx.compose(['stop', 'wordpress', 'db']); start(ctx); break;
    case 'logs': ctx.compose(['logs', '--follow', '--tail', '100', 'db', 'wordpress']); break;
    case 'quality-install': qualityInstall(ctx); break;
    case 'wp': if (!rest.length) throw new Error('Supply a WP-CLI command, for example: npm run wp -- core version'); ctx.wp(rest); break;
    case 'verify': await verify(ctx); break;
    case 'reset': {
      if (!process.stdin.isTTY) throw new Error('Reset requires an interactive terminal and typed confirmation.');
      const terminal = createInterface({ input: process.stdin, output: process.stdout });
      try { await reset(ctx, (prompt) => terminal.question(prompt)); } finally { terminal.close(); }
      break;
    }
  }
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
}
