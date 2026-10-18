# Candy Game (Jam Shift)

A mobile-first match-3 puzzle game built with React, TypeScript, and Vite. The game includes an 8×8 candy board, cascades, special candies, campaign progression across 100 levels, score/collect/jelly objectives, boosters, and visual feedback effects.

## Requirements

- Node.js 20 or newer (recommended)
- npm

## Run locally

```bash
npm install
npm run dev
```

Vite prints a local development URL in the terminal.

## Production build

```bash
npm run build
npm run preview
```

The production bundle is generated in `dist/`.

## Project layout

- `src/game/engine.ts` — board rules, match resolution helpers, specials, levels, and objectives.
- `src/App.tsx` — game UI and interaction flow.
- `src/components/JuiceBurstLayer.tsx` — visual effect layer.
- `src/*.css` — layout, game styling, and animation effects.
- `public/` — app icon, web manifest, and service worker.
- `tests/tests.json` — gameplay QA scenarios (scenario definitions; not proof of automated test execution).

## Notes

This repository contains the latest source snapshot deployed to AppDeploy. The live preview is [Jam Shift](https://jam-shift-6k5dl7.v2.appdeploy.ai/). It is an independent match-3 game and does not include Candy Crush proprietary artwork or assets.

Before a store release, run the production build, add/execute engine-level automated tests, and verify gameplay, persistence, accessibility, and performance on real mobile devices.
