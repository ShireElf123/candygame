# Development move profiling

Gameplay traces are opt-in in Vite development (`perfTrace=1`) and always available to Vitest. Production does not expose the trace API or write performance logs. The current production timing profile remains `compact`; `readable` is an explicit experiment until a browser A/B shows that its longer tile travel helps without harming response time.

## Replaying an A/B

1. Start the Vite development server and open the same level with the same seed in each run:
   - Current timings: `/?perfTrace=1&motion=compact&perfSeed=12345`
   - Readability experiment: `/?perfTrace=1&motion=readable&perfSeed=12345`
   - Ambient/juice-effect control: `/?perfTrace=1&motion=compact&perfSeed=12345&perfEffects=off`
2. Start/restart the same level and make the same tap or swipe. `perfSeed` seeds board creation and resolution refills. The report includes a board fingerprint and move coordinates; compare reports only when these match.
3. After input unlocks, inspect the last move in DevTools:

   ```js
   window.__JAM_SHIFT_PERFORMANCE__?.getLastMove()
   ```

   Or inspect several moves:

   ```js
   window.__JAM_SHIFT_PERFORMANCE__?.getHistory()
   ```

## Reading the report

- `durationMs` is input-to-unlock wall time; `events` identify phases and React commits.
- `waits` record the animation source, detected animation count, expected CSS duration, actual wait, first-frame handoff, idle/overrun, and completion result.
- `summary.jsExecutionMs` sums the explicitly wrapped resolver/geometry/burst work; it is not a profiler estimate of every JavaScript instruction.
- `summary.appRenderMs` and `boardRenderMs` are React Profiler render durations. They are diagnostic samples and can overlap the other timeline measurements.
- `expectedCssMotionMs` is the CSS motion estimate; `idleOrOverrunWaitMs` highlights waits with no motion or time beyond the estimate. These summary values are complementary diagnostics, not disjoint slices that should be added together.
- `frameIntervalsMs`, `longTasks`, `domMutations`, and `visualSnapshots` help distinguish missed frames, main-thread work, React/DOM churn, particles, and passive idle animations.

The `perfEffects=off` control suppresses ambient candy/jelly/shell motion, board impact animation, and burst particles without disabling swap, clear, or fall travel. It is intended only for a same-board diagnostic A/B, not as a user-facing mode.
