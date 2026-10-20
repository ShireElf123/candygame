# Jam Shift — Puzzle Club

Jam Shift is an original, mobile-first match-three game with a polished campaign hub, twelve themed worlds, a 120-level progression map, collectible stars, boosters, cascades, and offline-friendly play. It uses its own name, visual identity, candy styling, and game implementation; it does not include Candy Crush artwork or proprietary assets.

## What is in the build

- **Playable campaign:** 8×8 boards, tap/swipe/keyboard controls, match validation, cascades, striped/wrapped/color specials, and eight objective types: score, color collect, jelly, chapter bosses, sugar shells, special-candy activation, gravity-driven jam-jar delivery, and cascade-chain challenges. Levels 12, 32, 52, 72, and 92 ask players to build 2- or 3-wave chains; levels 15, 35, 55, 75, and 95 pair activation targets with existing goals; levels 25, 45, 64, and 85 add ingredient-drop goals. New worlds 11–12 extend the campaign through level 120, with chapter finales at 110 and 120. Levels 111–120 use a four-color “Moon Mix” palette to create a distinct, cascade-friendly puzzle rhythm; refills and dead-board recovery both preserve that palette.
- **Player portal:** campaign overview, twelve original world scenes, winding ten-level chapter trails with progress and objective markers, level previews, personal bests, star totals, and a configurable pre-level booster loadout.
- **Player feedback:** goal-focused hints, short onboarding guide, win/loss recaps, sound effects, reduced-motion support, and clear confirmation before leaving or restarting a level.
- **Local progress:** schema-checked browser storage with a migration path for existing Jam Shift saves. Progress and power-up counts stay on the player's device; there is no account or game backend.
- **Installable shell:** a visible “Install Jam Shift” action opens supported browser install prompts and gives device-specific Home Screen steps when a native prompt is unavailable. Platform-sized PNG and scalable SVG icons accompany a versioned service worker that precaches the built JavaScript, CSS, fonts, manifest, and icons for offline startup, then refreshes successful same-origin assets.

### Installed app updates

The home-screen icon opens the same deployed web app; it does not automatically receive edits from a developer’s local workspace. Once an update is published to this URL, online launches fetch the refreshed app files. If an installed copy looks old, fully close it and reopen it while connected.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Vite prints the development URL. The server binds to `0.0.0.0` for local devices and preview environments.

## Quality checks

```bash
npm test       # Match rules, specials, save validation, and star accounting
npm run typecheck
npm run build  # Type-checks and creates the production bundle
npm run preview
```

The `tests/tests.json` file contains manual gameplay QA scenarios for mobile and desktop. Automated engine/resolution, save-data, portal-render, animation/accessibility, and PWA asset tests live in `tests/`; a deterministic smoke audit covers all 120 levels across eight start seeds and resolves one legal turn per level. `npm run typecheck` checks app, tests, and Vite config. GitHub Actions runs the test suite, production build, and dependency audit on pushes and pull requests to `main`.

## Project layout

- `src/App.tsx` — campaign hub, world map, gameplay flow, accessibility, and recap states.
- `src/game/engine.ts` — pure board rules, match resolution, specials, level definitions, and objectives.
- `src/game/save.ts` — local-save validation, migration, and persistence.
- `src/game/progress.ts` — shared campaign star-rating rules.
- `src/components/JuiceBurstLayer.tsx` — lightweight match feedback effects.
- `src/*.css` — global design system, responsive screens, and motion.
- `public/` — app icon, web manifest, and service worker.
- `docs/game-benchmark-blueprint.md` — Candy Crush feature comparison, public references, and Jam Shift’s engine roadmap.

## Release notes

This repository is a polished client-side game prototype and a solid agency/demo handoff. Before a public store launch, add a backend only if accounts, cross-device sync, live events, or leaderboards are required; then run browser/device QA, tune the authored level curve, and complete store-specific privacy, legal, and accessibility reviews. No analytics, ads, purchases, or network accounts are included in this build.
