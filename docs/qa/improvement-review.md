# Last Light improvement review

Scope: whole-project review looking for improvement opportunities, requested after the 1.0 verification gate. Read-only analysis; no source files were changed by this review. Baseline commit `5bdf0e0`, branch `claude/game-improvement-areas-pd9nzd`. Full suite re-run on this baseline: 9 files, 92 tests passed. Production build clean.

Measurements below were taken against the real `Simulation` class using a throwaway harness under `tests/`, then removed. Section C3 proposes keeping that harness as a permanent test.

## Method

A deliberately naive bot was driven through all 25 rooms. Its entire policy: re-path to the exit every 0.25s with `findPath`, walk that path at full analog magnitude, never raise the light, never react to an enemy. No waiting, no hiding, no patrol timing. A second variant held the light on for the whole run. A third treated traps as walls, isolating stealth failures from trap deaths.

## Result summary

| Bot | Escaped | 3-star |
| --- | --- | --- |
| Light never on, trap-aware | 21 / 25 | 16 / 25 |
| Light never on, trap-blind | 20 / 25 | 16 / 25 |
| Light always on | 18 / 25 | 0 / 25 |

Rooms where the zero-effort bot is caught: 12, 14, 15, 21. Rooms where it escapes but is detected: 20, 22, 23, 24, 25. Every other room yields a perfect score to a bot with no stealth behaviour at all.

## A. Core loop

### A1. Dark-only invisibility — accepted constraint, measured cost

`Simulation.canPerceive()` gates all perception on `visible = lightOn || securityExposed` (`src/game/systems/Simulation.ts:164`). With the light off a watcher does not perceive the player at any distance; only the 0.38-unit contact check in `resolveContacts()` can end the run. 18 of 25 rooms contain neither a listener nor a security light, so in those rooms an unlit player cannot be caught by any means except walking into an enemy or a trap. 15 of 25 authored solutions contain no `flash` point.

This is not a defect. `docs/qa/campaign-fixes.md:9` records the instruction directly: *"preserve dark-only solvability (the user explicitly allows memorizing rooms and travelling in darkness). Do not add mandatory light gates or alter core AI to force energy use."* `docs/qa/progress.md:53` gives the same ruling with its rationale, and anticipates the risk: *"if this gives too little energy pressure, balance may need future adjustment, not a forced-light rule."*

What this review adds is the size of that adjustment. The gap is wider than energy pressure: with no stealth behaviour whatsoever a bot clears 21 rooms and perfect-scores 16. The campaign currently measures no stealth skill of any kind, not merely no light usage. The remedies in A2 and A3 are the ones compatible with the standing constraint.

### A2. Enemies have no facing — 360-degree perception

`Enemy.angle` is assigned every frame in `moveEnemy()` (`Simulation.ts:246`) and is never read anywhere in the codebase. `player.angle` (`Simulation.ts:125`) is likewise dead. `WorldRenderer.figure()` draws the figure without rotation, so the field reaches neither AI nor presentation.

Perception is therefore a pure radius-and-line-of-sight test. Approaching from behind, waiting out a turn, and staying in a blind arc — the core vocabulary of the genre — have no mechanical existence; patrol routes act only as moving circles. The renderer draws fixed-angle "ear" arcs for listeners (`WorldRenderer.ts:176`), so the visual language already implies a directionality the simulation does not have.

Suggested direction: add a `fov` field to `EnemySpec`, constrain the `vision` term with `Math.abs(angleBetween(directionToPlayer, enemy.angle)) <= fov / 2`, keep a short 360-degree peripheral radius, and draw the cone. `angleBetween` already exists in `Geometry.ts:122`.

This lever does not conflict with A1: it adds no mandatory light gate and forces no energy use. It converts dark travel into a real skill, since the player memorises where a patrol is looking rather than only where it walks — which is the memorisation the standing decision was written to protect.

### A3. Par times are roughly five times too generous

Three-star scoring requires no detections, time under `parTime`, and light time under `lightBudget` (`ProgressManager.scoreRun`). Because light is optional, `lightTime` is effectively always zero, and par is far out of reach of failure. Three conditions collapse into one.

| Room | Bot time | Par | Slack | Authored ideal |
| --- | --- | --- | --- | --- |
| 04 Still eyes | 5.4s | 28s | 5.2x | 7.1s |
| 11 Paper walls | 5.0s | 30s | 6.0x | 6.7s |
| 15 Staggered hall | 4.6s | 32s | 7.0x | 7.1s |
| 21 Quiet machinery | 2.2s | 22s | 10.0x | 17.5s |
| 25 Last light | 6.6s | 32s | 4.9x | 26.2s |

