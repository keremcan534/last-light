# Core fix-round review package

Compare only findings from core_review initial report. Current complete assigned files after fixes, no Git repository.

## src/game/systems/Geometry.ts

```ts
import type { Level, SecuritySpec, Vec, Wall } from '../types';

export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

const inside = (point: Vec, wall: Wall, pad = 0): boolean =>
  point.x >= wall.x - pad && point.x <= wall.x + wall.w + pad &&
  point.y >= wall.y - pad && point.y <= wall.y + wall.h + pad;

const segmentHitsWall = (a: Vec, b: Vec, wall: Wall): boolean => {
  if (inside(a, wall) || inside(b, wall)) return true;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let near = 0;
  let far = 1;
  for (const [origin, delta, minimum, maximum] of [
    [a.x, dx, wall.x, wall.x + wall.w],
    [a.y, dy, wall.y, wall.y + wall.h],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return true;
};

export const hasLineOfSight = (a: Vec, b: Vec, walls: Wall[], radius = 0): boolean =>
  !walls.some((wall) => segmentHitsWall(a, b, radius
    ? { x: wall.x - radius, y: wall.y - radius, w: wall.w + radius * 2, h: wall.h + radius * 2 }
    : wall));

export const isWalkable = (point: Vec, level: Level, radius = .2): boolean =>
  point.x >= radius && point.y >= radius &&
  point.x <= level.map.width - radius && point.y <= level.map.height - radius &&
  !level.walls.some((wall) => inside(point, wall, radius));

const cellKey = (x: number, y: number): string => `${x}:${y}`;

/** A deliberately small, deterministic grid BFS suitable for short enemy routes. */
export const findPath = (start: Vec, end: Vec, level: Level): Vec[] => {
  const scale = 2;
  const sx = Math.round(start.x * scale);
  const sy = Math.round(start.y * scale);
  const ex = Math.round(end.x * scale);
  const ey = Math.round(end.y * scale);
  const maxX = Math.floor(level.map.width * scale);
  const maxY = Math.floor(level.map.height * scale);
  const queue: Array<[number, number]> = [[sx, sy]];
  const previous = new Map<string, string | null>([[cellKey(sx, sy), null]]);
  const directions: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    if (x === ex && y === ey) break;
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      const key = cellKey(nx, ny);
      if (previous.has(key) || nx < 0 || ny < 0 || nx > maxX || ny > maxY) continue;
      const point = { x: nx / scale, y: ny / scale };
      if (!isWalkable(point, level)) continue;
      previous.set(key, cellKey(x, y));
      queue.push([nx, ny]);
    }
  }

  const endKey = cellKey(ex, ey);
  if (!previous.has(endKey)) return [start];
  const path: Vec[] = [];
  let key: string | null = endKey;
  while (key) {
    const [x, y] = key.split(':').map(Number);
    path.push({ x: x / scale, y: y / scale });
    key = previous.get(key) ?? null;
  }
  path.reverse();
  path[0] = { ...start };
  path[path.length - 1] = { ...end };
  return path;
};

export const securityAngle = (spec: SecuritySpec, time: number): number => {
  const period = spec.period > 0 ? spec.period : 1;
  const phase = spec.phase ?? 0;
  return spec.angle + Math.sin((time / period) * Math.PI * 2 + phase) * spec.sweep;
};

const angleBetween = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export const inSecurityLight = (point: Vec, spec: SecuritySpec, time: number, walls: Wall[]): boolean => {
  const range = distance(point, spec);
  if (range > spec.radius || !hasLineOfSight(point, spec, walls)) return false;
  if (range < 1e-9) return true;
  const direction = Math.atan2(point.y - spec.y, point.x - spec.x);
  return Math.abs(angleBetween(direction, securityAngle(spec, time))) <= .26;
};


```

## src/game/systems/Simulation.ts

