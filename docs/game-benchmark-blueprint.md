# Jam Shift game benchmark & blueprint

**Research snapshot:** 18 October 2026. This is a code/product inspection, not a controlled playtest, market study, or claim that the games are equivalent in scale.

## Executive assessment

**Jam Shift: 6/10 against Candy Crush Saga’s publicly visible product breadth; about 8/10 as a focused, offline-first web-game prototype.** The core match-three loop is recognizable and has a solid presentation, input/accessibility work, local campaign, specials, boosters, and cascades. The largest gap is not the portal: it is the depth and ongoing operation of the game itself—board mechanics, objective variety, authored level content, and live-service features.

The score is a practical product assessment, not a measured fun or visual-quality score. Jam Shift is an original small web game; Candy Crush Saga is a mature, continuously updated commercial service.

| Area | Jam Shift assessment | What the public Candy Crush reference shows |
| --- | ---: | --- |
| Match-three loop and controls | **7/10** | Jam Shift has an 8×8 board, legal-swap checks, cascades, gravity/refill, hints, touch, keyboard, and reduced-motion support. Candy Crush’s public materials foreground the same easy-to-learn match-three loop and polished combo feedback. |
| Special candies and combos | **6.5/10** | Jam Shift has striped, wrapped, and color candies plus combo clears. It does not model the full set of specials, obstacles, and interactions in the commercial game. This refresh also corrected the striped-plus-striped cross behavior. |
| Goals and level variety | **5.5/10** | Jam Shift now has score, color-collect, jelly, chapter-boss, sugar-shell, special-candy activation, gravity-driven ingredient-drop, and cascade-chain goals, with mixed-goal milestones. King publicly documents jelly, collect-order, Gummi Dragon drop, Rainbow Rapids, and mixed-mode levels. Collect-order variations, richer blocker interactions, and irregular board layouts remain gaps. |
| Campaign and ongoing content | **3/10** | Jam Shift has 120 locally configured levels across twelve worlds, stars, and boosters. King’s current listing describes thousands of levels, weekly updates, daily rewards, and limited-time events. Jam Shift has no backend, live events, leaderboards, or cloud sync. |
| Player-friendly independence | **8/10** | Jam Shift deliberately has no account, lives timer, ads, or purchases; progress and boosters stay on-device and the shell supports offline use. This is a scope/values advantage, not a claim that it has more content than Candy Crush. |
| Engineering and release readiness | **6/10** | TypeScript, automated engine/save/render tests, CI, and a PWA shell are in place. The React app still coordinates animated cascade resolution; deterministic replay, a level editor/simulator, and browser/device gameplay QA are not yet in place. |

## What changed from the research

1. **Mixed-goal campaign milestones.** Levels **29, 39, 49, 59, 69, 79, 89, and 99** now require both their original goal and a second score or jelly goal. The level preview and in-game objective panel show both requirements. The overall progress bar follows the least-complete goal; the hint scorer values either goal; a win is impossible until both are complete.
2. **Striped-pair correction.** Two striped candies now clear one full row and one full column at the swap destination regardless of whether their stripes are parallel or perpendicular. Previously, parallel pairs could clear only their shared line. Regression tests cover all four orientation cases.
3. **Shared rule helpers.** `src/game/engine.ts` now owns the common goal-list, completion, and aggregate-progress rules, so the UI, hint system, and win check agree about mixed goals.
4. **Original blockers and chapter bosses.** Levels 8, 18, 28, 38, 58, 78, 88, and 98 add layered sugar-shell objectives alongside their existing goals. A match or power-up cracks a shell on that cell; later shell levels introduce two-hit layers. Every chapter finale remains its own named boss encounter.
5. **Motion and feedback pass.** The board now gives candies a subtle idle rhythm, shows true per-candy fall distance and landing bounce, and pairs clears with local spark bursts, score pops, and objective reactions. The portal, map scenery, original characters, boss hits, and level results also have short original animations; operating-system reduced-motion preferences disable them.
6. **Special-candy activation milestones.** Levels **15, 35, 55, 75, and 95** now pair their existing goal with targets of **1, 2, 2, 3, and 3 activated specials**, respectively. Creating a special does not advance the objective; it must be triggered by a clear. Progress carries across moves/cascade waves, appears in the objective HUD, and is included in win checks.
7. **Ingredient-drop mechanics.** Levels **25, 45, 64, and 85** pair their existing goal with **1, 1, 2, and 2 jam jars**. Jars are original, non-matchable board pieces that cannot be swapped or cleared directly; they fall down their lane when clears open space beneath them and count only when they exit the bottom. Hints, boosters, special effects, mixed-goal progress, and win checks all respect this rule. The current campaign still uses rectangular boards; irregular silhouettes remain a future mechanic.
8. **Sugar-rush chain challenges.** Levels **12, 32, 52, 72, and 92** pair color collection with a best-chain target of **2, 2, 3, 3, and 3 cascade waves** in a single move. The strongest chain persists for the current level, is shown in objective progress, and must be reached alongside the color goal.
9. **Two new campaign worlds.** Levels **101–110** introduce Prism Orchard and its new Lady Luma finale; levels **111–120** open Moonmallow Observatory and a Mallow Nova finale. The ten Moonmallow levels use a deliberate four-color “Moon Mix” spawn palette to make longer chains a distinct, teachable strategy. The palette remains consistent through refills and dead-board recovery; existing saves carry forward into the added levels.

