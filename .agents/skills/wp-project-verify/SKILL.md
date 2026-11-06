---
name: wp-project-verify
description: Verify starter structure, scripts, coding standards and a running local WordPress project, reporting passes and unavailable checks with explicit evidence.
---

# Verify a WordPress starter

Own verification and its report. Read root `AGENTS.md`, README verification guidance,
selected environment and relevant recent changes. Do not silently rewrite source,
reset data, update dependencies or create commits to obtain a passing result.

1. Run `npm run verify:static` and `npm test` for metadata/JSON and meaningful Node
   workflow checks. These do not require a Docker daemon or `.env`.
2. With local configuration present, run `docker compose --env-file .env config
   --quiet`; never print interpolated configuration containing credentials.
3. With the selected local project running and locked tooling installed, run
   `npm run verify`. It checks Composer consistency, PHP syntax, WPCS, core version
   and checksums, active components, block-theme detection and HTTP output.
4. For lifecycle testing, create a separate `.env.NAME`, use a unique project name
   and free port, and pass `--env .env.NAME` to each npm operation. Verify setup
   reruns, a database sentinel and an uploaded file across stop/start, and reset
   cancellation. Delete test volumes only after the required typed confirmation.
5. Review ignore behavior in a disposable Git repository with `git check-ignore`.
   Confirm that secrets, core, uploads, dumps, dependencies and generated artifacts
   are ignored while custom source and Composer locks remain trackable.
6. If a browser is available, inspect homepage, post, page, mobile navigation,
   keyboard focus and editor rendering. Do not claim these from HTTP checks alone.

Report exact checks and results, environment limitations, remaining risks and any
fixes made. A missing daemon, missing tooling or failed command is an unverified or
failed check, never a pass. Network-dependent checksum validation needs connectivity.

Rerun behavior: normal verification preserves content and configuration. Use
isolated fixtures for destructive scenarios; never bypass reset confirmation or
prune unrelated Docker resources.