In 20 rooms the authored route itself finishes 15.8–24.9s inside par. Only the listener rooms (19–21, 24–25) sit on a real 4.4–5.8s margin. Retuning par toward 1.3–1.6x the authored ideal is a single data-file change, and is the "balance adjustment" the earlier ruling pointed at.

Note that no test asserts anything about `parTime` anywhere in the suite. `campaign.test.ts:110` bounds `lightTime` against `level.lightBudget`, but the time half of the three-star condition is unguarded, so a par value can drift arbitrarily without any test noticing. See C3.

### A4. Rooms 4–15 repeat one solution shape

Eleven of those twelve authored solutions are the same route: reach an outer wall lane at x ≈ 1.5 or 8.5, run to y = 2, cross the top to the exit. Room 5 is `[{1.5,12},{1.5,2}]`, room 9 is `[{1.5,8.2},{1.5,2},{8.5,2}]`, room 15 is `[{1.5,8.2},{1.5,2},{8.5,2}]`. Walls and patrols change; the play does not.

The chapters introduce mechanics in order (watcher, patrol, cover, two enemies, energy, listener, beam) but none of them is tested afterwards — the same edge lane keeps working once the new element is added. Closing the outer lane in each chapter's final room, or placing a bottleneck passable only on patrol timing, would make the introductions pay off. Some of this resolves itself once A2 lands.

## B. Defects and player feedback

### B1. Joystick nub saturates at 73% of real throttle

`Controls.move()` clamps the nub at 32px with `Math.min(1, 32 / Math.hypot(dx, dy))` (`src/game/ui/Controls.ts:47`), while `ControlState.move()` reaches full magnitude at 44px (`ControlState.ts:21`). Between 32px and 44px of drag the nub does not move at all while speed rises from 73% to 100%.

This is a fairness problem in listener rooms specifically. The noise threshold is `actualSpeed > 1` (`Simulation.ts:144`), i.e. 41.7% of `MAX_SPEED`. The point the player must hold to stay silent sits inside the band where the stick gives no visual signal. Fix: share one constant between the two files.

### B2. The player cannot see their own noise

`state.noiseRadius` is simulated but drawn only in the DEV F2 overlay (`WorldRenderer.debug()`, `WorldRenderer.ts:264`). The HUD reacts only after a listener has already been alerted — `AppUI.update()` shows `THE LISTENER HEARS YOU. WALK SLOWLY.` once `listenerAware` is true — so the feedback arrives after the mistake rather than before it.

Combined with B1, listener rooms ask the player to hold an invisible threshold with a control that gives no readout. The data and the drawing code both already exist; surfacing the ring, or marking the silent band on the joystick, is small.

### B3. Level-select chapter names contradict the level data

`AppUI.levelSelect()` hardcodes five names in groups of five (`AppUI.ts:61-64`): THE AWAKENING, WATCHFUL SHADOWS, OUT OF SIGHT, A FADING SIGNAL, THE LAST WAY OUT. `levels.ts` defines nine chapters in groups of three: The awakening, The watchers, Patrol patterns, Shadows and screens, Two at a time, Borrowed light, Listening posts, Searchlights, The last watch.

Four of the five displayed names appear nowhere in the game data, and `Level.chapter` is read by nothing — it is dead data. The group boundaries are also wrong: "Borrowed light" begins at room 16, which the UI places mid-way through its "A FADING SIGNAL" block. Deriving the groups from `level.chapter` makes the level data the single source of truth.

### B4. The status line is not a live region

`#status-text` carries the primary gameplay feedback — HIDDEN IN THE DARK, THEY CAN SEE YOU, EXPOSED IN THE BEAM — and has no `aria-live`. The only live region in the interface is the hint toast (`#toast`, `role="status"`).

A screen-reader player is never told that they have become visible, entered a beam, or been heard. The rest of the UI work is careful here (focus trap, `inert` on the gameplay layer during modals, labelled controls), which makes the omission stand out. Adding `role="status"` and `aria-live="polite"` to `.game-status` is sufficient; the text is already only rewritten when it changes (`AppUI.ts:107`).

## C. Architecture and performance

### C1. Phaser is 94% of the JS payload and is barely used

