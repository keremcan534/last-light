# Presentation fixes report

## Status

Implemented and verified the bounded presentation correction wave. No campaign/core files, dependencies, browser harness, or browser session were changed.

## Changed files

- `src/game/ui/AppUI.ts`
- `src/game/scenes/GameScene.ts`
- `src/game/systems/AudioManager.ts`
- `src/game/systems/HintService.ts`
- `src/main.ts`
- `src/style.css`
- `README.md`
- `tests/ui.test.ts`
- `tests/hint.test.ts`
- `tests/audio.test.ts` (new)
- `tests/game-scene.test.ts` (new)

## What changed

- Pause and result dialogs now make gameplay inert, ignore background action events, wrap Tab/Shift+Tab focus, restore gameplay input on resume, and replace instead of stacking existing modal nodes.
- Compact layouts retain top/bottom safe-area insets for menu, page, HUD/status/energy/touch/footer, and modal padding (including 320px-wide override). Heading text keeps semantic whitespace when line-break elements are hidden.
- Pause, blur, and muting suspend the real Web Audio context. Only an explicit `unlock()` resumes it; paused settings clicks do not wake ambience.
- Fixed simulation stepping continues during the brief alert presentation freeze. Tick events are processed at their own step, and rendering holds only player/enemy positions while retaining the current light/energy/state presentation.
- Hints prepend the player spawn to authored solutions and use geometry pathfinding for a first collision-safe waypoint. An unreachable target returns no hint.
- Removed Phaser's `limit: 60` configuration, retaining `target: 60` and the fixed 60Hz simulation. README terminology now says target rather than cap.
- Listener awareness has hearing-specific HUD wording; Listener captures retain `CAUGHT IN THE LIGHT` and advise slow movement.

## RED to GREEN evidence

Initial targeted run:

```text
npm test -- tests/ui.test.ts tests/hint.test.ts tests/audio.test.ts tests/game-scene.test.ts
FAILED: AudioContext suspendCalls expected 2, received 0
FAILED: spawn-aware hint expected a collision-safe waypoint, received null
FAILED: pause gameplay inert expected true, received false
FAILED: Listener HUD expected HEARS YOU, received THEY REMEMBER. KEEP MOVING.
FAILED: compact heading expected Find your way out., received Find yourway out.
```

Additional focused RED checks caught the two subsequent integration edges:

```text
tests/ui.test.ts: existing result dialog expected 1 modal, received 2
tests/game-scene.test.ts: environment initially loaded Phaser canvas in node; test was changed to happy-dom with only the external Phaser scene shell mocked, while exercising the real Simulation.
```

Final GREEN command and result:

```text
npm test -- tests/ui.test.ts tests/hint.test.ts tests/audio.test.ts tests/game-scene.test.ts
Test Files  4 passed (4)
Tests  19 passed (19)
```

Build command and result:

```text
npm run build
tsc --noEmit && vite build
✓ built in 3.23s
```

## Self-review and limitations

- Re-read all owned source and regression tests after the final change. The per-step callback avoids replaying only the final tick's events; frozen render state intentionally copies only spatial entities, so a light release is visible on the next fixed tick.
- The hint fallback is `null`, not the blocked authored target, when geometry cannot find a path.
- This task intentionally did not run browser QA or a full campaign suite; focused happy-dom/UI, audio fake-context, real Simulation orchestration, hint, TypeScript, and production-build checks are the evidence above.
