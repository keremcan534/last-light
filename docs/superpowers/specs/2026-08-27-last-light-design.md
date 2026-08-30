# Last Light — design

The attached user brief is the binding requirement. The user explicitly requests autonomous completion without questions; design decisions are made here without approval pauses.

## Product

A portrait-first, finished 25-room stealth puzzle game by BlackBlue Studios. A very dark blue industrial space, warm diffused handheld light, cyan doorways, crimson shadows. Menus use spacious editorial typography and a living procedural scene, not stock artwork. A silent menu vignette demonstrates a light being noticed by a shadow and an escape, while levels 1–3 remain enemy-free as requested.

## Architecture

TypeScript + Vite + Phaser 3. No backend, remote assets, accounts or runtime network dependencies. Adaptive portrait canvas, capped at 460px wide with dark sidebars on desktop; responsive HTML overlays for accessible menus, controls, safe areas, and results. Logical gameplay stays in tile units independent of viewport dimensions. Phaser owns the loop and a Canvas renderer. Pre-rendered room geometry and small, smooth canvas lighting avoid full-screen postprocessing.

Pure deterministic simulation in tile units: circle collision with rectangular walls; segment/rectangle line of sight; bounded weighted grid paths (Dijkstra) with clearance-safe continuous endpoints for enemies around walls; fixed 1/60 steps. Enemy states patrol → alert → chase → search → return. Darkness clears live tracking immediately but preserves the last seen position. Listeners investigate fast movement, not slow movement. Security cones sweep by deterministic sine waves and are blocked by walls. Light energy is forgiving with an exhaustion recovery threshold. Contact traps are visible with light. All 25 maps are authored, never randomly generated; explicit solution routes are replayed in the real simulation to establish solvability.

## Controls and flow

Left-side floating analog joystick, right-side hold to light. Both can run simultaneously. Pointer capture/cancel, blur and visibility changes clear input. Keyboard WASD/arrows, Space for light, Shift for slow walk, Escape to pause, R to retry. Movement can continue with a mouse via joystick + Space. Large bottom controls remain separate from room visibility; any right-side room touch also lights.

Splash → main menu → current unlocked room. Main menu also provides level select and settings. Pause supports resume/retry/settings/menu. Win offers next/retry/level select; final room offers campaign completion and replay. Local storage saves maximum unlocked room, non-decreasing stars, minimum completion times and sound/vibration/reduced-motion settings; corrupt or unavailable storage cannot crash play. Stars: one if detected; two for clean escape; three for clean, fast and low-light escape. Hint highlights a next route waypoint without exposing the player, through an asynchronous service suitable for later rewarded actions (no ads included).

## Verification

Unit tests for collision, LOS, all AI states, noise, security cones, energy, capture, escape, scoring and resilient persistence. Campaign tests inspect metadata, bounds, clear starts/exits/routes, progression and replay all 25 solutions through Simulation. Browser QA checks menu, gameplay, mouse/touch events, resize, pause/retry/results/settings, console errors and local progress. Production tsc + Vite build required. Debug controls are gated on import.meta.env.DEV and do not ship in production.
