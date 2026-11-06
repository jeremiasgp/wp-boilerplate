# Generador de proyectos WordPress

Este repositorio genera el punto de partida de proyectos WordPress independientes
en otros directorios. Incluye Docker, un tema de bloques, un plugin mínimo,
comandos Node.js sin dependencias npm e instrucciones para trabajar con IA.
Los cambios de cada sitio se realizan en su propio directorio.

## Crear un proyecto: paso a paso

1. Instalá Node.js 20.19 o superior y Docker con Compose v2.20 o superior.
   Iniciá Docker con contenedores Linux. Es la preparación necesaria de la máquina;
   la herramienta automatiza la instalación del proyecto. La primera ejecución
   requiere Internet para descargar imágenes y dependencias.
2. Abrí una terminal en este repositorio y ejecutá, por ejemplo:

   ```powershell
   npm run create -- "C:\Dev\projects\mi-sitio"
   ```

   En macOS/Linux, por ejemplo: `npm run create -- ../mi-sitio`.
   Las rutas relativas se resuelven desde el directorio de ejecución del comando
   (con npm, normalmente la raíz del paquete). Usá una ruta absoluta para evitar dudas.
   El destino debe estar fuera del boilerplate y no debe existir, aunque esté vacío.
3. El comando copia solamente la base reutilizable, genera credenciales e identidad
   Docker propias, comprueba los archivos y scripts, instala WordPress y las
   herramientas de calidad y verifica el sitio. No hace falta `npm install`,
   instalar WordPress desde el navegador ni copiar archivos manualmente.
4. Abrí `http://localhost:8080` o `http://localhost:8080/wp-admin/`.
   Las credenciales están en el `.env` privado del nuevo proyecto; no se imprimen.
5. Abrí la carpeta generada en tu editor. Para trabajar con IA, pedile que lea
   `AGENTS.md` y la skill pertinente de `.agents/skills`. Modificá presentación en
   `wp-content/themes/starter-theme` y funcionalidad en
   `wp-content/plugins/starter-plugin`.
6. Desde esa carpeta, usá `npm run stop` para detener conservando datos y
   `npm run start` para volver a trabajar. Ejecutá `npm run verify:static`,
   `npm test` y `npm run verify` para revisar cambios (el último requiere el sitio
   iniciado). `npm run reset` elimina datos locales y exige confirmación escrita.

Para otro sitio simultáneo, elegí un puerto libre distinto:

```powershell
npm run create -- "C:\Dev\projects\otro-sitio" --port 8081
```

Cada proyecto tiene archivos, contraseñas, identidad y volúmenes Docker propios.
No se copian `.env` del generador, historial Git, dependencias ni cachés, ni se
inicializa Git. Los proyectos generados funcionan sin depender de la carpeta
original y no reciben automáticamente sus futuras actualizaciones.

Para generar archivos sin iniciar Docker, o personalizar la configuración antes
de instalar WordPress:

```powershell
npm run create -- "C:\Dev\projects\mi-sitio" --skip-setup
cd C:\Dev\projects\mi-sitio
# Editá .env si necesitás cambiar título, usuario, email o puerto/URL.
npm run setup
npm run verify
```

`--skip-setup` genera la configuración y ejecuta las comprobaciones sin Docker.
Si la instalación falla, conserva el proyecto: corregí el problema y ejecutá
`npm run setup` y `npm run verify` desde el destino. No repitas `create` sobre
esa carpeta. Si un puerto está ocupado antes de instalar, cambiá `HTTP_PORT` y
`WP_URL` juntos en `.env`. Repetir setup conserva una instalación existente.

En PowerShell, si la política de ejecución bloquea `npm.ps1`, usá `npm.cmd`.
Para consultar las opciones: `npm run create -- --help`.
No ejecutes setup en la carpeta de la herramienta para crear un sitio nuevo:
usá `create` y luego trabajá en la carpeta generada.

## Referencia técnica del proyecto generado

## Requirements and versions

- Node.js 20.19+ and npm on PATH; use a currently maintained Node.js LTS release.
- Docker Engine with Compose v2.20+ and Linux containers. On Windows/macOS, start
  Docker Desktop and allow access to the project directory. On Linux, ensure the
  current user can run Docker without a script adding `sudo`.
- Network access for initial image/dependency downloads and WordPress checksums.
- No host PHP, Composer, Python, Make, Bash, npm packages or frontend build step.
  **Do not run npm install:** package scripts use only Node built-ins.