## Code/source and product audit (October 2026)

The current **Candy Crush Saga production source code was not available in the public search results**. GitHub results included an unrelated 2018 CS422 course project and a community revival of the older Flash game; neither is King's current mobile code. I did not copy code, art, level data, characters, or UI from those projects. A separate public match-three sample advertises data-driven JSON levels and blocker modules; it is useful as a general architecture example, not evidence about King's internals. See [the student implementation](https://github.com/reddtoric/candy-crush), [the Flash revival](https://github.com/MysticCCS/CandyCrushSaga), and [the community blocker/level-schema sample](https://github.com/mariomakesgames/battle-jungle-gems).

This pass compares **public product information**, not private implementation. As of this research snapshot, Saga's Play listing highlights thousands of levels, creative obstacles, offline play, boosters, daily rewards, limited-time events, and regular updates; Soda advertises blockers and distinct board/mode twists; Jelly highlights boss and versus play; Friends highlights companion powers and collectible outfits. Jam Shift now has 120 levels across twelve worlds, bosses, one layered blocker family, an original ingredient-drop objective, cascade-chain challenges, and a four-color puzzle chapter, but still lacks varied board shapes, companion powers/collection, social competition, events, and a server-backed content cadence. The next upgrades should prioritize mechanics and hand-authored level variation—not copying proprietary source or branding.

## Motion and feedback audit (October 2026)

**Public inspiration, not private implementation access:** King’s art-team Q&A describes 3D-rendered candies, sparkles/glitter, and animation of characters and elements using code or tools such as Spine [King Community art Q&A](https://community.king.com/en/candy-crush-saga/discussion/308930/%EF%B8%8F-we-have-their-answers-exclusive-q-a-with-our-ccs-art-team). In a 2026 interview, Saga artists describe combining paper-craft 2D art with rendered candy pieces and “snappy animation” [PocketGamer, 2026](https://www.pocketgamer.biz/the-secret-ingredients-behind-the-art-of-candy-crush-saga/). A King engineer interview says Saga Adventures prototype animation, transitions, and interactions separately before integrating them with art and sound [PocketGamer, 2025](https://www.pocketgamer.biz/how-saga-adventures-make-candy-crush-a-living-breathing-universe/). The Friends team has also documented reduced-screen-shake and reduced-particle options for accessibility [King Community accessibility post](https://community.king.com/en/candy-crush-friends-saga/discussion/313075/new-check-out-the-accessibility-features).

**Jam Shift implementation:** existing original SVG candy and character art now gets a quiet, staggered idle motion; match clears squash/pop with local radial sparkles and floating score; dropped candies animate from their actual cleared-cell distance and bounce on landing. Score, moves, boss portraits, sugar-shell hits, map scenery, chapter characters, page transitions, and win stars each react to their own game event. Effects are bounded and brief rather than an always-on screen shake or flash. The CSS follows the device’s `prefers-reduced-motion` setting. These are original CSS/SVG treatments based on broad feedback principles—not copied King code, assets, or animation sequences.

## Visual and UI comparison: Candy Crush and Jam Shift

**Scope and limits:** I inspected Jam Shift's current CSS/UI structure, the original `f83d8bf` styling, the current Google Play listing/screenshots, and public Candy Crush reference screenshots. The Game UI Database archive is historical (the game entry is 2012 and its gameplay captures include 2020 screens), so it is used for visual principles—not as proof that every screen is the exact 2026 build. This is a source-and-reference review, not a same-device pixel comparison or audience playtest. Jam Shift's swatches are original design choices, not sampled Candy Crush brand values.

### What Candy Crush is doing visually

- **Separates the world from the playfield.** Public screenshots show warm pink/cream UI and illustrated scenery around a blue/slate board; the candies are the highest-saturation, highest-detail objects. A darker playfield can make the pieces pop without making the entire game feel dark.
- **Uses deliberately different art treatments.** Candy Crush's former Associate UI Director describes highly rendered 3D game pieces alongside 2D paper-craft environments, joined by the UI. In a 2026 interview, King artists describe flat, paper-textured 2D art contrasted with glossy, edible-looking 3D pieces, bright modern colour, vector art, and snappy animation. That contrast is part of a consistent art system—not a reason to apply gradients to every element.
- **Makes pieces legible at a glance.** Distinct candy silhouettes, surface shine/shading, and special-candy markings help the board read quickly. James Kirkwood also notes that simplifying the pre-level popup made it more harmonious and that the target stayed highlighted through the end-of-game flow. Those are useful hierarchy principles; they don't require reproducing Candy Crush's screens.

### Side-by-side with Jam Shift

| Dimension | Candy Crush reference | Jam Shift after the UI pass | Original styling at `f83d8bf` |
| --- | --- | --- | --- |
| Overall palette | Bright candy objects; warm pink/cream UI; sky/blue accents; gold rewards; pastel illustrated map | Sugar-paper cream/sky world, deep-plum text, berry CTA, blue information accents, gold rewards, mint success states | Sky-to-green backdrop, blush/pink bevelled panels and buttons, bright blue score/goal ribbon, gold stars, plus purple/cyan arcade accents |
| Board and pieces | Blue/slate playfield contrasts with glossy, distinct candy shapes and snappy clear/fall feedback | Sky-blue raised frame and slate-blue grid, six original SVG candy silhouettes, surface glints, special markings, subtle idle motion, squash-pop clears, spark bursts, and true-distance fall/bounce | Blue playfield and glossy saturated gradients; closer to classic match-3 language, but pieces were primarily gradient tiles with glyphs |
| Shell and hierarchy | Chunky, playful UI; goal/moves stay prominent; scenery and board have distinct roles | Warm card system; portrait play now uses a compact objective/moves HUD, a full-width board, and a reachable booster tray; desktop side rails remain | Stronger candy-game mood, but busy pre-level card and a mix of pastel bevels and neon accents |
| Map/progression | Illustrated, themed world-map language | Pastel paper surfaces, clearer current/complete/locked states, and an original chapter-specific scenic banner with a winding path; level picks remain a compact grid, not a full route map | Bright coloured level nodes and a candy-like raised-button treatment |

### Per-title public-screen gap audit

These are **screen-language observations**, not a literal pixel overlay: available public screenshots mix devices, versions, and third-party archive dates, and this environment cannot capture Jam Shift's rendered page at the same device viewport. I compared those references with Jam Shift's current component/CSS structure. Pixel-position claims would be misleading without same-resolution captures.

| Title | Strong screen cues in public references | Jam Shift gap / response |
| --- | --- | --- |
| **Candy Crush Saga** | Big, glossy pieces; bright themed scenery; a blue/slate playfield; prominent move/objective/score information. The public Saga captures are historical, so use as style references, not exact 2026 pixels. | Jam Shift's pieces had mostly solid vector fills and the campaign map felt like a UI grid. Added individual SVG gloss gradients and chapter scenery; the game's objective and move hierarchy remains deliberately original. |
| **Candy Crush Soda Saga** | The 2020 archived board capture uses a vivid cyan HUD, a large move count, an irregular board, and large boosters below the playfield. Current store copy highlights its own mode variety, including Bubblegum Pop and Gummy Dragons. | Jam Shift still uses a uniform 8×8 rectangle and a card-based desktop mission panel. Don't copy Soda's exact bar or board; the next meaningful feature gap is original board silhouettes/obstacles and additional modes, not more gradients. |
| **Candy Crush Jelly Saga** | Recent public captures show jelly/boss moments overlaid on a themed board; its official listing highlights spread-jelly goals and boss/versus modes. | Jam Shift now has an original boss encounter at each chapter finale, with visible power/health and clear feedback; it still has no versus mode or irregular jelly board. |
| **Candy Crush Friends Saga** | Character and world art are foregrounded; the official listing describes friends with powers, collectible outfits, and 3D worlds. | Jam Shift now introduces Pip as a guide and ten original chapter bosses, alongside the per-world scenery. Character collection, outfits, and companion powers remain out of scope. |

**What I changed from that audit:** `CandyArt` now gives each instance its own color-specific gloss gradient (without duplicate SVG IDs), and the chapter panel includes bespoke, palette-shifted landscapes and paths in `WorldScene`. The content pass adds a guide character, twelve named/coloured bosses, boss health as a new level objective on each tenth level, and layered sugar-shell objectives on selected late-chapter levels. A motion pass makes the portal, chapter scenery, candies, falls, clears, boss reactions, counters, and result stars respond to play; it honors reduced-motion preferences. Portrait gameplay keeps the objective and moves above the full-width board and the power-ups in a compact, reachable tray. These are original assets and mechanics with broad match-3 presentation cues, not copied King sprites or screen layouts. The uniform 8×8 board and simple level grid remain visible product gaps; those need gameplay/map decisions rather than cosmetic claims.

**Your recollection was right:** the original styling was closer to Candy Crush's *genre cues*—pink, blue, gold, glossy buttons, stars, and a bright map—than the dark-and-lime refresh. That isn't evidence the original copied Candy Crush artwork; these are broad match-3 conventions. The current pass restores warmth while keeping Jam Shift's own layouts, plum/berry identity, and original candy art.

### Implemented visual changes

- Added a warm light palette and role-based colours: paper/sky surfaces, plum text, berry actions, blue navigation/information, gold stars, and mint success states. White text on the berry CTA stop `#D12E78` is about **4.8:1**; the blue `#2D77C7` is about **4.6:1** against white.
- Restyled the hub, chapter map, mission/HUD, power-up cards, focus states, help/result dialogs, board frame, browser theme colour, PWA manifest, and app icon; bumped the service-worker shell cache so updated offline assets refresh. The actual board stays slate blue so the brighter candy pieces have contrast; lime is now a small accent rather than the dominant action colour.
- Added `src/components/CandyArt.tsx`: six original colour-plus-shape SVG candies (grape cluster, lemon, berry, mint square, blueberry, and orange lozenge), each with a unique gloss gradient, plus separate stripe/wrap/rainbow special marks. Candy buttons keep their accessible colour/special/row/column labels.
- Added `src/components/WorldScene.tsx`: twelve chapter palettes, original rolling scenery, candy-tree landmarks, and a winding path behind the level selector. This gives each chapter a place identity; the ten level buttons are still a grid, so a fully walkable route map remains a separate upgrade.
- Raised important small labels and updated selection/juice effects to the berry/gold/sky palette.

This is a visual-appeal and readability pass, **not** a claim that any hue is inherently addictive. The sources support a bright, cohesive, readable, satisfying presentation; they do **not** prove a particular palette causes addiction. Candy Crush's store copy is product marketing, not behavioural research. The new palette still needs same-viewport playtesting; ask players to identify the objective, move budget, and next action before calling the design finished.

**UI-only heuristic (not a user-test score):** Candy Crush is about **9/10** for cohesive visual identity and board-art polish; Jam Shift after this pass is about **8/10** for match-3 warmth and hierarchy, with the next visual gap being authored world-map/candy illustration depth; the original styling was about **8/10** for genre fit but **6/10** for restraint/cohesion. This is separate from the product-breadth/prototype scores above.

**Visual references:** [Candy Crush Saga](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US), [Soda Saga](https://play.google.com/store/apps/details?id=com.king.candycrushsodasaga&hl=en_US), [Jelly Saga](https://play.google.com/store/apps/details?id=com.king.candycrushjellysaga&hl=en_US), and [Friends Saga](https://play.google.com/store/apps/details?id=com.king.candycrush4&hl=en_US) official Play listings; [James Kirkwood, former Associate UI Director on Candy Crush](https://www.jameskirkwood.com/new-page-1); [PocketGamer's 2026 interview with Candy Crush artists](https://www.pocketgamer.biz/the-secret-ingredients-behind-the-art-of-candy-crush-saga/); [King Community art-team Q&A](https://community.king.com/en/candy-crush-saga/discussion/308930/%EF%B8%8F-we-have-their-answers-exclusive-q-a-with-our-ccs-art-team); historical [Saga](https://www.gameuidatabase.com/gameData.php?id=147), [Soda](https://www.gameuidatabase.com/gameData.php?id=434), and [Friends](https://www.gameuidatabase.com/gameData.php?id=433) screen archives; and [Jelly Saga public screenshots](https://gamerant.com/db/video-game/candy-crush-jelly-saga/). Archive images vary in date/provenance and are not treated as current device-perfect captures.

## Blueprint: a maintainable match-three stack

```text
Player input
    ↓
Game session: validate adjacent swap, spend a move, capture the level/seed
    ↓
Pure rules core: swap → match/special analysis → clear → gravity/refill → cascades
    ↓
Resolution record: cleared, special created/fired, fallen, spawned, goal deltas
    ↓
UI replays the record as animation; it does not invent game rules
    ↓
Campaign result/save
```

Recommended data contracts as the game grows:

- **Level definition:** board layout, move budget, objective list, target color/count, blockers/ingredients, booster rules, and a stable level identifier.
- **Board state:** candies plus separate board entities/overlays (for example, jelly and blockers), rather than encoding every future obstacle as a candy special.
- **Resolver:** a deterministic function of board + action + injected random source. Return a sequence of events for animation and tests. Store a seed with a replay/debug report so a bad cascade can be reproduced.
- **Objective tracker:** evaluate an array of goal types against one move result. Mixed goals should not require UI-specific win logic.
- **Level validation/simulation:** check board shape, initial matches, at least one legal move, and run seeded bot/random simulations to catch impossible or overtuned levels before release.

A small proposed TypeScript contract for the next resolver extraction (design sketch, not code currently shipped):

```ts
type ResolutionEvent =
  | { type: 'clear'; cells: Pos[]; cause: 'match' | 'special' }
  | { type: 'fall'; candyId: number; from: Pos; to: Pos }
  | { type: 'spawn'; candy: Candy; at: Pos }
  | { type: 'goal'; goal: GoalType; delta: number };

type MoveResolution = {
  accepted: boolean;
  board: Candy[][];
  events: ResolutionEvent[]; // ordered cascade steps for the view to animate
  scoreDelta: number;
  completedGoals: GoalType[];
};

function resolveMove(
  board: Candy[][],
  swap: [Pos, Pos],
  level: LevelDefinition,
  random: () => number,
): MoveResolution;
```

### How this maps to this repository

- `src/game/engine.ts` contains the board helpers, specials, level definitions, move hints, shared mixed-objective rules, and the layered sugar-shell state/damage helpers.
- `src/App.tsx` renders the board and also orchestrates the asynchronous animation/cascade loop. That is appropriate for this prototype, but the next architecture step is for a pure resolver to return a replayable event trace that React only animates.
- `src/game/save.ts` and `src/game/progress.ts` own local-save validation and campaign-star accounting.
- `tests/game-engine.test.ts`, `tests/save.test.ts`, and `tests/app-render.test.ts` cover rules, save validation, and server rendering. Add seeded cascade traces and property/simulation tests as the rules grow.

## Public research and code references

- King’s [official game-mode guide](https://candycrush.zendesk.com/hc/en-us/articles/360000754897-Which-game-modes-will-I-find) lists clearing jelly, collecting orders, releasing Gummi Dragons, clearing paths for Rainbow Rapids, and mixed mode. Its [special-candy guide](https://candycrush.zendesk.com/hc/en-us/articles/211939685-Creating-and-combining-Special-Candies) describes how the main special candies are created and used. The striped-plus-striped cross is also described in this [public community reference](https://candycrush.fandom.com/wiki/Candy_Crush_Saga); it is a gameplay reference, not King source code.
- King’s [Google Play listing](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US) currently advertises thousands of levels, weekly updates, daily rewards, and limited-time events. These are the basis for the content/operations comparison above.
- [PlaytestersKitchen/match-three-js](https://github.com/PlaytestersKitchen/match-three-js) is an MIT-licensed independent engine example. Its README describes a reusable board core for moving, matching, removing, refilling, and shuffling, without game-specific turn/stat business logic.
- [aykutkardas/ymir-js Match 3 implementation](https://github.com/aykutkardas/ymir-js/pull/30) is another MIT-repository reference. Its public implementation notes are useful for a modern blueprint: seedable randomness, cascade-step output for animation, and tests across many seeds/random swaps.

**Important boundary:** This audit did not identify an official, current King production-source repository. The GitHub links above are explicitly community/student recreations or independent match-three engineering examples; they are not King source and are not a license to reuse King material. Public gameplay guides/listings informed the comparison, and no third-party code or assets were copied into Jam Shift.

## Next best steps

1. **Playtest the new milestone levels**, especially ingredient delivery and cascade-chain challenges, on a real mobile viewport; tune move budgets and objective counts from observed completion rates.
2. **Add a multi-seed campaign simulator** over the existing pure resolver to estimate solvability and relative difficulty across the 120-level curve.
3. **Prototype one irregular playable silhouette** with explicit fall/match boundaries and its own tests; preserve the current rectangular-board behavior for existing levels.
4. Keep authoring levels in the validated JSON manifest and add solver feedback to the authoring workflow.
5. Consider daily/live events or social/cloud features only if the product actually wants a backend; keep Jam Shift’s no-paywall, local-first design intentional.
