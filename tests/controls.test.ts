import { describe, expect, it } from 'vitest';
import { ControlState } from '../src/game/ui/ControlState';

describe('independent thumb controls', () => {
  it('uses analog joystick distance and caps diagonal movement', () => {
    const c = new ControlState();
    c.begin(1, 'move', 100, 100);
    c.move(1, 122, 100);
    expect(c.read().x).toBeCloseTo(.5);
    c.move(1, 200, 200);
    expect(Math.hypot(c.read().x, c.read().y)).toBeCloseTo(1);
  });
  it('releasing light leaves a simultaneous joystick active', () => {
    const c = new ControlState();
    c.begin(1, 'move', 100, 100);
    c.move(1, 144, 100);
    c.begin(2, 'light', 300, 100);
    expect(c.read()).toMatchObject({ x: 1, light: true });
    c.end(2);
    expect(c.read()).toMatchObject({ x: 1, light: false });
  });
  it('ignores unrelated and extra pointers', () => {
    const c = new ControlState();
    c.begin(1, 'move', 0, 0);
    c.begin(2, 'move', 20, 20);
    c.move(2, 64, 20);
    expect(c.read().x).toBe(0);
    c.move(1, 44, 0);
    c.end(2);
    expect(c.read().x).toBe(1);
  });
  it('cancellation and blur clear all pointer and keyboard state', () => {
    const c = new ControlState();
    c.key('KeyW', true); c.key('Space', true);
    c.begin(1, 'light', 0, 0);
    c.clear();
    expect(c.read()).toEqual({ x: 0, y: 0, light: false, slow: false });
  });
  it('combines keyboard movement, light and slow walk without diagonal boost', () => {
    const c = new ControlState();
    c.key('KeyW', true); c.key('KeyD', true); c.key('Space', true); c.key('ShiftLeft', true);
    expect(c.read()).toMatchObject({ light: true, slow: true });
    expect(c.read().y).toBeLessThan(0);
    expect(Math.hypot(c.read().x, c.read().y)).toBeCloseTo(1);
    c.key('Space', false);
    expect(c.read().light).toBe(false);
  });
});
