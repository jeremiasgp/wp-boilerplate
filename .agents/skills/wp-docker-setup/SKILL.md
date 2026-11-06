---
name: wp-docker-setup
description: Create or maintain the local WordPress, MariaDB and WP-CLI Compose stack, persistent volumes and cross-platform lifecycle commands.
---

# Maintain the local Docker stack

Own `compose.yaml`, `docker/`, and the Docker lifecycle portions of `scripts/`.
Read root `AGENTS.md`, the README lifecycle/upgrade instructions and the current
image pins before changing services.

- Use official WordPress and MariaDB images with explicit version and multiarch
  index digest pins. Verify actual registry tags and compatibility before upgrades.
  Match the application's PHP version in WP-CLI and the quality image.
- Keep database and WordPress data in project-scoped named volumes. Bind only
  custom theme/plugin directories, read-only inside containers. Do not bind an
  entire backup or mount an empty host `wp-content` over Docker-managed data.
- The Apache image uses UID/GID 33. The Alpine CLI image has a different default;
  retain the explicit `33:33` CLI user and writable `/tmp` home/cache paths.
- Gate startup on database health and WordPress readiness. Avoid fixed sleeps as
  readiness checks. WP-CLI `run --no-deps` assumes runtime services are started.
- Publish HTTP on loopback only. Do not publish the database port. Forward only
  needed credentials to each service and never print resolved Compose secrets.
- Preserve data on stop/restart. Reset must show the selected project, explain
  volume loss and require exact typed confirmation. Never bypass confirmation.
- Core files already exist in a persistent volume: changing the image does not
  automatically replace them. Follow the README backup/upgrade procedure.

Validate with `docker compose --env-file .env config --quiet`, `npm test`, setup
and `npm run verify`. For persistence/reset validation, use a separate `.env.NAME`
  project and port (`--env .env.NAME`); never destroy the developer installation. Report whether actual
container startup and CLI/database connectivity were exercised.

Rerun behavior: preserve project names, volumes and credentials; apply scoped
configuration changes. Do not prune unrelated containers, networks or volumes.
