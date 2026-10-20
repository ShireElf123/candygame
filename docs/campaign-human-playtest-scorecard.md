# Campaign human playtest scorecard

This scorecard is for an **exploratory, non-production** playtest of the current campaign. It is not a statistically representative pass-rate study. The development-only launch mode starts at a selected level, unlocks the map in memory, and does not read or overwrite the tester’s saved progress.

## Start the local playtest

1. Start the development preview with `npm run dev -- --host 0.0.0.0 --port 5173`.
2. Open the preview URL and append `?playtest=79` (replace `79` with any level from 1 to 120). The campaign map opens with that level selected and all levels available.
3. Confirm the yellow **Local playtest · all levels unlocked · progress will not be saved** banner. If it is missing, stop; you may not be in the isolated development mode.
4. Select a level and play normally. Do not change the palette, move budget, or use a special test save. Record hints/boosters if used.

The query access is gated to Vite development mode; it is ignored in production builds. Playtest progress is kept only in memory for that browser session and is not written to the normal save.

## Recommended slice

**Highest-priority challenge checks:** 79, 99, 87, 96, 103. These had the weakest repeated automated probe results.

**Finale feel checks:** 111, 112, 115, 117, 119, 120. These sample the four-color score, jelly, mixed/cascade, ingredient, and boss experiences.

**If time allows:** 57, 65, 76, 84, 93. These are additional jelly levels near the probe’s 50% boundary.

For a qualitative pass, start with 5–8 people across self-described newer/casual and experienced match-3 players. That can reveal clarity and fairness issues; it is **not enough to claim a reliable population win rate**. Ask each tester to play naturally. Do not tell them which levels the bot struggled with before they play.

## Per attempt

Copy one row per attempt. Use anonymous tester codes; do not record names or personal information.

| Tester code | Experience band | Level | Attempt | Win/loss | Moves left / goal remainder | Hints used | Boosters used | Time (approx.) | Difficulty 1–5 | Fairness 1–5 | Fun 1–5 | Notes / confusing moment |
|---|---|---:|---:|---|---|---|---|---:|---:|---:|---:|---|
|  |  |  |  |  |  |  |  |  |  |  |  |  |

## Ask after each level

- Was the goal obvious before the first move? What did you think you needed to do?
- Did you feel you had meaningful control over the result, or did success feel mostly random?
- If you lost, did the remaining goal feel achievable with a few more moves?
- Which moment felt most satisfying or frustrating?
- Would you play another level like this?

## Review after the sessions

Compare the answers by experience band. Look for repeated confusion, multiple testers calling the same loss unfair, or consistent “too easy / too hard” ratings. Keep the four-color Moon Mix palette during this first test: the A/B simulation indicates that a full six-color change makes several finale levels substantially harder. Use human results to decide whether Moonmallow should remain a cascade-focused wind-down or whether only its final encounter needs a stronger climax.
