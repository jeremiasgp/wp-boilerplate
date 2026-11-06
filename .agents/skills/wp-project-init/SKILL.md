---
name: wp-project-init
description: Initialize or adapt this reusable WordPress starter for a new project, including generic conventions, local configuration and command documentation.
---

# Initialize a WordPress project

Own repository layout, generic naming, environment onboarding and developer
documentation. Docker service internals, theme/plugin implementation and quality
rules belong to their respective skills.

Read root `AGENTS.md`, `README.md`, `.env.example` and `package.json` first. Treat
the directory containing those files as the repository root; do not assume a
machine-specific absolute path. Inspect existing custom code before scaffolding.

- Keep WordPress core and runtime data outside source control. Do not copy a site
  backup, client branding, credentials or third-party dependencies into the starter.
- Use `npm run env:init` to create local configuration. Preserve existing `.env`
  files and secrets. Each simultaneous clone needs a distinct project name and port.
- Use `npm run setup` only for the intended local project. Rerunning setup must
  preserve installed content, configuration and existing component activation.
- If renaming custom components is requested, update slugs, text domains, PHP
  prefixes/namespaces, mount paths, verification paths and `.gitignore` allowlists
  together. Do not rename an existing project as an incidental cleanup.
- Keep scripts dependent only on Node built-ins. Document exact npm commands;
  do not introduce shell-specific onboarding or silently initialize Git.

Finish by running `npm run verify:static` and `npm test`. When Docker is available,
run setup followed by `npm run verify`. Report unavailable checks. Changes to an
existing environment's URL require a deliberate database URL migration; setup
does not overwrite installed options.

Rerun behavior: inspect and fill missing scaffolding; never overwrite existing
custom code or regenerate credentials. Never reset data as part of initialization.
