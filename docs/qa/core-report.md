# Core simulation and persistence QA report

## Scope

Implemented the assigned deterministic, DOM-free core modules only:

- `src/game/systems/Geometry.ts`
- `src/game/systems/Simulation.ts`
- `src/game/systems/ProgressManager.ts`
- `tests/simulation.test.ts`
- `tests/progress.test.ts`

## TDD evidence

### RED

Initial focused run, before the core modules existed:

```text
npm test -- tests/simulation.test.ts tests/progress.test.ts
FAIL tests/progress.test.ts: Cannot find module ../src/game/systems/ProgressManager
FAIL tests/simulation.test.ts: Cannot find module ../src/game/systems/Geometry
```

After the first implementation pass, the focused suite exercised six remaining behavioral mismatches (security cone fixture, capped-dt slide expectation, alert timing, security-source exposure, and held-button energy behavior). The fixtures were corrected where they contradicted the specified capped timestep; the production energy/security behavior was corrected where it violated the requirements.

Final regression RED before episode bookkeeping:

```text
npm test -- tests/simulation.test.ts
FAIL counts and emits an alert once throughout one awareness episode
expected 2 to be 1
```

### GREEN

```text
npm test -- tests/simulation.test.ts tests/progress.test.ts
Test Files  2 passed (2)
Tests       18 passed (18)
```

Focused type check:

```text
npx tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext \
  --moduleResolution Bundler --strict --skipLibCheck \
  src/game/types.ts src/game/systems/Geometry.ts \
  src/game/systems/Simulation.ts src/game/systems/ProgressManager.ts
exit 0
```

## Coverage summary

- Geometry: wall LOS, bounds/padded collision, grid pathing, sweep angle/cone/LOS.
- Simulation: swept sliding collision, watcher and listener sensing, noise occlusion, awareness memory and all five AI states, one-alert episodes, deterministic reset, security exposure, light energy/rearm, trap/enemy/exit terminal behavior.
- Progress: scoring, storage round-trip, best-result merging, settings/reset, corrupted/unavailable/invalid storage.

## Self-review

- The simulation contains no Phaser or DOM imports and uses a capped fixed-step-safe update, substeps for collision, and deterministic BFS routing.
- AI visibility is immediately recomputed from the current light/security state; dark players do not update a watcher's last-known position.
- Persistence treats browser storage as optional and leaves valid in-memory progress intact when reads/writes throw.
- Event emission is transition/cadence based, with events cleared at each step and terminal state immutable until `reset()`.

## Integration note

The initial integration build was temporarily blocked by a concurrently created UI import. A fresh full production build now passes after the scene work landed.

## Fix round 1: enemy movement, energy accounting, and pathing

### Root-cause trace

- `updateEnemies()` always called `moveEnemy()` after advancing state, so `alert` enemies patrolled during their warning period.
- `return` read the previous `routeIndex`; no transition calculated the closest patrol point.
- `search` consumed its dwell timer before the enemy reached `lastKnown`.
- Limited-light accounting charged an entire frame even when only part of the energy remained. (The unlimited-energy accounting statement below was corrected in round 3.)
- Raw input used the clamped magnitude both to normalize and scale, which cancelled the clamp for vectors over unit length.
- A grid route was recomputed every frame; an unreachable `findPath()` result of `[start]` then fell back to the direct target. BFS also used `Array.shift()`.

### RED

New focused regressions were added before the core changes. The first run reproduced the four existing defects:

```text
npm test -- tests/simulation.test.ts
FAIL holds an enemy still for the alert warning duration
  expected x 4.0225, received 4.495
FAIL returns to the nearest patrol waypoint rather than its previous route index
  expected 0, received 1
FAIL caps oversized raw input vectors at the maximum player speed
  expected 11.246759533305582 to be <= 2.4
FAIL does not count light time for unlimited energy and counts only the final available charge
  expected 0.07, received 0.1
Test Files  1 failed (1)
Tests       4 failed | 18 passed (22)
```

The lit-wall watcher and full-recharge regressions passed before implementation because that behavior was already present. The search-dwell and no-path tests were then tightened to exercise travel-before-dwell and intermediate direct-fallback movement, respectively.

### GREEN

```text
npm test -- tests/simulation.test.ts tests/progress.test.ts
Test Files  2 passed (2)
Tests       26 passed (26)
```

```text
npx tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext \
  --moduleResolution Bundler --strict --skipLibCheck \
  src/game/types.ts src/game/systems/Geometry.ts \
  src/game/systems/Simulation.ts src/game/systems/ProgressManager.ts
exit 0
```

### Implementation review

- Alert now returns early from enemy movement; search only decrements after it reaches last-known position; return captures the nearest waypoint once per return episode.
- Light time uses `min(dt, energy * 7)` and exhaustion occurs exactly when charge ends.
- Cached paths repath at a bounded cadence (or material target change), use padded wall LOS as a direct-path shortcut, stop on unreachable routes, and move in collision substeps even at high configured speeds.
- The geometry BFS uses a queue head index rather than `Array.shift()`.

Full integration verification:

```text
npm run build
✓ 22 modules transformed.
✓ built in 3.72s
exit 0
```

## Fix round 2: first return movement

### Root cause

The search state set `state = 'return'` and returned. `moveEnemy()` then ran in that same frame against the stale patrol `routeIndex`; nearest-waypoint selection did not occur until the next update.

### RED

```text
npm test -- tests/simulation.test.ts
FAIL selects the nearest patrol point before moving on the search-to-return transition
expected routeIndex 0, received 1
Test Files  1 failed (1)
Tests       1 failed | 22 passed (23)
```

### GREEN

```text
npm test -- tests/simulation.test.ts tests/progress.test.ts
Test Files  2 passed (2)
Tests       27 passed (27)
```

The transition now chooses and records the nearest waypoint before `moveEnemy()` runs, so the first return step follows the correct route.

## Fix round 3: unlimited light-time accounting

### Root cause

The unlimited-energy branch set `lightOn` but never incremented `stats.lightTime`, which made no-light-budget star calculations incorrect for unlimited levels.

### RED

```text
npm test -- tests/simulation.test.ts
FAIL counts light time for unlimited energy and only the final available limited charge
expected 0 to be close to 1
Test Files  1 failed (1)
Tests       1 failed | 22 passed (23)
```

### GREEN

```text
npm test -- tests/simulation.test.ts tests/progress.test.ts
Test Files  2 passed (2)
Tests       27 passed (27)
```

Unlimited levels now retain energy at `1` while counting every actual lit timestep; limited levels still count only the charge-backed portion of their final timestep.
