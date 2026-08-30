import { afterEach, expect, it } from 'vitest';
import { AudioManager } from '../src/game/systems/AudioManager';

class FakeAudioContext {
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  suspendCalls = 0;
  resumeCalls = 0;
  createGain() { return { gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } as unknown as GainNode; }
  createOscillator() { return { type: 'sine', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {}, disconnect() {} } as unknown as OscillatorNode; }
  suspend() { this.suspendCalls++; return Promise.resolve(); }
  resume() { this.resumeCalls++; return Promise.resolve(); }
}

const original = globalThis.AudioContext;
afterEach(() => { globalThis.AudioContext = original; });

it('suspends the actual audio context for pause and muting, then resumes only after unlock', () => {
  let context: FakeAudioContext | undefined;
  globalThis.AudioContext = class extends FakeAudioContext { constructor() { super(); context = this; } } as unknown as typeof AudioContext;
  const audio = new AudioManager();
  audio.unlock();
  audio.suspend();
  audio.setEnabled(false);
  expect(context!.suspendCalls).toBe(2);
  expect(context!.resumeCalls).toBe(1);
  audio.setEnabled(true);
  expect(context!.resumeCalls).toBe(1);
  audio.unlock();
  expect(context!.resumeCalls).toBe(2);
});
