# Task 2: Authored campaign

Read src/game/types.ts, src/game/levels/levels.ts and tests/campaign.test.ts. Existing rooms 1–3 are implemented and simulation-replayed successfully. Initial RED already recorded: expected ids1..25 but received1..3. Extend this to the complete campaign, not a procedural generator.

## Ownership

Edit src/game/levels/levels.ts, tests/campaign.test.ts; optionally add campaign data/helper files under src/game/levels and tests/utilities. You may extend `Level.solution` in types.ts to `SolutionPoint[]` where SolutionPoint extends Vec with optional wait (seconds) and speed (analog magnitude). Coordinate paths remain compatible with HintService. No other production edits, no npm installs, no subagents, no git repository. Use apply_patch. Primary owns visual/UI work concurrently.

## Binding requirements

- 25 manually authored distinct solvable levels. Keep first3 unless a real test defect needs correcting. Distinct named rooms, explicit walls and enemy routes; simple helper for perimeter/default metadata allowed but no algorithmic map generation.
- All maps10x14 is recommended for rendering consistency. Map limits x0..10,y0..14; .4 thick perimeter walls. Walkable coordinates away from walls by >.2; integer or half-grid points preferred for enemy pathfinding.
- Levels4–6 one stationary watcher each (one-point route). Passing near them in darkness must be possible, lighting nearby should expose risk.
- Levels7–9 moving patrol watcher(s), simple predictable routes.
- Levels10–12 LOS-blocking corners/screens form the solution.
- Levels13–15 at least two watchers with offset patrol phases (phase 0..1 influences routeIndex) and distinct timing.
- Levels16–18 limited light on; keep it enabled thereafter. Route should be doable with short bursts, not only blindly along map edge.
- Levels19–21 include Listener (type listener), slow input magnitude .38 is inaudible (speed<1 tile/s).
- Levels22–23 use sweeping security lights; explicit angle radians, sweep radians, period seconds, radius tiles. Avoid embedding source in wall, which blocks its own beam. Walled safe zones and timed crossings should matter.
- Levels24–25 combine patrol watcher, Listener, limited light, LOS walls, security sweeps; genuinely puzzle-like.
- Occasional trap contact obstacles are fine, never block all paths. Avoid unavoidable spawn capture, exit occupied, enemy route in wall, impossible corners, and random enemy movement.
- Tests must verify 25 unique walls, all starts/exits/route waypoints walkable, traps avoid spawn/exit, routes in bounds, progression, and all25 escape by replaying authored solution in actual Simulation with real elapsed time and movement (no teleport, no disabling enemies/security). Existing slow default route replay can be extended with explicit waits/speed for security crossings. At least one sensible solution each is required; don't weaken collision/AI to pass. Tests should fail if an escape is blocked.
- Additionally verify each new enemy actually represents light/noise risk somewhere on room's reachable route, not isolated behind walls forever. Provide a conservative certificate and report what it proves, without claiming physical-device testing.
- Pars should permit 3 stars at full/controlled speed with a little spare time, light budgets typically5–10secs. Provide short one-sentence hint for every room. Menu chapter grouping is fixed in5 groups of5, but chapter metadata can be descriptive.

## Deliverable

Run `npm test -- tests/campaign.test.ts` (require_escalated needed for esbuild parent-directory read), fix real failures, then `npm test`/build if own code ready (root may be changing UI tests). Write full report and per-level escape evidence/time in docs/qa/campaign-report.md; return short status, number of passing tests, concerns. Include RED/GREEN. Do not invoke Sites: this is a local Phaser game with explicit no-server/Capacitor-ready requirement.
