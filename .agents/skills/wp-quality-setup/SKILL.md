---
name: wp-quality-setup
description: Configure or maintain containerized PHP linting, WordPress Coding Standards, locked development dependencies and dependency-free Node validation for this starter.
---

# Maintain quality tooling

Own `composer.json`, `composer.lock`, `phpcs.xml.dist`, formatting conventions and
validation portions of `scripts/`. Coordinate PHP image changes with Docker setup;
do not use quality work to redesign theme/plugin behavior.

- Use WPCS for custom PHP and syntax lint with the application's PHP version.
  Keep rules scoped to source-controlled custom code; do not lint WordPress core,
  uploads or vendored dependencies. Do not suppress a rule just to make checks pass.
- Keep Composer dependencies development-only and commit their resolved lockfile.
  Use `npm run quality:install` for normal installs. Dependency updates must be
  intentional and reviewed; setup must never resolve a new dependency graph.
- PHPCS needs the WPCS, PHPCSUtils and PHPCSExtra installed paths registered.
  The verify command sets these inside ignored `vendor/`; do not add a Composer
  plugin solely for registration or require host PHP/Composer.
- Keep Node scripts dependency-free and use built-in `node:test` for meaningful
  workflow invariants such as credential preservation and destructive confirmation.
- Validate theme JSON and component/skill structure, but do not equate a header
  check with functional WordPress validation or an accessibility audit.
- A required failed or unavailable check must produce a nonzero result. Provide
  `verify:static` for checks that genuinely do not require Docker or an installation.

Run `npm test`, `npm run verify:static`, `npm run quality:install` and
`npm run verify` when runtime services are available. Report dependency installation,
PHP lint, WPCS and runtime results separately when only some checks can execute.

Rerun behavior: install from the existing lockfile, preserve intentional rules and
avoid duplicate configuration. Do not format unrelated files or update locks as a
side effect of ordinary verification.
