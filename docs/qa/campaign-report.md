# Authored campaign QA report

## Result

`npm test -- tests/campaign.test.ts` passed: **1 file, 32 tests**.

RED was observed before implementation: the sequential campaign test expected IDs 1–25 and received only 1–3. GREEN was observed after authoring the rooms and replaying the actual `Simulation` at 60 Hz.

The replay uses analogue magnitude `.38`, darkness, authored waits, real walls, traps, enemy AI, security-light visibility, contact capture, and exit detection. It does not teleport the player or disable hazards.

| Rooms | Escape time (s) | Detections |
| --- | ---: | ---: |
| 1 | 15.87 | 0 |
| 2 | 33.30 | 0 |
| 3 | 18.05 | 0 |
| 4 | 18.13 | 0 |
| 5 | 18.13 | 0 |
| 6 | 17.03 | 0 |
| 7 | 18.13 | 0 |
| 8 | 18.13 | 0 |
| 9 | 18.13 | 0 |
| 10 | 16.97 | 0 |
| 11 | 17.03 | 0 |
| 12 | 18.13 | 0 |
| 13 | 18.13 | 0 |
| 14 | 18.13 | 0 |
| 15 | 18.13 | 0 |
| 16 | 21.12 | 0 |
| 17 | 21.12 | 0 |
| 18 | 19.93 | 0 |
| 19 | 18.13 | 0 |
| 20 | 18.13 | 0 |
| 21 | 17.03 | 0 |
| 22 | 25.23 | 0 |
| 23 | 25.83 | 0 |
| 24 | 25.33 | 0 |
| 25 | 25.33 | 0 |

## Coverage and certificates

- All 25 IDs are sequential, names and hints are non-empty, layouts are distinct, and all maps are 10×14.
- Starts, exits, patrol waypoints, authored solution points, and traps are checked for walkability; traps must not overlap the start or exit.
- The mechanics progression is checked by room range: stationary watchers (4–6), patrols (7–9), screens (10–12), phased pairs (13–15), limited light (16+), listeners (19–21), sweeps (22+), and combined final rooms (24–25).
- The conservative risk certificate verifies every post-tutorial enemy has a route point within its perception range and line of sight of an authored-route point. This proves it is not isolated permanently behind walls; it is not a substitute for physical-device playtesting.
- Level 22 is replayed again with the same movement targets but with every authored wait removed; its real watcher records a detection. The authored wait replay escapes with zero detections. A direct illuminated checkpoint regression also checks the actual room-22 security cone changes that watcher's state to `alert`.
- Rooms 22–25 are additionally replayed with the browser’s `.09` endpoint tolerance and retain escape/zero-detection results, so the timed gates are not dependent on the stricter `.07` test endpoint.

No physical-device testing is claimed here; this evidence covers the deterministic game simulation and its current collision/AI/security implementation.

## Round 1 follow-up

RED/GREEN command: `npm test -- tests/campaign.test.ts`.

- RED: the new limited-light certificate reported `room 16 needs an authored flash`; the new same-route timing certificate reported `room 25 did not constrain its un-timed route`.
- GREEN: `✓ tests/campaign.test.ts (34 tests)` / `Test Files 1 passed (1)`.

`SolutionPoint.flash` is an optional, seconds-long hold at a safe authored point. It remains structurally a `Vec`, so hint routing is unchanged. Browser QA replay honors it with the actual light control. The certificate replays every room 16–25 using the real Simulation, verifies the flash consumes limited energy, the route later recharges, the run escapes, and light time stays within budget. The existing dark-only `.07` routes are still replayed separately.

| Rooms | Flash replay time (s) | Light time (s) | Final energy |
| --- | ---: | ---: | ---: |
| 16 | 21.38 | 0.27 | 1.00 |
| 17 | 21.38 | 0.27 | 1.00 |
| 18 | 20.20 | 0.27 | 1.00 |
| 19 | 18.40 | 0.27 | 1.00 |
| 20 | 18.40 | 0.27 | 1.00 |
| 21 | 17.30 | 0.27 | 1.00 |
| 22 | 25.50 | 0.27 | 1.00 |
| 23 | 26.10 | 0.27 | 1.00 |
| 24 | 25.60 | 0.27 | 1.00 |
| 25 | 25.60 | 0.27 | 1.00 |

Rooms 23–25 now also replay the same target route with every wait removed and require a real detection. Rooms 22–25 retain the `.09` browser-endpoint replay, with zero detections. Late pars are 31–32 seconds, providing a small practical margin over their 25–26 second authored replays rather than the previous 46–49 seconds.

## Build follow-up

`npm run build` passed after extending the browser QA replay point cast with the optional `flash` field. Output: `tsc --noEmit && vite build`, **22 modules transformed**, and `✓ built in 3.31s`.
