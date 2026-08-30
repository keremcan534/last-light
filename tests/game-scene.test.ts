// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { advanceSimulation } from '../src/game/scenes/GameScene';
import { getLevel } from '../src/game/levels/levels';
import { Simulation } from '../src/game/systems/Simulation';

it('applies a light release on the next fixed tick while presentation is frozen', () => {
  const simulation = new Simulation(getLevel(1));
  advanceSimulation(simulation, { x: 0, y: 0, light: true }, 1 / 60, 0);
  expect(simulation.state.lightOn).toBe(true);
  const result = advanceSimulation(simulation, { x: 0, y: 0, light: false }, 1 / 60, 0);
  expect(simulation.state.lightOn).toBe(false);
  expect(result.steps).toBe(1);
});

it('delivers each fixed tick to orchestration instead of replaying the final tick', () => {
  const simulation = new Simulation(getLevel(1));
  const observed:number[]=[];
  advanceSimulation(simulation, { x: 0, y: 0, light: false }, 2 / 60, 0, () => observed.push(simulation.state.time));
  expect(observed).toEqual([1 / 60, 2 / 60]);
});
