# Final fix wave report

Status: DONE. The Room 10 continuous-endpoint pathfinding defect is fixed. The requested short-flash zero-detection assertion passes without changing campaign data or gameplay rules.

## Root cause and implementation

`findPath` previously rounded continuous endpoints to the half-unit grid. Room 10's valid target `(3.99, 3)` rounded to `(4, 3)`, inside the wall's `.2` clearance padding. BFS therefore returned `[start]`, and the real watcher never moved far enough to begin its search dwell. Replacing reconstructed endpoints also allowed a diagonal connector to cut a corner. Checking only grid-point walkability allowed grid edges to cross a sufficiently thin wall.

The exact start and end now connect to grid nodes only through `.2`-padded clear segments. Every grid edge has the same clearance check. Variable-length endpoint connections use bounded Dijkstra distance costs rather than uniform BFS hop counts. A stable grid scan gives deterministic tie-breaking; the authored 10-by-14 maps contain at most 609 candidate grid positions. Clear direct paths return the exact endpoints immediately. Invalid or unreachable routes retain the existing `[start]` failure convention. Identical consecutive points are removed without rounding or moving the endpoints.

No Simulation or HintService implementation changes were necessary. Enemy speed, detection, search dwell, route data, and campaign geometry are unchanged.

## Files changed

- `src/game/systems/Geometry.ts`: continuous endpoint connections, weighted bounded search, segment clearance, exact endpoint preservation.
- `tests/geometry.test.ts`: six focused geometry cases, including deterministic output and clearance of every returned segment.
- `tests/simulation.test.ts`: real Room 10 alert, dark retreat, movement, search, return, and patrol regression; frame-by-frame clearance and speed checks.
- `tests/campaign.test.ts`: explicit zero detections for all ten limited-light short-flash certificates.
- `README.md` and `docs/superpowers/specs/2026-08-27-last-light-design.md`: replace obsolete BFS wording with bounded weighted grid routing.
- `docs/qa/final-fix-report.md`: this report.

The production build regenerated `dist/`. No commit, publication, new dependency, authored route change, or browser action was performed.

## RED evidence

Before production changes:

```text
npm test -- tests/geometry.test.ts tests/simulation.test.ts tests/campaign.test.ts
Test Files  2 failed | 1 passed (3)
Tests       5 failed | 58 passed (63)
Exit        1
```

Observed failures:

- Room 10's valid end produced a one-point path: `expected 1 to be greater than 1`.
- After a light tick followed by 20 seconds retreating left in darkness, the actual Room 10 watcher had maximum displacement `0`: `expected 0 to be greater than 1`.
- Two distinct endpoints in one rounded grid cell collapsed into one point.
- Thin-wall route contained the blocked edge `[{"x":3,"y":3},{"x":3.5,"y":3}]`.
- A full-height thin barrier incorrectly returned a route instead of `[start]`.
- The strengthened campaign flash certificates already passed: 34/34 campaign tests.

One additional off-grid connector regression was added before production changes and failed as intended:

```text
npm test -- tests/geometry.test.ts
Tests  5 failed | 1 passed (6)
Exit   1
blocked segment [{"x":3.01,"y":3.24},{"x":3.5,"y":3}]: expected false to be true
```

The reverse Room 10 path was a passing compatibility/clearance case in RED, not a claimed failing reproduction.

## GREEN focused verification

```text
> last-light@1.0.0 test
> vitest run tests/geometry.test.ts tests/simulation.test.ts tests/campaign.test.ts tests/hint.test.ts

 RUN  v3.2.7 C:/Users/Kerem/Documents/light

 ✓ tests/hint.test.ts (5 tests) 6ms
 ✓ tests/geometry.test.ts (6 tests) 23ms
 ✓ tests/simulation.test.ts (24 tests) 72ms
 ✓ tests/campaign.test.ts (34 tests) 451ms

 Test Files  4 passed (4)
      Tests  69 passed (69)
   Start at  23:36:55
   Duration  769ms (transform 164ms, setup 0ms, collect 284ms, tests 552ms, environment 1ms, prepare 330ms)
```

Exit 0. The Room 10 test observes `alert → chase → search → return → patrol`, movement exceeding one world unit, eventual return within `.12` of the authored patrol point, exactly one detection, and a still-playing player. Every movement frame is padded-LOS clear and no faster than `enemy.speed / 60`. Every geometry route preserves exact endpoints and is deterministic across repeated calls.

## Full test suite output

The fix worker's full suite run exited 0. All 25 authored replay tests and all 34 campaign tests remain green. Total increased from 85 to 92 tests.

