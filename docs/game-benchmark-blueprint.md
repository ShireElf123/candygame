# Jam Shift game benchmark & blueprint

**Research snapshot:** 18 October 2026. This is a code/product inspection, not a controlled playtest, market study, or claim that the games are equivalent in scale.

## Executive assessment

**Jam Shift: 6/10 against Candy Crush Saga’s publicly visible product breadth; about 8/10 as a focused, offline-first web-game prototype.** The core match-three loop is recognizable and has a solid presentation, input/accessibility work, local campaign, specials, boosters, and cascades. The largest gap is not the portal: it is the depth and ongoing operation of the game itself—board mechanics, objective variety, authored level content, and live-service features.

The score is a practical product assessment, not a measured fun or visual-quality score. Jam Shift is an original small web game; Candy Crush Saga is a mature, continuously updated commercial service.

| Area | Jam Shift assessment | What the public Candy Crush reference shows |
| --- | ---: | --- |
| Match-three loop and controls | **7/10** | Jam Shift has an 8×8 board, legal-swap checks, cascades, gravity/refill, hints, touch, keyboard, and reduced-motion support. Candy Crush’s public materials foreground the same easy-to-learn match-three loop and polished combo feedback. |
| Special candies and combos | **6.5/10** | Jam Shift has striped, wrapped, and color candies plus combo clears. It does not model the full set of specials, obstacles, and interactions in the commercial game. This refresh also corrected the striped-plus-striped cross behavior. |
| Goals and level variety | **5/10** | Jam Shift has score, color-collect, and jelly goals, with eight new late-world mixed-goal milestones. King publicly documents jelly, collect-order, Gummi Dragon drop, Rainbow Rapids, and mixed-mode levels. Blockers, ingredients/drop goals, and board layouts remain the next large content gap. |
| Campaign and ongoing content | **3/10** | Jam Shift has 100 locally configured levels across ten worlds, stars, and boosters. King’s current listing describes thousands of levels, weekly updates, daily rewards, and limited-time events. Jam Shift has no backend, live events, leaderboards, or cloud sync. |
| Player-friendly independence | **8/10** | Jam Shift deliberately has no account, lives timer, ads, or purchases; progress and boosters stay on-device and the shell supports offline use. This is a scope/values advantage, not a claim that it has more content than Candy Crush. |
| Engineering and release readiness | **6/10** | TypeScript, automated engine/save/render tests, CI, and a PWA shell are in place. The React app still coordinates animated cascade resolution; deterministic replay, a level editor/simulator, and browser/device gameplay QA are not yet in place. |

## What changed from the research

1. **Mixed-goal campaign milestones.** Levels **29, 39, 49, 59, 69, 79, 89, and 99** now require both their original goal and a second score or jelly goal. The level preview and in-game objective panel show both requirements. The overall progress bar follows the least-complete goal; the hint scorer values either goal; a win is impossible until both are complete.
2. **Striped-pair correction.** Two striped candies now clear one full row and one full column at the swap destination regardless of whether their stripes are parallel or perpendicular. Previously, parallel pairs could clear only their shared line. Regression tests cover all four orientation cases.
3. **Shared rule helpers.** `src/game/engine.ts` now owns the common goal-list, completion, and aggregate-progress rules, so the UI, hint system, and win check agree about mixed goals.

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
| Board and pieces | Blue/slate playfield contrasts with glossy, distinct candy shapes | Sky-blue raised frame and slate-blue grid, now with six original SVG candy silhouettes, surface glints, and explicit special-candy markings | Blue playfield and glossy saturated gradients; closer to classic match-3 language, but pieces were primarily gradient tiles with glyphs |
| Shell and hierarchy | Chunky, playful UI; goal/moves stay prominent; scenery and board have distinct roles | Warm card system; mission and move count remain ahead of the board on mobile; stronger contrast and larger labels; desktop side rails remain | Stronger candy-game mood, but busy pre-level card and a mix of pastel bevels and neon accents |
| Map/progression | Illustrated, themed world-map language | Pastel paper surfaces and clearer current/complete/locked level states; still a chapter grid rather than a scenic illustrated map | Bright coloured level nodes and a candy-like raised-button treatment |

**Your recollection was right:** the original styling was closer to Candy Crush's *genre cues*—pink, blue, gold, glossy buttons, stars, and a bright map—than the dark-and-lime refresh. That isn't evidence the original copied Candy Crush artwork; these are broad match-3 conventions. The new pass restores warmth while keeping Jam Shift's own layouts, plum/berry identity, and original candy art.

### Implemented visual changes

