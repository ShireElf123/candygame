# Campaign difficulty and level-feel audit

**Audit date:** 20 October 2026. **Scope:** the current 120-level campaign in this working tree. This is an offline content audit; the expansion has not been deployed. **No gameplay balance values were changed during this audit.**

## Verdict

**Fun potential: 6/10 (low confidence; design review, not a player rating).** Jam Shift has a recognizable, satisfying match-3 loop and a good spread of objectives. Its weakest point is level-to-level identity: all 120 stages use the same open 8×8 board, none has an authored starting layout, and most variation comes from changing the goal/count rather than changing the board. Score-only levels and boss levels also look very forgiving to the hint-following probe, while jelly objectives account for every particularly low bot result. The final world then becomes much easier in this probe after the palette shrinks to four colors.

**Short recommendation:** keep the strong objective mix, but add more spatial/mechanical variation and validate the jelly bottlenecks and four-color finale with human playtests before treating the curve as balanced. I would not blindly raise targets or reduce moves from this simulation alone.

## What was measured (and what was not)

- Ran **3,600 seeded runs**: 30 per level. Each turn used the existing engine `findBestMove` scoring policy (a greedy, goal-aware hint-style picker), then the real resolution/objective rules for clears, cascades, shell damage, ingredients, specials, bosses, and move limits. No boosters, bonus moves, player mistakes, purchases, or retries were included.
- The policy cleared **3,049/3,600 runs (84.7%)**. This is **not a human first-try win rate**, not a calibrated player model, and not an upper bound: the picker is perfect-information and objective-aware but greedy and short-sighted. It is useful for finding contrasts and likely problem cases, not for predicting actual player outcomes.
- Thirty seeds per level are a small diagnostic sample (3.3 percentage-point steps; around a 50% result, sampling uncertainty is roughly ±18 points at 95% before accounting for bot bias). These seeds vary board/refill randomness while keeping one policy; they do not sample different player styles. Treat individual percentages as triage signals, not precise difficulty ratings. The engine produced no no-move stalls in these runs.
- No real players, playtest cohort, attempt-to-complete data, retention, or perceived-fun ratings were available. The 6/10 is therefore a static design judgment with low confidence.

## Comparison to industry practice and Candy Crush