```text
> last-light@1.0.0 test
> vitest run

 RUN  v3.2.7 C:/Users/Kerem/Documents/light

 ✓ tests/audio.test.ts (1 test) 3ms
 ✓ tests/controls.test.ts (5 tests) 6ms
 ✓ tests/progress.test.ts (4 tests) 6ms
 ✓ tests/hint.test.ts (5 tests) 10ms
 ✓ tests/geometry.test.ts (6 tests) 39ms
 ✓ tests/simulation.test.ts (24 tests) 106ms
 ✓ tests/game-scene.test.ts (2 tests) 3ms
 ✓ tests/ui.test.ts (11 tests) 68ms
 ✓ tests/campaign.test.ts (34 tests) 536ms

 Test Files  9 passed (9)
      Tests  92 passed (92)
   Start at  23:37:36
   Duration  936ms (transform 499ms, setup 0ms, collect 813ms, tests 778ms, environment 733ms, prepare 944ms)
```

## Production build outputs

The first build exposed a TypeScript inference issue in path reconstruction (exit 1):

```text
> last-light@1.0.0 build
> tsc --noEmit && vite build

src/game/systems/Geometry.ts(105,11): error TS7022: 'node' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.
```

A named `PathNode` interface and explicit reconstruction-local type resolved this. This was the only source change after the full suite; both are erased at runtime. README/design wording was also updated. The necessary build retry succeeded (exit 0):

```text
> last-light@1.0.0 build
> tsc --noEmit && vite build

vite v7.3.6 building client environment for production...
transforming...
✓ 22 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.72 kB │ gzip:   0.85 kB
dist/assets/index-BfkBVoyI.css     19.59 kB │ gzip:   5.35 kB
dist/assets/index-CpcnguPP.js      59.40 kB │ gzip:  19.84 kB
dist/assets/phaser-DFK5Ua9d.js  1,208.06 kB │ gzip: 332.17 kB
✓ built in 3.22s
```

The coordinator subsequently reported an independent fresh run on the final typed source: 92/92 tests at 23:39:43 and a successful production build in 3.16 seconds. The coordinator also verified that production entry assets are relative and exist, and that QA panel markers are absent. The complete console outputs above are from this fix worker's own runs.

## Bounded desktop performance diagnostic

Read-only, in-memory esbuild bundles of the actual Geometry and level modules were evaluated under Node v26.7.0 on Windows. No benchmark file or permanent infrastructure was added. Tested all 25 authored spawn-to-exit pairs plus the exact Room 10 blind-corner pair, with 10 warmups and 100 individually timed calls per case. Every case returned a route. Results below are milliseconds per uncached `findPath` call; room rows are the five slowest tested pairs by median, plus the reproduction.

| Case | Median ms | p95 ms | Maximum ms |
| --- | ---: | ---: | ---: |
| Room 19 spawn to exit | 1.816 | 4.995 | 11.329 |
| Room 21 spawn to exit | 1.785 | 1.951 | 2.034 |
| Room 13 spawn to exit | 1.760 | 1.836 | 2.156 |
| Room 20 spawn to exit | 1.759 | 1.963 | 2.056 |
| Room 1 spawn to exit | 1.738 | 3.385 | 4.776 |
| Room 10 blind corner | 0.536 | 1.467 | 4.155 |

The linear minimum-cost scan has worst-case O(V²) work for this bounded grid, with wall checks on connectors and relaxed edges. This is a desktop sample of these endpoint pairs, not a universal worst-case bound or a phone performance certification. Existing direct-LOS handling and the `.3`-second enemy path cache remain intact. Much larger maps would need a different frontier implementation; no larger maps are introduced here.

## Self-review and limits

- Both endpoint connectors and every grid edge use the same `.2` clearance as movement; walkable points alone are not accepted as proof of a safe segment.
- All graph costs are nonnegative; settled nodes cannot form predecessor cycles. Stable iteration order handles equal-cost choices deterministically, and failure cannot fabricate a direct endpoint.
- Direct paths, same-cell endpoints, unreachable barriers, corner connectors, actual enemy movement/state recovery, and existing HintService behavior are covered.
- No source mutation to detection, movement speed, search timing, authored paths, or campaign geometry hides the defect.
- The half-unit grid remains a bounded approximation, not a complete continuous-space planner for arbitrary narrow mazes.
- The no-subagents constraint was honored; this report includes self-review and is handed back for coordinator review.
- Browser access remains policy-blocked. No fresh browser or physical Android result is claimed.
- `RTK.md` was absent from the project and checked parent/user locations; the coordinator confirmed it was absent at initial setup too.

No remaining actionable defect was found within this bounded fix scope.
