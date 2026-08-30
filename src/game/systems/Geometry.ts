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

interface PathNode { point: Vec; cost: number; previous: string | null; settled: boolean }

/** A small, deterministic grid search with clearance-safe continuous endpoints. */
export const findPath = (start: Vec, end: Vec, level: Level): Vec[] => {
  const scale = 2;
  const radius = .2;
  if (!isWalkable(start, level, radius) || !isWalkable(end, level, radius)) return [start];
  if (distance(start, end) === 0) return [{ ...start }];
  if (hasLineOfSight(start, end, level.walls, radius)) return [{ ...start }, { ...end }];

  const maxX = Math.floor(level.map.width * scale);
  const maxY = Math.floor(level.map.height * scale);
  const nodes = new Map<string, PathNode>();
  const directions: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // Endpoints connect to visible grid nodes, not blindly rounded wall cells.
  // Different connector lengths require Dijkstra costs rather than BFS hops.
  for (let y = 0; y <= maxY; y++) for (let x = 0; x <= maxX; x++) {
    const point = { x: x / scale, y: y / scale };
    if (!isWalkable(point, level, radius)) continue;
    nodes.set(cellKey(x, y), {
      point,
      cost: hasLineOfSight(start, point, level.walls, radius) ? distance(start, point) : Infinity,
      previous: null,
      settled: false,
    });
  }

  let endKey: string | null = null;
  let bestCost = Infinity;
  while (true) {
    let currentKey: string | null = null;
    let currentCost = bestCost;
    // At most 609 grid positions in an authored room; stable scan order breaks ties.
    for (const [key, node] of nodes) {
      if (!node.settled && node.cost < currentCost) {
        currentKey = key;
        currentCost = node.cost;
      }
    }
    if (currentKey === null) break;
    const current = nodes.get(currentKey)!;
    current.settled = true;
    const totalCost = currentCost + distance(current.point, end);
    if (totalCost < bestCost && hasLineOfSight(current.point, end, level.walls, radius)) {
      endKey = currentKey;
      bestCost = totalCost;
    }

    for (const [dx, dy] of directions) {
      const next = nodes.get(cellKey(current.point.x * scale + dx, current.point.y * scale + dy));
      const cost = currentCost + 1 / scale;
      if (!next || next.settled || cost >= next.cost) continue;
      if (!hasLineOfSight(current.point, next.point, level.walls, radius)) continue;
      next.cost = cost;
      next.previous = currentKey;
    }
  }

  if (endKey === null) return [start];
  const path: Vec[] = [{ ...end }];
  let key: string | null = endKey;
  while (key !== null) {
    const node: PathNode = nodes.get(key)!;
    path.push(node.point);
    key = node.previous;
  }
  path.push({ ...start });
  path.reverse();
  return path.filter((point, index) => index === 0 || distance(point, path[index - 1]) > 0);
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
