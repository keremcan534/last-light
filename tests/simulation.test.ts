import { describe, expect, test } from 'vitest';
import type { InputState, Level, SecuritySpec, Vec, Wall } from '../src/game/types';
import { findPath, hasLineOfSight, inSecurityLight, isWalkable, securityAngle } from '../src/game/systems/Geometry';
import { Simulation } from '../src/game/systems/Simulation';
import { getLevel } from '../src/game/levels/levels';

const idle: InputState = { x: 0, y: 0, light: false };
const baseLevel = (patch: Partial<Level> = {}): Level => ({
  id: 1, name: 'Test', chapter: 'Test', map: { width: 8, height: 8 },
  player: { x: 1, y: 1 }, exit: { x: 7, y: 7 }, walls: [], enemies: [], traps: [], securityLights: [],
  lightEnergyEnabled: false, parTime: 10, lightBudget: 2, solution: [], hint: '', ...patch,
});

const run = (sim: Simulation, input: InputState, seconds: number) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) sim.step(input, 1 / 60);
};

describe('Geometry', () => {
  test('blocks line of sight through a wall but not beside it', () => {
    const walls: Wall[] = [{ x: 3, y: 0, w: 1, h: 4 }];
    expect(hasLineOfSight({ x: 1, y: 1 }, { x: 6, y: 1 }, walls)).toBe(false);
    expect(hasLineOfSight({ x: 1, y: 5 }, { x: 6, y: 5 }, walls)).toBe(true);
  });

  test('keeps points inside bounds and outside padded walls walkable', () => {
    const level = baseLevel({ walls: [{ x: 3, y: 3, w: 1, h: 1 }] });
    expect(isWalkable({ x: 0.2, y: 0.2 }, level)).toBe(true);
    expect(isWalkable({ x: -0.01, y: 1 }, level)).toBe(false);
    expect(isWalkable({ x: 8.01, y: 1 }, level)).toBe(false);
    expect(isWalkable({ x: 2.9, y: 3.5 }, level)).toBe(false);
  });

  test('finds a bounded path around walls', () => {
    const level = baseLevel({ walls: [{ x: 3, y: 1, w: 1, h: 5 }] });
    const path = findPath({ x: 1, y: 3 }, { x: 6, y: 3 }, level);
    expect(path.length).toBeGreaterThan(2);
    expect(path.every((point) => isWalkable(point, level))).toBe(true);
  });

  test('uses the same swept security angle and cone line of sight', () => {
    const spec: SecuritySpec = { x: 2, y: 2, angle: 0, sweep: 0.5, period: 2, radius: 4, phase: 0 };
    expect(securityAngle(spec, 0.5)).toBeCloseTo(0.5);
    const litPoint = { x: 4.63, y: 3.44 };
    expect(inSecurityLight(litPoint, spec, 0.5, [])).toBe(true);
    expect(inSecurityLight(litPoint, spec, 0.5, [{ x: 3, y: 2, w: 1, h: 2 }])).toBe(false);
  });
});

