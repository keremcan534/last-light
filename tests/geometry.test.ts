import { expect, test } from 'vitest';
import type { Level, Vec, Wall } from '../src/game/types';
import { getLevel } from '../src/game/levels/levels';
import { findPath, hasLineOfSight, isWalkable } from '../src/game/systems/Geometry';

const levelWithWalls = (walls: Wall[]): Level => ({
  ...getLevel(1), map: { width: 8, height: 8 }, walls,
});

const expectClearPath = (start: Vec, end: Vec, level: Level) => {
  const path = findPath(start, end, level);
  expect(path.length).toBeGreaterThan(1);
  expect(path[0]).toEqual(start);
  expect(path[path.length - 1]).toEqual(end);
  expect(path.every(point => isWalkable(point, level))).toBe(true);
  for (let index = 1; index < path.length; index++) {
    expect(hasLineOfSight(path[index - 1], path[index], level.walls, .2),
      `blocked segment ${JSON.stringify(path.slice(index - 1, index + 1))}`).toBe(true);
  }
  expect(findPath(start, end, level)).toEqual(path);
  return path;
};

test('connects the valid Room 10 target whose nearest grid point is blocked', () => {
  const level = getLevel(10);
  const start = { x: 6, y: 2.5 };
  const end = { x: 3.99, y: 3 };
  expect(isWalkable(end, level)).toBe(true);
  expect(isWalkable({ x: 4, y: 3 }, level)).toBe(false);
  expectClearPath(start, end, level);
});

test('connects an off-grid start without cutting the padded blind corner', () => {
  expectClearPath({ x: 3.99, y: 3 }, { x: 6, y: 2.5 }, getLevel(10));
});

test('does not cut a padded corner when connecting an off-grid start', () => {
  const level = levelWithWalls([{ x: 3.25, y: 3.25, w: .02, h: .02 }]);
  expectClearPath({ x: 3.01, y: 3.24 }, { x: 5, y: 3 }, level);
});

test('retains both distinct exact endpoints within one grid cell', () => {
  expectClearPath({ x: 1.01, y: 1.01 }, { x: 1.12, y: 1.12 }, levelWithWalls([]));
});

test('routes around a thin wall between walkable neighboring grid nodes', () => {
  const level = levelWithWalls([{ x: 3.24, y: 2, w: .02, h: 3 }]);
  expect(isWalkable({ x: 3, y: 3 }, level)).toBe(true);
  expect(isWalkable({ x: 3.5, y: 3 }, level)).toBe(true);
  expectClearPath({ x: 2, y: 3 }, { x: 5, y: 3 }, level);
});

test('does not fabricate a direct route through an unreachable thin barrier', () => {
  const level = levelWithWalls([{ x: 3.24, y: 0, w: .02, h: 8 }]);
  const start = { x: 2, y: 3 };
  expect(findPath(start, { x: 5, y: 3 }, level)).toEqual([start]);
});
