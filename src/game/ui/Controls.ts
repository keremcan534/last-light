import { ControlState } from './ControlState';

export class Controls {
  readonly state = new ControlState();
  private abort = new AbortController();
  private moveId: number | null = null;
  private origin = { x: 0, y: 0 };
  private stick: HTMLElement;
  private nub: HTMLElement;

  constructor(private surface: HTMLElement, private onShortcut: (action: string) => void) {
    this.stick = surface.querySelector('.joystick')!;
    this.nub = surface.querySelector('.joystick-nub')!;
    const options = { signal: this.abort.signal };
    surface.addEventListener('pointerdown', this.down, options);
    surface.addEventListener('pointermove', this.move, options);
    surface.addEventListener('pointerup', this.up, options);
    surface.addEventListener('pointercancel', this.up, options);
    surface.addEventListener('lostpointercapture', this.up, options);
    window.addEventListener('keydown', this.keydown, options);
    window.addEventListener('keyup', this.keyup, options);
    window.addEventListener('blur', this.clear, options);
    surface.addEventListener('contextmenu', e => e.preventDefault(), options);
  }

  private down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bounds = this.surface.getBoundingClientRect();
    const side = e.clientX - bounds.left < bounds.width / 2 ? 'move' : 'light';
    this.state.begin(e.pointerId, side, e.clientX, e.clientY);
    this.surface.setPointerCapture(e.pointerId);
    if (side === 'move' && this.moveId === null) {
      this.moveId = e.pointerId;
      this.origin = { x: e.clientX, y: e.clientY };
      this.stick.style.left = `${e.clientX - bounds.left}px`;
      this.stick.style.top = `${e.clientY - bounds.top}px`;
      this.stick.classList.add('floating');
    }
    this.refresh();
  };

  private move = (e: PointerEvent) => {
    this.state.move(e.pointerId, e.clientX, e.clientY);
    if (e.pointerId === this.moveId) {
      const dx = e.clientX - this.origin.x, dy = e.clientY - this.origin.y;
      const scale = Math.min(1, 32 / (Math.hypot(dx, dy) || 1));
      this.nub.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    }
  };

  private up = (e: PointerEvent) => {
    this.state.end(e.pointerId);
    if (e.pointerId === this.moveId) { this.moveId = null; this.resetStick(); }
    this.refresh();
  };

  private keydown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button, input, select')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat && ['Escape', 'KeyR', 'KeyH'].includes(e.code)) {
      this.onShortcut(e.code === 'Escape' ? 'pause' : e.code === 'KeyR' ? 'retry' : 'hint');
      return;
    }
    this.state.key(e.code, true); this.refresh();
  };

  private keyup = (e: KeyboardEvent) => { this.state.key(e.code, false); this.refresh(); };
  private refresh() { this.surface.classList.toggle('holding-light', this.state.read().light); }
  private resetStick() {
    this.stick.classList.remove('floating');
    this.stick.style.left = ''; this.stick.style.top = ''; this.nub.style.transform = '';
  }
  read() { return this.state.read(); }
  clear = () => { this.state.clear(); this.moveId = null; this.resetStick(); this.refresh(); };
  destroy() { this.clear(); this.abort.abort(); }
}
