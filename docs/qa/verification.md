# Last Light verification

Status: implementation,92tests,productionbuild and final scoped code review verified. Fresh final browser retest remains blocked as detailed below; this is not a physical-device certification.

## Runtime and input observations

The game was run in the Codex in-app browser against the local Vite server using IPv4. The source `index.html` is not a file-protocol application; use the local server. `localhost` on this machine also resolves a different IPv6 application, so the documented URL is `http://127.0.0.1:5173/`.

| Area | Evidence |
| --- | --- |
| Splash/menu/settings | Browser rendered the studio splash, animated menu, playable controls, level select and settings. Sound preference survived a full reload. |
| Keyboard | Actual KeyboardEvents through the development QA UI moved the player, activated light and released it; all three runtime checks reported PASS. Native Escape opened pause. |
| Mouse | Browser pointer drag moved the player through the left-side joystick; releasing reset its floating state. |
| Multi-touch | DOM integration test dispatches two independent touch PointerEvents, releases light while movement stays held, then cancels movement; state and DOM joystick reset asserted. Physical multi-touch Android hardware was not available. |
| Real escape/progression | Room1 played through the live fixed-step scene, escaped in16.17s with0detections, displayed3stars; Next Level opened room2 and level select showed saved completion/unlock. |
| Detection/failure | Room6 held light: visible warning, alert exclamation, chase, then CAUGHT IN THE LIGHT. Retry reopened the level in286ms in one local browser measurement. |
| Pause | HUD pause showed dialog, stopped simulation, cleared held controls; resumed play remained functional. Modal keyboard isolation subsequently fixed and confirmed by focused regression tests and independent source re-review. |
| Mobile layout | Browser viewports390×844 and320×568 inspected visually. At320×568 final level cell bottom499.53px and footer bottom548px; all25 buttons fit. |
| Energy | Room16 light hold visibly reduced the energy meter and showed VISIBLE IN THE LIGHT. Core tests cover drain, recharge, exhaustion threshold. |
| Listener | Room19 fast2sec upward movement in darkness caused hearing/pursuit/capture; slow5sec movement reached the same area with0detections and Listener still patrolling. |
| Console | No game errors/warnings observed in browser QA so far; repeat after final production build. |

## Deterministic simulation coverage

The pure core test suite exercises lit/dark detection, wall occlusion, alert pause, chase and short memory, search at the last-known position, nearest patrol return, slow/fast Listener behavior, wall-blocked hearing, security exposure, circle collision, trap/enemy capture, terminal escape, acceleration, energy, reset and light-usage accounting. Progress tests cover corrupt/unavailable storage, persistence, scoring, best-value merges and unlock bounds.

Campaign tests replay every authored route through the real Simulation with enemies/hazards active. They are solvability certificates for a particular route, not proof that arbitrary input is safe. The last four rooms additionally require detection-free timed routes and a representative timing mistake must cause real detection.

## Performance measurement correction

The development harness originally displayed Phaser's `actualFps`, which measures underlying RAF frequency even with a render limit. A separate poststep counter now measures actual game frames. On this desktop, the old hard limit reported44renderFPS /123RAF FPS. Installed Phaser's `TimeStep.stepLimitFPS` resets its accumulated delta to zero; the fixed cap has been removed while retaining the60Hz deterministic simulation and60FPS target. Final browser performance was not remeasured after the policy block. No physical-phone performance guarantee is implied by desktop measurements.

## Final gate

- Campaign:34/34 pass, all25 dark real-simulation escape certificates, short-flash energy/recharge/budget certificates16–25, skipped-wait detection22–25 and tolerant22–25 replay.
- Full suite:9files92tests passed, freshly rerun by root on2026-08-28 at23:39:43.
- TypeScript/Vite production build: fresh root run passed in3.16seconds after the full suite.22modules,1.72kB HTML,19.59kB CSS,59.40kB game JS and1208.06kB Phaser JS (gzip332.17kB for Phaser).
- Production artifact inspection: all4 relative entry assets exist. QA panel/replay markers are absent. A strict marker scan found keydown-F2 only in shutdown's listener-removal call; DEV-only registration is stripped, so this is not an exposed control. Fresh production browser console/menu/gameplay check remains blocked.
- Independent core, campaign and presentation scoped reviews: clean. Final whole-project review identified a near-wall endpoint rounding defect; now fixed with clearance-safe continuous endpoint connectors and bounded deterministic weighted grid search. Six geometry cases and a real Room10 pursuit/search/return regression pass. Flash certificates now explicitly assert0detections. Final scoped re-review approved both fixes with no new Critical/Important defects.

After a session restart, the browser tool rejected the previous QA-tab claim/reload with a URL security-policy denial. No browser workaround was attempted. The local servers were restarted successfully. Earlier browser observations apply to the earlier code version; a fresh final browser pass remains unverified while this tool restriction persists.

## Scope

All art and audio are procedural/local. No backend, account, advertising, payments, external runtime assets or native Android project is included. `dist/` is the future Capacitor `webDir`; actual device packaging, signing and store publishing are outside this web build.
