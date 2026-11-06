# Implementation verification

## Generator verification — 2026-11-06

- Removed the relocation-only CONTEXT.md and committed the reusable baseline.
- Static verification and all 11 Node tests passed on Windows / Node 20.20.1.
  Generator tests cover independent configuration, paths with spaces, source-only
  copies, destination/option rejection, skip-setup and preservation after failure.
- Executed the actual create CLI with `--skip-setup --port 8097` into a new external
  temporary directory. Its own static checks and all 11 copied tests passed.
  Removed only that temporary source fixture afterward; it created no Docker data.
- The existing runtime initially failed the HTTP main-landmark check because
  containers still mounted the pre-relocation source path. Ran `npm run start`
  to recreate the WordPress container using the current paths, preserving volumes.
- Repeated `npm run verify` successfully: Compose configuration, Composer lock,
  PHP syntax, WPCS, core version/checksums, active theme/plugin and HTTP landmark.
- A fresh generated project's Docker installation and browser/editor behavior
  remain for manual testing. Unit tests simulate setup execution; the external
  CLI check intentionally skips Docker installation. No reset was performed.
- The README now explains creation, ports, prerequisites, independent directories,
  AI instructions, everyday commands and recovery from interrupted installation.

The sections below are historical implementation results.

Validation performed on Windows on 2026-11-05, using Node.js 20.20.1, npm 10.8.2,
Docker Engine 24.0.7, Compose 2.23.3 and Linux containers.

| Check | Result |
| --- | --- |
| Node syntax and dependency-free workflow tests | Passed; eight tests |
| Required source files, JSON, theme/plugin headers and direct-access guard | Passed |
| All six skill frontmatter documents | Valid YAML; parsed with WP-CLI's bundled Spyc parser |
| Compose configuration and service health | Passed |
| Official WordPress, MariaDB, WP-CLI and Composer version/digest pins | Resolved against the registry |
| Fresh WordPress setup and custom component activation | Passed in a separate project on port 8081 |
| Repeat setup | Preserved configuration, activation, database sentinel and uploaded file |
| Stop/start and restart | Database sentinel and uploaded file survived both |
| Logs | Followed both runtime services successfully; stopped with Ctrl+C |
| Reset with wrong phrase | Cancelled without running Docker; fixture data remained |
| Reset with exact typed fixture confirmation | Removed fixture containers, network and both data volumes |
| PHP syntax and WordPress Coding Standards | Passed for theme/plugin PHP |
| Composer manifest/lock and security audit | Passed; no advisories reported for locked packages |
| Core version and checksums | Passed; expected Docker-provided wp-config-docker.php excluded |
| WP-CLI connectivity, active plugin and block theme | Passed |
| Homepage HTTP and main landmark | Passed |
| Desktop rendering | Inspected in headless Chrome at 1280px |
| Mobile layout/navigation | Passed at an emulated 390px viewport, no horizontal overflow; menu opened/closed |
| Single post and page templates | Full content, one main landmark and one main heading checked in Chrome |
| Git ignore behavior | Eleven secret/runtime paths ignored; five source/example/lock paths remained trackable |

The main development installation remains at `http://localhost:8080`. Credentials
are only in ignored `.env`. The disposable integration project's runtime was
removed through the interactive reset command; the main project's data was retained.

## Corrections found during validation

- Replaced proposed WPCS 3.3.0 with patched 3.4.1 because Composer blocked the former
  on an advisory. Composer advisory blocking remains enabled.
- Set the CLI service's entrypoint explicitly to `wp` and its user to `33:33`.
- Replaced WP-CLI's piped password prompt, which echoes input, with stdin-fed private
  temporary configuration. Rotated the initially generated local admin credential.
  Fresh setup with the corrected flow completed without echoing secrets.
- Used wrapper option `--env` for alternate environments to avoid a collision with
  Node 20's own `--env-file` handling. Docker still uses its native `--env-file` flag.

## Verification limits

- Native macOS/Linux host execution was not available; the commands avoid host-shell
  syntax and dependencies, but these platforms still need their own execution checks.
- Authenticated Site Editor workflows, exhaustive keyboard/screen-reader review,
  mail delivery and production deployment were not verified.
- The skill-creator Python helper could not run because its PyYAML dependency was
  absent. The six frontmatter documents were instead parsed with the existing
  Spyc YAML parser, with required names/descriptions and naming checks; repository
  structural validation also passed. Python is not a starter dependency.
- This records implementation-time results, not a guarantee against future image,
  dependency, network or environment changes. Rerun the documented verification
  commands after changes.

At the time of the original validation, no project Git repository, commits or
remote pushes were created. The generator work above adds the user-authorized
local commits; no remote push was performed.
