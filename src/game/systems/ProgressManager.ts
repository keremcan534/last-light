import type { Level, Progress, RecordEntry, RunStats, Settings } from '../types';

const KEY = 'last-light:progress:v1';
const MAX_LEVEL = 25;
const defaults = (): Progress => ({
  unlocked: 1,
  completed: {},
  settings: { sound: true, vibration: false, reducedMotion: false },
});

const validEntry = (value: unknown): value is RecordEntry => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as RecordEntry;
  return Number.isInteger(entry.stars) && entry.stars >= 1 && entry.stars <= 3 &&
    Number.isFinite(entry.bestTime) && entry.bestTime >= 0;
};

const readProgress = (raw: string | null): Progress => {
  if (!raw) return defaults();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults();
    const source = parsed as Partial<Progress>;
    const result = defaults();
    if (typeof source.unlocked === 'number' && Number.isFinite(source.unlocked)) {
      result.unlocked = Math.max(1, Math.min(MAX_LEVEL, Math.floor(source.unlocked)));
    }
    if (source.completed && typeof source.completed === 'object' && !Array.isArray(source.completed)) {
      for (const [id, entry] of Object.entries(source.completed)) {
        const numericId = Number(id);
        if (Number.isInteger(numericId) && numericId >= 1 && numericId <= MAX_LEVEL && validEntry(entry)) {
          result.completed[String(numericId)] = { stars: entry.stars, bestTime: entry.bestTime };
        }
      }
    }
    if (source.settings && typeof source.settings === 'object' && !Array.isArray(source.settings)) {
      const setting = source.settings as Partial<Settings>;
      for (const key of ['sound', 'vibration', 'reducedMotion'] as const) {
        if (typeof setting[key] === 'boolean') result.settings[key] = setting[key];
      }
    }
    return result;
  } catch {
    return defaults();
  }
};

const browserStorage = (): Pick<Storage, 'getItem' | 'setItem'> | undefined => {
  try { return globalThis.localStorage; } catch { return undefined; }
};

export const scoreRun = (stats: RunStats, level: Level): number => {
  if (stats.detections > 0) return 1;
  return stats.time <= level.parTime && stats.lightTime <= level.lightBudget ? 3 : 2;
};

export class ProgressManager {
  public data: Progress;
  private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>;

  constructor(storage = browserStorage()) {
    this.storage = storage;
    let raw: string | null = null;
    try { raw = this.storage?.getItem(KEY) ?? null; } catch { /* unavailable storage uses defaults */ }
    this.data = readProgress(raw);
  }

  record(id: number, stats: RunStats, level: Level): number {
    const stars = scoreRun(stats, level);
    if (Number.isInteger(id) && id >= 1 && id <= MAX_LEVEL) {
      const key = String(id);
      const previous = this.data.completed[key];
      this.data.completed[key] = {
        stars: Math.max(previous?.stars ?? 0, stars),
        bestTime: Math.min(previous?.bestTime ?? Infinity, stats.time),
      };
      this.data.unlocked = Math.max(this.data.unlocked, Math.min(MAX_LEVEL, id + 1));
      this.persist();
    }
    return stars;
  }

  updateSettings(partial: Partial<Settings>): void {
    for (const key of ['sound', 'vibration', 'reducedMotion'] as const) {
      if (typeof partial[key] === 'boolean') this.data.settings[key] = partial[key];
    }
    this.persist();
  }

  reset(): void {
    const settings = { ...this.data.settings };
    this.data = { unlocked: 1, completed: {}, settings };
    this.persist();
  }

  private persist(): void {
    try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch { /* keep in-memory progress */ }
  }
}
