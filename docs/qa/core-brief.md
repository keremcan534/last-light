# Task 1: Simulation and storage

Read src/game/types.ts first; these are binding interfaces. Implement only systems and tests described here. No Phaser or DOM dependency in Simulation. Workspace has no git repository; do not initialize/commit. Use apply_patch. Do not spawn subagents. Follow TDD and include RED/GREEN evidence.

## Files and exports

- src/game/systems/Geometry.ts: `distance(a: Vec,b: Vec): number`, `hasLineOfSight(a: Vec,b: Vec,walls: Wall[]): boolean`, `isWalkable(point: Vec,level: Level,radius = 0.2): boolean`, `findPath(start: Vec,end: Vec,level: Level): Vec[]`, `securityAngle(spec: SecuritySpec,time: number): number`, `inSecurityLight(point: Vec,spec: SecuritySpec,time: number,walls: Wall[]): boolean`.
- src/game/systems/Simulation.ts: class `Simulation` with public `level: Level`, `state: GameState`, constructor(level), `step(input: InputState, dt: number): void`, `reset(): void`.
- src/game/systems/ProgressManager.ts: class `ProgressManager(storage?: Pick<Storage,'getItem'|'setItem'>)` with public `data: Progress`, `record(id: number,stats: RunStats,level: Level): number`, `updateSettings(partial: Partial<Settings>): void`, `reset(): void`. Export `scoreRun(stats,level): number`.
- tests/simulation.test.ts and tests/progress.test.ts.

## Mechanics

Tile centers are at integer coordinates; map spans x=0..width, y=0..height, walls are top-left rectangles. Player radius about .2 tiles, movement max ~2.4 tiles/s with quick acceleration and deceleration. Input analog vector magnitude is speed; Shift/slow about .4 max speed. Collision swept/substepped to avoid tunneling and slide along walls. Frame dt passed at 1/60; cap excessive dt safely. player.angle uses Math.atan2(dy,dx).

Watcher sees ONLY if player.lightOn OR player.securityExposed AND distance < ~3.6 tiles AND LOS. Listener has poor vision (~1.8 tiles) but hears movement > ~1 tile/s within noise radius (fast max radius ~2.3), with wall occlusion. Slow movement <1 tile/s must be inaudible, so every puzzle has a deterministic stealth solution.

Enemy patrol -> alert (.4s warning) -> chase (last known player position); turning light off stops omniscient tracking immediately. Keep memory ~1.4 seconds then search at last known location ~1.4s then return to nearest patrol point and patrol. Chase/path movement must route around walls using cheap bounded grid BFS; do not let actors enter walls. Detect increments once per new awareness episode and emits alert once. Listener noise should trigger investigation and have warning reaction. Stationary route length 1 must return to its point. Patrol phase seeds routeIndex and/or initial waiting time for alternating patrols, deterministic across reset.

Light switches immediately on/off on step, no fade on release. Light energy enabled drains in ~7 seconds while on and recharges in ~5 seconds dark. Depletion turns off, emits empty once and prevents rapid on/off flicker until at least 20% charged. Unlimited levels keep energy=1. stats.lightTime counts actual on time, stats.time uses playing time only. Expose securityExposed and visible, noiseRadius. Contact enemy radius ~.38 captures even in darkness (still cannot see player); trap contact ~.3 captures with cause trap. Exit contact .42 escapes. Events cleared each step; terminal state stays terminal until reset. Footstep events while actual movement, limited cadence; empty and transitions not spammed.

Security cone angle = base angle + sin(time/period*2π + phase)*sweep. Cone half width .26 radians, radius spec.radius. LOS blocked by walls. Export helper used by rendering to guarantee consistency.

## Persistence/scoring

Use key `last-light:progress:v1`; default unlocked 1, completed {}, settings {sound:true,vibration:false,reducedMotion:false}. Handle inaccessible localStorage (including getter throw), parse errors, invalid object/array/NaN values, quota failures without crashing or resetting current in-memory progress. Clamp unlocked to 1..25. Completed valid ids 1..25; stars integer1..3, finite nonnegative bestTime. Completion of id unlocks next (max25) and merges best stars max and best time min. Score 1 if detected, 3 if no detection AND time<=parTime AND lightTime<=lightBudget, otherwise 2. record returns THIS run's stars (not prior best). settings update persists. Reset progress but preserve settings.

## Required tests

Clear lit alert; wall/dark blocks alert; memory remembers location not current dark player; all five states; deterministic reset; collision slide and no tunneling; bounds; fast vs slow listener; occluded noise; security cone/angle/LOS and dark exposure; energy recharge/deplete/release/rearm; trap and enemy capture; exit and terminal state; score cases; storage round-trip and max/min merge; corrupted/unavailable storage; invalid schema.

Run focused tests, report evidence to docs/qa/core-report.md. Root owns dependency install; npm test available shortly. If absent, wait while editing tests (no independent installs).
