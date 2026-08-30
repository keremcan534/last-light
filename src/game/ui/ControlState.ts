import type { InputState } from '../types';

/** Input is independent of rendering, so multi-touch cancellation is testable. */
export class ControlState {
  private moveId: number | null = null;
  private lightId: number | null = null;
  private origin = { x: 0, y: 0 };
  private vector = { x: 0, y: 0 };
  private keys = new Set<string>();

  begin(id: number, side: 'move' | 'light', x: number, y: number) {
    if (side === 'move' && this.moveId === null) {
      this.moveId = id;
      this.origin = { x, y };
      this.vector = { x: 0, y: 0 };
    } else if (side === 'light' && this.lightId === null) this.lightId = id;
  }

  move(id: number, x: number, y: number) {
    if (id !== this.moveId) return;
    const dx = (x - this.origin.x) / 44;
    const dy = (y - this.origin.y) / 44;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.vector = { x: dx / length, y: dy / length };
  }

  end(id: number) {
    if (id === this.moveId) { this.moveId = null; this.vector = { x: 0, y: 0 }; }
    if (id === this.lightId) this.lightId = null;
  }

  key(code: string, pressed: boolean) { if (pressed) this.keys.add(code); else this.keys.delete(code); }

  read(): InputState {
    const has = (...codes: string[]) => codes.some(c => this.keys.has(c));
    let x = this.vector.x + Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    let y = this.vector.y + Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    const length = Math.max(1, Math.hypot(x, y));
    x /= length; y /= length;
    return { x, y, light: this.lightId !== null || has('Space'), slow: has('ShiftLeft', 'ShiftRight') };
  }

  clear() { this.moveId = null; this.lightId = null; this.vector = { x: 0, y: 0 }; this.keys.clear(); }
}
