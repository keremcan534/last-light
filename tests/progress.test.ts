import { describe, expect, test } from 'vitest';
import type { Level, RunStats } from '../src/game/types';
import { ProgressManager, scoreRun } from '../src/game/systems/ProgressManager';

const level: Level = { id: 2, name: '', chapter: '', map: { width: 4, height: 4 }, player: { x: 1, y: 1 }, exit: { x: 3, y: 3 }, walls: [], enemies: [], traps: [], securityLights: [], lightEnergyEnabled: true, parTime: 10, lightBudget: 2, solution: [], hint: '' };
const clean: RunStats = { time: 9, lightTime: 2, detections: 0 };
const storage = () => {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); }, items };
};

describe('scoreRun', () => {
  test('awards one for detection, three for clean budget, otherwise two', () => {
    expect(scoreRun({ ...clean, detections: 1 }, level)).toBe(1);
    expect(scoreRun(clean, level)).toBe(3);
    expect(scoreRun({ ...clean, time: 11 }, level)).toBe(2);
    expect(scoreRun({ ...clean, lightTime: 3 }, level)).toBe(2);
  });
});

describe('ProgressManager', () => {
  test('round trips stored progress and merges max stars with minimum time', () => {
    const store = storage();
    const manager = new ProgressManager(store);
    expect(manager.record(2, clean, level)).toBe(3);
    manager.record(2, { time: 12, lightTime: 4, detections: 1 }, level);
    expect(manager.data).toMatchObject({ unlocked: 3, completed: { '2': { stars: 3, bestTime: 9 } } });
    expect(new ProgressManager(store).data).toEqual(manager.data);
  });

  test('updates and preserves settings when reset', () => {
    const manager = new ProgressManager(storage());
    manager.updateSettings({ sound: false, reducedMotion: true });
    manager.record(2, clean, level);
    manager.reset();
    expect(manager.data).toEqual({ unlocked: 1, completed: {}, settings: { sound: false, vibration: false, reducedMotion: true } });
  });

  test('survives corrupted, unavailable, and invalid persisted schemas', () => {
    const corrupt = { getItem: () => '{wat', setItem: () => {} };
    expect(new ProgressManager(corrupt).data.unlocked).toBe(1);
    const unavailable = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('quota'); } };
    const manager = new ProgressManager(unavailable);
    manager.record(2, clean, level);
    expect(manager.data.unlocked).toBe(3);
    const invalid = { getItem: () => JSON.stringify({ unlocked: Infinity, completed: { '2': { stars: 9, bestTime: NaN }, '30': { stars: 3, bestTime: 1 } }, settings: [] }), setItem: () => {} };
    expect(new ProgressManager(invalid).data).toEqual({ unlocked: 1, completed: {}, settings: { sound: true, vibration: false, reducedMotion: false } });
  });
});
