# Final review fix wave

Read first: this is the complete bounded findings list. Local game root C:/Users/Kerem/Documents/light, no Git repository. No subagents. Use apply_patch, TDD, targeted diagnostics, then full suite and build once. No browser work (policy blocked).

## Important finding (P2)

Geometry.ts findPath rounds valid near-wall continuous endpoints into blocked grid nodes and returns[start]. Confirmed against actual Room10: player at walkable(3.99,3), watcher at(6,2.5). Unpadded LOS true, padded movement LOS false. One light tick alerts watcher; retreat left in darkness for20seconds leaves watcher unmoved in search with timer1.4 forever. Connect valid continuous start/end to reachable, clearance-safe grid nodes without teleporting/cutting corners. Preserve exact endpoints, deterministic small-map performance, safe failure for truly unreachable routes. Validate segment clearance, not only waypoint walkability. Do not change detection, movement speed, search semantics or authored enemy paths to hide the defect.

Own src/game/systems/Geometry.ts and focused tests (tests/simulation.test.ts or new geometry regression test), plus any minimal caller correction only if necessary. Add regression for actual Room10 alert→movement→eventual return/patrol after player retreats. Also cover off-grid start near wall, all path segments padded-LOS clear, unreachable barrier still no direct fallback. Keep public findPath(start,end,level):Vec[] compatible with Simulation and HintService. Existing failure convention[start] is consumed safely, but do not fabricate unsafe endpoints/paths.

## Minor coverage finding

tests/campaign.test.ts short-flash certificates assert escape/energy/budget but not0detections. Add explicit0detections assertion if existing authored flash routes support it; report any actualfailure rather than weakening tests or changing rules. Campaign geometry should not need editing. All25replays and34campaigntests currently pass; rootfullsuite85/85 andbuildgreen before this fix.

## Evidence and report

Read docs/qa/final-review-brief.md for binding context only if needed. Current core contracts are in source. Record RED reproduction, GREEN targeted tests, full `npm test` and `npm run build` outputs in docs/qa/final-fix-report.md. Include files changed, any concerns and self-review. Return concise DONE/status and test counts. npmcommands need require_escalated because of Windows parent-directory sandbox (prefix npmtest/npmrunbuild). Do not commit or publish. This is the single final fix wave; resolve coherent root cause and verify before reporting.