- Puzzle-game difficulty is commonly operationalized with **attempts-to-complete or pass rate**; measuring actual player difficulty requires player attempts and varies by skill cohort. Research recommends combining player and simulated data, and warns that an agent can favor some mechanics in ways human players do not. The 2024 modelling paper cites Candy Crush among games that use attempts/pass-rate style metrics, but its detailed case study is **Lily’s Garden**—its reported average of about 3.2 attempts is not a Candy Crush target and should not be transferred to Jam Shift. Kristensen & Burelli (2024) [2](https://arxiv.org/pdf/2401.17436)
- King’s public help page describes Candy Crush modes including jelly, collecting orders, items dropping to the bottom, Rainbow Rapids, mixed goals, visible objective counters, and indicators for harder levels. Jam Shift covers several comparable high-level goal families (jelly, collect, ingredient drop, specials, mixed goals) and adds shells, cascades, and bosses. Its map/mission UI also makes objectives and counters visible and distinguishes bosses/mixed goals, but it does not assign calibrated “hard” labels. This is a **mechanics/structure comparison**, not a claim about Candy Crush’s private level tuning or success rates. King Help Center, “Which game modes will I find?” [1](https://candycrush.zendesk.com/hc/en-us/articles/360000754897-Which-game-modes-will-I-find)
- Level-design practitioners recommend internal playtesting first, then iterative tuning from player data; averages/medians of attempts can be more informative than a single pass-rate KPI. Game Developer / Room 8 Studio [10](https://www.gamedeveloper.com/design/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1)

## Campaign-level findings

### Structural variety

- **120 / 120 boards are 8×8; 0 have an authored `initialGrid`.** The board silhouette therefore never changes. World scenery and boss names provide theme, but individual stage feel is mostly objective-driven. Jelly and shells add targets on top of an open board, ingredients introduce vertical drop lanes, and bosses convert clears into damage—but none create a new board shape in this campaign.
- The manifest contains **38 mixed-goal levels** and these objective occurrences: **45 score, 36 collect, 31 jelly, 12 shell, 12 boss, 8 special, 7 cascade, 7 ingredient**. These counts overlap for mixed levels.
- **28 levels are score-only**; all cleared in 30/30 probe runs, averaging **23.0 moves left when won**. All 12 boss levels also cleared in 30/30 runs under this picker. By contrast, the 25 jelly-only levels averaged **59.9% (449/750 runs)**; all ten levels below 50% are jelly-based (including mixed-goal cases). This points to a likely over-easy score/boss lane and a jelly bottleneck for this policy, though it does not establish human pass rates.
- **10 levels use four candy colors**: all ten in Moonmallow Observatory (111–120). The other 110 use six. Four colors make matches and cascades easier to form, which likely contributes to the final world’s sharp simulated ease.

### Difficulty signals by world

| World | Levels | Hint-policy clears (mean across 10 levels) | Lowest level | Highest level | Reading |
|---|---:|---:|---:|---:|---|
| 1. Sugar Garden | 1–10 | 96.3% | L6 (25/30) | L1 (30/30) | Very gentle onboarding; jelly begins to add variance. |
| 2. Berry Bay | 11–20 | 91.3% | L17 (15/30) | L11 (30/30) | Still forgiving overall; level 17 is the first clear probe dip. |
| 3. Lemon Lagoon | 21–30 | 83.4% | L28 (17/30) | L21 (30/30) | Moderate drift; jelly/mixed goals make the lows. |
| 4. Mint Meadow | 31–40 | 88.7% | L39 (16/30) | L31 (30/30) | Moderate drift; jelly/mixed goals make the lows. |
| 5. Moonlit Market | 41–50 | 88.7% | L48 (15/30) | L41 (30/30) | Moderate drift; jelly/mixed goals make the lows. |
| 6. Crystal Caverns | 51–60 | 82.1% | L57 (13/30) | L51 (30/30) | Moderate drift; jelly/mixed goals make the lows. |
| 7. Neon Orchard | 61–70 | 81.0% | L65 (13/30) | L61 (30/30) | Moderate drift; jelly/mixed goals make the lows. |
| 8. Frosted Peaks | 71–80 | 74.3% | L79 (9/30) | L71 (30/30) | First sustained late-campaign pressure; level 79 is a watch item. |
| 9. Starfall Summit | 81–90 | 77.3% | L87 (10/30) | L81 (30/30) | Uneven; levels 84 and 87 are the weakest signals. |
| 10. Royal Candy Castle | 91–100 | 75.3% | L93 (9/30) | L91 (30/30) | A sharper jelly-heavy dip through 93/96/99. |
| 11. Prism Orchard | 101–110 | 81.3% | L103 (8/30) | L101 (30/30) | Move budget resets upward; level 103 is the largest outlier. |
| 12. Moonmallow Observatory | 111–120 | 96.7% | L119 (22/30) | L111 (30/30) | Pronounced ease reset with four colors; may feel like a difficulty drop. |

**Shape:** the probe’s world-average clear rate trends from 96.3% in World 1 to the mid-70s by Worlds 8–10, recovers to 81.3% in Prism Orchard, then jumps to 96.7% in Moonmallow Observatory. This is a useful contrast, not a player-facing curve. World 11 also raises the move budget relative to World 10, while World 12 changes the palette to four colors.

### Targeted follow-up: jelly levels and Moon Mix

This is an automated seeded playtest using the same fixed `findBestMove` hint-policy as the first pass—not a human cohort. I increased the sample to 200 starts for each of the ten flagged jelly levels and each palette condition below. All targeted runs ended without a no-move stall.

#### Jelly bottlenecks (200 starts each)

All ten candidates remained below 50% for this policy. The results are more stable than the original 30-start screen (roughly ±7 percentage points near 50%), but still do not establish player difficulty.

| Level | Goal | Moves | Hint-policy clears |
|---:|---|---:|---:|
| 57 | 12 jelly | 24 | 98/200 (49.0%) |
| 65 | 12 jelly | 24 | 99/200 (49.5%) |
| 76 | 13 jelly | 23 | 98/200 (49.0%) |
| 79 | 14 jelly + 2,575 points | 22 | 56/200 (28.0%) |
| 84 | 14 jelly | 24 | 88/200 (44.0%) |
| 87 | 15 jelly | 22 | 80/200 (40.0%) |
| 93 | 14 jelly | 23 | 89/200 (44.5%) |
| 96 | 15 jelly | 22 | 79/200 (39.5%) |
| 99 | 16 jelly + 2,915 points | 21 | 67/200 (33.5%) |
| 103 | 16 jelly | 27 | 92/200 (46.0%) |

The strongest persistent bottlenecks are **79 (28%)**, **99 (33.5%)**, **87 (40%)**, and **96 (39.5%)**. Levels 57, 65, and 76 sit near the 50% boundary; they still warrant a human check, but are less urgent than 79/99. The earlier 30-run screen also flagged 17, 22, 26, 28, 35, 39, 48, 54, 58, 62, 64, 68, 73, 78, 85, 98, and 105 at 50–69%; those were not re-run at 200 starts.

#### Moon Mix palette A/B (200 starts per level and condition)

| Level | Current four-color | Full six-color counterfactual | Six-color refills only¹ |
|---:|---:|---:|---:|
| 111 | 200/200 (100.0%) | 200/200 (100.0%) | 200/200 (100.0%) |
| 112 | 199/200 (99.5%) | 83/200 (41.5%) | 149/200 (74.5%) |
| 113 | 199/200 (99.5%) | 172/200 (86.0%) | 187/200 (93.5%) |
| 114 | 197/200 (98.5%) | 106/200 (53.0%) | 152/200 (76.0%) |
| 115 | 200/200 (100.0%) | 181/200 (90.5%) | 196/200 (98.0%) |
| 116 | 200/200 (100.0%) | 129/200 (64.5%) | 182/200 (91.0%) |
| 117 | 199/200 (99.5%) | 69/200 (34.5%) | 125/200 (62.5%) |
| 118 | 200/200 (100.0%) | 160/200 (80.0%) | 173/200 (86.5%) |
| 119 | 146/200 (73.0%) | 82/200 (41.0%) | 137/200 (68.5%) |
| 120 | 200/200 (100.0%) | 200/200 (100.0%) | 200/200 (100.0%) |

¹ **Controlled refill-only comparison:** both variants start from the identical current four-color board and the same post-start random state; only refills/dead-board recovery switch from four to six colors. The full six-color variant regenerates the starting board from the same per-level seed, so those starting boards are paired by seed but are not identical.

Across levels 111–120, the current palette cleared **1,940/2,000 (97.0%)**. The full six-color counterfactual cleared **1,382/2,000 (69.1%)**. Changing only refills from a shared four-color start cleared **1,701/2,000 (85.1%)**. The palette is therefore a substantial easing factor for this policy; it is not just a visual distinction. The full six-color swap is also too blunt: it drops levels 112, 117, and 119 to 41.5%, 34.5%, and 41.0% respectively.

Under the current palette, score level 111 and final boss 120 clear in 200/200 runs after an average of 2.4 and 3.2 moves respectively; level 115 averages 3.6 moves. This is a warning that those objectives are very forgiving to the hint-policy, not proof that real players will find them trivial.

**Breather decision:** `README.md` and `docs/game-benchmark-blueprint.md` describe Moon Mix as a *cascade-friendly rhythm* / a way to teach longer chains; they do **not** explicitly call it a breather. The measured effect is a clear difficulty release. I recommend preserving the four-color identity and treating Moonmallow as a cascade-focused wind-down for now—not replacing it wholesale with six colors. If the final boss is meant to be a difficulty peak, adjust specific goals, layout, or boss behavior after human playtesting rather than undoing the mode identity.

## Per-level feel and probe results

“Feel” here means the intended gameplay texture from the objective, not measured emotion. This per-level table retains the original 30-run campaign screen; targeted 200-run follow-ups for its lowest-scoring jelly levels are listed above. The “probe signal” is only the 30-run hint-policy result: **Probe trouble** <50%, **Mixed results** 50–69%, **Usually clears** 70–94%, **Near-certain for probe** ≥95%. A level can still feel very different to a player.

| Level | Objective(s) | Moves | Expected feel | Probe clears | Probe signal |
|---:|---|---:|---|---:|---|
| 1 | Reach 850 points | 32 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 2 | Reach 900 points | 32 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 3 | Reach 950 points | 31 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 4 | Reach 1,000 points | 31 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 5 | Collect 6 grape candies | 30 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 6 | Clear 5 jelly tiles | 30 | Coverage sweep | 25/30 (83%) | Usually clears |
| 7 | Reach 1,200 points | 29 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 8 | Collect 6 mint candies + Clear 4 shell targets | 29 | Split focus: Color hunt + Shell-cell targeting | 29/30 (97%) | Near-certain for probe |
| 9 | Clear 6 jelly tiles | 28 | Coverage sweep | 25/30 (83%) | Usually clears |
| 10 | Defeat Captain Crumble (6 HP) | 28 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 11 | Reach 1,350 points | 30 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 12 | Collect 7 lemon candies + Reach a 2-wave cascade | 30 | Split focus: Color hunt + Chain-building | 30/30 (100%) | Near-certain for probe |
| 13 | Reach 1,395 points | 29 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 14 | Clear 7 jelly tiles | 29 | Coverage sweep | 24/30 (80%) | Usually clears |
| 15 | Reach 1,445 points + Activate 1 special candy | 28 | Split focus: Open score chase + Special-candy setup | 30/30 (100%) | Near-certain for probe |
| 16 | Collect 8 orange candies | 28 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 17 | Clear 8 jelly tiles | 27 | Coverage sweep | 15/30 (50%) | Mixed results |
| 18 | Reach 1,535 points + Clear 5 shell targets | 27 | Split focus: Open score chase + Shell-cell targeting | 25/30 (83%) | Usually clears |
| 19 | Collect 9 berry candies | 26 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 20 | Defeat Berry Bandit (7 HP) | 26 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 21 | Reach 1,510 points | 29 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 22 | Clear 7 jelly tiles | 29 | Coverage sweep | 20/30 (67%) | Mixed results |
| 23 | Collect 8 grape candies | 28 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 24 | Reach 1,580 points | 28 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 25 | Collect 9 berry candies + Deliver 1 ingredient | 27 | Split focus: Color hunt + Drop-lane timing | 23/30 (77%) | Usually clears |
| 26 | Clear 8 jelly tiles | 27 | Coverage sweep | 19/30 (63%) | Mixed results |
| 27 | Reach 1,665 points | 26 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 28 | Collect 9 orange candies + Clear 6 shell targets | 26 | Split focus: Color hunt + Shell-cell targeting | 17/30 (57%) | Mixed results |
| 29 | Clear 9 jelly tiles + Reach 1,725 points | 25 | Split focus: Coverage sweep + Open score chase | 21/30 (70%) | Usually clears |
| 30 | Defeat Zest Zapper (8 HP) | 25 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 31 | Reach 1,680 points | 28 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 32 | Collect 9 mint candies + Reach a 2-wave cascade | 28 | Split focus: Color hunt + Chain-building | 30/30 (100%) | Near-certain for probe |
| 33 | Clear 8 jelly tiles | 27 | Coverage sweep | 24/30 (80%) | Usually clears |
| 34 | Reach 1,750 points | 27 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 35 | Clear 9 jelly tiles + Activate 2 special candies | 26 | Split focus: Coverage sweep + Special-candy setup | 17/30 (57%) | Mixed results |
| 36 | Collect 10 lemon candies | 26 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 37 | Reach 1,835 points | 25 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 38 | Collect 10 mint candies + Clear 7 shell targets | 25 | Split focus: Color hunt + Shell-cell targeting | 29/30 (97%) | Near-certain for probe |
| 39 | Clear 10 jelly tiles + Reach 1,895 points | 24 | Split focus: Coverage sweep + Open score chase | 16/30 (53%) | Mixed results |
| 40 | Defeat Mallow Muncher (9 HP) | 24 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 41 | Reach 1,850 points | 27 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 42 | Clear 9 jelly tiles | 27 | Coverage sweep | 23/30 (77%) | Usually clears |
| 43 | Collect 10 berry candies | 26 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 44 | Reach 1,920 points | 26 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 45 | Collect 11 blueberry candies + Deliver 1 ingredient | 25 | Split focus: Color hunt + Drop-lane timing | 27/30 (90%) | Usually clears |
| 46 | Clear 10 jelly tiles | 25 | Coverage sweep | 23/30 (77%) | Usually clears |
| 47 | Reach 2,005 points | 24 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 48 | Clear 11 jelly tiles | 24 | Coverage sweep | 15/30 (50%) | Mixed results |
| 49 | Collect 12 berry candies + Reach 2,065 points | 23 | Split focus: Color hunt + Open score chase | 28/30 (93%) | Usually clears |
| 50 | Defeat Midnight Moth (10 HP) | 23 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 51 | Reach 2,020 points | 27 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 52 | Collect 11 orange candies + Reach a 3-wave cascade | 26 | Split focus: Color hunt + Chain-building | 26/30 (87%) | Usually clears |
| 53 | Reach 2,065 points | 26 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 54 | Clear 11 jelly tiles | 25 | Coverage sweep | 17/30 (57%) | Mixed results |
| 55 | Collect 12 berry candies + Activate 2 special candies | 25 | Split focus: Color hunt + Special-candy setup | 29/30 (97%) | Near-certain for probe |
| 56 | Reach 2,145 points | 24 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 57 | Clear 12 jelly tiles | 24 | Coverage sweep | 13/30 (43%) | Probe trouble |
| 58 | Collect 12 orange candies + Clear 9 shell targets | 23 | Split focus: Color hunt + Shell-cell targeting | 20/30 (67%) | Mixed results |
| 59 | Reach 2,235 points + Clear 12 jelly tiles | 23 | Split focus: Open score chase + Coverage sweep | 21/30 (70%) | Usually clears |
| 60 | Defeat Crystal Crumbler (11 HP) | 22 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 61 | Reach 2,190 points | 26 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 62 | Clear 11 jelly tiles | 26 | Coverage sweep | 18/30 (60%) | Mixed results |
| 63 | Collect 12 blueberry candies | 25 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 64 | Reach 2,260 points + Deliver 2 ingredients | 25 | Split focus: Open score chase + Drop-lane timing | 18/30 (60%) | Mixed results |
| 65 | Clear 12 jelly tiles | 24 | Coverage sweep | 13/30 (43%) | Probe trouble |
| 66 | Collect 13 lemon candies | 24 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 67 | Reach 2,345 points | 23 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 68 | Clear 13 jelly tiles | 23 | Coverage sweep | 15/30 (50%) | Mixed results |
| 69 | Collect 14 blueberry candies + Reach 2,405 points | 22 | Split focus: Color hunt + Open score chase | 29/30 (97%) | Near-certain for probe |
| 70 | Defeat Neon Nibbler (12 HP) | 22 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 71 | Reach 2,360 points | 26 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 72 | Collect 13 lemon candies + Reach a 3-wave cascade | 25 | Split focus: Color hunt + Chain-building | 28/30 (93%) | Usually clears |
| 73 | Clear 12 jelly tiles | 25 | Coverage sweep | 15/30 (50%) | Mixed results |
| 74 | Reach 2,430 points | 24 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 75 | Collect 14 blueberry candies + Activate 3 special candies | 24 | Split focus: Color hunt + Special-candy setup | 21/30 (70%) | Usually clears |
| 76 | Clear 13 jelly tiles | 23 | Coverage sweep | 12/30 (40%) | Probe trouble |
| 77 | Reach 2,515 points | 23 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 78 | Collect 14 lemon candies + Clear 9 shell targets | 22 | Split focus: Color hunt + Shell-cell targeting | 18/30 (60%) | Mixed results |
| 79 | Clear 14 jelly tiles + Reach 2,575 points | 22 | Split focus: Coverage sweep + Open score chase | 9/30 (30%) | Probe trouble |
| 80 | Defeat Frost Flurry (13 HP) | 21 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 81 | Reach 2,530 points | 25 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 82 | Clear 13 jelly tiles | 25 | Coverage sweep | 21/30 (70%) | Usually clears |
| 83 | Collect 14 grape candies | 24 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 84 | Clear 14 jelly tiles | 24 | Coverage sweep | 13/30 (43%) | Probe trouble |
| 85 | Reach 2,625 points + Deliver 2 ingredients | 23 | Split focus: Open score chase + Drop-lane timing | 17/30 (57%) | Mixed results |
| 86 | Collect 15 mint candies | 23 | Color hunt | 29/30 (97%) | Near-certain for probe |
| 87 | Clear 15 jelly tiles | 22 | Coverage sweep | 10/30 (33%) | Probe trouble |
| 88 | Reach 2,715 points + Clear 9 shell targets | 22 | Split focus: Open score chase + Shell-cell targeting | 24/30 (80%) | Usually clears |
| 89 | Collect 15 grape candies + Reach 2,745 points | 21 | Split focus: Color hunt + Open score chase | 28/30 (93%) | Usually clears |
| 90 | Defeat Comet Cookie (14 HP) | 21 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 91 | Reach 2,700 points | 24 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 92 | Collect 15 mint candies + Reach a 3-wave cascade | 24 | Split focus: Color hunt + Chain-building | 29/30 (97%) | Near-certain for probe |
| 93 | Clear 14 jelly tiles | 23 | Coverage sweep | 9/30 (30%) | Probe trouble |
| 94 | Collect 15 orange candies | 23 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 95 | Reach 2,795 points + Activate 3 special candies | 22 | Split focus: Open score chase + Special-candy setup | 25/30 (83%) | Usually clears |
| 96 | Clear 15 jelly tiles | 22 | Coverage sweep | 13/30 (43%) | Probe trouble |
| 97 | Collect 15 berry candies | 21 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 98 | Reach 2,885 points + Clear 9 shell targets | 21 | Split focus: Open score chase + Shell-cell targeting | 20/30 (67%) | Mixed results |
| 99 | Clear 16 jelly tiles + Reach 2,915 points | 21 | Split focus: Coverage sweep + Open score chase | 10/30 (33%) | Probe trouble |
| 100 | Defeat Crowned Caramel (15 HP) | 20 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 101 | Reach 3,000 points | 28 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 102 | Collect 14 lemon candies | 28 | Color hunt | 30/30 (100%) | Near-certain for probe |
| 103 | Clear 16 jelly tiles | 27 | Coverage sweep | 8/30 (27%) | Probe trouble |
| 104 | Collect 14 blueberry candies + Clear 6 shell targets | 27 | Split focus: Color hunt + Shell-cell targeting | 23/30 (77%) | Usually clears |
| 105 | Deliver 2 ingredients | 26 | Drop-lane timing | 19/30 (63%) | Mixed results |
| 106 | Activate 3 special candies | 26 | Special-candy setup | 25/30 (83%) | Usually clears |
| 107 | Collect 15 mint candies + Reach a 3-wave cascade | 25 | Split focus: Color hunt + Chain-building | 28/30 (93%) | Usually clears |
| 108 | Reach 3,210 points + Clear 8 shell targets | 25 | Split focus: Open score chase + Shell-cell targeting | 22/30 (73%) | Usually clears |
| 109 | Collect 16 berry candies + Activate 2 special candies | 24 | Split focus: Color hunt + Special-candy setup | 29/30 (97%) | Near-certain for probe |
| 110 | Defeat Lady Luma (17 HP) | 24 | Boss damage race | 30/30 (100%) | Near-certain for probe |
| 111 | Reach 3,300 points | 27 | Open score chase | 30/30 (100%) | Near-certain for probe |
| 112 | Clear 19 jelly tiles | 26 | Coverage sweep | 29/30 (97%) | Near-certain for probe |
| 113 | Collect 16 orange candies + Clear 8 shell targets | 26 | Split focus: Color hunt + Shell-cell targeting | 29/30 (97%) | Near-certain for probe |
| 114 | Deliver 2 ingredients | 25 | Drop-lane timing | 30/30 (100%) | Near-certain for probe |
| 115 | Collect 16 lemon candies + Reach a 3-wave cascade | 24 | Split focus: Color hunt + Chain-building | 30/30 (100%) | Near-certain for probe |
| 116 | Activate 4 special candies | 24 | Special-candy setup | 30/30 (100%) | Near-certain for probe |
| 117 | Clear 21 jelly tiles | 23 | Coverage sweep | 30/30 (100%) | Near-certain for probe |
| 118 | Reach 3,510 points + Clear 10 shell targets | 23 | Split focus: Open score chase + Shell-cell targeting | 30/30 (100%) | Near-certain for probe |
| 119 | Collect 17 blueberry candies + Deliver 2 ingredients | 22 | Split focus: Color hunt + Drop-lane timing | 22/30 (73%) | Usually clears |
| 120 | Defeat Mallow Nova (20 HP) | 21 | Boss damage race | 30/30 (100%) | Near-certain for probe |

## Tuning priorities (before changing numbers)

1. **Playtest the ten sub-50% jelly levels first** (see above), plus a sample of 50–69% levels. Record attempts, moves left on wins, failed objective remainder, boosters used, time-to-complete, and a quick perceived-difficulty score. Use novice and experienced cohorts separately.
2. **Add more board-level variety** every few stages: authored silhouettes, blockers/terrain, asymmetric target placement, or objective interactions. Keep the familiar open-board levels as breathers; do not rely only on larger counts or fewer moves.
3. **Check the score/boss pace.** All score-only and boss levels are 30/30 for this policy. If human tests confirm they are trivial, make them more distinctive through constraints or boss behavior rather than simply inflating target numbers.
4. **Treat World 12 as a cascade-focused wind-down for now.** That matches the documented Moon Mix intent and the measured ease effect. If the final chapter should instead peak in difficulty, test level-specific goals or boss behavior after human sessions; do not replace the four-color identity wholesale.
5. **Tune from cohorts, not the bot number.** Compare median and average attempts, moves used, retries, booster use, and abandonment by skill band. Then use simulation as an additional regression signal.

## Human playtest kit

A development-only `?playtest=<level>` launch opens the map at any authored level, unlocks levels in memory, and does not read or overwrite the normal save. It is ignored in production. Use `docs/campaign-human-playtest-scorecard.md` for the target slice, questions, and per-attempt notes. The local preview is not a deployment.

## Source notes

- Kristensen, J. T. & Burelli, P. (2024), “Difficulty Modelling in Mobile Puzzle Games.” [2](https://arxiv.org/pdf/2401.17436)
- King Help Center, “Which game modes will I find?” [1](https://candycrush.zendesk.com/hc/en-us/articles/360000754897-Which-game-modes-will-I-find)
- Game Developer / Room 8 Studio, “Smart & Casual: The State of Tile Puzzle Games Level Design. Part 1.” [10](https://www.gamedeveloper.com/design/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1)

---

Prepared from the campaign manifest and a local deterministic simulation; no deployment, commit, or production telemetry was involved.
