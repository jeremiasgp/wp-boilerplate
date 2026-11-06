import { spawnSync } from 'node:child_process';
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initializeEnvironment } from './environment.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Explicit source manifest: never copy local runtime, credentials or Git history.
const sources = [
  '.dockerignore', '.editorconfig', '.env.example', '.gitattributes', '.gitignore',
  'AGENTS.md', 'README.md', 'compose.yaml', 'composer.json', 'composer.lock',
  'package.json', 'phpcs.xml.dist', '.agents/skills', 'docker', 'scripts',
  'wp-content/themes/starter-theme', 'wp-content/plugins/starter-plugin',
];

function collect(path, files = []) {
  if (path !== '.env.example' && /(^|\/)(?:\.env(?:\..*)?|node_modules|vendor|\.cache|\.git|auth\.json|uploads|backups)(\/|$)/.test(path)) return files;
  const stat = lstatSync(resolve(root, path));
  if (stat.isSymbolicLink()) throw new Error(`Source links are unsupported: ${path}`);
  if (stat.isDirectory()) {
    for (const name of readdirSync(resolve(root, path))) collect(`${path}/${name}`, files);
  } else if (stat.isFile()) {
    // Ignore accidental generated files even inside an allowed source directory.
    if (!/\.(?:log|tmp|sql|gz|key|pem)$/i.test(path)) files.push(path);
  } else throw new Error(`Unsupported source file: ${path}`);
  return files;
}

function inspect(path) {
  try { return lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function checkDestination(target, files) {
  const targetStat = inspect(target);
  if (targetStat && (targetStat.isSymbolicLink() || !targetStat.isDirectory())) {
    throw new Error('Destination must be a directory, not a file or symbolic link.');
  }
  const conflicts = new Set();
  // Inspect every path before writing anything, including the private configuration.
  for (const file of [...files, '.env']) {
    const path = resolve(target, file);
    let parent = dirname(path);
    const parents = [];
    while (parent !== target) {
      parents.unshift(parent);
      parent = dirname(parent);
    }
    let blocked = false;
    for (const parent of parents) {
      const stat = inspect(parent);
      if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) {
        conflicts.add(relative(target, parent));
        blocked = true;
        break;
      }
    }
    if (!blocked && inspect(path)) conflicts.add(file);
  }
  if (conflicts.size) {
    throw new Error(`Destination conflicts (nothing was copied):\n${[...conflicts].map((path) => `- ${path}`).join('\n')}\nMove or rename conflicting files, or choose another directory. Existing files are never overwritten.`);
  }
}

export function createProject(destination, { port = '8080', skipSetup = false, run } = {}) {
  if (!destination) throw new Error('Usage: npm run create -- <destination> [--port 8081] [--skip-setup]');
  if (!/^\d+$/.test(String(port)) || Number(port) < 1024 || Number(port) > 65535) throw new Error('--port must be an integer between 1024 and 65535.');
  const target = resolve(destination);
  const targetStat = inspect(target);
  if (targetStat && (targetStat.isSymbolicLink() || !targetStat.isDirectory())) {
    throw new Error('Destination must be a directory, not a file or symbolic link.');
  }
  // Resolve ancestor links before checking containment (including Windows junctions).
  let ancestor = dirname(target);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const physical = resolve(realpathSync(ancestor), relative(ancestor, target));
  const fromRoot = relative(realpathSync(root), physical);
  if (!fromRoot || (!fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && fromRoot !== '..' && !isAbsolute(fromRoot))) {
    throw new Error('Destination must be outside the boilerplate directory.');
  }
  const files = sources.flatMap((path) => collect(path));
  checkDestination(target, files);
  mkdirSync(target, { recursive: true });
  for (const path of files) {
    mkdirSync(dirname(resolve(target, path)), { recursive: true });
    copyFileSync(resolve(root, path), resolve(target, path), constants.COPYFILE_EXCL);
  }
  const example = resolve(target, '.env.example');
  // Configure only the new project's private env; keep the reusable example intact.
  initializeEnvironment(resolve(target, '.env'), example);
  const envPath = resolve(target, '.env');
  writeFileSync(envPath, readFileSync(envPath, 'utf8')
    .replace(/^HTTP_PORT=.*$/m, `HTTP_PORT=${port}`)
    .replace(/^WP_URL=.*$/m, `WP_URL=http://localhost:${port}`), { mode: 0o600 });
  const execute = run ?? ((args) => {
    const result = spawnSync(process.execPath, args, { cwd: target, stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) throw new Error(`Command failed: node ${args.join(' ')}. ${result.error?.message ?? ''}`);
  });
  console.log(`Project created: ${target}`);
  try {
    execute(['scripts/dev.mjs', 'verify-static']);
    execute(['--test', 'scripts/workflow.test.mjs', 'scripts/create.test.mjs']);
    if (!skipSetup) {
      execute(['scripts/dev.mjs', 'setup']);
      execute(['scripts/dev.mjs', 'verify']);
    }
  } catch (error) {
    throw new Error(`${error.message}\nProject files were retained at ${target}. From that directory, fix the cause and run npm run setup followed by npm run verify. Do not rerun create on this directory.`);
  }
  console.log(skipSetup
    ? 'Files and independent credentials are ready. From the project directory, run npm run setup and npm run verify.'
    : `Ready: http://localhost:${port} (admin: /wp-admin/). Credentials: local .env.`);
  return target;
}

export function main(args = process.argv.slice(2)) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: npm run create -- <destination> [--port 8081] [--skip-setup]\nRelative destinations use the current working directory. Existing directories and Git repositories are supported; conflicting files are never overwritten.');
    return;
  }
  const [destination, ...flags] = args;
  const options = {};
  while (flags.length) {
    const flag = flags.shift();
    if (flag === '--skip-setup' && !options.skipSetup) options.skipSetup = true;
    else if (flag === '--port' && options.port === undefined && flags.length) options.port = flags.shift();
    else throw new Error(`Unknown, duplicate or incomplete option: ${flag}`);
  }
  if (destination?.startsWith('-')) throw new Error('Provide a destination directory before options.');
  return createProject(destination, options);
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  try { main(); } catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
}
