# Presentation scoped fix review package

No Git baseline. Compare the defect descriptions in presentation-fixes-brief.md against the following complete modified-file surface:

- src/game/ui/AppUI.ts: inert modal background, focus wrapping, action guards, heading spacing, Listener advice, paused settings audio.
- src/game/scenes/GameScene.ts: exported advanceSimulation per-step callback, spatial-only alert freeze with live light state, audio pause and whole-Level hint call.
- src/game/systems/HintService.ts: spawn-aware route, collision-safe next path point, unreachable null.
- src/game/systems/AudioManager.ts: actual AudioContext suspension/mute lifecycle.
- src/main.ts: remove hard FPS limit and pause audio integration.
- src/style.css: short-height safe areas.
- README.md: FPS target wording.
- tests/ui.test.ts, hint.test.ts, audio.test.ts, game-scene.test.ts: focused regressions.

Requirements: docs/qa/presentation-fixes-brief.md. Evidence: docs/qa/presentation-fixes-report.md. Read both, then actual source; verdict each of7 findings ADDRESSED/NOT ADDRESSED, and any new Critical/Important breakage in these fixes. In particular check per-tick event preservation and that freeze does not delay visible light release, not only internal simulation state.

The internal design's old420×760 requirement was corrected to adaptive portrait with desktop sidebars (ledger ruling based on user's actual Android ratio requirement). Do not rerun reported19 focused tests/build without a specific unresolved doubt. No browser tests were run for this wave (root's resumed browser request was blocked by URL policy). Read-only, no subagents, no edits.