| Production bundle | Raw | Gzip |
| --- | --- | --- |
| phaser | 1,208 kB | 332 kB |
| game | 59 kB | 20 kB |
| css | 20 kB | 5 kB |

The complete Phaser surface in use: `Phaser.Game`, four `Scene` subclasses, one `Textures.CanvasTexture`, one `GameObjects.Image`, `Scale.RESIZE`/`CENTER_BOTH`, `input.keyboard` for a single DEV-only F2 binding, and the `registry` as a service locator. All drawing is hand-written Canvas2D inside `WorldRenderer`.

A mobile-first game therefore downloads 332 kB gzipped to draw on a raw canvas — sixteen times the size of the game itself. Replacing it with a `<canvas>`, a `requestAnimationFrame` loop and a small scene switch is a bounded change because game logic already has no Phaser dependency (`Simulation`, `Geometry`, `ControlState`, `ProgressManager` are all pure), so the existing test suite is unaffected. This is independent of every gameplay item above.

### C2. findPath costs 3ms per call

`findPath()` rebuilds the full ~609-cell walkable grid on every call, running a `hasLineOfSight` against the start point for each cell, then runs Dijkstra by linear-scanning the whole node map for the minimum at every settle (`Geometry.ts:61-101`). Measured on this container: **3.05 ms per call** on room 25.

Enemies re-path every 0.3s (`Simulation.ts:262`) and their timers are not staggered, so two enemies can re-path on the same tick for ~6 ms. On a mid-range phone at 3–5x slower that is 20–30 ms — a dropped frame, arriving exactly during a chase. Cheapest fixes first: cache the walkable-node grid per level since it is static; replace the linear scan with a binary heap; stagger the per-enemy `repathAt` offsets.

### C3. Tests prove the authored route works, never that a naive route fails

`campaign.test.ts` replays every authored route through the real simulation and asserts escape — a good and unusual test. `docs/qa/verification.md` states the limit honestly: these are "solvability certificates for a particular route, not proof that arbitrary input is safe."

The untested direction is the one that matters for balance: nothing asserts that a *trivial* route should fail. The campaign is green because it is solvable, not because it is challenging, which is why A1 and A3 could drift without any test noticing. `parTime` in particular is asserted by nothing in the suite — `campaign.test.ts:110` bounds light time against `lightBudget`, but no test bounds run time against par.

Suggested addition: promote the bot used in this review into a permanent test — "a straight-line sprint bot with no stealth logic must not earn 3 stars in room N". That turns difficulty into a regression-guarded property and gives the A3 retune an instrument.

### C4. The number 25 is hardcoded in seven places

`ProgressManager.MAX_LEVEL = 25` (`ProgressManager.ts:4`); `AppUI` has `/ 25` twice (`AppUI.ts:52`, `AppUI.ts:87`), `completed * 4` for the progress bar (100/25), `/ 75 ★` in the level-select footer (25×3), `id === 25` for the final-room check (`AppUI.ts:142`), and `chapter < 5` plus `slice(chapter * 5, chapter * 5 + 5)` in the level grid.

Adding a 26th room requires six separate edits, none of them test-guarded — which is the same class of drift that produced B3. Deriving all of them from `levels.length` and `level.chapter` removes the category.

## Suggested order

1. **A2, vision cones.** Best impact per unit of work: the angle is already computed, `angleBetween` already exists, and it gives all 25 existing rooms a new solution dimension without touching the A1 constraint.
2. **A3, retune par times.** The balance adjustment the earlier ruling called for. Do it after A2, which will change every route time anyway. One data file.
3. **B1 + B2, make the control honest.** A few hours together, and they make the existing listener rooms fair. The control needs to be readable before difficulty goes up.
4. **C3, add the bot test.** The instrument for the rebalancing work, and the guard against it drifting back.
5. **A4, vary rooms 4–15.** After A2, since cones will re-contextualise some of these rooms on their own.
6. **C1, remove Phaser.** Fully independent of gameplay; high value if mobile first-load is a goal, but it blocks nothing else.
7. **B3, B4, C2, C4.** Small, independent cleanups.

## Limits of this review

No browser or physical-device testing was performed; all measurements are headless, against the deterministic simulation, on x86 container hardware. The per-call `findPath` timing in C2 is a relative signal for mobile, not a device measurement. The bot in the method section approximates an unskilled player pressing toward the exit; it is a lower bound on difficulty, not a model of real play. Nothing in sections A or B was implemented — this review is analysis only, and the design ruling in A1 stands unless the owner decides otherwise.