```ts
import type { Enemy, EnemySpec, EnemyState, GameEvent, GameState, InputState, Level, Vec } from '../types';
import { distance, findPath, hasLineOfSight, inSecurityLight, isWalkable } from './Geometry';

const PLAYER_RADIUS = .2;
const MAX_SPEED = 2.4;
const SLOW_SPEED = .4;
const WATCHER_RANGE = 3.6;
const LISTENER_RANGE = 1.8;
const CONTACT_RANGE = .38;
const clone = <T>(value: T): T => structuredClone(value);
interface CachedPath { target: Vec; points: Vec[]; index: number; repathAt: number }

const approach = (value: number, target: number, amount: number): number =>
  value + Math.max(-amount, Math.min(amount, target - value));

export class Simulation {
  public level: Level;
  public state: GameState;
  private readonly initialLevel: Level;
  private footstepClock = 0;
  private alertedEnemies = new WeakSet<Enemy>();
  private returningEnemies = new WeakSet<Enemy>();
  private paths = new WeakMap<Enemy, CachedPath>();

  constructor(level: Level) {
    this.initialLevel = clone(level);
    this.level = clone(level);
    this.state = this.newState();
  }

  reset(): void {
    this.level = clone(this.initialLevel);
    this.state = this.newState();
    this.footstepClock = 0;
    this.alertedEnemies = new WeakSet<Enemy>();
    this.returningEnemies = new WeakSet<Enemy>();
    this.paths = new WeakMap<Enemy, CachedPath>();
  }

  step(input: InputState, dt: number): void {
    this.state.events = [];
    if (this.state.status !== 'playing') return;
    const elapsed = Math.max(0, Math.min(.1, Number.isFinite(dt) ? dt : 0));
    if (!elapsed) return;
    this.state.time += elapsed;
    this.state.stats.time += elapsed;
    this.updateLight(input.light, elapsed);
    this.state.securityExposed = this.level.securityLights.some((spec) =>
      inSecurityLight(this.state.player, spec, this.state.time, this.level.walls));
    this.state.visible = this.state.lightOn || this.state.securityExposed;
    this.movePlayer(input, elapsed);
    this.state.securityExposed = this.level.securityLights.some((spec) =>
      inSecurityLight(this.state.player, spec, this.state.time, this.level.walls));
    this.state.visible = this.state.lightOn || this.state.securityExposed;
    this.updateEnemies(elapsed);
    this.resolveContacts();
  }

  private newState(): GameState {
    return {
      player: { ...this.level.player, vx: 0, vy: 0, angle: 0 },
      enemies: this.level.enemies.map((spec) => this.newEnemy(spec)),
      lightOn: false,
      energy: 1,
      exhausted: false,
      visible: false,
      securityExposed: false,
      noiseRadius: 0,
      status: 'playing',
      cause: null,
      stats: { time: 0, lightTime: 0, detections: 0 },
      time: 0,
      events: [],
    };
  }

  private newEnemy(spec: EnemySpec): Enemy {
    const route = spec.route.length ? clone(spec.route) : [{ x: spec.x, y: spec.y }];
    const phase = Math.abs(spec.phase ?? 0);
    return {
      x: spec.x, y: spec.y, type: spec.type, route,
      routeIndex: Math.floor(phase * route.length) % route.length,
      timer: 0, memory: 0, lastKnown: { x: spec.x, y: spec.y },
      angle: 0, speed: spec.speed ?? 1.35,
      state: 'patrol',
    };
  }

  private updateLight(wantsLight: boolean, dt: number): void {
    const before = this.state.lightOn;
    if (!this.level.lightEnergyEnabled) {
      this.state.energy = 1;
      this.state.exhausted = false;
      this.state.lightOn = wantsLight;
    } else {
      if (this.state.exhausted && this.state.energy >= .2) this.state.exhausted = false;
      this.state.lightOn = wantsLight && !this.state.exhausted;
      if (this.state.lightOn) {
        const litDuration = Math.min(dt, this.state.energy * 7);
        this.state.energy = Math.max(0, this.state.energy - litDuration / 7);
        this.state.stats.lightTime += litDuration;
        if (litDuration < dt || this.state.energy === 0) {
          this.state.lightOn = false;
          this.state.exhausted = true;
          this.event('empty');
        }
      } else if (!wantsLight) {
        this.state.energy = Math.min(1, this.state.energy + dt / 5);
      }
    }
    if (before !== this.state.lightOn) this.event(this.state.lightOn ? 'light-on' : 'light-off');
  }

  private movePlayer(input: InputState, dt: number): void {
    const rawMagnitude = Number.isFinite(input.x) && Number.isFinite(input.y) ? Math.hypot(input.x, input.y) : 0;
    const magnitude = Math.min(1, rawMagnitude);
    const multiplier = input.slow ? SLOW_SPEED : 1;
    const targetX = rawMagnitude ? (input.x / rawMagnitude) * magnitude * MAX_SPEED * multiplier : 0;
    const targetY = rawMagnitude ? (input.y / rawMagnitude) * magnitude * MAX_SPEED * multiplier : 0;
    const acceleration = MAX_SPEED * 18 * dt;
    const player = this.state.player;
    player.vx = approach(player.vx, targetX, acceleration);
    player.vy = approach(player.vy, targetY, acceleration);
    if (rawMagnitude) player.angle = Math.atan2(input.y, input.x);
    const wantedDistance = Math.hypot(player.vx, player.vy) * dt;
    const steps = Math.max(1, Math.ceil(wantedDistance / .05));
    const stepX = player.vx * dt / steps;
    const stepY = player.vy * dt / steps;
    let moved = false;
    for (let step = 0; step < steps; step++) {
      const xCandidate = { x: player.x + stepX, y: player.y };
      if (isWalkable(xCandidate, this.level, PLAYER_RADIUS)) {
        player.x = xCandidate.x;
        moved ||= Math.abs(stepX) > 1e-7;
      } else player.vx = 0;
      const yCandidate = { x: player.x, y: player.y + stepY };
      if (isWalkable(yCandidate, this.level, PLAYER_RADIUS)) {
        player.y = yCandidate.y;
        moved ||= Math.abs(stepY) > 1e-7;
      } else player.vy = 0;
    }
    const actualSpeed = moved ? Math.hypot(player.vx, player.vy) : 0;
    this.state.noiseRadius = actualSpeed > 1 ? 2.3 * Math.min(1, actualSpeed / MAX_SPEED) : 0;
    this.footstepClock -= dt;
    if (moved && this.footstepClock <= 0) {
      this.event('footstep');
      this.footstepClock = .32;
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.state.enemies) {
      const aware = this.canPerceive(enemy);
      if (aware) this.notice(enemy);
      this.advanceEnemyState(enemy, dt, aware);
      this.moveEnemy(enemy, dt);
    }
  }

  private canPerceive(enemy: Enemy): boolean {
    const player = this.state.player;
    const range = enemy.type === 'watcher' ? WATCHER_RANGE : LISTENER_RANGE;
    const vision = this.state.visible && distance(enemy, player) < range && hasLineOfSight(enemy, player, this.level.walls);
    if (enemy.type === 'watcher') return vision;
    const noise = this.state.noiseRadius > 0 && distance(enemy, player) <= this.state.noiseRadius &&
      hasLineOfSight(enemy, player, this.level.walls);
    return vision || noise;
  }

  private notice(enemy: Enemy): void {
    enemy.lastKnown = { x: this.state.player.x, y: this.state.player.y };
    enemy.memory = 1.4;
    if (enemy.state === 'patrol' || enemy.state === 'return' || enemy.state === 'search') {
      this.returningEnemies.delete(enemy);
      enemy.state = 'alert';
      enemy.timer = .4;
      if (!this.alertedEnemies.has(enemy)) {
        this.alertedEnemies.add(enemy);
        this.state.stats.detections += 1;
        this.event('alert');
      }
    }
  }

  private advanceEnemyState(enemy: Enemy, dt: number, aware: boolean): void {
    if (enemy.state === 'alert') {
      enemy.timer -= dt;
      if (enemy.timer <= 0) enemy.state = 'chase';
      return;
    }
    if (enemy.state === 'chase') {
      if (!aware) enemy.memory -= dt;
      if (enemy.memory <= 0) {
        enemy.state = 'search';
        enemy.timer = 1.4;
      }
      return;
    }
    if (enemy.state === 'search') {
      if (distance(enemy, enemy.lastKnown) <= .12) {
        enemy.timer -= dt;
        if (enemy.timer <= 0) enemy.state = 'return';
      }
      return;
    }
    if (enemy.state === 'return') {
      if (!this.returningEnemies.has(enemy)) {
        enemy.routeIndex = this.nearestRouteIndex(enemy);
        this.returningEnemies.add(enemy);
      }
      const target = enemy.route[enemy.routeIndex];
      if (distance(enemy, target) < .12) {
        enemy.state = 'patrol';
        this.alertedEnemies.delete(enemy);
        this.returningEnemies.delete(enemy);
      }
    }
  }

  private moveEnemy(enemy: Enemy, dt: number): void {
    if (enemy.state === 'alert') return;
    let target: Vec;
    if (enemy.state === 'chase' || enemy.state === 'search') target = enemy.lastKnown;
    else target = enemy.route[enemy.routeIndex];
    const next = this.nextPathPoint(enemy, target);
    if (!next) return;
    const dx = next.x - enemy.x;
    const dy = next.y - enemy.y;
    const length = Math.hypot(dx, dy);
    if (length > .001) {
      const amount = Math.min(length, enemy.speed * dt);
      const steps = Math.max(1, Math.ceil(amount / .05));
      const stepX = dx / length * amount / steps;
      const stepY = dy / length * amount / steps;
      for (let step = 0; step < steps; step++) {
        const candidate = { x: enemy.x + stepX, y: enemy.y + stepY };
        if (!isWalkable(candidate, this.level, PLAYER_RADIUS)) break;
        enemy.x = candidate.x;
        enemy.y = candidate.y;
      }
      enemy.angle = Math.atan2(dy, dx);
    }
    if (enemy.state === 'patrol' && distance(enemy, target) < .12 && enemy.route.length > 1) {
      enemy.routeIndex = (enemy.routeIndex + 1) % enemy.route.length;
    }
  }

  private nextPathPoint(enemy: Enemy, target: Vec): Vec | null {
    if (hasLineOfSight(enemy, target, this.level.walls, PLAYER_RADIUS)) {
      this.paths.delete(enemy);
      return target;
    }
    const cached = this.paths.get(enemy);
    const targetMoved = !cached || distance(cached.target, target) > .2;
    if (!cached || targetMoved || this.state.time >= cached.repathAt) {
      const points = findPath(enemy, target, this.level);
      const fresh: CachedPath = { target: { ...target }, points, index: 1, repathAt: this.state.time + .3 };
      this.paths.set(enemy, fresh);
      if (points.length < 2) return null;
      return points[1];
    }
    while (cached.index < cached.points.length && distance(enemy, cached.points[cached.index]) < .1) cached.index++;
    return cached.points[cached.index] ?? null;
  }

  private nearestRouteIndex(enemy: Enemy): number {
    let nearest = 0;
    let nearestDistance = Infinity;
    for (let index = 0; index < enemy.route.length; index++) {
      const candidateDistance = distance(enemy, enemy.route[index]);
      if (candidateDistance < nearestDistance) {
        nearest = index;
        nearestDistance = candidateDistance;
      }
    }
    return nearest;
  }

  private resolveContacts(): void {
    const player = this.state.player;
    if (this.level.traps.some((trap) => distance(player, trap) <= .3)) {
      this.capture('trap');
      return;
    }
    if (this.state.enemies.some((enemy) => distance(player, enemy) <= CONTACT_RANGE)) {
      this.capture('enemy');
      return;
    }
    if (distance(player, this.level.exit) <= .42) {
      this.state.status = 'escaped';
      this.event('escaped');
    }
  }

  private capture(cause: 'enemy' | 'trap'): void {
    this.state.status = 'caught';
    this.state.cause = cause;
    this.event('caught');
  }

  private event(event: GameEvent): void {
    if (!this.state.events.includes(event)) this.state.events.push(event);
  }
}


```

## tests/simulation.test.ts

```ts
import { describe, expect, test } from 'vitest';
import type { InputState, Level, SecuritySpec, Vec, Wall } from '../src/game/types';
import { findPath, hasLineOfSight, inSecurityLight, isWalkable, securityAngle } from '../src/game/systems/Geometry';
import { Simulation } from '../src/game/systems/Simulation';

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

  test('returns to the nearest patrol waypoint rather than its previous route index', () => {
    const sim = new Simulation(baseLevel({ enemies: [{ x: 4, y: 4, type: 'watcher', route: [{ x: 2, y: 4 }, { x: 7, y: 4 }] }] }));
    const enemy = sim.state.enemies[0];
    enemy.state = 'return';
    enemy.routeIndex = 1;
    sim.step(idle, 1 / 60);
    expect(enemy.routeIndex).toBe(0);
    expect(enemy.x).toBeLessThan(4);
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

  test('does not count light time for unlimited energy and counts only the final available charge', () => {
    const unlimited = new Simulation(baseLevel());
    run(unlimited, { ...idle, light: true }, .5);
    expect(unlimited.state.stats.lightTime).toBe(0);
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


```

