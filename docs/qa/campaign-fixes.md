# Campaign review fix round1

Original brief and report: campaign-brief.md / campaign-report.md. Reviewer requested:

- P1 limited-light16–25 not exercised by any solution certificate: every replay uses light:false, proving dark route but not viable short light bursts.
- P2 missed-wait timing evidence exists only22, not23–25; confirm final sweeps actually constrain route.
- P2 late pars46–49 vs25–26sec route leave20+sec slack, not just little spare time.

Controller direction: preserve dark-only solvability (the user explicitly allows memorizing rooms and travelling in darkness). Do not add mandatory light gates or alter core AI to force energy use. Add explicit brief light flashes at safe authored route points for16–25 and replay them with real energy consumption/recharge, within light budgets, preferably via a small optional SolutionPoint field interpreted by certificates and development harness. Ensure both previous dark-only routes and new lit certificates escape. No fake state assignment or hazard disabling. If extending types, maintain HintService structural Vec compatibility. Keep changes minimal.

Add no-wait real-route tests for23–25, especially24–25. Fix meaningful sweep placement/patrol if a no-wait route is immune. Current25 moved Watcher to final corridor during short-period tuning; now first sweep period12seconds allows a wider robust crossing, so a Watcher near first gate may be feasible again. Do not test merely teleporting to a lit checkpoint. Keep .07/.09 tolerant safe replay. Calibrate late pars to about30–34seconds plus any new deliberate light pauses, enough margin over25–26sec slow route without trivial double-time slack.

Ownership extends to tests/browser-harness.ts only for interpreting optional authored light flashes during replay; preserve diagnostics and all other behavior. No UI/core files; no subagents. Use apply_patch; focused TDD; append exact test command/RED/GREEN output and revised times to campaign-report.md. Do not run broad suite. Ask root if unsure about a field contract before modifying it.
