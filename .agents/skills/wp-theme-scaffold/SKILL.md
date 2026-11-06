---
name: wp-theme-scaffold
description: Scaffold or extend the minimal custom WordPress block theme with native blocks, theme.json design tokens and semantic CSS.
---

# Scaffold a block theme

Own `wp-content/themes/starter-theme/`. Read root `AGENTS.md`, existing theme files,
Compose mounts and verification expectations before editing. Do not change plugin
behavior, install a page builder or add a frontend framework.

- A valid block theme needs `style.css` with the theme header, versioned
  `theme.json` and `templates/index.html`. Preserve slug/text-domain alignment.
- Use core block serialization for templates and parts. Add single/page templates
  when needed to render full content rather than archive excerpts on detail pages.
- Put design tokens and editor-visible settings in `theme.json`; use logical CSS
  properties, custom properties, native layout, fluid sizing and media queries.
  Keep the frontend and editor styling consistent via WordPress enqueue APIs.
- Keep PHP limited to presentation and assets. Prefix procedural functions with
  `starter_theme_`, guard direct file access and follow WPCS. Translate PHP strings
  with the theme's text domain and escape dynamic output at its final context.
- Preserve semantic landmarks, useful heading levels, keyboard navigation, visible
  focus, readable contrast and reduced-motion behavior. Avoid external font requests.
- Site Editor changes override file templates in the database. Export intentional
  reusable changes into theme files; do not silently clear saved customizations.

Run static verification, PHP lint and WPCS through `npm run verify`. Inspect the
homepage, a single post, a page, navigation and the Site Editor at mobile and desktop
widths when a browser is available. Distinguish structural checks from visual review.

Rerun behavior: extend existing files without replacing custom templates or design
choices. Do not activate a different theme unless that operation is requested.
