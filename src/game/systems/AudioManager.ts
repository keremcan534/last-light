import type { GameEvent } from '../types';

/** Everything is synthesized locally. Audio starts only after a user gesture. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hum: GainNode | null = null;
  private enabled = true;
  private suspended = false;
  private beat = 0;
  private metal = 0;

  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = .38;
        this.master.connect(this.ctx.destination);
        this.hum = this.ctx.createGain();
        this.hum.gain.value = .055;
        this.hum.connect(this.master);
        for (const frequency of [48, 72.15]) {
          const oscillator = this.ctx.createOscillator();
          oscillator.type = 'sine'; oscillator.frequency.value = frequency;
          oscillator.connect(this.hum); oscillator.start();
        }
      }
      this.suspended = false;
      void this.ctx.resume().catch(() => {});
      this.master?.gain.setTargetAtTime(.38, this.ctx.currentTime, .08);
    } catch { /* Browsers without WebAudio remain fully playable. */ }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.suspend();
  }

  suspend() {
    this.suspended = true;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .025);
      void this.ctx.suspend().catch(() => {});
    }
  }

  private tone(frequency: number, end: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0) {
    if (!this.enabled || this.suspended || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, end), now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  play(event: GameEvent | 'ui') {
    switch (event) {
      case 'light-on': this.tone(380, 740, .16, .09); this.tone(110, 170, .25, .09); break;
      case 'light-off': this.tone(320, 120, .12, .065); break;
      case 'footstep': this.tone(75, 32, .075, .09, 'triangle'); break;
      case 'alert': this.tone(176, 440, .35, .18, 'triangle'); this.tone(185, 465, .35, .06); break;
      case 'caught': this.tone(160, 23, .55, .28, 'sawtooth'); break;
      case 'escaped': [330, 440, 660, 880].forEach((n, i) => this.tone(n, n, .7, .1, 'sine', i * .13)); break;
      case 'empty': this.tone(160, 90, .16, .1, 'triangle'); break;
      case 'ui': this.tone(520, 700, .06, .045); break;
    }
  }

  update(dt: number, tension: number) {
    if (!this.enabled || this.suspended || !this.ctx) return;
    this.beat -= dt; this.metal -= dt;
    if (tension > .1 && this.beat <= 0) {
      this.beat = 1.15 - tension * .55;
      this.tone(62, 35, .14, .12 * tension);
      this.tone(55, 32, .12, .08 * tension, 'sine', .17);
    }
    if (this.metal <= 0) {
      this.metal = 14;
      this.tone(670, 664, 2.2, .016);
      this.tone(1055, 1030, 1.4, .009, 'sine', .04);
    }
    this.hum?.gain.setTargetAtTime(.04 + tension * .035, this.ctx.currentTime, .3);
  }
}
