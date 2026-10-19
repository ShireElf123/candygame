# Match-three architecture update

The supplied blueprint is useful at the architecture level, but its Unity/C# and DOTween snippets are not drop-in code for Jam Shift: the game is a React + TypeScript PWA. This update ports the applicable ideas into the existing stack and keeps the campaign usable offline.

## What is now in the game

- **Validated JSON campaign data.** `src/game/levels.json` contains all 100 existing levels. `src/game/levels.schema.json` describes the authoring format; `parseLevelManifest` in `src/game/engine.ts` also validates data at runtime before it is used. Level entries define dimensions, move limits, score targets, objective arrays, boss data, spawn weights (with shared defaults), and optional initial grids. An initial-grid `J` seeds a candy under a jelly tile. Current authored campaign values and the default 8×8 boards are preserved.
- **Rectangular, data-sized boards.** Core match scanning, gravity, special effects, valid-move search, shuffling, boosters, keyboard navigation, swipe bounds, burst placement, and board CSS now use each level’s row/column dimensions. The engine accepts boards from 3×3 through 16×16. New levels can vary their shape without changing the resolver; the shipped campaign remains 8×8 for now.
- **Model/view resolution boundary.** `src/game/resolution.ts` computes a pure resolution plan: cascade clears, points, goal progress, activated-special counts, jelly and shell damage, boss health, refill boards, and per-candy fall distances. `App.tsx` consumes those snapshots and coordinates DOM/CSS animation timing. This is the web equivalent of the blueprint’s separated model and animation pipeline; no Unity or DOTween dependency was added.
- **Goal-aware hints and special objectives.** The move evaluator ranks clears for active goals, including special-candy activation. Five campaign milestones (15, 35, 55, 75, and 95) track 1/2/2/3/3 actual activations as secondary goals; creating a special alone does not count. If the player pauses for 6.5 seconds, one hint is highlighted; any board activity resets the timer. The existing manual hint remains available.
- **Existing input and layout retained.** Pointer swipe/tap, keyboard movement, input locking during animations, responsive board layout, and the reduced-motion treatment remain in place.

## Level data shape

A simplified entry looks like this; see the complete campaign in `src/game/levels.json` and the JSON Schema beside it.

```json
{
  "levelId": 8,
  "chapter": 1,
  "chapterName": "Sugar Garden",
  "rows": 8,
  "columns": 8,
  "maxMoves": 29,
  "targetScore": 1250,
  "objectives": [
    { "type": "collect", "color": 3, "targetAmount": 6 },
    { "type": "shell", "targetAmount": 4 }
  ],
  "spawnWeights": [
    { "color": 0, "weight": 100 },
    { "color": 1, "weight": 100 },
    { "color": 2, "weight": 100 },
    { "color": 3, "weight": 100 },
    { "color": 4, "weight": 100 },
    { "color": 5, "weight": 100 }
  ]
}
```

`spawnWeights` may be supplied per level or inherited from manifest defaults. `initialGrid` is optional; cells are candy color indexes or `J`. For seeded grids, the runtime also checks that the randomized jelly candies leave a match-free board with a legal move.

## Verification and limits

The engine and schema accept dimensions from 3 to 16, but complex custom layouts with holes/blocking cells are not implemented. The current `J` marker means a jelly overlay on an ordinary candy, and sugar shells remain a separate objective layer. Current campaign JSON keeps 8×8 boards and equal spawn weights, so existing balance is unchanged. Remote level delivery, a Unity port, social/live services, and special tile blockers are outside this change.

Coverage added for manifest validation, rectangular board generation, weighted refills, special-creating hints, and resolution snapshots. Run `npm test`, `npm run build`, and `git diff --check` before shipping.
