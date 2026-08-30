# Campaign review package

No Git baseline: workspace began empty. Review added source files directly as the complete change surface:

- src/game/levels/levels.ts: all25 authored rooms, especially4–25 added by implementer;16–18 and22–25 revised to force interior crossings.
- src/game/types.ts: SolutionPoint extends Vec with optional wait/speed, Level.solution uses it.
- tests/campaign.test.ts:32 tests covering25 real-simulation escapes, metadata/progression/risk areas, real removed-wait detection and late-room endpoint tolerance.

Requirements: docs/qa/campaign-brief.md. Evidence: docs/qa/campaign-report.md. Binding original brief: C:/Users/Kerem/.codex/attachments/d4e73dd0-c233-4a5c-a3f9-c8e84dc64a44/pasted-text.txt (level/campaign portions relevant).

Cross-task contract: Simulation in tile units,1/60sec fixed steps, .38analog movement on certificates. Security cones expose players to enemies, not automatic failure. Listener hears fast nearby movement. Tests run real Simulation with AI/hazards active. All25 must be solvable, data-driven, hand-authored, with requested progression. Final two must combine meaningful patrols/Listener/cover/energy/security timing.

Scope: campaign spec compliance AND quality. Read-only; no subagents. Check evidence against actual source, including whether timing tests genuinely validate waits rather than synthetic teleport success. Do not re-run already-reported suite unless a specific code doubt demands a focused test. Return severity/file:line findings and clear spec/quality verdict.