describe('Simulation', () => {
  test('slides along a wall and cannot tunnel through it on a large dt', () => {
    const sim = new Simulation(baseLevel({ walls: [{ x: 3, y: 0, w: 1, h: 8 }] }));
    sim.step({ x: 1, y: 1, light: false }, 1);
    expect(sim.state.player.x).toBeLessThan(2.81);
    expect(sim.state.player.y).toBeGreaterThan(1.1);
  });

  test('watcher alerts clear lit player and ignores dark player behind a wall', () => {
    const enemy = { x: 4, y: 1, type: 'watcher' as const, route: [{ x: 4, y: 1 }] };
    const clear = new Simulation(baseLevel({ enemies: [enemy] }));
    clear.step({ ...idle, light: true }, 1 / 60);
    expect(clear.state.enemies[0].state).toBe('alert');
    const blocked = new Simulation(baseLevel({ enemies: [enemy], walls: [{ x: 2, y: 0, w: 1, h: 3 }] }));
    blocked.step(idle, 1 / 60);
    expect(blocked.state.enemies[0].state).toBe('patrol');
  });

  test('a wall blocks watcher alert even when the player is lit', () => {
    const sim = new Simulation(baseLevel({
      enemies: [{ x: 4, y: 1, type: 'watcher', route: [{ x: 4, y: 1 }] }],
      walls: [{ x: 2, y: 0, w: 1, h: 3 }],
    }));
    sim.step({ ...idle, light: true }, 1 / 60);
    expect(sim.state.enemies[0].state).toBe('patrol');
  });

  test('holds an enemy still for the alert warning duration', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 4, y: 1, type: 'watcher', route: [{ x: 6, y: 1 }] }] }));
    sim.step({ ...idle, light: true }, 1 / 60);
    const position = { x: sim.state.enemies[0].x, y: sim.state.enemies[0].y };
    run(sim, { ...idle, light: true }, .35);
    expect(sim.state.enemies[0].state).toBe('alert');
    expect(sim.state.enemies[0]).toMatchObject(position);
  });

  test('counts and emits an alert once throughout one awareness episode', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 4, y: 1, type: 'watcher', route: [{ x: 4, y: 1 }] }] }));
    sim.step({ ...idle, light: true }, 1 / 60);
    expect(sim.state.stats.detections).toBe(1);
    expect(sim.state.events).toContain('alert');
    run(sim, { x: 0, y: 1, light: false }, .5);
    run(sim, idle, 2.1);
    sim.step({ ...idle, light: true }, 1 / 60);
    expect(sim.state.stats.detections).toBe(1);
    expect(sim.state.events).not.toContain('alert');
  });

  test('listener hears fast movement but not slow movement and walls occlude noise', () => {
    const enemy = { x: 3, y: 1, type: 'listener' as const, route: [{ x: 3, y: 1 }] };
    const fast = new Simulation(baseLevel({ enemies: [enemy] }));
    run(fast, { x: 1, y: 0, light: false }, .1);
    expect(fast.state.enemies[0].state).toBe('alert');
    const slow = new Simulation(baseLevel({ enemies: [enemy] }));
    run(slow, { x: 1, y: 0, slow: true, light: false }, .2);
    expect(slow.state.enemies[0].state).toBe('patrol');
    const occluded = new Simulation(baseLevel({ enemies: [enemy], walls: [{ x: 2, y: 0, w: 1, h: 2 }] }));
    run(occluded, { x: 1, y: 0, light: false }, .1);
    expect(occluded.state.enemies[0].state).toBe('patrol');
  });

  test('remembers last known location rather than a currently dark player', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 4, y: 1, type: 'watcher', route: [{ x: 4, y: 1 }] }] }));
    sim.step({ ...idle, light: true }, 1 / 60);
    const known = { ...sim.state.enemies[0].lastKnown };
    run(sim, { x: -1, y: 0, light: false }, .5);
    expect(sim.state.enemies[0].lastKnown).toEqual(known);
    expect(sim.state.enemies[0].state).toBe('chase');
  });

  test('runs the alert, chase, search, return and patrol state sequence', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 4.4, y: 1, type: 'watcher', route: [{ x: 4.4, y: 1 }, { x: 4.4, y: 4 }] }] }));
    sim.step({ ...idle, light: true }, 1 / 60);
    expect(sim.state.enemies[0].state).toBe('alert');
    run(sim, { x: 0, y: 1, light: false }, .5);
    expect(sim.state.enemies[0].state).toBe('chase');
    run(sim, idle, 1.5);
    expect(sim.state.enemies[0].state).toBe('search');
    run(sim, idle, 2.5);
    expect(sim.state.enemies[0].state).toBe('return');
    run(sim, idle, 4);
    expect(sim.state.enemies[0].state).toBe('patrol');
  });

  test('recovers from an alert at Room 10’s off-grid blind corner after a dark retreat', () => {
    const sim = new Simulation({ ...getLevel(10), player: { x: 3.99, y: 3 } });
    const enemy = sim.state.enemies[0];
    const initial = { x: enemy.x, y: enemy.y };
    expect(isWalkable(sim.state.player, sim.level)).toBe(true);
    expect(hasLineOfSight(enemy, sim.state.player, sim.level.walls)).toBe(true);
    expect(hasLineOfSight(enemy, sim.state.player, sim.level.walls, .2)).toBe(false);

    sim.step({ ...idle, light: true }, 1 / 60);
    expect(enemy.state).toBe('alert');
    const states = new Set([enemy.state]);
    let maximumDisplacement = 0;
    for (let frame = 0; frame < 20 * 60; frame++) {
      const before = { x: enemy.x, y: enemy.y };
      sim.step({ x: -1, y: 0, light: false }, 1 / 60);
      states.add(enemy.state);
      maximumDisplacement = Math.max(maximumDisplacement, Math.hypot(enemy.x - initial.x, enemy.y - initial.y));
      expect(isWalkable(enemy, sim.level)).toBe(true);
      expect(hasLineOfSight(before, enemy, sim.level.walls, .2)).toBe(true);
      expect(Math.hypot(enemy.x - before.x, enemy.y - before.y)).toBeLessThanOrEqual(enemy.speed / 60 + 1e-9);
    }
    expect(sim.state.status).toBe('playing');
    expect(sim.state.stats.detections).toBe(1);
    expect(maximumDisplacement).toBeGreaterThan(1);
    expect([...states]).toEqual(['alert', 'chase', 'search', 'return', 'patrol']);
    expect(enemy.state).toBe('patrol');
    expect(Math.hypot(enemy.x - initial.x, enemy.y - initial.y)).toBeLessThan(.12);
  });

  test('returns to the nearest patrol waypoint rather than its previous route index', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 4, y: 4, type: 'watcher', route: [{ x: 2, y: 4 }, { x: 7, y: 4 }] }] }));
    const enemy = sim.state.enemies[0];
    enemy.state = 'return';
    enemy.routeIndex = 1;
    sim.step(idle, 1 / 60);
    expect(enemy.routeIndex).toBe(0);
    expect(enemy.x).toBeLessThan(4);
  });

  test('selects the nearest patrol point before moving on the search-to-return transition', () => {
    const sim = new Simulation(baseLevel({
      enemies: [{ x: 3, y: 1, type: 'watcher', phase: .5, route: [{ x: .5, y: 1 }, { x: 7, y: 1 }] }],
    }));
    sim.step({ ...idle, light: true }, 1 / 60);
    run(sim, { x: 0, y: 1, light: false }, .5);
    for (let frame = 0; frame < 600 && sim.state.enemies[0].state !== 'return'; frame++) {
      sim.step(idle, 1 / 60);
    }
    const enemy = sim.state.enemies[0];
    expect(enemy.state).toBe('return');
    expect(enemy.routeIndex).toBe(0);
    expect(enemy.x).toBeLessThan(1);
  });

  test('starts the search dwell only after reaching the last known position', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 3, y: 4, type: 'watcher', speed: 20, route: [{ x: 7, y: 7 }] }] }));
    const enemy = sim.state.enemies[0];
    enemy.state = 'search';
    enemy.lastKnown = { x: 5, y: 4 };
    enemy.timer = 1.4;
    sim.step(idle, .1);
    run(sim, idle, 1.35);
    expect(enemy.state).toBe('search');
    expect(enemy.x).toBeCloseTo(5, 2);
  });

  test('does not move an enemy directly through an unreachable path', () => {
    const sim = new Simulation(baseLevel({
      player: { x: 1, y: 6 },
      walls: [{ x: 3, y: 0, w: 1, h: 8 }],
      enemies: [{ x: 1, y: 1, type: 'watcher', speed: 100, route: [{ x: 6, y: 1 }] }],
    }));
    sim.step(idle, .1);
    expect(sim.state.enemies[0]).toMatchObject({ x: 1, y: 1 });
  });

  test('caps oversized raw input vectors at the maximum player speed', () => {
    const sim = new Simulation(baseLevel());
    run(sim, { x: 3, y: 4, light: false }, .2);
    expect(Math.hypot(sim.state.player.vx, sim.state.player.vy)).toBeLessThanOrEqual(2.4);
  });

  test('reset is deterministic including phased patrols', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 4, y: 4, type: 'watcher', phase: .5, route: [{ x: 4, y: 4 }, { x: 6, y: 4 }] }] }));
    const initial = JSON.stringify(sim.state);
    run(sim, { x: 1, y: 0, light: true }, .8);
    sim.reset();
    expect(JSON.stringify(sim.state)).toBe(initial);
  });

  test('exposes security light even while player light is dark', () => {
    const sim = new Simulation(baseLevel({ securityLights: [{ x: 1, y: 1, angle: 0, sweep: 0, period: 1, radius: 4 }] }));
    sim.step(idle, 1 / 60);
    expect(sim.state.lightOn).toBe(false);
    expect(sim.state.securityExposed).toBe(true);
    expect(sim.state.visible).toBe(true);
  });

  test('depletes, recharges, turns off on release, and needs 20 percent rearm', () => {
    const sim = new Simulation(baseLevel({ lightEnergyEnabled: true }));
    run(sim, { ...idle, light: true }, 7.2);
    expect(sim.state.energy).toBe(0);
    expect(sim.state.lightOn).toBe(false);
    expect(sim.state.exhausted).toBe(true);
    run(sim, { ...idle, light: true }, .5);
    expect(sim.state.lightOn).toBe(false);
    run(sim, idle, 1.1);
    expect(sim.state.exhausted).toBe(false);
    sim.step({ ...idle, light: true }, 1 / 60);
    expect(sim.state.lightOn).toBe(true);
    sim.step(idle, 1 / 60);
    expect(sim.state.lightOn).toBe(false);
  });

  test('counts light time for unlimited energy and only the final available limited charge', () => {
    const unlimited = new Simulation(baseLevel());
    run(unlimited, { ...idle, light: true }, 1);
    expect(unlimited.state.stats.lightTime).toBeCloseTo(1, 6);
    const limited = new Simulation(baseLevel({ lightEnergyEnabled: true }));
    limited.state.energy = .01;
    limited.step({ ...idle, light: true }, .1);
    expect(limited.state.stats.lightTime).toBeCloseTo(.07, 6);
  });

  test('fully recharges limited light while dark', () => {
    const sim = new Simulation(baseLevel({ lightEnergyEnabled: true }));
    sim.state.energy = 0;
    run(sim, idle, 6);
    expect(sim.state.energy).toBe(1);
  });

  test('captures on trap and enemy contact, escapes at exit, and keeps terminal state', () => {
    const trap = new Simulation(baseLevel({ player: { x: 1, y: 1 }, traps: [{ x: 1, y: 1 }] }));
    trap.step(idle, 1 / 60);
    expect([trap.state.status, trap.state.cause]).toEqual(['caught', 'trap']);
    const enemy = new Simulation(baseLevel({ enemies: [{ x: 1.2, y: 1, type: 'watcher', route: [{ x: 1.2, y: 1 }] }] }));
    enemy.step(idle, 1 / 60);
    expect([enemy.state.status, enemy.state.cause]).toEqual(['caught', 'enemy']);
    enemy.step({ x: 1, y: 0, light: true }, 1);
    expect(enemy.state.status).toBe('caught');
    const exit = new Simulation(baseLevel({ exit: { x: 1.2, y: 1 } }));
    exit.step(idle, 1 / 60);
    expect(exit.state.status).toBe('escaped');
  });
});
