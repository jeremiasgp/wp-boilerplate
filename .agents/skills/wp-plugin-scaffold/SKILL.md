---
name: wp-plugin-scaffold
description: Scaffold or extend the minimal custom WordPress plugin for behavior that must survive a theme change, using WordPress APIs and security conventions.
---

# Scaffold a minimal plugin

Own `wp-content/plugins/starter-plugin/`. Read root `AGENTS.md` and the current
plugin before editing. Presentation belongs to the theme. Do not add sample content,
database tables, options, endpoints or dependencies without a requested feature.

- Keep a valid WordPress plugin header, matching text domain, declared minimum
  versions and an `ABSPATH` direct-access guard. Use namespace `Starter_Plugin`.
- Register behavior on appropriate WordPress hooks. Keep activation/deactivation
  work separate from normal requests; flush rewrite rules only when necessary.
- Prefer core APIs for metadata, settings, HTTP and database access. Validate and
  sanitize input by type, unslash request data where appropriate and escape output
  according to context. Use prepared statements for variable custom SQL.
- Protect privileged changes with capability checks and nonces. REST endpoints
  require permission callbacks; nonces alone do not establish authorization.
- Translate user-facing strings. Enqueue assets only where needed. Never store or
  log secrets, credentials or whole request bodies as a default diagnostic measure.
- Uninstall must not remove user content or shared data without an explicit data
  ownership policy. Deactivation should not delete persistent data.

Run static verification, PHP lint and WPCS through `npm run verify`. If behavior is
added, test its observable result and relevant authorization/failure paths. Test
activation/deactivation only on the intended local project; report runtime gaps.

Rerun behavior: inspect and extend the existing bootstrap. Preserve feature code,
namespace and stored data; do not recreate the plugin or reactivate it incidentally.
