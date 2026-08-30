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
      if (this.state.lightOn) this.state.stats.lightTime += dt;
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
        if (enemy.timer <= 0) {
          enemy.state = 'return';
          enemy.routeIndex = this.nearestRouteIndex(enemy);
          this.returningEnemies.add(enemy);
        }
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
