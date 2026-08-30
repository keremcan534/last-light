export interface Vec { x: number; y: number }
export interface Wall extends Vec { w: number; h: number }
export type EnemyKind = 'watcher' | 'listener';
export type EnemyState = 'patrol' | 'alert' | 'chase' | 'search' | 'return';
export interface EnemySpec extends Vec { type: EnemyKind; route: Vec[]; phase?: number; speed?: number }
export interface SecuritySpec extends Vec { angle: number; sweep: number; period: number; radius: number; phase?: number }
export interface SolutionPoint extends Vec { wait?: number; speed?: number; flash?: number }
export interface Level {
  id: number; name: string; chapter: string; map: { width: number; height: number };
  player: Vec; exit: Vec; walls: Wall[]; enemies: EnemySpec[];
  traps: Vec[]; securityLights: SecuritySpec[]; lightEnergyEnabled: boolean;
  parTime: number; lightBudget: number; solution: SolutionPoint[]; hint: string;
}
export interface Enemy extends Vec {
  type: EnemyKind; state: EnemyState; route: Vec[]; routeIndex: number;
  timer: number; memory: number; lastKnown: Vec; angle: number; speed: number;
}
export interface InputState { x: number; y: number; light: boolean; slow?: boolean }
export interface RunStats { time: number; lightTime: number; detections: number }
export type GameEvent = 'light-on' | 'light-off' | 'alert' | 'caught' | 'escaped' | 'footstep' | 'empty';
export interface GameState {
  player: Vec & { vx: number; vy: number; angle: number };
  enemies: Enemy[]; lightOn: boolean; energy: number; exhausted: boolean;
  visible: boolean; securityExposed: boolean; noiseRadius: number;
  status: 'playing' | 'caught' | 'escaped'; cause: 'enemy' | 'trap' | null;
  stats: RunStats; time: number; events: GameEvent[];
}
export interface Settings { sound: boolean; vibration: boolean; reducedMotion: boolean }
export interface RecordEntry { stars: number; bestTime: number }
export interface Progress { unlocked: number; completed: Record<string, RecordEntry>; settings: Settings }
