# Last Light

A mobile-first, portrait stealth puzzle game by BlackBlue Studios.

You need the light to see the way. But the light lets them see you.

## Run

Use Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. For a phone on the same Wi-Fi network, use the Network URL Vite prints. All art, fonts and audio are local/procedural; there are no runtime CDNs or backend services.

```sh
npm test
npm run build
npm run preview
```

The production bundle is in `dist/`. Serve that directory with any static host; do not open the source `index.html` directly with `file://`.

## Controls

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Move | Drag anywhere on the left side | WASD / arrows |
| Walk softly | Drag the joystick only a little | Hold Shift |
| Light | Hold anywhere on the right side | Hold Space |
| Pause | Top-right pause | Escape |
| Retry | Top-right circular arrow | R |
| Hint | Bottom-right hint | H |

The joystick and light support two simultaneous fingers. On desktop you can combine a mouse joystick with Space. Releasing light hides you immediately, but enemies still investigate your last known position. Touch cancellation and lost focus clear input; leaving the tab pauses play.

## Campaign

25 authored rooms introduce movement, stationary Watchers, patrols, cover, multiple enemies, rechargeable light, Listeners, then sweeping security beams. Walls block sight and sound. Listeners hear fast movement nearby; use the edge of the joystick's center or Shift. Contact with a shadow or broken floor ends the run. Security beams reveal you even with your light off.

Each room has an authored solution, hint, par time and light budget. A hint points briefly toward the next route waypoint without exposing you. The hint service has an asynchronous permission boundary for a future rewarded action; no advertising is included.

Stars: **1** for escaping after detection, **2** for an undetected escape, **3** for an undetected escape within both the room's time and light budgets. The result screen shows the thresholds. Best times and best stars are preserved independently.

Progress and sound/haptics/reduced-motion settings are saved in browser `localStorage`, under `last-light:progress:v1`. If storage is unavailable, play still works for the current session. Haptics depend on device/browser support and are off by default. Sound starts after interaction; no recorded audio files are needed.

## Architecture

- `src/game/levels/`: authored campaign data, independent of scenes.
- `src/game/systems/Simulation.ts`: deterministic tile-unit simulation, updated at 60Hz.
- `Geometry.ts`: padded collision, wall-occluded sight, bounded weighted grid routes with clearance-safe endpoints, and security cones. Enemy routes are cached by the simulation.
- `WorldRenderer.ts`: cached room canvas, lightweight radial masks, silhouettes, particles and effects.
- `ProgressManager.ts`, `AudioManager.ts`, `HintService.ts`: persistence, procedural audio and hints.
- `src/game/scenes/`: splash, living menu and gameplay lifecycle.
- `src/game/ui/`: responsive HTML menus/HUD and independent pointer/keyboard state.

The visual renderer is Phaser 3 Canvas with a 60 FPS target. Level logic has no Phaser or DOM dependency. Portrait layouts include safe-area padding; desktop uses a centered playfield. No game state is sent off-device.

## Development tools and QA

In development, **F2** shows collision geometry, enemy range/rays/routes, noise radius, visibility and AI states. These controls are stripped from production.

`http://127.0.0.1:5173/?qa=1` opens a browser QA panel with room selection, a timed light preview, keyboard-event checks, state/FPS readouts and a real-time escape-route replay. It uses separate `qa:` save keys so testing cannot change normal campaign progress. The harness lives in `tests/` and is not shipped in `dist/`.

Tests cover geometry, enemy state transitions, energy, noise, exposure, capture/escape, persistence, scoring, keyboard/multi-touch lifecycle, menus and real-simulation campaign escape certificates. See `docs/qa/` for recorded verification evidence. Simulation certificates prove a viable authored route, not that every possible input sequence is safe.

## Future Capacitor wrapper

The game is already a relative-asset, static web bundle with no server assumptions. A future Capacitor wrapper should point `webDir` to `dist`, use a portrait orientation and retain the existing viewport/safe-area handling. Native project files, store signing and publishing are intentionally not part of this web build.

## Assets

All graphics, interface symbols, textures and sounds are generated in code. No copyrighted third-party artwork or audio is used. Phaser and other dependencies retain their own licenses.