- Added a warm light palette and role-based colours: paper/sky surfaces, plum text, berry actions, blue navigation/information, gold stars, and mint success states. White text on the berry CTA stop `#D12E78` is about **4.8:1**; the blue `#2D77C7` is about **4.6:1** against white.
- Restyled the hub, chapter map, mission/HUD, power-up cards, focus states, help/result dialogs, board frame, browser theme colour, PWA manifest, and app icon; bumped the service-worker shell cache so updated offline assets refresh. The actual board stays slate blue so the brighter candy pieces have contrast; lime is now a small accent rather than the dominant action colour.
- Added `src/components/CandyArt.tsx`: six original colour-plus-shape SVG candies (grape cluster, lemon, berry, mint square, blueberry, and orange lozenge), plus separate stripe/wrap/rainbow special marks. The candy buttons keep their accessible colour/special/row/column labels.
- Raised important small labels and updated selection/juice effects to the berry/gold/sky palette. The current chapter-grid layout remains intentionally simple; a fully illustrated route/world map is a separate art-production task.

This is a visual-appeal and readability pass, **not** a claim that any hue is inherently addictive. The sources support a bright, cohesive, readable, satisfying presentation; they do **not** prove a particular palette causes addiction. Candy Crush's store copy is product marketing, not behavioural research. The new palette still needs same-viewport playtesting; ask players to identify the objective, move budget, and next action before calling the design finished.

**UI-only heuristic (not a user-test score):** Candy Crush is about **9/10** for cohesive visual identity and board-art polish; Jam Shift after this pass is about **8/10** for match-3 warmth and hierarchy, with the next gap being authored world-map/candy illustration depth; the original styling was about **8/10** for genre fit but **6/10** for restraint/cohesion. This is separate from the product-breadth/prototype scores above.

**Visual references:** [King's current Google Play listing](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US); [James Kirkwood, former Associate UI Director on Candy Crush](https://www.jameskirkwood.com/new-page-1); [PocketGamer's 2026 interview with Candy Crush artists](https://www.pocketgamer.biz/the-secret-ingredients-behind-the-art-of-candy-crush-saga/); [King Community art-team Q&A](https://community.king.com/en/candy-crush-saga/discussion/308930/%EF%B8%8F-we-have-their-answers-exclusive-q-a-with-our-ccs-art-team); [Game UI Database's historical Candy Crush screen archive](https://www.gameuidatabase.com/gameData.php?id=147).

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

- `src/game/engine.ts` contains the board helpers, specials, level definitions, move hints, and now shared mixed-objective rules.
- `src/App.tsx` renders the board and also orchestrates the asynchronous animation/cascade loop. That is appropriate for this prototype, but the next architecture step is for a pure resolver to return a replayable event trace that React only animates.
- `src/game/save.ts` and `src/game/progress.ts` own local-save validation and campaign-star accounting.
- `tests/game-engine.test.ts`, `tests/save.test.ts`, and `tests/app-render.test.ts` cover rules, save validation, and server rendering. Add seeded cascade traces and property/simulation tests as the rules grow.

## Public research and code references

- King’s [official game-mode guide](https://candycrush.zendesk.com/hc/en-us/articles/360000754897-Which-game-modes-will-I-find) lists clearing jelly, collecting orders, releasing Gummi Dragons, clearing paths for Rainbow Rapids, and mixed mode. Its [special-candy guide](https://candycrush.zendesk.com/hc/en-us/articles/211939685-Creating-and-combining-Special-Candies) describes how the main special candies are created and used. The striped-plus-striped cross is also described in this [public community reference](https://candycrush.fandom.com/wiki/Candy_Crush_Saga); it is a gameplay reference, not King source code.
- King’s [Google Play listing](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US) currently advertises thousands of levels, weekly updates, daily rewards, and limited-time events. These are the basis for the content/operations comparison above.
- [PlaytestersKitchen/match-three-js](https://github.com/PlaytestersKitchen/match-three-js) is an MIT-licensed independent engine example. Its README describes a reusable board core for moving, matching, removing, refilling, and shuffling, without game-specific turn/stat business logic.
- [aykutkardas/ymir-js Match 3 implementation](https://github.com/aykutkardas/ymir-js/pull/30) is another MIT-repository reference. Its public implementation notes are useful for a modern blueprint: seedable randomness, cascade-step output for animation, and tests across many seeds/random swaps.

**Important boundary:** King has not published Candy Crush Saga’s proprietary source code as a reusable blueprint. The references above are public gameplay documentation and independent match-three implementations. No Candy Crush source, art, branding, or copied code was used in Jam Shift. The external repositories are architecture/learning references; their existence does not imply they are King code.

## Next best steps

1. **Playtest the new milestone levels** on a real mobile viewport and tune move budgets/objective counts from observed completion rates.
2. **Extract the cascade resolver and inject seeded randomness** so bug reports and level simulations are reproducible.
3. **Add one original board mechanic**—for example a removable blocker or a falling ingredient—with explicit rules and its own tests before expanding the 100-level curve.
4. Add a readable level-data format plus a small bot/simulator to check solvability and relative difficulty.
5. Consider daily/live events or social/cloud features only if the product actually wants a backend; keep Jam Shift’s no-paywall, local-first design intentional.
