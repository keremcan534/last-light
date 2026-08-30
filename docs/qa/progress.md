# Implementation ledger — docs/superpowers/plans/2026-08-27-last-light.md

Workspace initially empty; not a Git checkout. Worktree and commit steps are inapplicable. The user's explicit no-questions instruction controls design approvals. Core is delegated; presentation integration stays with the primary agent. Only one implementation subagent runs at a time. Source review packages are file lists because no git baseline exists.

| Contract | Producer | Consumer | Check |
| --- | --- | --- | --- |
| Shared Level/GameState types | setup | core, campaign, presentation | names fixed in src/game/types.ts |
| Simulation.step/read state | core | campaign replay, GameScene | tile units and seconds throughout |
| Geometry security helpers | core | WorldRenderer | same cone/LOS rules |
| ProgressManager | core | AppUI | record returns run stars, merge best values |
| levels and solution routes | campaign | GameScene, hints, tests | 25 sequential ids, explicit route arrays |
| Core task | tests vs implementation | self | cases cover state transitions and storage |
| Campaign task | routes vs replay | self | actual simulation escape required |
| Presentation task | pointer events vs state | self | independent identities and cancellation |
| Verification task | evidence vs claims | self | browser observations and build recorded |

Setup: complete. Implementation: in progress.

Task1: complete, core review clean after three fix rounds. 27 focused core tests pass. Fixed alert immobility, accurate limited/unlimited light duration, natural nearest-return transition, search dwell, cached paths, path failure behavior, enemy substeps and input normalization. Reports and scoped review packages in docs/qa.

Task2: campaign implementation complete, independent review in progress.32 focused tests pass:25 authored room escapes, real room22 skipped-wait detection, and .09 endpoint-tolerance safe escapes in22–25. See campaign-report.md.

Task3: first live preview running at http://127.0.0.1:5173/. localhost resolves another IPv6 app; do not stop that app. Initial menu/game browser check clean, settings sound toggle persists after reload. Controls/hints7 tests plus DOM UI7 tests pass. Remaining browser playthrough and performance checks in progress.

Task3 review: modal background keyboard focus isolation is an important open finding. Short-height safe areas and paused audio are minor findings selected for this fix wave. Additional controller checks found heading word concatenation at short heights, delayed light release during the alert freeze, and an inaccurate hard FPS cap. All enter the presentation fix brief.

Ruling: replace the internal fixed 420×760 presentation assumption with an adaptive portrait canvas and desktop sidebars — the user's binding brief requires different Android aspect ratios, not a fixed logical pixel size; 320×568 and 390×844 have been checked — if wrong, the renderer and overlay sizing would need a fixed-ratio layout pass.

Browser evidence to date: real keyboard movement/light/release; mouse joystick drag; actual room1 escape and next-level unlock; sound setting reload persistence; room6 light alert→chase→capture; retry 286ms; pause stops simulation; mobile level grid remains in bounds. Physical Android device not available. Two-pointer cancellation is tested through real DOM PointerEvents in happy-dom.

Task3: presentation_fixes agent implementing the seven findings in presentation-fixes-brief.md; independent scoped re-review follows. Browser Listener comparison: fast2sec movement caused capture with lightOFF; slow5sec reached the same area with0detections and Listener:patrol. Final25 outcome screen observed via live replay before last timing-data revision.

Resumed-session browser limitation: after local servers restarted, claiming/reloading the previous127.0.0.1:5174 QA tab was rejected by browser URL security policy. No alternate browser/surface or policy workaround attempted. Prior browser evidence remains valid for the earlier version; new fixes will be tested automatically and reviewed, but final fresh browser check is unverified until access is restored. Normal dev server runs at127.0.0.1:5173.

Task2 review requested explicit brief-light route evidence, missed-wait23–25 evidence and tighter late pars. Fixes queued after the current presentation implementer completes; only one implementation agent runs at a time.

Task3 fix wave implemented:19 focused regression tests/build passed in implementer report. Controller reran combined presentation/core/input tests:7files51tests passed at23:22 on2026-08-28. Scoped independent review is active. Campaign fix round1 now running.

Task3: complete. Scoped independent re-review confirms all7findings addressed, no new Critical/Important breakage. Per-step event delivery, live light during spatial freeze, modal isolation and unreachable-hint fallback checked against source.

Task2: complete after fix round1.34campaign tests pass; independent scoped re-review approves all3findings with no new Critical/Important breakage. Root full suite85/85 passed. Build passed after optional flash type correction. Minor test coverage note: flash certificates assert escape/energy/budget but not explicit zero detections; flash positions were inspected as outside perception range. Final whole-project reviewer will see this note.

Production marker scan: QA panel/replay strings are absent; `keydown-F2` remains in shutdown's listener-removal call, while the DEV-only registration is stripped. This strict marker scan was a false positive for exposed debug UI; final reviewer should confirm the source/build gating.

Final whole-project review found one P2: continuous valid Room10 last-known point(3.99,3) rounds to blocked BFS node(4,3), leaving enemy in search forever. Final single fix wave dispatched for clearance-safe endpoint attachment and regressions, plus minor explicit0detection assertion in flash certificates. No other actionable production issues found; final browser/physical-device limit remains.

Ruling: use bounded deterministic Dijkstra on the existing half-unit grid for clearance-safe continuous endpoint connectors — connectors have different physical lengths, so hop-count BFS is no longer the right cost model — if this costs too much on low-end devices, the small graph search would need profiling/optimization; no gameplay rules change.

Final single fix wave: complete. Rootfresh92/92tests andproductionbuild3.16s; final scoped re-review APPROVED. Original P2 and minor flash0detection assertion addressed, no new Critical/Important defects. All productionassetsrelative/present, QA panelabsent, no TODO/FIXME/placeholder in source/tests/README. Normal previewserverconfirmedlistening127.0.0.1:5173.

Implementation and automated/source-review gates complete. Fresh final browser retest remains blocked by tool URL policy; no final visual/physical-Android certification claimed. Handoff requires user refreshing/reopening the normal preview to re-establish browser access if a further assisted visual pass is desired. No Git repository: no branch/merge/push/commit or worktree cleanup performed. Source, build and evidence reports retained locally; temporary QA server stopped, normal dev server left running.

Ruling: preserve dark-only route solvability while adding short-flash certificates — the user's core mechanic explicitly rewards memorization and dark travel, so compulsory light gates would alter the game — if this gives too little energy pressure, balance may need future adjustment, not a forced-light rule.
