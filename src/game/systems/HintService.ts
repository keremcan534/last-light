import type { Level, Vec } from '../types';
import { findPath } from './Geometry';

export function nextWaypoint(player: Vec, route: Vec[], level?: Level): Vec | null {
  if (!route.length) return null;
  let nearest = Infinity;
  let target = route[0];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((player.x - a.x) * dx + (player.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const dist = Math.hypot(player.x - a.x - dx * t, player.y - a.y - dy * t);
    if (dist <= nearest) { nearest = dist; target = b; }
  }
  if (!level) return { ...target };
  const path = findPath(player, target, level);
  return path[1] ? { ...path[1] } : null;
}

/** Replace this permission callback with a rewarded action later, without changing gameplay. */
export class HintService {
  constructor(private authorize: () => Promise<boolean> = async () => true) {}
  async request(player: Vec, level: Level) {
    return await this.authorize() ? nextWaypoint(player, [level.player, ...level.solution], level) : null;
  }
}