| Component | Version |
| --- | --- |
| WordPress / Apache / PHP | `wordpress:7.1.4-php8.3-apache` |
| Database | `mariadb:11.4.13-noble` |
| WP-CLI | `wordpress:cli-2.12.0-php8.3` |
| Composer (quality image only) | `composer:2.11.1` |
| WordPress Coding Standards | `wp-coding-standards/wpcs:3.4.1` |

All Docker references include immutable multiarchitecture index digests in
`compose.yaml` and `docker/quality/Dockerfile`. Composer development dependencies
are pinned transitively in `composer.lock`. Official image manifests are maintained
in [docker-library/official-images](https://github.com/docker-library/official-images/tree/master/library).

## Quick start

Open a terminal in the generated project directory, then:

```text
npm run setup
npm run verify
```

Setup creates an ignored `.env` with random passwords and a unique Compose project
name, starts healthy database/WordPress services, installs WordPress, activates the
custom components on first installation and installs locked quality tooling.
Open `http://localhost:8080`; administration is at `/wp-admin/`. The local admin
credentials are in `.env`. No real email is sent by setup.

Repeat setup preserves credentials, installed content, site options and component
activation choices. It does not migrate an existing site or import a database. If
interrupted after installation but before component activation, activate explicitly:

```text
npm run wp -- theme activate starter-theme
npm run wp -- plugin activate starter-plugin
```

For custom settings **before installation**, generate configuration first:

```text
npm run env:init
```

Edit `.env`, then run setup. If port 8080 is in use, change both `HTTP_PORT` and
`WP_URL` to a free matching port. Each clone has its own project name; each running
clone also needs its own port. Never reuse an existing project's name inadvertently.

The env parser supports `KEY=value`, `KEY="value with spaces"`, single-quoted values,
blank lines and whole-line comments. It intentionally rejects duplicate keys,
interpolation, shell expressions and inline comments. Generated secrets are hex;
custom passwords need at least 20 characters. Existing `.env` files are validated
without rewriting them, including blank passwords. If you copy `.env.example`
manually, fill its project name and all passwords yourself; `env:init` is easier.
The selected file takes precedence over inherited shell values for its keys.

## Commands: Windows, macOS and Linux

All commands run from the starter root and use the same syntax on every platform.
`node scripts/dev.mjs COMMAND` is the direct equivalent if npm is unavailable.
In PowerShell installations that block `npm.ps1`, use `npm.cmd`.

| Operation | Exact command | Result |
| --- | --- | --- |
| Generate local env only | `npm run env:init` | Create configuration once; no Docker required |
| Setup | `npm run setup` | Initialize local stack and locked quality tools |
| Start | `npm run start` | Start runtime and wait for health |
| Stop | `npm run stop` | Remove project containers/network, preserve volumes |
| Restart | `npm run restart` | Stop/start runtime and apply configuration |
| Logs | `npm run logs` | Follow the last 100 lines; Ctrl+C exits |
| Reset | `npm run reset` | Delete project runtime volumes after typed confirmation |
| Verify | `npm run verify` | Check custom PHP, core, active components and HTTP |
| Static checks | `npm run verify:static` | Check structure, JSON and metadata without Docker |
| Script tests | `npm test` | Test initialization, forwarding and reset safeguards |
| Install quality tools | `npm run quality:install` | Build quality image and install from lock |
| WP-CLI | `npm run wp -- core version` | Run an arbitrary CLI command against this project |

WP-CLI requires the database/WordPress runtime to be started for commands that load
WordPress. CLI and Apache share volumes and configuration. The CLI runs as UID/GID
33 to match Apache, despite the CLI image's Alpine default UID being different.
Core installation feeds a private temporary WP-CLI configuration through stdin.
The file is removed on exit; the password is never passed as an argument or prompt.

Reset displays the selected Compose project and requires exactly
`reset PROJECT_NAME`. It refuses noninteractive execution and provides no bypass
flag. It deletes database records, installed runtime plugins/themes, uploads and
core runtime files. It preserves custom source, `.env` and quality dependencies.
Stop/restart do not delete volumes. No command prunes unrelated Docker resources.

To use an isolated environment, generate an ignored alternate env file:

```text
npm run env:init -- --env .env.verify
```

Give `.env.verify` a free `HTTP_PORT` and matching `WP_URL`, then use the same flag
for every operation, for example:

```text
npm run setup -- --env .env.verify
npm run wp -- --env .env.verify core version
npm run verify -- --env .env.verify
npm run reset -- --env .env.verify
```

## Source and runtime boundaries

```text
.agents/skills/                 Six reusable repository-scoped AI skills
AGENTS.md                      Architecture, security and coding conventions
compose.yaml                   Official runtime images and persistent volumes
docker/quality/Dockerfile       Composer + application PHP for development tools
scripts/                       Node commands and workflow tests
wp-content/themes/starter-theme/  Custom block theme
wp-content/plugins/starter-plugin/ Custom plugin
```

The theme owns templates, typography, spacing, colors and presentation assets. It
uses core blocks, a system font stack, `theme.json` tokens, native CSS layers,
logical properties and fluid sizing. It has index, page and single templates.
The plugin is a valid, guarded bootstrap with a namespace/version; it intentionally
adds no example business logic. Put content models and persistent behavior there.

Custom source is mounted read-only in containers. Edit files on the host; changes
are immediately visible. Core, generated `wp-config.php`, uploads and third-party
runtime packages live only in the WordPress named volume. Database files live in
a separate named volume. Source and dependency locks belong in version control;
credentials, dumps, uploads, runtime files and dependencies do not.

`.gitignore` allowlists the two custom directories. If intentionally adding or
renaming a custom component, update that allowlist, Compose mounts, text domains,
PHP names, PHPCS configuration and verification paths together. Do not copy the
unrelated source or runtime data into a generated project.

The Site Editor stores customizations in the database, which can override file
templates. Export intended reusable changes into theme files before sharing them.
The stack does not include a mail catcher or SMTP; configure mail per project.

## Verification and quality

`verify:static` checks required files, parseable JSON, essential theme/plugin
metadata, direct-access guard, skill frontmatter and the secret-free env example.
`npm test` exercises credential generation/preservation, invalid config rejection,
argument forwarding, project scoping, reset confirmation, setup rerun behavior,
independent project generation, destination protection and installation recovery.

`verify` additionally checks Compose validity, Composer manifest/lock consistency,
PHP syntax, WPCS, installed core version/checksums, plugin activation, theme
activation, block-theme detection and a successful HTTP homepage with a main
landmark. It expects an installed running stack and installed quality tools; it
does not start or reset runtime data. Required failures exit nonzero. Core checksums
need network access. A deliberately deactivated starter component will fail verify.

For an integration review, use an isolated `.env.verify` project: set up twice,
create a temporary WordPress option and an uploads file, stop/start and confirm both
survive. Test a wrong reset phrase and confirm data remains, then type the exact
phrase to remove only the test project's runtime. Verify PHP/HTTP results separately
from browser checks of desktop/mobile layouts, keyboard access, post/page content
and the Site Editor. Native macOS/Linux behavior requires tests on those systems.

The six skills split initialization, Docker, theme, plugin, quality tooling and
verification responsibilities. Each `SKILL.md` provides prerequisites, scope,
rerun behavior and checks. Read the relevant one along with root `AGENTS.md`.

## Intentional dependency and core upgrades

Setup uses `composer install`, never `update`. To deliberately update development
dependencies after editing constraints, run:

```text
docker compose --env-file .env run --rm --no-deps -T quality composer update --no-interaction
npm run verify
```

Review the manifest/lock diff. Composer plugin execution is disabled, including the
transitive PHPCS installer; verification registers standards inside ignored `vendor/`.
Package scripts need no npm lock because there are no npm dependencies.

Persistent volumes retain core files when an image changes. For a core upgrade:

1. Back up the database and uploads outside source control. For disposable local
   data, the confirmed reset command followed by setup recreates core from the image.
2. Resolve reviewed, compatible image tags and their multiarchitecture digests.
   Update Compose, the quality Dockerfile, declared WP/PHP minimums, theme schema,
   documentation and `expectedWordPress` in `scripts/dev.mjs` together as needed.
3. For an installation whose data must survive, start the new runtime image and
   deliberately replace the volume's core with the reviewed version using WP-CLI:

   ```text
   npm run wp -- core download --version=REVIEWED_VERSION --force --skip-content
   npm run wp -- core update-db
   npm run quality:install
   npm run verify
   ```

   This writes managed core in the Docker volume, never repository core. Verify
   checksums afterward. Backups are essential; downgrade may require a DB restore.

Changing an installed site's URL is a separate migration: back up the database,
update `home`/`siteurl` or run an appropriate serialized-data-aware WP-CLI
search/replace, then adjust `.env`. Changing a database password in `.env` does not
rotate the credentials already stored in MariaDB; rotate deliberately or reset
disposable data. Automatic core updates are disabled to keep image/version control
authoritative. Reviewed maintenance remains the developer's responsibility.

## Local scope

Only loopback HTTP is published; the database is private to the Compose network.
Debug logging is enabled inside the runtime volume, browser error display and the
dashboard file editor are disabled. Never share `.env` or publish this development
stack as-is. A production deployment needs environment-specific HTTPS, secret
management, monitoring, backups, restores and a reviewed deployment process.
