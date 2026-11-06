# WordPress starter conventions

This directory is the repository root. Keep the starter generic. Do not import a
client backup, credentials, uploads, database dumps, third-party plugin trees or
WordPress core. Do not commit or push unless explicitly authorized.

## Architecture and ownership

- Docker owns WordPress core, runtime configuration and MariaDB. Keep the official
  version-and-digest pins explicit. Do not edit core or install core into this tree.
- Track custom code only in `wp-content/themes/starter-theme` and
  `wp-content/plugins/starter-plugin`. Runtime files and uploads live in named volumes.
- Theme: presentation, templates, patterns, design tokens and presentation assets.
  Put tokens in `theme.json`, layouts in block templates and additional styling in
  native CSS. No framework, bundler, external fonts or JavaScript unless required.
- Plugin: content models, metadata, integrations, permissions, APIs and behavior
  that must survive changing themes. Do not put business logic in the theme.
- The minimal plugin intentionally adds no sample content, endpoints or database
  tables. Add features only when requested. Avoid dependencies without a concrete need.
- The Node.js wrapper uses built-in modules, argument arrays and `shell: false`.
  Keep commands compatible with Windows, macOS and Linux; do not add Bash or Make
  as requirements. Keep setup rerunnable without resetting existing configuration.

## Coding and security

- Follow WordPress PHP Coding Standards: tabs, WordPress spacing, PHPDoc, prefixed
  procedural functions (`starter_theme_`) and plugin namespace `Starter_Plugin`.
  Preserve matching slug/text domains and translate user-facing PHP strings.
- Guard executable PHP entry files against direct access with `ABSPATH` checks.
  Omit closing PHP tags in PHP-only files. Use WordPress hooks and APIs.
- Validate input before use and sanitize it according to its type. Unslash request
  data when appropriate. Escape at output with the context-specific WordPress API.
- Check capabilities and nonces for privileged state changes. A nonce is not an
  authorization check. REST endpoints need explicit permission callbacks.
- Prefer WordPress data APIs; use `$wpdb->prepare()` for variable SQL. Do not store
  secrets in options, source, logs or command arguments. Do not log whole env files.
- Use platform APIs for passwords, authentication, HTTP requests and filesystem work.
  Do not hand-roll crypto or accept arbitrary remote URLs without validation.
- Enqueue assets through WordPress. Preserve semantic landmarks, visible focus,
  keyboard access, contrast, responsive layouts and reduced-motion preferences.
- Never expose the database host port by default. This Compose stack is for local
  development; a production rollout needs its own TLS, secrets, backups and hardening.

## Working and verification

- See `README.md` for exact operations. `npm run setup` creates `.env` only when
  missing, installs core only when not installed and preserves existing choices.
- Never overwrite a nonempty custom component or silently rename its namespace.
  Extend existing files with scoped changes; report naming collisions.
- Read the relevant `.agents/skills/*/SKILL.md` for the requested operation. Each
  skill owns its domain; do not use a scaffolding request to reset runtime data.
- Run `npm run verify:static`, `npm test` and, when Docker is running, `npm run verify`.
  Report checks that could not run separately from successful checks. Visual and
  editor checks require an actual browser; do not claim them from PHP lint results.
- Keep `composer.lock` committed. Install locked quality dependencies with Composer
  inside Docker. Update pins and locks deliberately, never as a setup side effect.
- All destructive resets require the exact typed project confirmation. Never bypass
  it, delete volumes of another project, or reset a developer installation to test.
- Site Editor changes are stored in the database and override file templates. Export
  intended template changes into source before considering them reusable.
