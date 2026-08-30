# Scoped final core fixes

Only unlimited light accounting and natural nearest-return transition changed since earlier package. Verify against final sections below and docs/qa/core-report.md.

tests/simulation.test.ts-212-    expect(sim.state.lightOn).toBe(true);
tests/simulation.test.ts-213-    sim.step(idle, 1 / 60);
tests/simulation.test.ts-214-    expect(sim.state.lightOn).toBe(false);
tests/simulation.test.ts-215-  });
tests/simulation.test.ts-216-
tests/simulation.test.ts:217:  test('counts light time for unlimited energy and only the final available limited charge', () => {
tests/simulation.test.ts:218:    const unlimited = new Simulation(baseLevel());
tests/simulation.test.ts:219:    run(unlimited, { ...idle, light: true }, 1);
tests/simulation.test.ts:220:    expect(unlimited.state.stats.lightTime).toBeCloseTo(1, 6);
tests/simulation.test.ts-221-    const limited = new Simulation(baseLevel({ lightEnergyEnabled: true }));
tests/simulation.test.ts-222-    limited.state.energy = .01;
tests/simulation.test.ts-223-    limited.step({ ...idle, light: true }, .1);
tests/simulation.test.ts-224-    expect(limited.state.stats.lightTime).toBeCloseTo(.07, 6);
tests/simulation.test.ts-225-  });
tests/simulation.test.ts-226-
tests/simulation.test.ts-227-  test('fully recharges limited light while dark', () => {
tests/simulation.test.ts-228-    const sim = new Simulation(baseLevel({ lightEnergyEnabled: true }));
tests/simulation.test.ts-229-    sim.state.energy = 0;
tests/simulation.test.ts-230-    run(sim, idle, 6);
tests/simulation.test.ts-231-    expect(sim.state.energy).toBe(1);
tests/simulation.test.ts-232-  });
tests/simulation.test.ts-233-
tests/simulation.test.ts-234-  test('captures on trap and enemy contact, escapes at exit, and keeps terminal state', () => {
tests/simulation.test.ts-235-    const trap = new Simulation(baseLevel({ player: { x: 1, y: 1 }, traps: [{ x: 1, y: 1 }] }));
tests/simulation.test.ts-236-    trap.step(idle, 1 / 60);
tests/simulation.test.ts-237-    expect([trap.state.status, trap.state.cause]).toEqual(['caught', 'trap']);
tests/simulation.test.ts-238-    const enemy = new Simulation(baseLevel({ enemies: [{ x: 1.2, y: 1, type: 'watcher', route: [{ x: 1.2, y: 1 }] }] }));
tests/simulation.test.ts-239-    enemy.step(idle, 1 / 60);
tests/simulation.test.ts-240-    expect([enemy.state.status, enemy.state.cause]).toEqual(['caught', 'enemy']);
tests/simulation.test.ts-241-    enemy.step({ x: 1, y: 0, light: true }, 1);
tests/simulation.test.ts-242-    expect(enemy.state.status).toBe('caught');
tests/simulation.test.ts-243-    const exit = new Simulation(baseLevel({ exit: { x: 1.2, y: 1 } }));
tests/simulation.test.ts-244-    exit.step(idle, 1 / 60);
tests/simulation.test.ts-245-    expect(exit.state.status).toBe('escaped');
tests/simulation.test.ts-246-  });
tests/simulation.test.ts-247-});
--
src/game/systems/Simulation.ts-84-      angle: 0, speed: spec.speed ?? 1.35,
src/game/systems/Simulation.ts-85-      state: 'patrol',
src/game/systems/Simulation.ts-86-    };
src/game/systems/Simulation.ts-87-  }
src/game/systems/Simulation.ts-88-
src/game/systems/Simulation.ts:89:  private updateLight(wantsLight: boolean, dt: number): void {
src/game/systems/Simulation.ts-90-    const before = this.state.lightOn;
src/game/systems/Simulation.ts-91-    if (!this.level.lightEnergyEnabled) {
src/game/systems/Simulation.ts-92-      this.state.energy = 1;
src/game/systems/Simulation.ts-93-      this.state.exhausted = false;
src/game/systems/Simulation.ts-94-      this.state.lightOn = wantsLight;
src/game/systems/Simulation.ts-95-      if (this.state.lightOn) this.state.stats.lightTime += dt;
src/game/systems/Simulation.ts-96-    } else {
src/game/systems/Simulation.ts-97-      if (this.state.exhausted && this.state.energy >= .2) this.state.exhausted = false;
src/game/systems/Simulation.ts-98-      this.state.lightOn = wantsLight && !this.state.exhausted;
src/game/systems/Simulation.ts-99-      if (this.state.lightOn) {
src/game/systems/Simulation.ts-100-        const litDuration = Math.min(dt, this.state.energy * 7);
src/game/systems/Simulation.ts-101-        this.state.energy = Math.max(0, this.state.energy - litDuration / 7);
src/game/systems/Simulation.ts-102-        this.state.stats.lightTime += litDuration;
src/game/systems/Simulation.ts-103-        if (litDuration < dt || this.state.energy === 0) {
src/game/systems/Simulation.ts-104-          this.state.lightOn = false;
src/game/systems/Simulation.ts-105-          this.state.exhausted = true;
src/game/systems/Simulation.ts-106-          this.event('empty');
src/game/systems/Simulation.ts-107-        }
src/game/systems/Simulation.ts-108-      } else if (!wantsLight) {
src/game/systems/Simulation.ts-109-        this.state.energy = Math.min(1, this.state.energy + dt / 5);
src/game/systems/Simulation.ts-110-      }
src/game/systems/Simulation.ts-111-    }
src/game/systems/Simulation.ts-112-    if (before !== this.state.lightOn) this.event(this.state.lightOn ? 'light-on' : 'light-off');
src/game/systems/Simulation.ts-113-  }
src/game/systems/Simulation.ts-114-
src/game/systems/Simulation.ts-115-  private movePlayer(input: InputState, dt: number): void {
src/game/systems/Simulation.ts-116-    const rawMagnitude = Number.isFinite(input.x) && Number.isFinite(input.y) ? Math.hypot(input.x, input.y) : 0;
src/game/systems/Simulation.ts-117-    const magnitude = Math.min(1, rawMagnitude);
src/game/systems/Simulation.ts-118-    const multiplier = input.slow ? SLOW_SPEED : 1;
src/game/systems/Simulation.ts-119-    const targetX = rawMagnitude ? (input.x / rawMagnitude) * magnitude * MAX_SPEED * multiplier : 0;
src/game/systems/Simulation.ts-120-    const targetY = rawMagnitude ? (input.y / rawMagnitude) * magnitude * MAX_SPEED * multiplier : 0;
src/game/systems/Simulation.ts-121-    const acceleration = MAX_SPEED * 18 * dt;
src/game/systems/Simulation.ts-122-    const player = this.state.player;
src/game/systems/Simulation.ts-123-    player.vx = approach(player.vx, targetX, acceleration);
--
src/game/systems/Simulation.ts-181-        this.event('alert');
src/game/systems/Simulation.ts-182-      }
src/game/systems/Simulation.ts-183-    }
src/game/systems/Simulation.ts-184-  }
src/game/systems/Simulation.ts-185-
src/game/systems/Simulation.ts:186:  private advanceEnemyState(enemy: Enemy, dt: number, aware: boolean): void {
src/game/systems/Simulation.ts-187-    if (enemy.state === 'alert') {
src/game/systems/Simulation.ts-188-      enemy.timer -= dt;
src/game/systems/Simulation.ts-189-      if (enemy.timer <= 0) enemy.state = 'chase';
src/game/systems/Simulation.ts-190-      return;
src/game/systems/Simulation.ts-191-    }
src/game/systems/Simulation.ts-192-    if (enemy.state === 'chase') {
src/game/systems/Simulation.ts-193-      if (!aware) enemy.memory -= dt;
src/game/systems/Simulation.ts-194-      if (enemy.memory <= 0) {
src/game/systems/Simulation.ts-195-        enemy.state = 'search';
src/game/systems/Simulation.ts-196-        enemy.timer = 1.4;
src/game/systems/Simulation.ts-197-      }
src/game/systems/Simulation.ts-198-      return;
src/game/systems/Simulation.ts-199-    }
src/game/systems/Simulation.ts-200-    if (enemy.state === 'search') {
src/game/systems/Simulation.ts-201-      if (distance(enemy, enemy.lastKnown) <= .12) {
src/game/systems/Simulation.ts-202-        enemy.timer -= dt;
src/game/systems/Simulation.ts-203-        if (enemy.timer <= 0) {
src/game/systems/Simulation.ts-204-          enemy.state = 'return';
src/game/systems/Simulation.ts-205-          enemy.routeIndex = this.nearestRouteIndex(enemy);
src/game/systems/Simulation.ts-206-          this.returningEnemies.add(enemy);
src/game/systems/Simulation.ts-207-        }
src/game/systems/Simulation.ts-208-      }
src/game/systems/Simulation.ts-209-      return;
src/game/systems/Simulation.ts-210-    }
src/game/systems/Simulation.ts-211-    if (enemy.state === 'return') {
src/game/systems/Simulation.ts-212-      if (!this.returningEnemies.has(enemy)) {
src/game/systems/Simulation.ts-213-        enemy.routeIndex = this.nearestRouteIndex(enemy);
src/game/systems/Simulation.ts-214-        this.returningEnemies.add(enemy);
src/game/systems/Simulation.ts-215-      }
src/game/systems/Simulation.ts-216-      const target = enemy.route[enemy.routeIndex];
src/game/systems/Simulation.ts-217-      if (distance(enemy, target) < .12) {
src/game/systems/Simulation.ts-218-        enemy.state = 'patrol';
src/game/systems/Simulation.ts-219-        this.alertedEnemies.delete(enemy);
src/game/systems/Simulation.ts-220-        this.returningEnemies.delete(enemy);

