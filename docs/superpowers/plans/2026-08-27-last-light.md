# Last Light Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the bounded simulation/campaign tasks and independent code review. Presentation integration is owned by the primary agent.

**Goal:** Deliver and verify a complete 25-level mobile stealth game.

**Architecture:** A pure tile-unit simulation with Phaser presentation and HTML overlays. Authored level data remains separate from scene logic. Procedural audio and art require no external assets.

**Tech Stack:** TypeScript, Vite, Phaser 3, Vitest.

**Spec:** docs/superpowers/specs/2026-08-27-last-light-design.md

## Global Constraints

- TypeScript + Vite + Phaser 3; no backend, account, paid assets, ads or combat.
- Portrait, touchscreen + mouse + keyboard; small maps; deterministic behavior.
- At least 25 manually designed solvable levels with the brief's exact progression.
- All production behavior verified; npm run build must succeed.
- Shared types are src/game/types.ts. Positions and speeds are tile units / seconds.
- User asks for autonomous completion; do not pause for questions.

### Task 1: Simulation and storage

**Files:** src/game/systems/{Geometry,Simulation,ProgressManager}.ts; tests/{simulation,progress}.test.ts.

**Interfaces:** `Simulation(level: Level)` exposes `level`, `state: GameState`, `step(input: InputState, dt: number): void`, `reset(): void`. Geometry exports `distance(a,b)`, `hasLineOfSight(a,b,walls)`, `isWalkable(point,level,radius?)`, `findPath(start,end,level): Vec[]`, `securityAngle(spec,time)`, `inSecurityLight(point,spec,time,walls)`. `ProgressManager(storage?: Pick<Storage,'getItem'|'setItem'>)` exposes `data: Progress`, `record(id,stats,level): number`, `updateSettings(partial): void`, `reset(): void`; `scoreRun(stats,level): number`.

- [ ] Write real fixture-based tests: lit player in clear range alerts a watcher; wall blocks alert; dark player does not alert; light release stops live tracking while preserving memory; alert/chase/search/return/patrol all reachable; slow listener approach stays unheard; fast approach causes investigation; security light exposes dark player; movement collides with walls; capture and exit are terminal; energy drains/recharges/exhausts; reset restores pristine state.
- [ ] Run `npm test -- tests/simulation.test.ts tests/progress.test.ts` and record initial failure.
- [ ] Implement systems against shared types with deterministic time and no Phaser/browser dependency in Simulation.
- [ ] Storage tests use an actual in-memory Storage-shaped class and round-trip a new manager. Check malformed JSON, invalid types, quota throw, unlock clamp, best result merge, setting persistence.
- [ ] Run tests green; self-review; record evidence in docs/qa/core-report.md.

### Task 2: Authored campaign

**Files:** src/game/levels/levels.ts; tests/campaign.test.ts.

**Interfaces:** `levels: Level[]` and `getLevel(id: number): Level`. Uses Simulation and shared types. Each room has explicit walls/routes and an explicit solution polyline; any helpers only expand authored geometry, never generate random maps.

- [ ] Assert 25 sequential unique rooms, specified progression, clear collision-safe paths and every waypoint in bounds.
- [ ] Run `npm test -- tests/campaign.test.ts` and observe failure.
- [ ] Author distinct maps: 1–3 no enemies; 4–6 stationary watcher; 7–9 patrol; 10–12 LOS corners; 13–15 multi-patrol with offsets; 16–18 energy; 19–21 Listener; 22–23 security; 24–25 combine all. Include occasional clear trap obstacles and route-around solutions.
- [ ] Replay each solution in real Simulation at fixed dt with slow movement near listeners and timed security-safe crossings. Report genuine escape for all, not only flood fill.
- [ ] Run tests green and record evidence in docs/qa/campaign-report.md.

### Task 3: Presentation, input and audio

**Files:** src/{main.ts,style.css}; src/game/scenes/{BootScene,MenuScene,GameScene}.ts; src/game/ui/{AppUI,Controls}.ts; src/game/systems/{WorldRenderer,AudioManager,HintService}.ts; tests/{controls,hint}.test.ts; index.html.

**Interfaces:** Scenes consume Simulation and levels. AppUI owns screen transitions and calls scene actions through a small callback object. Controls exposes `read(): InputState`, `clear()`, `destroy()`. AudioManager exposes `unlock`, `setEnabled`, `setTension`, `play`, `suspend`.

- [ ] Test pointer identity, analog magnitude, immediate light release/cancel, independent touch controls, and hint waypoint selection before implementation.
- [ ] Implement a complete live room, light compositor, silhouettes, dust, traps/doors, security cones and AI warnings in Phaser. Render no debug UI in production.
- [ ] Implement splash/menu, 25-room select, settings, pause, retry, hint, win/fail overlays and final campaign finish.
- [ ] Implement procedural ambient/metal/footsteps/heartbeat/alert/light/escape sounds, sound toggles and opt-in vibration.
- [ ] Test controls and DOM transitions in the browser at desktop and narrow portrait sizes. Test light visuals, visibility and state feedback.

### Task 4: Verification and handoff

**Files:** README.md; docs/qa/verification.md; defects and regression tests in affected modules.

- [ ] Run the complete unit/campaign suite.
- [ ] Start and inspect the game; exercise navigation, movement, light, pause, capture/retry and escape/progression, saving and resizing.
- [ ] Obtain independent spec and code review; resolve important findings with regression tests.
- [ ] Run `npm run build`; inspect production preview and verify debug UI absent.
- [ ] Document controls, architecture, level editing, local-first behavior and Capacitor webDir dist preparation; leave the working local preview available.
